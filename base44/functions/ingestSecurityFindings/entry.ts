import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SLA = { critical: 168, high: 336, medium: 720, low: 2160, info: 4320 };

Deno.serve(async (req) => {
  let body = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'compliance_officer') return Response.json({ error: 'Forbidden' }, { status: 403 });
    body = await req.json();
    const findings = Array.isArray(body?.findings) ? body.findings : (body?.finding ? [body.finding] : []);
    if (!findings.length) return Response.json({ error: 'No findings provided' }, { status: 400 });
    const now = new Date();
    const records = findings.map((f, i) => {
      const sev = f.severity || 'medium';
      const sla = SLA[sev] ?? 720;
      const due = new Date(now.getTime() + sla * 3600 * 1000);
      return {
        finding_id: f.finding_id || `SF-${now.getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        source: f.source || 'other',
        title: f.title || 'Untitled finding',
        description: f.description || '',
        severity: sev,
        status: f.status || 'open',
        cve: f.cve || '',
        asset: f.asset || '',
        resource_id: f.resource_id || '',
        service: f.service || '',
        detected_date: f.detected_date || now.toISOString().slice(0, 10),
        first_seen: f.first_seen || now.toISOString(),
        last_seen: f.last_seen || now.toISOString(),
        due_date: due.toISOString().slice(0, 10),
        sla_hours: sla,
        sla_breached: false,
        owner_name: f.owner_name || '',
        linked_control_ids: f.linked_control_ids || [],
        linked_control_names: f.linked_control_names || [],
        evidence_url: f.evidence_url || '',
        notes: f.notes || '',
        connection_id: f.connection_id || ''
      };
    });
    const created = await base44.entities.SecurityFinding.bulkCreate(records);
    return Response.json({ ok: true, count: created.length });
  } catch (error) {
    console.error('ingestSecurityFindings error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});