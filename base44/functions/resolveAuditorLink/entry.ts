import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { waitUntil } from 'base44:runtime';

const enc = new TextEncoder();

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { token, passphrase } = body || {};
    if (!token || !passphrase) return Response.json({ error: 'token and passphrase required' }, { status: 400 });

    const links = await base44.asServiceRole.entities.AuditorLink.filter({ token }, '-created_date', 5);
    const link = links && links[0];
    if (!link) return Response.json({ error: 'Invalid link' }, { status: 404 });
    if (link.revoked) return Response.json({ error: 'Link revoked' }, { status: 403 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return Response.json({ error: 'Link expired' }, { status: 403 });
    }
    const hash = await sha256(passphrase);
    if (hash !== link.passphrase_hash) return Response.json({ error: 'Incorrect passphrase' }, { status: 401 });

    const scope = await base44.asServiceRole.entities.AuditorScope.get(link.scope_id).catch(() => null);
    if (!scope || scope.status !== 'active') return Response.json({ error: 'Scope inactive' }, { status: 403 });

    const tenantId = link.tenant_id;
    const [frameworks, controls, evidence] = await Promise.all([
      base44.asServiceRole.entities.Framework.filter({ tenant_id: tenantId }, '-created_date', 200).catch(() => []),
      base44.asServiceRole.entities.Control.filter({ tenant_id: tenantId }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId, status: 'approved' }, '-created_date', 500).catch(() => [])
    ]);

    const scopedFwIds = (scope.framework_ids && scope.framework_ids.length) ? scope.framework_ids : null;
    const scopedFrameworks = scopedFwIds ? frameworks.filter((f) => scopedFwIds.includes(f.id)) : frameworks;
    const scopedControls = scopedFwIds
      ? controls.filter((c) => (c.framework_ids || []).some((fid) => scopedFwIds.includes(fid)))
      : controls;
    const scopedControlIds = new Set(scopedControls.map((c) => c.control_id).filter(Boolean));
    const scopedEvidence = scopedFwIds
      ? evidence.filter((e) => e.control_id && scopedControlIds.has(e.control_id))
      : evidence;

    waitUntil(
      base44.asServiceRole.entities.AuditorLink
        .update(link.id, { access_count: (link.access_count || 0) + 1, accessed_at: new Date().toISOString() })
        .catch(() => {})
    );

    return Response.json({
      auditor_name: scope.auditor_name,
      scope_notes: scope.scope_notes,
      expires_at: link.expires_at,
      frameworks: scopedFrameworks.map((f) => ({
        id: f.id, name: f.name, status: f.status,
        readiness_score: f.readiness_score, total_controls: f.total_controls, passing_controls: f.passing_controls
      })),
      controls: scopedControls.map((c) => ({
        id: c.id, control_id: c.control_id, title: c.title, status: c.status,
        framework_names: c.framework_names, owner_name: c.owner_name,
        last_tested: c.last_tested, automation_status: c.automation_status
      })),
      evidence: scopedEvidence.map((e) => ({
        id: e.id, title: e.title, file_url: e.file_url, file_name: e.file_name,
        type: e.type, status: e.status, collected_date: e.collected_date,
        expiry_date: e.expiry_date, control_id: e.control_id, control_title: e.control_title
      }))
    });
  } catch (error) {
    console.error('resolveAuditorLink error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to resolve link' }, { status: 500 });
  }
}