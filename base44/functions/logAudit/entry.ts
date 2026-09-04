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

    // Use only the authenticated user's tenant_id — never trust a client-supplied
    // tenant_id, which could be used to attribute audit entries to another tenant.
    // tenant_id is stamped on the user profile via updateMe(), landing at user.data.tenant_id.
    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    let tenant_name = '';
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

    const created = await base44.asServiceRole.entities.AuditTrail.create({ ...basePayload, audit_hash });

    // Reconcile after concurrent writes: if another entry was created between
    // our read (line 36) and our write, our prev_hash points to the entry that
    // was latest at read time — not the true latest at write time. Re-read now;
    // if the true latest is a different entry, patch our prev_hash so the chain
    // stays anchored. (The verifier tolerates forks, but this reduces them.)
    try {
      const recheck = await base44.asServiceRole.entities.AuditTrail.filter({ tenant_id }, '-created_date', 2);
      if (recheck && recheck.length === 2 && recheck[0].id === created.id && recheck[1].audit_hash && recheck[1].audit_hash !== prev_hash) {
        // Another entry landed between our read and write — re-anchor to it.
        const correctedPrev = recheck[1].audit_hash;
        const correctedPayload = { ...basePayload, prev_hash: correctedPrev };
        const correctedHash = await sha256(JSON.stringify(correctedPayload));
        await base44.asServiceRole.entities.AuditTrail.update(created.id, { prev_hash: correctedPrev, audit_hash: correctedHash });
        return Response.json({ ok: true, hash: correctedHash, prev_hash: correctedPrev, reconciled: true });
      }
    } catch (e) { /* reconciliation is best-effort */ }

    return Response.json({ ok: true, hash: audit_hash, prev_hash });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});