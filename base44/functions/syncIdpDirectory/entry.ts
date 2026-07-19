import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  let idpId = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json();
    idpId = body?.idp_id;
    if (!idpId) return Response.json({ error: 'idp_id required' }, { status: 400 });
    const idp = await base44.entities.IdentityProvider.get(idpId);
    if (!idp) return Response.json({ error: 'IdP not found' }, { status: 404 });
    const token = idp.token_secret ? Deno.env.get(idp.token_secret) : null;
    if (!token || !idp.scim_base_url) {
      await base44.entities.IdentityProvider.update(idp.id, { last_error: 'SCIM base URL and token secret required' });
      return Response.json({ error: 'SCIM base URL and token secret required' }, { status: 400 });
    }
    const base = idp.scim_base_url.replace(/\/$/, '');
    const all = [];
    let startIndex = 1, total = 0;
    do {
      const res = await fetch(`${base}/Users?startIndex=${startIndex}&count=200`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/scim+json', 'Content-Type': 'application/scim+json' }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`SCIM fetch failed (${res.status}): ${txt.slice(0, 300)}`);
      }
      const data = await res.json();
      const items = data.Resources || data.resources || [];
      all.push(...items);
      total = data.totalResults || all.length;
      startIndex += items.length;
    } while (all.length < total && startIndex < 5000);

    const nowIso = new Date().toISOString();
    const groupSet = new Set();
    let synced = 0;
    for (const u of all) {
      const email = (u.emails && u.emails[0] && u.emails[0].value) || u.userName || '';
      const fullName = u.displayName || [u.name && u.name.givenName, u.name && u.name.familyName].filter(Boolean).join(' ') || email;
      const externalId = u.id || u.externalId || email;
      const groups = (u.groups || []).map((g) => g.display || g.value).filter(Boolean);
      groups.forEach((g) => groupSet.add(g));
      const active = u.active !== false;
      const ext = u['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'] || {};
      const payload = {
        idp_id: idp.id,
        idp_name: idp.name,
        external_id: externalId,
        email,
        full_name: fullName,
        status: active ? 'active' : 'suspended',
        groups,
        roles: groups,
        department: ext.department || '',
        title: ext.title || '',
        provisioning_status: 'synced',
        last_synced_at: nowIso,
        mfa_enabled: false
      };
      const existing = await base44.entities.DirectoryUser.filter({ idp_id: idp.id, external_id: externalId });
      if (existing && existing.length) {
        await base44.entities.DirectoryUser.update(existing[0].id, payload);
      } else {
        let pstatus = 'synced';
        let userId = '';
        if (idp.provision_new_users && email) {
          try {
            const inv = await base44.users.inviteUser(email, 'user');
            userId = (inv && inv.id) || '';
            pstatus = 'invited';
          } catch (e) {
            console.warn('provision invite failed', email, e?.message);
            pstatus = 'error';
          }
        }
        await base44.entities.DirectoryUser.create({ ...payload, provisioning_status: pstatus, user_id: userId });
      }
      synced++;
    }
    await base44.entities.IdentityProvider.update(idp.id, {
      last_sync_at: nowIso,
      user_count: synced,
      group_count: groupSet.size,
      last_error: ''
    });
    return Response.json({ ok: true, synced, total });
  } catch (error) {
    console.error('syncIdpDirectory error', error?.message || error);
    try {
      if (idpId) {
        const base44 = createClientFromRequest(req);
        await base44.entities.IdentityProvider.update(idpId, { last_error: error.message || 'Sync failed' });
      }
    } catch (e) { console.error('failed to record error', e?.message); }
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});