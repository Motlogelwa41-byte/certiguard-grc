import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const TRIAL_DAYS = 14;

/**
 * Provisions a trial Tenant workspace for the calling user if they don't
 * already have one. Idempotent — returns the existing tenant if the user
 * already has a tenant_id or is the admin_email of a tenant.
 *
 * The client is responsible for stamping `tenant_id` on the user profile
 * via base44.auth.updateMe() after this returns (the User entity is
 * platform-managed and can't be written server-side here).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me?.id) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const existingTenantId = me.tenant_id || me.data?.tenant_id;

    // 1. User profile already references a tenant — return it
    if (existingTenantId) {
      const existing = await base44.asServiceRole.entities.Tenant
        .get(existingTenantId)
        .catch(() => null);
      if (existing) {
        return Response.json({ tenant_id: existing.id, tenant: existing, created: false });
      }
    }

    // 2. Idempotency: a tenant already exists where this user is the admin
    const byAdmin = await base44.asServiceRole.entities.Tenant
      .filter({ admin_email: me.email })
      .catch(() => []);
    if (byAdmin.length > 0) {
      return Response.json({ tenant_id: byAdmin[0].id, tenant: byAdmin[0], created: false });
    }

    // 3. Create a fresh 14-day trial workspace
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    const handle = (me.email?.split('@')[0] || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40) || 'workspace';

    const tenant = await base44.asServiceRole.entities.Tenant.create({
      name: `${me.full_name || handle}'s Workspace`,
      slug: handle,
      size: 'startup',
      subscription_tier: 'trial',
      subscription_status: 'trial',
      trial_ends_at: trialEnd.toISOString().slice(0, 10),
      billing_email: me.email,
      admin_name: me.full_name || '',
      admin_email: me.email,
      max_users: 3,
      max_frameworks: 2,
      is_active: true,
    });

    // Best-effort audit log
    await base44.asServiceRole.functions
      .invoke('logAudit', {
        action: 'create',
        entity_type: 'Tenant',
        entity_id: tenant.id,
        entity_name: tenant.name,
        changes: JSON.stringify({ tier: 'trial', trial_days: TRIAL_DAYS }),
        severity: 'info',
      })
      .catch(() => {});

    return Response.json({ tenant_id: tenant.id, tenant, created: true });
  } catch (error) {
    console.error('provisionTenant error:', error?.message || error);
    return Response.json({ error: error?.message || 'Provisioning failed' }, { status: 500 });
  }
});