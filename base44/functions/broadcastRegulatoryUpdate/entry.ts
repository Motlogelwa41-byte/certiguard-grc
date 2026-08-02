import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Broadcasts a regulatory update to every tenant tracking the affected framework.
// Called by platform admins or via workflow when a RegulatoryChange is posted.
// Creates a RegulatoryAlert record (banner) for each affected tenant.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authorization: authenticated admin or internal workflow token
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (!user) {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (user.role !== 'admin') {
      return Response.json({ error: 'Only platform admins can broadcast regulatory updates' }, { status: 403 });
    }

    const {
      title,
      message,
      framework_code,
      framework_name,
      priority,
      change_type,
      effective_date,
      compliance_deadline,
      source_url,
    } = body;

    if (!title || !message || !framework_code) {
      return Response.json(
        { error: 'Required fields: title, message, framework_code' },
        { status: 400 }
      );
    }

    // Find the RegulatoryFramework by code (service role — cross-tenant)
    const frameworks = await base44.asServiceRole.entities.RegulatoryFramework
      .filter({ code: framework_code }, '-created_date', 50)
      .catch(() => []);

    if (!frameworks || frameworks.length === 0) {
      return Response.json({ error: `Framework not found: ${framework_code}` }, { status: 404 });
    }

    const frameworkIds = frameworks.map((f) => f.id);
    const fwName = framework_name || frameworks[0].name;

    // Find all TenantSettings that have any of these framework IDs in active_framework_ids
    const allSettings = await base44.asServiceRole.entities.TenantSettings
      .list('-created_date', 500)
      .catch(() => []);

    const affectedSettings = (allSettings || []).filter((s) => {
      const activeIds = s.active_framework_ids || [];
      return activeIds.some((id) => frameworkIds.includes(id));
    });

    if (affectedSettings.length === 0) {
      return Response.json({ success: true, alerts_created: 0, reason: 'no tenants tracking this framework' });
    }

    // Create a RegulatoryAlert for each affected tenant
    let created = 0;
    for (const settings of affectedSettings) {
      // De-duplicate: skip if an active alert with the same title already exists for this tenant
      const existing = await base44.asServiceRole.entities.RegulatoryAlert
        .filter({ tenant_id: settings.tenant_id, title, is_active: true }, '-created_date', 1)
        .catch(() => []);
      if (existing && existing.length > 0) continue;

      await base44.asServiceRole.entities.RegulatoryAlert.create({
        tenant_id: settings.tenant_id,
        title,
        message,
        framework_code,
        framework_name: fwName,
        priority: priority || 'high',
        change_type: change_type || 'amendment',
        effective_date: effective_date || null,
        compliance_deadline: compliance_deadline || null,
        source_url: source_url || null,
        is_active: true,
      });
      created++;
    }

    return Response.json({
      success: true,
      alerts_created: created,
      framework: fwName,
      framework_code,
    });
  } catch (error) {
    console.error('broadcastRegulatoryUpdate error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to broadcast regulatory update' }, { status: 500 });
  }
}