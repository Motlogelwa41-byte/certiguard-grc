import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Centralized Key Management Service — handles cryptographic key lifecycle:
//   - rotateKey: rotates a key (increments version, archives previous version, resets rotation schedule)
//   - listKeysDueForRotation: returns keys past their next_rotation date
//   - revokeKey: revokes a key (sets status to revoked, archives version)
//
// Body:
//   action: "rotate" | "revoke" | "list_due"
//   key_id: string (the CryptoKey.key_id to rotate/revoke)
//
// Authorization: admin or compliance_officer only.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "list_due";

    // Auth
    let me = null;
    try { me = await base44.auth.me(); } catch (_) { me = null; }
    if (!me || !me.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userRole = me.role || 'user';
    if (!['admin', 'compliance_officer'].includes(userRole)) {
      return Response.json({ error: 'Insufficient privileges — admin or compliance_officer required' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // --- LIST KEYS DUE FOR ROTATION ---
    if (action === 'list_due') {
      const allKeys = await base44.entities.CryptoKey.filter({ status: 'active', auto_rotation: true }).catch(() => []);
      const dueKeys = (allKeys || []).filter((k) => {
        if (!k.next_rotation) return false;
        return new Date(k.next_rotation).getTime() <= Date.now();
      });
      return Response.json({
        action: 'list_due',
        total_keys: (allKeys || []).length,
        keys_due_for_rotation: dueKeys.length,
        keys: dueKeys.map((k) => ({
          key_id: k.key_id,
          name: k.name,
          key_type: k.key_type,
          purpose: k.purpose,
          version: k.version,
          last_rotated: k.last_rotated,
          next_rotation: k.next_rotation,
          days_overdue: k.next_rotation ? Math.floor((Date.now() - new Date(k.next_rotation).getTime()) / 86400000) : 0,
        })),
      });
    }

    // --- ROTATE KEY ---
    if (action === 'rotate') {
      if (!body.key_id) return Response.json({ error: 'key_id required' }, { status: 400 });

      const keys = await base44.entities.CryptoKey.filter({ key_id: body.key_id }).catch(() => []);
      if (!keys || keys.length === 0) {
        return Response.json({ error: `Key ${body.key_id} not found` }, { status: 404 });
      }
      const key = keys[0];

      // Archive the current version
      let prevVersions = [];
      try { prevVersions = JSON.parse(key.previous_versions || '[]'); } catch (_) { prevVersions = []; }
      prevVersions.push({
        version: key.version,
        activated_at: key.last_rotated || key.created_date,
        rotated_at: now,
        status: 'rotated',
        rotated_by: me.full_name || me.email,
      });

      const newVersion = (key.version || 1) + 1;
      const rotationDays = key.rotation_frequency_days || 90;
      const nextRotation = new Date(Date.now() + rotationDays * 86400000).toISOString();

      await base44.entities.CryptoKey.update(key.id, {
        version: newVersion,
        last_rotated: now,
        next_rotation: nextRotation,
        previous_versions: JSON.stringify(prevVersions),
        status: 'active',
      });

      return Response.json({
        action: 'rotate',
        key_id: body.key_id,
        name: key.name,
        previous_version: key.version,
        new_version: newVersion,
        rotated_at: now,
        rotated_by: me.full_name || me.email,
        next_rotation: nextRotation,
        archived_versions: prevVersions.length,
      });
    }

    // --- REVOKE KEY ---
    if (action === 'revoke') {
      if (!body.key_id) return Response.json({ error: 'key_id required' }, { status: 400 });

      const keys = await base44.entities.CryptoKey.filter({ key_id: body.key_id }).catch(() => []);
      if (!keys || keys.length === 0) {
        return Response.json({ error: `Key ${body.key_id} not found` }, { status: 404 });
      }
      const key = keys[0];

      let prevVersions = [];
      try { prevVersions = JSON.parse(key.previous_versions || '[]'); } catch (_) { prevVersions = []; }
      prevVersions.push({
        version: key.version,
        activated_at: key.last_rotated || key.created_date,
        rotated_at: now,
        status: 'revoked',
        revoked_by: me.full_name || me.email,
        reason: body.reason || 'Manual revocation',
      });

      await base44.entities.CryptoKey.update(key.id, {
        status: 'revoked',
        previous_versions: JSON.stringify(prevVersions),
        notes: (key.notes || '') + `\n[REVOKED ${now}] ${body.reason || 'Manual revocation'} by ${me.full_name || me.email}`,
      });

      return Response.json({
        action: 'revoke',
        key_id: body.key_id,
        name: key.name,
        status: 'revoked',
        revoked_at: now,
        revoked_by: me.full_name || me.email,
        reason: body.reason || 'Manual revocation',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('rotateCryptoKey error:', error?.message || error);
    return Response.json({ error: error?.message || 'Key management failed' }, { status: 500 });
  }
});