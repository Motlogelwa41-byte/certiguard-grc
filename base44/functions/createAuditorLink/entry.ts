import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const enc = new TextEncoder();

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
}

function randPass() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = '';
  for (let i = 0; i < 16; i++) out += chars[bytes[i] % chars.length];
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admins only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { scope_id, expires_at } = body || {};
    if (!scope_id) return Response.json({ error: 'scope_id required' }, { status: 400 });

    const scope = await base44.asServiceRole.entities.AuditorScope.get(scope_id).catch(() => null);
    if (!scope) return Response.json({ error: 'Scope not found' }, { status: 404 });

    const tenantId = user.data?.tenant_id || scope.tenant_id;
    const token = randToken();
    const passphrase = randPass();
    const passphraseHash = await sha256(passphrase);

    await base44.asServiceRole.entities.AuditorLink.create({
      tenant_id: tenantId,
      scope_id,
      auditor_name: scope.auditor_name || '',
      token,
      passphrase_hash: passphraseHash,
      expires_at: expires_at || '',
      revoked: false,
      access_count: 0,
      created_by_name: user.full_name || user.email || 'admin'
    });

    return Response.json({ token, passphrase, auditor_name: scope.auditor_name || '' });
  } catch (error) {
    console.error('createAuditorLink error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to create link' }, { status: 500 });
  }
}