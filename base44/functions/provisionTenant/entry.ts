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

    // --- #1: Create default TenantSettings (enables white-labeling, risk appetite, multi-currency) ---
    const settings = await base44.asServiceRole.entities.TenantSettings.create({
      tenant_id: tenant.id,
      base_currency: 'ZAR',
      active_framework_ids: [],
      active_framework_names: [],
      active_jurisdictions: ['South Africa'],
      risk_appetite_limit: 5000000,
      impact_1_min: 0,        impact_1_max: 50000,
      impact_2_min: 50001,    impact_2_max: 250000,
      impact_3_min: 250001,   impact_3_max: 1000000,
      impact_4_min: 1000001,  impact_4_max: 5000000,
      impact_5_min: 5000001,  impact_5_max: 50000000,
    }).catch(() => null);

    // --- #5: Seed default compliance framework baseline (ISO 27001, NIST CSF, King IV, POPIA) ---
    const DEFAULT_FRAMEWORKS = [
      { name: 'ISO 27001:2022', version: '2022', description: 'Information security management systems — international standard', icon: 'shield' },
      { name: 'NIST CSF 2.0', version: '2.0', description: 'NIST Cybersecurity Framework — Identify, Protect, Detect, Respond, Recover', icon: 'shield' },
      { name: 'King IV Report', version: '2016', description: 'King IV Report on Corporate Governance for South Africa', icon: 'crown' },
      { name: 'POPIA', version: '2013 (Effective 2021)', description: 'Protection of Personal Information Act — South Africa data protection', icon: 'lock' },
    ];
    const seededFrameworks = [];
    for (const fw of DEFAULT_FRAMEWORKS) {
      const created = await base44.asServiceRole.entities.Framework.create({
        tenant_id: tenant.id,
        name: fw.name,
        version: fw.version,
        description: fw.description,
        status: 'not_started',
        readiness_score: 0,
        total_controls: 0,
        passing_controls: 0,
        icon: fw.icon,
      }).catch(() => null);
      if (created) seededFrameworks.push(created.id);
    }

    // Link seeded frameworks to TenantSettings
    if (settings && seededFrameworks.length > 0) {
      await base44.asServiceRole.entities.TenantSettings.update(settings.id, {
        active_framework_ids: seededFrameworks,
        active_framework_names: DEFAULT_FRAMEWORKS.map(f => f.name),
      }).catch(() => {});
    }

    // --- #7: Comprehensive audit trail for the full onboarding event ---
    await base44.asServiceRole.functions
      .invoke('logAudit', {
        action: 'create',
        entity_type: 'Tenant',
        entity_id: tenant.id,
        entity_name: tenant.name,
        changes: JSON.stringify({ tier: 'trial', trial_days: TRIAL_DAYS, admin_email: me.email }),
        severity: 'info',
      })
      .catch(() => {});

    await base44.asServiceRole.functions
      .invoke('logAudit', {
        action: 'create',
        entity_type: 'TenantSettings',
        entity_id: settings?.id || '',
        entity_name: 'Default Tenant Settings',
        changes: JSON.stringify({ base_currency: 'ZAR', risk_appetite_limit: 5000000, jurisdictions: ['South Africa'] }),
        severity: 'info',
      })
      .catch(() => {});

    await base44.asServiceRole.functions
      .invoke('logAudit', {
        action: 'create',
        entity_type: 'Framework',
        entity_id: tenant.id,
        entity_name: 'Default Framework Baseline',
        changes: JSON.stringify({ frameworks: DEFAULT_FRAMEWORKS.map(f => f.name), count: seededFrameworks.length }),
        severity: 'info',
      })
      .catch(() => {});

    return Response.json({ tenant_id: tenant.id, tenant, created: true, seeded_frameworks: seededFrameworks.length });
  } catch (error) {
    console.error('provisionTenant error:', error?.message || error);
    return Response.json({ error: error?.message || 'Provisioning failed' }, { status: 500 });
  }
});