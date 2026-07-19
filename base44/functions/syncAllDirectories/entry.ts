import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const idps = await base44.entities.IdentityProvider.filter({ status: 'active' });
    const results = [];
    for (const idp of (idps || [])) {
      try {
        const token = idp.token_secret ? Deno.env.get(idp.token_secret) : null;
        if (!token || !idp.scim_base_url) { results.push({ idp: idp.name, error: 'missing SCIM config' }); continue; }
        const base = idp.scim_base_url.replace(/\/$/, '');
        const all = [];
        let startIndex = 1, total = 0;
        do {
          const res = await fetch(`${base}/Users?startIndex=${startIndex}&count=200`, {
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/scim+json', 'Content-Type': 'application/scim+json' }
          });
          if (!res.ok) { const txt = await res.text(); throw new Error(`SCIM ${res.status}: ${txt.slice(0, 200)}`); }
          const data = await res.json();
          const items = data.Resources || data.resources || [];
          all.push(...items);
          total = data.totalResults || all.length;
          startIndex += items.length;
        } while (all.length < total && startIndex < 5000);

        const nowIso = new Date().toISOString();
        const groupSet = new Set();
        let synced = 0, provisioned = 0;
        for (const u of all) {
          const email = (u.emails && u.emails[0] && u.emails[0].value) || u.userName || '';
          const fullName = u.displayName || [u.name && u.name.givenName, u.name && u.name.familyName].filter(Boolean).join(' ') || email;
          const externalId = u.id || u.externalId || email;
          const groups = (u.groups || []).map((g) => g.display || g.value).filter(Boolean);
          groups.forEach((g) => groupSet.add(g));
          const ext = u['urn:ietf:params:scim:schemas:extension:enterprise:2.0:User'] || {};
          const payload = {
            idp_id: idp.id, idp_name: idp.name, external_id: externalId, email, full_name: fullName,
            status: u.active !== false ? 'active' : 'suspended', groups, roles: groups,
            department: ext.department || '', title: ext.title || '', provisioning_status: 'synced',
            last_synced_at: nowIso, mfa_enabled: false
          };
          const existing = await base44.entities.DirectoryUser.filter({ idp_id: idp.id, external_id: externalId });
          if (existing && existing.length) {
            await base44.entities.DirectoryUser.update(existing[0].id, payload);
          } else {
            let pstatus = 'synced', userId = '';
            if (idp.provision_new_users && email) {
              try { const inv = await base44.users.inviteUser(email, 'user'); userId = (inv && inv.id) || ''; pstatus = 'invited'; provisioned++; }
              catch (e) { pstatus = 'error'; }
            }
            await base44.entities.DirectoryUser.create({ ...payload, provisioning_status: pstatus, user_id: userId });
          }
          synced++;
        }
        await base44.entities.IdentityProvider.update(idp.id, { last_sync_at: nowIso, user_count: synced, group_count: groupSet.size, last_error: '' });
        results.push({ idp: idp.name, synced, provisioned });
      } catch (e) {
        await base44.entities.IdentityProvider.update(idp.id, { last_error: e.message }).catch(() => {});
        results.push({ idp: idp.name, error: e.message });
      }
    }
    return Response.json({ ok: true, providers: results });
  } catch (error) {
    console.error('syncAllDirectories error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});