import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'compliance_officer') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const tenantId = user?.data?.tenant_id || user?.tenant_id || '';
    const body = await req.json();
    const { library_key, library_name, library_version, controls } = body || {};
    if (!library_name || !Array.isArray(controls) || !controls.length) {
      return Response.json({ error: 'library_name and controls[] required' }, { status: 400 });
    }

    // Find or create the framework
    const existingFws = await base44.entities.Framework.filter({ name: library_name });
    let framework = existingFws && existingFws[0];
    if (!framework) {
      framework = await base44.entities.Framework.create({
        tenant_id: tenantId,
        name: library_name,
        version: library_version || '1.0',
        description: `Imported from ${library_key} authoritative control library`,
        status: 'not_started',
        total_controls: controls.length
      });
    }

    // Skip controls that already exist for this framework
    const allControls = await base44.entities.Control.list('-updated_date', 1000);
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
    if (toCreate.length) created = await base44.entities.Control.bulkCreate(toCreate);

    const total = (existing ? existing.length : 0) + created.length;
    await base44.entities.Framework.update(framework.id, { total_controls: total });
    return Response.json({ ok: true, framework_id: framework.id, created: created.length, skipped: controls.length - toCreate.length, total });
  } catch (error) {
    console.error('importControlLibrary error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});