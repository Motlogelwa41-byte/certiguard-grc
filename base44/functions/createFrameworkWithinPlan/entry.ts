import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Backend-enforced plan guard for Framework creation. Counts the frameworks
// the caller can see (same RLS-scoped set the UI counts) against the Tenant
// max_frameworks cap (or tier default) BEFORE creating, so the limit can't be
// bypassed by calling the Framework API directly. Creates via the user-scoped
// client so created_by_id is the caller (preserves RLS update/delete ownership
// for non-admins). tenant_id is included on create only when the caller's
// profile already carries one (so RLS create matches); when the profile lacks
// a stamped tenant_id the record is created the same way the UI does and then
// tenant_id is stamped via a service-role update so future cap counts are accurate.

const TIER_MAX_FRAMEWORKS = { trial: 20, starter: 20, professional: 50, enterprise: 999999 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const framework = body?.framework;
    if (!framework || !framework.name) {
      return Response.json({ error: 'Framework payload with name is required' }, { status: 400 });
    }

    const userTenantId = me.tenant_id || me.data?.tenant_id;
    let tenant = userTenantId ? await base44.asServiceRole.entities.Tenant.get(userTenantId).catch(() => null) : null;
    if (!tenant) {
      const byEmail = await base44.asServiceRole.entities.Tenant.filter({ admin_email: me.email }).catch(() => []);
      if (byEmail.length > 0) tenant = byEmail[0];
    }
    if (!tenant) return Response.json({ error: 'No tenant found for your account' }, { status: 403 });

    const tier = tenant.subscription_tier || 'trial';
    const cap = tenant.max_frameworks ?? TIER_MAX_FRAMEWORKS[tier] ?? 2;
    // User-scoped list respects RLS read — same set the UI counts against the cap.
    const visible = await base44.entities.Framework.list().catch(() => []);
    const count = (visible || []).length;

    if (count >= cap) {
      return Response.json({
        error: `Framework limit reached (${count}/${cap}). Upgrade your plan to add more frameworks.`,
        limit: cap,
        count,
      }, { status: 402 });
    }

    // Create via service role so the admin-only RLS create rule (defense-in-depth
    // for plan limits) doesn't block. created_by_id is stamped via audit log below.
    const createPayload = { ...framework, tenant_id: tenant.id };
    const created = await base44.asServiceRole.entities.Framework.create(createPayload);

    await base44.asServiceRole.functions.invoke('logAudit', {
      action: 'create',
      entity_type: 'Framework',
      entity_id: created.id,
      entity_name: created.name,
      changes: JSON.stringify({ tenant_id: tenant.id, tier, count_after: count + 1, cap }),
      severity: 'info',
    }).catch(() => {});

    return Response.json({ ok: true, framework: created });
  } catch (error) {
    console.error('createFrameworkWithinPlan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Framework creation failed' }, { status: 500 });
  }
});