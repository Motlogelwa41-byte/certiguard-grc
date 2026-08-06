import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Syncs endpoint detection findings from CrowdStrike Falcon or Microsoft Defender
// for Endpoint into the SecurityFinding entity. Deduplicates by finding_id.
// Workflow-invoked (service role) or manually triggered.

const CROWDSTRIKE_TOKEN_URL = 'https://api.crowdstrike.com/oauth2/token';
const CROWDSTRIKE_DETECTIONS_URL = 'https://api.crowdstrike.com/detects/queries/detects/v2';
const CROWDSTRIKE_DETECT_DETAIL_URL = 'https://api.crowdstrike.com/detects/entities/detects/v2';
const CROWDSTRIKE_SPOTLIGHT_QUERY_URL = 'https://api.crowdstrike.com/spotlight/queries/vulnerabilities/v1';
const CROWDSTRIKE_SPOTLIGHT_DETAIL_URL = 'https://api.crowdstrike.com/spotlight/entities/vulnerabilities/v2';

const DEFENDER_TOKEN_URL = 'https://login.microsoftonline.com';
const DEFENDER_ALERTS_URL = 'https://api.security.microsoft.com/api/alerts_v2';

function mapCrowdStrikeSeverity(s) {
  const n = Number(s);
  if (n >= 70) return 'critical';
  if (n >= 50) return 'high';
  if (n >= 30) return 'medium';
  if (n > 0) return 'low';
  return 'info';
}

function mapCvssSeverity(score) {
  const n = Number(score);
  if (n >= 9) return 'critical';
  if (n >= 7) return 'high';
  if (n >= 4) return 'medium';
  if (n > 0) return 'low';
  return 'info';
}

function mapDefenderSeverity(s) {
  const v = (s || '').toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  if (v === 'low') return 'low';
  if (v === 'informational') return 'info';
  return 'medium';
}

function slaForSeverity(severity) {
  switch (severity) {
    case 'critical': return 24;
    case 'high': return 48;
    case 'medium': return 168;
    case 'low': return 720;
    default: return 1440;
  }
}

function computeDueDate(detectedDate, slaHours) {
  if (!detectedDate || !slaHours) return undefined;
  try {
    const d = new Date(detectedDate);
    d.setHours(d.getHours() + slaHours);
    return d.toISOString().slice(0, 10);
  } catch { return undefined; }
}

async function fetchEdrControls(base44) {
  const controls = await base44.asServiceRole.entities.Control.list('-updated_date', 500).catch(() => []);
  return (controls || []).filter(c => {
    const t = (c.title || '').toLowerCase();
    const cat = (c.category || '').toLowerCase();
    return t.includes('edr') || t.includes('endpoint') || t.includes('malware') ||
           t.includes('antivirus') || t.includes('threat detection') || t.includes('xdr') ||
           cat === 'technical';
  }).slice(0, 10);
}

