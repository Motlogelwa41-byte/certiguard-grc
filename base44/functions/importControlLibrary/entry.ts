import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'compliance_officer') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const tenantId = user?.data?.tenant_id || user?.tenant_id || '';
    // Admin-only import: use service role so RLS (tenant_id match) can't block bulk framework/control creation
    const db = base44.asServiceRole;
    const body = await req.json();
    const { library_key, library_name, library_version, controls } = body || {};
    if (!library_name || !Array.isArray(controls) || !controls.length) {
      return Response.json({ error: 'library_name and controls[] required' }, { status: 400 });
    }

    // Find or create the framework (tenant-scoped to prevent cross-tenant matches)
    const existingFws = tenantId
      ? await db.entities.Framework.filter({ name: library_name, tenant_id: tenantId })
      : await db.entities.Framework.filter({ name: library_name });
    let framework = existingFws && existingFws[0];
    if (!framework) {
      // Enforce framework cap before creating a new one
      const TIER_MAX_FRAMEWORKS = { trial: 2, starter: 5, professional: 20, enterprise: 999999 };
      let tenant = null;
      if (tenantId) tenant = await db.entities.Tenant.get(tenantId).catch(() => null);
      if (!tenant) {
        const byEmail = await db.entities.Tenant.filter({ admin_email: user.email }).catch(() => []);
        if (byEmail.length > 0) tenant = byEmail[0];
      }
      if (tenant) {
        const tier = tenant.subscription_tier || 'trial';
        const cap = tenant.max_frameworks ?? TIER_MAX_FRAMEWORKS[tier] ?? 2;
        const visible = await base44.entities.Framework.list().catch(() => []);
        if ((visible || []).length >= cap) {
          return Response.json({
            error: `Framework limit reached (${(visible || []).length}/${cap}). Upgrade your plan to import more frameworks.`,
            limit: cap,
            count: (visible || []).length,
          }, { status: 402 });
        }
      }
      framework = await db.entities.Framework.create({
        tenant_id: tenantId,
        name: library_name,
        version: library_version || '1.0',
        description: `Imported from ${library_key} authoritative control library`,
        status: 'not_started',
        total_controls: controls.length
      });
    }

    // Skip controls that already exist for this framework (tenant-scoped)
    const allControls = tenantId
      ? await db.entities.Control.filter({ tenant_id: tenantId }, '-updated_date', 1000)
      : await db.entities.Control.list('-updated_date', 1000);
    const existing = (allControls || []).filter((c) => Array.isArray(c.framework_ids) && c.framework_ids.includes(framework.id));
    const existingIds = new Set((existing || []).map((c) => c.control_id).filter(Boolean));
    const toCreate = controls
      .filter((c) => c.control_id && !existingIds.has(c.control_id))
      .map((c) => ({
        tenant_id: tenantId,
        control_id: c.control_id,
        title: c.title,
        description: c.description || '',
        category: c.category || 'compliance',
        framework_ids: [framework.id],
        framework_names: [library_name],
        status: 'not_tested',
        automation_status: 'manual',
        severity: 'medium'
      }));

    let created = [];
    if (toCreate.length) created = await db.entities.Control.bulkCreate(toCreate);

    const total = (existing ? existing.length : 0) + created.length;
    await db.entities.Framework.update(framework.id, { total_controls: total });
    return Response.json({ ok: true, framework_id: framework.id, created: created.length, skipped: controls.length - toCreate.length, total });
  } catch (error) {
    console.error('importControlLibrary error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});