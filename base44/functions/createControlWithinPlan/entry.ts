import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Backend-enforced plan guard for Control creation. Counts the controls the
// caller can see (same RLS-scoped set the UI counts) against the Tenant
// max_controls cap (or tier default) BEFORE creating, so the limit can't be
// bypassed by calling the Control API directly. Mirrors createFrameworkWithinPlan.

const TIER_MAX_CONTROLS = { trial: 50, starter: 100, professional: 1000, enterprise: 999999 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const control = body?.control;
    if (!control || !control.title) {
      return Response.json({ error: 'Control payload with title is required' }, { status: 400 });
    }

    const userTenantId = me.tenant_id || me.data?.tenant_id;
    let tenant = userTenantId ? await base44.asServiceRole.entities.Tenant.get(userTenantId).catch(() => null) : null;
    if (!tenant) {
      const byEmail = await base44.asServiceRole.entities.Tenant.filter({ admin_email: me.email }).catch(() => []);
      if (byEmail.length > 0) tenant = byEmail[0];
    }
    if (!tenant) return Response.json({ error: 'No tenant found for your account' }, { status: 403 });

    const tier = tenant.subscription_tier || 'trial';
    const cap = tenant.max_controls ?? TIER_MAX_CONTROLS[tier] ?? 50;
    const visible = await base44.entities.Control.list().catch(() => []);
    const count = (visible || []).length;

    if (count >= cap) {
      return Response.json({
        error: `Control limit reached (${count}/${cap}). Upgrade your plan to add more controls.`,
        limit: cap,
        count,
      }, { status: 402 });
    }

    const createPayload = { ...control, tenant_id: tenant.id };
    const created = await base44.asServiceRole.entities.Control.create(createPayload);

    await base44.asServiceRole.functions.invoke('logAudit', {
      action: 'create',
      entity_type: 'Control',
      entity_id: created.id,
      entity_name: created.title,
      changes: JSON.stringify({ tenant_id: tenant.id, tier, count_after: count + 1, cap }),
      severity: 'info',
    }).catch(() => {});

    return Response.json({ ok: true, control: created });
  } catch (error) {
    console.error('createControlWithinPlan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Control creation failed' }, { status: 500 });
  }
});