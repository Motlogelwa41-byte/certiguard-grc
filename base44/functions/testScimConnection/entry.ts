import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Lightweight SCIM connectivity check — verifies the base URL + bearer token
// work before the admin runs a full directory sync. Does NOT create or update
// any DirectoryUser records; just issues GET /Users?count=1 and reports back.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const idpId = body?.idp_id;
    if (!idpId) return Response.json({ error: 'idp_id required' }, { status: 400 });

    const idp = await base44.entities.IdentityProvider.get(idpId);
    if (!idp) return Response.json({ error: 'IdP not found' }, { status: 404 });

    const token = idp.token_secret ? Deno.env.get(idp.token_secret) : null;
    if (!token || !idp.scim_base_url) {
      return Response.json({
        ok: false,
        error: 'SCIM base URL and token secret are required. Enter the SCIM base URL in the provider config and add the bearer token as an app secret.'
      }, { status: 400 });
    }

    const base = idp.scim_base_url.replace(/\/$/, '');
    const res = await fetch(`${base}/Users?count=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/scim+json',
        'Content-Type': 'application/scim+json'
      }
    });

    if (!res.ok) {
      const txt = await res.text();
      const detail = txt.slice(0, 300);
      await base44.entities.IdentityProvider.update(idp.id, {
        last_error: `Connection test failed (${res.status}): ${detail}`
      });
      return Response.json({
        ok: false,
        status: res.status,
        error: `SCIM endpoint returned ${res.status}: ${detail}`
      }, { status: 502 });
    }

    const data = await res.json().catch(() => ({}));
    const totalUsers = data.totalResults ?? data.totalResults ?? null;

    await base44.entities.IdentityProvider.update(idp.id, { last_error: '' });

    return Response.json({
      ok: true,
      status: res.status,
      total_users: totalUsers,
      message: totalUsers != null
        ? `Connected successfully — ${totalUsers} user(s) visible in the directory.`
        : 'Connected successfully — SCIM endpoint is reachable and credentials are valid.'
    });
  } catch (error) {
    console.error('testScimConnection error', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Connection test failed' }, { status: 500 });
  }
}