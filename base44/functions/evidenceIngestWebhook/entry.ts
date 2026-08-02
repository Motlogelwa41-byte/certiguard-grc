import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Secure webhook endpoint for external evidence ingestion.
// Accepts: { tenant_api_key, control_id, status }
// Validates the API key against the TenantApiKey table, matches the control,
// and updates its status. Real-time dashboard updates are handled by the
// platform's entity realtime subscriptions on the frontend.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tenant_api_key, control_id, status } = body;

    // Validate required fields
    if (!tenant_api_key || !control_id || !status) {
      return Response.json(
        { error: 'Missing required fields: tenant_api_key, control_id, status' },
        { status: 400 }
      );
    }

    const normalizedStatus = String(status).toLowerCase();
    if (!['pass', 'fail'].includes(normalizedStatus)) {
      return Response.json(
        { error: 'status must be "Pass" or "Fail"' },
        { status: 400 }
      );
    }

    // Validate the API key against the TenantApiKey table (service role)
    const keys = await base44.asServiceRole.entities.TenantApiKey
      .filter({ api_key: tenant_api_key, is_active: true }, '-created_date', 1)
      .catch(() => []);

    if (!keys || keys.length === 0) {
      return Response.json({ error: 'Invalid or revoked API key' }, { status: 401 });
    }

    const apiKeyRecord = keys[0];
    const tenantId = apiKeyRecord.tenant_id;

    // Update last_used_at timestamp
    await base44.asServiceRole.entities.TenantApiKey.update(apiKeyRecord.id, {
      last_used_at: new Date().toISOString(),
    }).catch(() => {});

    // Find the control by control_id within this tenant
    const controls = await base44.asServiceRole.entities.Control
      .filter({ control_id, tenant_id: tenantId }, '-created_date', 1)
      .catch(() => []);

    if (!controls || controls.length === 0) {
      return Response.json({ error: 'Control not found for this tenant' }, { status: 404 });
    }

    const control = controls[0];
    const newStatus = normalizedStatus === 'pass' ? 'passing' : 'failing';

    // Update the control status
    await base44.asServiceRole.entities.Control.update(control.id, {
      status: newStatus,
      last_tested: new Date().toISOString().slice(0, 10),
    });

    // If the control is failing, auto-create a remediation task with 48h deadline
    if (newStatus === 'failing') {
      try {
        const internalToken = secrets.get('INTERNAL_INVOKE_TOKEN');
        await base44.asServiceRole.functions.invoke('autoCreateRemediationTask', {
          entity_type: 'control',
          control: {
            id: control.id,
            control_id: control.control_id,
            title: control.title,
            tenant_id: tenantId,
            owner_name: control.owner_name,
            owner_id: control.owner_id,
          },
          _internal_token: internalToken,
        });
      } catch (e) {
        console.error('Failed to auto-create remediation task from webhook:', e?.message || e);
      }
    }

    return Response.json({
      success: true,
      control_id: control.control_id,
      previous_status: control.status,
      new_status: newStatus,
      updated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('evidenceIngestWebhook error:', error?.message || error);
    return Response.json({ error: error?.message || 'Webhook processing failed' }, { status: 500 });
  }
}