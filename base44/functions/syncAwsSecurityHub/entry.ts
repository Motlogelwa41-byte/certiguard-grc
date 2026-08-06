import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { secrets } from 'base44:runtime';

const SLA = { critical: 168, high: 336, medium: 720, low: 2160, info: 4320 };
const SEV_MAP = { CRITICAL: 'critical', HIGH: 'high', MEDIUM: 'medium', LOW: 'low', INFORMATIONAL: 'info' };
const WF_MAP = { NEW: 'open', RESOLVED: 'remediated', SUPPRESSED: 'accepted' };

const enc = new TextEncoder();
async function hmac(key, data) {
  const c = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', c, enc.encode(data)));
}
async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(data || ''));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hex(bytes) { return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// RFC 3986 URI-encode (AWS Sig V4 requires this, not encodeURIComponent)
function uriEncode(str) {
  return encodeURIComponent(String(str)).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

async function awsGet(host, uri, query, region, service, accessKey, secretKey) {
  const t = new Date();
  const amzDate = t.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = await sha256Hex('');
  // Canonical headers: host must be lowercase, trimmed, sorted
  const hdrs = [['host', host], ['x-amz-content-sha256', payloadHash], ['x-amz-date', amzDate]];
  hdrs.sort((a, b) => a[0].localeCompare(b[0]));
  const canonicalHeaders = hdrs.map((h) => `${h[0]}:${h[1]}\n`).join('');
  const signedHeaders = hdrs.map((h) => h[0]).join(';');
  // Canonical query string: keys and values URI-encoded, sorted by key
  const canonicalQuery = Object.keys(query).sort().map((k) => `${uriEncode(k)}=${uriEncode(query[k])}`).join('&');
  const canonicalRequest = ['GET', uri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const kDate = await hmac(enc.encode('AWS4' + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, 'aws4_request');
  const signature = hex(await hmac(kSigning, stringToSign));
  const auth = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  // Do NOT pass host header explicitly — Deno/fetch sets it from the URL automatically
  const headers = { 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate, Authorization: auth };
  return await fetch(`https://${host}${uri}?${canonicalQuery}`, { method: 'GET', headers });
}

Deno.serve(async (req) => {
  let conn = null;
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (user.role !== 'admin' && user.role !== 'compliance_officer') return Response.json({ error: 'Forbidden' }, { status: 403 });
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const client = user ? base44 : base44.asServiceRole;
    if (body?.connection_id) conn = await client.entities.Connection.get(body.connection_id).catch(() => null);
    if (!conn) {
      const awsConns = await client.entities.Connection.filter({ service: 'aws' });
      conn = (awsConns && awsConns[0]) || null;
    }
    if (!conn) return Response.json({ error: 'No AWS connection found. Create an AWS connection in Connections first.' }, { status: 404 });
    if (conn.status === 'disconnected' || conn.auto_collect === false) {
      return Response.json({ ok: true, skipped: true, reason: 'AWS connection disabled by admin' });
    }

    let region = 'us-east-1';
    try { region = JSON.parse(conn.config || '{}').region || region; } catch {}
    const accessKey = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    if (!accessKey || !secretKey) return Response.json({ error: 'AWS credentials not configured. Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets.' }, { status: 400 });

    // First verify credentials with STS GetCallerIdentity
    const stsHost = `sts.${region}.amazonaws.com`;
    const stsRes = await awsGet(stsHost, '/', { Action: 'GetCallerIdentity', Version: '2011-06-15' }, region, 'sts', accessKey, secretKey);
    if (!stsRes.ok) {
      const stsTxt = await stsRes.text();
      await client.entities.Connection.update(conn.id, { last_sync_at: new Date().toISOString(), last_status: 'error', last_error: 'Invalid AWS credentials' }).catch(() => {});
      return Response.json({ error: 'AWS credentials are invalid or expired. Please update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in app secrets with valid IAM credentials that have Security Hub read permissions.' }, { status: 401 });
    }
    const stsData = await stsRes.text();
    console.log('STS verification OK:', stsData.slice(0, 300));

    const host = `securityhub.${region}.amazonaws.com`;
    const res = await awsGet(host, '/findings', { MaxResults: '100' }, region, 'securityhub', accessKey, secretKey);
    if (!res.ok) {
      const txt = await res.text();
      await client.entities.Connection.update(conn.id, { last_sync_at: new Date().toISOString(), last_status: 'error', last_error: `Security Hub ${res.status}` }).catch(() => {});
      return Response.json({ error: `Security Hub request failed (${res.status}): ${txt.slice(0, 500)}` }, { status: 502 });
    }
    const data = await res.json();
    const items = data.Findings || [];
    const existing = await client.entities.SecurityFinding.list('-created_date', 500);
    const existingIds = new Set((existing || []).map((f) => f.finding_id).filter(Boolean));
    const controls = await client.entities.Control.list('-updated_date', 500);
    const byCat = {};
    (controls || []).forEach((c) => { (byCat[c.category] = byCat[c.category] || []).push(c); });
    const KW_CAT = [
      ['access_control', ['iam', 'mfa', 'password', 'access', 'root', 'credential', 'principal', 'permission', 'role']],
      ['data_protection', ['encryption', 'encrypt', 'kms', 's3', 'rds', 'ebs', 'snapshot', 'backup', 'tls', 'certificate', 'secret']],
      ['network_security', ['security group', 'vpc', 'subnet', 'port', 'firewall', 'nat', 'load balancer', 'ssh', 'elb']],
      ['change_management', ['config', 'cloudtrail', 'change', 'versioning', 'logging']],
      ['security_operations', ['guardduty', 'security hub', 'cloudwatch', 'alarm', 'alert', 'intrusion', 'detect']],
      ['asset_management', ['inventory', 'tag', 'asset']],
      ['incident_response', ['incident', 'breach', 'forensic']],
      ['compliance', ['cis', 'compliance', 'benchmark', 'standard', 'regulatory']],
    ];
    const linkControls = (haystack) => {
      const cats = new Set();
      for (const [cat, kws] of KW_CAT) { if (kws.some((k) => haystack.includes(k))) cats.add(cat); }
      let picked = [];
      for (const cat of cats) { for (const c of (byCat[cat] || [])) { if (picked.length < 3 && !picked.includes(c)) picked.push(c); } }
      if (picked.length === 0 && (controls || []).length) {
        const tokens = haystack.split(/[^a-z0-9]+/).filter((t) => t.length > 4);
        for (const c of controls) { const t = (c.title || '').toLowerCase(); if (tokens.some((tk) => t.includes(tk)) && picked.length < 3) picked.push(c); }
      }
      return { ids: picked.map((c) => c.id), names: picked.map((c) => c.title).filter(Boolean) };
    };
    const POSTURE_MAP = [
      ['IAM', ['iam', 'mfa', 'password', 'access', 'root', 'credential', 'principal', 'permission', 'role', 'policy']],
      ['Encryption', ['encryption', 'encrypt', 'kms', 'tls', 'certificate', 'secret']],
      ['Network', ['security group', 'vpc', 'subnet', 'port', 'firewall', 'nat', 'load balancer', 'ssh']],
      ['Logging', ['cloudtrail', 'logging', 'log', 'cloudwatch', 'audit']],
      ['Configuration', ['config', 'backup', 'snapshot', 'versioning', 'tag', 'inventory']],
      ['Compliance', ['cis', 'compliance', 'benchmark', 'standard', 'regulatory']],
    ];
    const postureCheck = (haystack) => {
      for (const [cat, kws] of POSTURE_MAP) { if (kws.some((k) => haystack.includes(k))) return cat; }
      return 'Configuration';
    };
    const now = new Date();
    const records = [];
    for (const f of items) {
      const fid = f.Id;
      if (fid && existingIds.has(fid)) continue;
      const sev = SEV_MAP[(f.Severity && f.Severity.Label) || ''] || 'medium';
      const sla = SLA[sev] ?? 720;
      const due = new Date(now.getTime() + sla * 3600 * 1000).toISOString().slice(0, 10);
      const res0 = (f.Resources && f.Resources[0]) || {};
      const types = (f.Types || []).join(' ');
      const haystack = [f.Title, f.Description, types, f.GeneratorId].filter(Boolean).join(' ').toLowerCase();
      const linked = linkControls(haystack);
      records.push({
        tenant_id: user?.data?.tenant_id || conn?.tenant_id || '',
        finding_id: fid || `SF-${now.getFullYear()}-${records.length}`,
        source: 'security_hub', cloud_provider: 'aws', posture_check: postureCheck(haystack),
        title: f.Title || f.Description || 'AWS Security Hub finding',
        description: f.Description || '', severity: sev,
        status: WF_MAP[(f.Workflow && f.Workflow.Status) || 'NEW'] || 'open',
        cve: (f.Vulnerabilities && f.Vulnerabilities[0] && f.Vulnerabilities[0].Cves && f.Vulnerabilities[0].Cves[0] && f.Vulnerabilities[0].Cves[0].Id) || '',
        asset: res0.Type || '', resource_id: res0.Id || '', service: f.GeneratorId || '',
        detected_date: f.CreatedAt ? f.CreatedAt.slice(0, 10) : now.toISOString().slice(0, 10),
        first_seen: f.FirstObservedAt || f.CreatedAt || now.toISOString(),
        last_seen: f.LastObservedAt || f.UpdatedAt || now.toISOString(),
        due_date: due, sla_hours: sla, sla_breached: false,
        owner_name: '', linked_control_ids: linked.ids, linked_control_names: linked.names,
        evidence_url: '', notes: '', connection_id: conn.id
      });
    }
    let created = [];
    if (records.length) created = await client.entities.SecurityFinding.bulkCreate(records);
    await client.entities.Connection.update(conn.id, { last_sync_at: new Date().toISOString(), last_status: 'ok', last_error: '', evidence_collected_count: (conn.evidence_collected_count || 0) + created.length }).catch(() => {});
    return Response.json({ ok: true, count: created.length, pulled: items.length, region });
  } catch (error) {
    console.error('syncAwsSecurityHub error', error?.message || error);
    if (conn?.id) {
      const errClient = createClientFromRequest(req).asServiceRole;
      await errClient.entities.Connection.update(conn.id, { last_sync_at: new Date().toISOString(), last_status: 'error', last_error: error?.message || 'Unknown error' }).catch(() => {});
    }
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});