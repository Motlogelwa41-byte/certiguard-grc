import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, entity_type, entity_id, entity_name, changes, severity } = body;
    if (!action || !entity_type) {
      return Response.json({ error: 'action and entity_type are required' }, { status: 400 });
    }

    const tenant_id = user.tenant_id || body.tenant_id || '';
    let tenant_name = body.tenant_name || '';
    if (tenant_id && !tenant_name) {
      try {
        const t = await base44.asServiceRole.entities.Tenant.get(tenant_id);
        if (t) tenant_name = t.name || '';
      } catch (e) { /* ignore */ }
    }

    // Hash chain: link to the previous audit entry for this tenant (tamper-evidence)
    let prev_hash = 'GENESIS';
    try {
      const recent = await base44.asServiceRole.entities.AuditTrail.filter({ tenant_id }, '-created_date', 1);
      if (recent && recent.length > 0 && recent[0].audit_hash) prev_hash = recent[0].audit_hash;
    } catch (e) { /* first entry */ }

    const ip_address = req.headers.get('x-forwarded-for') || '';
    const user_agent = req.headers.get('user-agent') || '';
    const now = new Date().toISOString();

    const basePayload = {
      action,
      entity_type,
      entity_id: entity_id || '',
      entity_name: entity_name || '',
      changes: changes || null,
      performed_by_name: user.full_name || user.email || '',
      performed_by_id: user.id || '',
      tenant_id,
      tenant_name,
      ip_address,
      user_agent,
      severity: severity || 'info',
      metadata: JSON.stringify({ timestamp: now }),
      prev_hash
    };
    const audit_hash = await sha256(JSON.stringify(basePayload));

    await base44.asServiceRole.entities.AuditTrail.create({ ...basePayload, audit_hash });

    return Response.json({ ok: true, hash: audit_hash, prev_hash });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});