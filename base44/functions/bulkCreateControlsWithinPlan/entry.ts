import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Backend-enforced plan guard for bulk Control creation. Counts the controls
// the caller can see (same RLS-scoped set the UI counts) against the Tenant
// max_controls cap (or tier default) BEFORE creating, so the limit can't be
// bypassed by calling the Control API directly. Creates via service role so
// the RLS create rule doesn't block bulk imports. Mirrors createControlWithinPlan
// for bulk paths (SADC framework import, CSV bulk import, AI control mapper).

const TIER_MAX_CONTROLS = { trial: 50, starter: 100, professional: 1000, enterprise: 999999 };

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const controls = body?.controls;
    if (!Array.isArray(controls) || controls.length === 0) {
      return Response.json({ error: 'controls[] with at least one control is required' }, { status: 400 });
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
    // User-scoped list respects RLS read — same set the UI counts against the cap.
    const visible = await base44.entities.Control.list().catch(() => []);
    const count = (visible || []).length;

    if (count + controls.length > cap) {
      return Response.json({
        error: `Control limit reached (${count}/${cap}). Cannot import ${controls.length} controls — upgrade your plan.`,
        limit: cap,
        count,
        requested: controls.length,
      }, { status: 402 });
    }

    const payload = controls.map((c, i) => ({
      ...c,
      control_id: c.control_id || `CTRL-${Date.now().toString().slice(-6)}-${i}`,
      tenant_id: tenant.id,
    }));

    const created = await base44.asServiceRole.entities.Control.bulkCreate(payload);

    await base44.asServiceRole.functions.invoke('logAudit', {
      action: 'create',
      entity_type: 'Control',
      entity_name: `${created.length} controls (bulk)`,
      changes: JSON.stringify({ tenant_id: tenant.id, tier, count_after: count + created.length, cap }),
      severity: 'info',
    }).catch(() => {});

    return Response.json({ ok: true, created: created.length, controls: created });
  } catch (error) {
    console.error('bulkCreateControlsWithinPlan error:', error?.message || error);
    return Response.json({ error: error?.message || 'Bulk control creation failed' }, { status: 500 });
  }
});