import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Syncs endpoint detection findings from CrowdStrike Falcon or Microsoft Defender
// for Endpoint into the SecurityFinding entity. Deduplicates by finding_id.
// Workflow-invoked (service role) or manually triggered.

const CROWDSTRIKE_TOKEN_URL = 'https://api.crowdstrike.com/oauth2/token';
const CROWDSTRIKE_DETECTIONS_URL = 'https://api.crowdstrike.com/detects/queries/detects/v2';
const CROWDSTRIKE_DETECT_DETAIL_URL = 'https://api.crowdstrike.com/detects/entities/detects/v2';

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

function mapDefenderSeverity(s) {
  const v = (s || '').toLowerCase();
  if (v === 'high') return 'high';
  if (v === 'medium') return 'medium';
  if (v === 'low') return 'low';
  if (v === 'informational') return 'info';
  return 'medium';
}

async function syncCrowdStrike(base44) {
  const clientId = Deno.env.get('CROWDSTRIKE_CLIENT_ID');
  const clientSecret = Deno.env.get('CROWDSTRIKE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return { provider: 'crowdstrike', synced: 0, skipped: true, reason: 'CROWDSTRIKE_CLIENT_ID / CROWDSTRIKE_CLIENT_SECRET not set' };
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

  // Query recent detections
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

  if (detectIds.length === 0) {
    return { provider: 'crowdstrike', synced: 0, fetched: 0 };
  }

  // Fetch detection details
  const detailRes = await fetch(CROWDSTRIKE_DETECT_DETAIL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: detectIds }),
  });
  if (!detailRes.ok) {
    const body = await detailRes.text();
    throw new Error(`CrowdStrike detect detail failed (${detailRes.status}): ${body}`);
  }
  const detailData = await detailRes.json();
  const detects = detailData.resources || [];

  // Fetch existing finding_ids to dedupe
  const existing = await base44.asServiceRole.entities.SecurityFinding.filter({ source: 'crowdstrike' }, '-created_date', 500);
  const existingIds = new Set((existing || []).map((f) => f.finding_id).filter(Boolean));

  let created = 0;
  for (const d of detects) {
    const fid = d.detect_id || d.id;
    if (!fid || existingIds.has(fid)) continue;
    try {
      await base44.asServiceRole.entities.SecurityFinding.create({
        finding_id: `CS-${fid}`,
        source: 'crowdstrike',
        cloud_provider: 'other',
        title: d.display_name || d.friendly_name || `CrowdStrike detection ${fid}`,
        description: d.description || d.friendly_name || '',
        severity: mapCrowdStrikeSeverity(d.max_severity || d.severity),
        status: 'open',
        asset: d.device?.device_name || undefined,
        resource_id: d.device?.device_id || undefined,
        service: 'falcon-endpoint',
        first_seen: d.first_behavior || undefined,
        last_seen: d.last_behavior || undefined,
        detected_date: new Date().toISOString().slice(0, 10),
        notes: d.friendly_name || undefined,
      });
      created++;
    } catch (err) {
      console.error('CrowdStrike finding create error:', err?.message);
    }
  }

  return { provider: 'crowdstrike', fetched: detectIds.length, synced: created };
}

async function syncDefender(base44) {
  const appId = Deno.env.get('DEFENDER_APP_ID');
  const tenantId = Deno.env.get('DEFENDER_TENANT_ID');
  const clientSecret = Deno.env.get('DEFENDER_CLIENT_SECRET');
  if (!appId || !tenantId || !clientSecret) {
    return { provider: 'defender', synced: 0, skipped: true, reason: 'DEFENDER_APP_ID / DEFENDER_TENANT_ID / DEFENDER_CLIENT_SECRET not set' };
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
  for (const a of alerts) {
    const fid = a.id;
    if (!fid || existingIds.has(fid)) continue;
    try {
      await base44.asServiceRole.entities.SecurityFinding.create({
        finding_id: `MD-${fid}`,
        source: 'defender',
        cloud_provider: 'other',
        title: a.title || `Defender alert ${fid}`,
        description: a.description || '',
        severity: mapDefenderSeverity(a.severity),
        status: a.status === 'Resolved' ? 'remediated' : 'open',
        asset: a.devices?.[0]?.deviceName || undefined,
        resource_id: a.devices?.[0]?.deviceId || undefined,
        service: 'defender-endpoint',
        first_seen: a.firstActivity || undefined,
        last_seen: a.lastActivity || undefined,
        detected_date: (a.firstActivity || new Date().toISOString()).slice(0, 10),
        notes: a.category || undefined,
      });
      created++;
    } catch (err) {
      console.error('Defender finding create error:', err?.message);
    }
  }

  return { provider: 'defender', fetched: alerts.length, synced: created };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const provider = (Deno.env.get('EDR_PROVIDER') || '').toLowerCase();
    const results = [];

    if (provider === 'crowdstrike' || provider === 'all') {
      try { results.push(await syncCrowdStrike(base44)); }
      catch (e) { results.push({ provider: 'crowdstrike', error: e.message }); }
    }
    if (provider === 'defender' || provider === 'all') {
      try { results.push(await syncDefender(base44)); }
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