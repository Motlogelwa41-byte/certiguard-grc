import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Backend-enforced plan guard for user invitations. Counts current users
// against the Tenant max_users cap (or tier default) and stops inviting once
// the cap is reached — so the limit can't be bypassed by calling inviteUser
// directly. Accepts a single email (string) or an array for bulk invites.
// Non-admins may only invite 'user' role (the platform also enforces this).
// Sends via the user-scoped client so platform invitation rules/emails apply.

const TIER_MAX_USERS = { trial: 3, starter: 10, professional: 100, enterprise: 999999 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawEmails = body?.emails;
    const inviteRole = body?.role || 'user';
    const list = Array.isArray(rawEmails)
      ? rawEmails.map((e) => String(e).trim()).filter(Boolean)
      : (typeof rawEmails === 'string' ? [rawEmails.trim()].filter(Boolean) : []);
    if (list.length === 0) return Response.json({ error: 'At least one email is required' }, { status: 400 });

    if (me.role !== 'admin' && inviteRole !== 'user') {
      return Response.json({ error: 'Only admins can invite users with elevated roles' }, { status: 403 });
    }

    const tenantId = me.tenant_id || me.data?.tenant_id;
    let tenant = tenantId ? await base44.asServiceRole.entities.Tenant.get(tenantId).catch(() => null) : null;
    if (!tenant) {
      const byEmail = await base44.asServiceRole.entities.Tenant.filter({ admin_email: me.email }).catch(() => []);
      if (byEmail.length > 0) tenant = byEmail[0];
    }
    if (!tenant) return Response.json({ error: 'No tenant found for your account' }, { status: 403 });

    const tier = tenant.subscription_tier || 'trial';
    const cap = tenant.max_users ?? TIER_MAX_USERS[tier] ?? 3;
    const users = await base44.asServiceRole.entities.User.list().catch(() => []);
    const count = (users || []).length;

    let invited = 0;
    let failed = 0;
    const failedItems = [];
    for (const email of list) {
      if (count + invited >= cap) { failed = list.length - invited; break; }
      try {
        await base44.users.inviteUser(email, inviteRole);
        invited++;
      } catch (e) {
        failed++;
        failedItems.push({ email, error: e?.message || 'invite failed' });
      }
    }

    if (invited > 0) {
      await base44.asServiceRole.functions.invoke('logAudit', {
        action: 'invite',
        entity_type: 'User',
        entity_name: `${invited} user(s)`,
        changes: JSON.stringify({ role: inviteRole, tenant_id: tenant.id, tier, count_before: count, invited, cap }),
        severity: 'info',
      }).catch(() => {});
    }

    return Response.json({ ok: true, invited, failed, cap, count_before: count, failedItems });
  } catch (error) {
    console.error('inviteUsersWithinPlan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Invite failed' }, { status: 500 });
  }
});