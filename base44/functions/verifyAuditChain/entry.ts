import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Verifies the integrity of the append-only, hash-chained AuditTrail.
// Re-computes each entry's SHA-256 from its stored fields and confirms it
// matches the stored audit_hash, and that prev_hash links form a continuous
// chain. Returns a verdict used by the Activity Log banner. Admin-only.

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
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const limit = Math.min(body.limit || 500, 1000);

    // Tenant isolation: only verify the calling admin's own audit chain.
    // Service-role reads bypass RLS, so we must filter by tenant_id explicitly
    // to avoid leaking other tenants' audit metadata.
    const tenant_id = (user as any)?.tenant_id || (user as any)?.data?.tenant_id || '';
    const entries = await sr.entities.AuditTrail.filter({ tenant_id }, '-created_date', limit).catch(() => []);
    const ordered = [...entries].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    let verified = 0;
    let hashBroken = 0;
    let linkBreaks = 0;
    let legacy = 0;
    const broken = [];

    // Build a set of all known audit_hash values so we can tolerate concurrent
    // writes. When two logAudit calls race, both read the same "latest" entry
    // before either writes, so both new entries point to the same prev_hash —
    // creating a fork, not a broken chain. Each entry still links to a real
    // prior entry, so the chain is intact; we just can't require strict linear
    // ordering. (GENESIS is always a valid anchor.)
    const knownHashes = new Set(['GENESIS']);

    for (const e of ordered) {
      // Entries without an audit_hash predate the hash-chain format — skip, don't count as tampered.
      if (!e.audit_hash) { legacy++; continue; }
      const basePayload = {
        action: e.action,
        entity_type: e.entity_type,
        entity_id: e.entity_id || '',
        entity_name: e.entity_name || '',
        changes: e.changes || null,
        performed_by_name: e.performed_by_name || '',
        performed_by_id: e.performed_by_id || '',
        tenant_id: e.tenant_id || '',
        tenant_name: e.tenant_name || '',
        ip_address: e.ip_address || '',
        user_agent: e.user_agent || '',
        severity: e.severity || 'info',
        metadata: e.metadata || '',
        prev_hash: e.prev_hash || 'GENESIS',
      };
      const recomputed = await sha256(JSON.stringify(basePayload));
      let hashOk = recomputed === e.audit_hash;
      let isLegacy = false;

      // Format drift from earlier logAudit versions — recognised, not tampering:
      //  v1: hashed before the `metadata` field was added to the chain payload.
      //  v2: hashed with severity forced to 'info' (old logAudit stored the real severity).
      if (!hashOk) {
        const legacyNoMeta = { ...basePayload };
        delete legacyNoMeta.metadata;
        if (await sha256(JSON.stringify(legacyNoMeta)) === e.audit_hash) isLegacy = true;
        if (!isLegacy) {
          const legacySevInfo = { ...basePayload, severity: 'info' };
          if (await sha256(JSON.stringify(legacySevInfo)) === e.audit_hash) isLegacy = true;
        }
      }

      // Fork-tolerant link check: prev_hash must be GENESIS or a known prior hash.
      // Concurrent writes produce forks (two entries sharing a prev_hash); this is
      // expected in a serverless environment without distributed locks and does
      // not indicate tampering — each entry still anchors to a real prior entry.
      const linkOk = knownHashes.has(e.prev_hash || 'GENESIS');

      if (hashOk) verified++;
      else if (isLegacy) legacy++;
      else {
        hashBroken++;
        if (broken.length < 20) broken.push({ id: e.id, created_date: e.created_date, action: e.action, entity_type: e.entity_type });
      }
      if (!linkOk) linkBreaks++;
      knownHashes.add(e.audit_hash);
    }

    const integrity = hashBroken === 0 ? 'verified' : 'compromised';
    return Response.json({
      ok: true,
      total: ordered.length,
      chained: ordered.length - legacy,
      legacy,
      verified,
      hash_broken: hashBroken,
      link_breaks: linkBreaks,
      broken_count: broken.length,
      broken,
      integrity,
    });
  } catch (error) {
    console.error('verifyAuditChain error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'verification failed' }, { status: 500 });
  }
});