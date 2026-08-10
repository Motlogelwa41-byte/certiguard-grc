import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Returns the current tenant's plan usage vs caps in a single call.
// Used by the PlanUsage widget and plan-enforcement gates.
const TIER_MAX_USERS = { trial: 3, starter: 10, professional: 100, enterprise: 999999 };
const TIER_MAX_FRAMEWORKS = { trial: 20, starter: 20, professional: 50, enterprise: 999999 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const tenantId = me.tenant_id || me.data?.tenant_id;
    let tenant = tenantId ? await base44.asServiceRole.entities.Tenant.get(tenantId).catch(() => null) : null;
    if (!tenant) {
      const byEmail = await base44.asServiceRole.entities.Tenant.filter({ admin_email: me.email }).catch(() => []);
      if (byEmail.length > 0) tenant = byEmail[0];
    }
    if (!tenant) return Response.json({ error: 'No tenant found' }, { status: 403 });

    const tier = tenant.subscription_tier || 'trial';
    const userCap = tenant.max_users ?? TIER_MAX_USERS[tier] ?? 3;
    const fwCap = tenant.max_frameworks ?? TIER_MAX_FRAMEWORKS[tier] ?? 2;

    const [users, frameworks] = await Promise.all([
      base44.asServiceRole.entities.User.list().catch(() => []),
      base44.entities.Framework.list().catch(() => []),
    ]);

    return Response.json({
      tier,
      subscription_status: tenant.subscription_status || 'trial',
      trial_ends_at: tenant.trial_ends_at || null,
      users: { count: (users || []).length, cap: userCap },
      frameworks: { count: (frameworks || []).length, cap: fwCap },
    });
  } catch (error) {
    console.error('checkPlanLimits error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
});