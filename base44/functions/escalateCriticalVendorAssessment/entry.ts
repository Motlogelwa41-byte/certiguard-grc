import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Triggered by the Vendor Assessment Critical Finding Alert workflow the moment a
// VendorAssessment is scored "critical". Captures the finding instantly by:
//   1. Posting a detailed Slack alert to #compliance
//   2. Escalating the parent Vendor's risk_level to "critical" (service role)
//   3. Creating a critical-priority remediation ComplianceTask
// Workflow-invoked (no user session) — all SDK calls use the service role.

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      assessment_id = '',
      vendor_id = '',
      vendor_name = '',
      assessment_title = '',
      risk_score = 0,
      risk_level = 'critical',
      tenant_id = '',
    } = body;

    if (!vendor_id) {
      return Response.json({ error: 'vendor_id is required' }, { status: 400 });
    }

    const score = typeof risk_score === 'number' ? risk_score : Number(risk_score) || 0;
    const text =
      `:rotating_light: Critical vendor assessment finding: *${vendor_name || vendor_id}* scored *${score}/100* (${risk_level.toUpperCase()}) on "${assessment_title || 'Security assessment'}". ` +
      `Vendor risk level escalated to CRITICAL. Immediate remediation required — review in CertiGuard.`;

    // 1. Post Slack alert
    let slackOk = false;
    let slackError = null;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection('slackbot');
      const accessToken = conn?.accessToken;
      if (accessToken) {
        const postRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: COMPLIANCE_CHANNEL_ID,
            text,
            username: BOT_USERNAME,
            icon_emoji: BOT_ICON_EMOJI,
          }),
        });
        const postData = await postRes.json();
        slackOk = !!postData.ok;
        if (!postData.ok) slackError = postData.error;
      } else {
        slackError = 'slackbot not connected';
      }
    } catch (e) {
      slackError = e?.message || 'slack post failed';
      console.error('Slack alert error:', slackError);
    }

    // 2. Escalate the parent Vendor's risk_level to critical
    let vendorEscalated = false;
    let vendorError = null;
    try {
      const vendor = await base44.asServiceRole.entities.Vendor.get(vendor_id);
      if (vendor && vendor.risk_level !== 'critical') {
        await base44.asServiceRole.entities.Vendor.update(vendor_id, { risk_level: 'critical' });
        vendorEscalated = true;
      }
    } catch (e) {
      vendorError = e?.message || 'vendor escalation failed';
      console.error('Vendor escalation error:', vendorError);
    }

    // 3. Create a critical remediation task
    let taskId = null;
    let taskError = null;
    try {
      const task = await base44.asServiceRole.entities.ComplianceTask.create({
        tenant_id: tenant_id || undefined,
        title: `Review critical vendor assessment: ${vendor_name || vendor_id}`,
        type: 'vendor_review',
        status: 'todo',
        priority: 'critical',
        notes:
          `Vendor assessment "${assessment_title || ''}" (ID: ${assessment_id || 'n/a'}) ` +
          `scored ${score}/100 → CRITICAL. Vendor risk escalated to critical. ` +
          `Immediate remediation and vendor follow-up required.`,
      });
      taskId = task?.id || null;
    } catch (e) {
      taskError = e?.message || 'task creation failed';
      console.error('Task creation error:', taskError);
    }

    return Response.json({
      ok: true,
      slackOk,
      slackError,
      vendorEscalated,
      vendorError,
      taskId,
      taskError,
    });
  } catch (error) {
    console.error('escalateCriticalVendorAssessment error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Escalation failed' }, { status: 500 });
  }
});