async function syncCrowdStrike(base44, edrControls) {
  const clientId = Deno.env.get('CROWDSTRIKE_CLIENT_ID');
  const clientSecret = Deno.env.get('CROWDSTRIKE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return { provider: 'crowdstrike', synced: 0, skipped: true, reason: 'CROWDSTRIKE_CLIENT_ID / CROWDSTRIKE_CLIENT_SECRET not set' };
  }

  // Build tenant mapping from active CrowdStrike connections
  const connections = await base44.asServiceRole.entities.Connection.filter(
    { service: 'crowdstrike', status: 'connected' }, '-created_date', 100
  );
  if (!connections || connections.length === 0) {
    return { provider: 'crowdstrike', synced: 0, skipped: true, reason: 'No active CrowdStrike connection — create one in Connections with service=crowdstrike' };
  }

  // Map: host_group_id → tenant_id (from Connection.config JSON).
  // Single connection with no host groups → all detections get its tenant_id.
  const hostGroupToTenant = new Map();
  let fallbackTenantId = null;
  for (const conn of connections) {
    let cfg = {};
    try { cfg = conn.config ? JSON.parse(conn.config) : {}; } catch { cfg = {}; }
    const hgIds = Array.isArray(cfg.host_group_ids) ? cfg.host_group_ids : [];
    if (hgIds.length > 0) {
      for (const hg of hgIds) hostGroupToTenant.set(String(hg), conn.tenant_id);
    } else if (connections.length === 1) {
      fallbackTenantId = conn.tenant_id;
    }
  }

  // OAuth2 token
  const tokenRes = await fetch(CROWDSTRIKE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`CrowdStrike token failed (${tokenRes.status}): ${body}`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // ── Detections ──
  const detectRes = await fetch(CROWDSTRIKE_DETECTIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 200 }),
  });
  if (!detectRes.ok) {
    const body = await detectRes.text();
    throw new Error(`CrowdStrike detects query failed (${detectRes.status}): ${body}`);
  }
  const detectData = await detectRes.json();
  const detectIds = detectData.resources || [];

  let detectionsSynced = 0;
  let detectionsSkipped = 0;
  if (detectIds.length > 0) {
    const detailRes = await fetch(CROWDSTRIKE_DETECT_DETAIL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: detectIds }),
    });
    if (!detailRes.ok) {
      const body = await detailRes.text();
      throw new Error(`CrowdStrike detect detail failed (${detailRes.status}): ${body}`);
    }
    const detailData = await detailRes.json();
    const detects = detailData.resources || [];

    const existing = await base44.asServiceRole.entities.SecurityFinding.filter({ source: 'crowdstrike' }, '-created_date', 500);
    const existingIds = new Set((existing || []).map((f) => f.finding_id).filter(Boolean));

    for (const d of detects) {
      const fid = d.detect_id || d.id;
      if (!fid || existingIds.has(`CS-${fid}`)) continue;

      let tenantId = fallbackTenantId;
      const deviceGroups = d.device?.groups || [];
      for (const g of deviceGroups) {
        if (hostGroupToTenant.has(String(g))) { tenantId = hostGroupToTenant.get(String(g)); break; }
      }
      if (!tenantId) { detectionsSkipped++; continue; }

      try {
        const csSev = mapCrowdStrikeSeverity(d.max_severity || d.severity);
        const csSla = slaForSeverity(csSev);
        const csDetected = new Date().toISOString().slice(0, 10);
        await base44.asServiceRole.entities.SecurityFinding.create({
          tenant_id: tenantId,
          finding_id: `CS-${fid}`,
          source: 'crowdstrike',
          cloud_provider: 'other',
          title: d.display_name || d.friendly_name || `CrowdStrike detection ${fid}`,
          description: d.description || d.friendly_name || '',
          severity: csSev,
          status: 'open',
          asset: d.device?.device_name || undefined,
          resource_id: d.device?.device_id || undefined,
          service: 'falcon-endpoint',
          first_seen: d.first_behavior || undefined,
          last_seen: d.last_behavior || undefined,
          detected_date: csDetected,
          sla_hours: csSla,
          due_date: computeDueDate(csDetected, csSla),
          sla_breached: false,
          linked_control_ids: edrControls.map(c => c.id),
          linked_control_names: edrControls.map(c => c.title),
          notes: d.friendly_name || undefined,
        });
        detectionsSynced++;
      } catch (err) {
        console.error('CrowdStrike finding create error:', err?.message);
      }
    }
  }

  // ── Spotlight Vulnerabilities ──
  const spotQueryRes = await fetch(CROWDSTRIKE_SPOTLIGHT_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: 100 }),
  });
  let vulnsSynced = 0;
  let vulnsSkipped = 0;
  let vulnsFetched = 0;
  if (spotQueryRes.ok) {
    const spotQueryData = await spotQueryRes.json();
    const vulnIds = spotQueryData.resources || [];
    vulnsFetched = vulnIds.length;
    if (vulnIds.length > 0) {
      const spotDetailRes = await fetch(`${CROWDSTRIKE_SPOTLIGHT_DETAIL_URL}?ids=${vulnIds.slice(0, 100).join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      if (spotDetailRes.ok) {
        const spotDetailData = await spotDetailRes.json();
        const vulns = spotDetailData.resources || [];
        const existingV = await base44.asServiceRole.entities.SecurityFinding.filter({ source: 'crowdstrike' }, '-created_date', 500);
        const existingVIds = new Set((existingV || []).map((f) => f.finding_id).filter(Boolean));

        for (const v of vulns) {
          const fid = v.id;
          if (!fid || existingVIds.has(`CS-SPOT-${fid}`)) continue;

          let tenantId = fallbackTenantId;
          const hostGroups = v.host_info?.groups || [];
          for (const g of hostGroups) {
            if (hostGroupToTenant.has(String(g))) { tenantId = hostGroupToTenant.get(String(g)); break; }
          }
          if (!tenantId) { vulnsSkipped++; continue; }

          const cveId = v.cve?.id || '';
          const hostname = v.host_info?.hostname || v.host_info?.machine_domain || 'unknown host';
          const cvss = v.cve?.cvss_score || v.app?.product?.risk_score || 0;

          try {
            const vSev = mapCvssSeverity(cvss);
            const vSla = slaForSeverity(vSev);
            const vDetected = new Date().toISOString().slice(0, 10);
            await base44.asServiceRole.entities.SecurityFinding.create({
              tenant_id: tenantId,
              finding_id: `CS-SPOT-${fid}`,
              source: 'crowdstrike',
              cloud_provider: 'other',
              title: cveId ? `${cveId} on ${hostname}` : `Vulnerability on ${hostname}`,
              description: v.cve?.description || v.app?.product?.name || '',
              severity: vSev,
              status: v.status === 'closed' ? 'remediated' : 'open',
              cve: cveId || undefined,
              asset: hostname,
              resource_id: v.aid || undefined,
              service: 'falcon-spotlight',
              first_seen: v.created_timestamp ? v.created_timestamp.slice(0, 10) : undefined,
              last_seen: v.last_seen ? v.last_seen.slice(0, 10) : undefined,
              detected_date: vDetected,
              sla_hours: vSla,
              due_date: computeDueDate(vDetected, vSla),
              sla_breached: false,
              linked_control_ids: edrControls.map(c => c.id),
              linked_control_names: edrControls.map(c => c.title),
              notes: v.app?.product?.name || undefined,
            });
            vulnsSynced++;
          } catch (err) {
            console.error('CrowdStrike vuln finding create error:', err?.message);
          }
        }
      }
    }
  } else {
    console.error('CrowdStrike Spotlight query failed:', spotQueryRes.status);
  }

  return {
    provider: 'crowdstrike',
    detections: { fetched: detectIds.length, synced: detectionsSynced, skipped_no_tenant: detectionsSkipped },
    vulnerabilities: { fetched: vulnsFetched, synced: vulnsSynced, skipped_no_tenant: vulnsSkipped },
    synced: detectionsSynced + vulnsSynced,
  };
}

async function syncDefender(base44, edrControls) {
  const appId = Deno.env.get('DEFENDER_APP_ID');
  const tenantId = Deno.env.get('DEFENDER_TENANT_ID');
  const clientSecret = Deno.env.get('DEFENDER_CLIENT_SECRET');
  if (!appId || !tenantId || !clientSecret) {
    return { provider: 'defender', synced: 0, skipped: true, reason: 'DEFENDER_APP_ID / DEFENDER_TENANT_ID / DEFENDER_CLIENT_SECRET not set' };
  }

  // Build tenant mapping from active Defender connections
  const connections = await base44.asServiceRole.entities.Connection.filter(
    { service: 'defender', status: 'connected' }, '-created_date', 100
  );
  let fallbackTenantId = null;
  if (connections && connections.length > 0) {
    if (connections.length === 1) fallbackTenantId = connections[0].tenant_id;
  }

  // OAuth2 client credentials token
  const tokenRes = await fetch(`${DEFENDER_TOKEN_URL}/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: appId, client_secret: clientSecret,
      grant_type: 'client_credentials',
      scope: 'https://api.security.microsoft.com/.default',
    }),
  });
  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    throw new Error(`Defender token failed (${tokenRes.status}): ${body}`);
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Fetch recent alerts
  const alertsRes = await fetch(`${DEFENDER_ALERTS_URL}?$top=200`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!alertsRes.ok) {
    const body = await alertsRes.text();
    throw new Error(`Defender alerts fetch failed (${alertsRes.status}): ${body}`);
  }
  const alertsData = await alertsRes.json();
  const alerts = alertsData.value || [];

  // Dedupe
  const existing = await base44.asServiceRole.entities.SecurityFinding.filter({ source: 'defender' }, '-created_date', 500);
  const existingIds = new Set((existing || []).map((f) => f.finding_id).filter(Boolean));

  let created = 0;
  let skipped = 0;
  for (const a of alerts) {
    const fid = a.id;
    if (!fid || existingIds.has(`MD-${fid}`)) continue;
    if (!fallbackTenantId) { skipped++; continue; }
    try {
      const dSev = mapDefenderSeverity(a.severity);
      const dSla = slaForSeverity(dSev);
      const dDetected = (a.firstActivity || new Date().toISOString()).slice(0, 10);
      await base44.asServiceRole.entities.SecurityFinding.create({
        tenant_id: fallbackTenantId,
        finding_id: `MD-${fid}`,
        source: 'defender',
        cloud_provider: 'other',
        title: a.title || `Defender alert ${fid}`,
        description: a.description || '',
        severity: dSev,
        status: a.status === 'Resolved' ? 'remediated' : 'open',
        asset: a.devices?.[0]?.deviceName || undefined,
        resource_id: a.devices?.[0]?.deviceId || undefined,
        service: 'defender-endpoint',
        first_seen: a.firstActivity || undefined,
        last_seen: a.lastActivity || undefined,
        detected_date: dDetected,
        sla_hours: dSla,
        due_date: computeDueDate(dDetected, dSla),
        sla_breached: false,
        linked_control_ids: edrControls.map(c => c.id),
        linked_control_names: edrControls.map(c => c.title),
        notes: a.category || undefined,
      });
      created++;
    } catch (err) {
      console.error('Defender finding create error:', err?.message);
    }
  }

  return { provider: 'defender', fetched: alerts.length, synced: created, skipped_no_tenant: skipped };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let provider = (Deno.env.get('EDR_PROVIDER') || '').toLowerCase();
    let body = {};
    try {
      body = await req.json();
      if (body && body.provider) provider = String(body.provider).toLowerCase();
    } catch (_) { /* no body — use env var */ }
    // Auth gate: authenticated admin/compliance_officer, or internal workflow token
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (user.role !== 'admin' && user.role !== 'compliance_officer') {
        return Response.json({ error: 'Forbidden — admin or compliance_officer only' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    const results = [];
    const edrControls = await fetchEdrControls(base44);

    if (provider === 'crowdstrike' || provider === 'all') {
      try { results.push(await syncCrowdStrike(base44, edrControls)); }
      catch (e) { results.push({ provider: 'crowdstrike', error: e.message }); }
    }
    if (provider === 'defender' || provider === 'all') {
      try { results.push(await syncDefender(base44, edrControls)); }
      catch (e) { results.push({ provider: 'defender', error: e.message }); }
    }
    if (results.length === 0) {
      results.push({ provider: provider || 'none', skipped: true, reason: 'EDR_PROVIDER not set (use crowdstrike, defender, or all)' });
    }

    const totalSynced = results.reduce((sum, r) => sum + (r.synced || 0), 0);
    return Response.json({ ok: true, results, totalSynced });
  } catch (error) {
    console.error('syncEdrFindings error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'EDR sync failed' }, { status: 500 });
  }
});