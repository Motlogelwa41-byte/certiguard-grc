import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Triggered the instant a Control regresses from PASSING to FAILING.
// Posts a Slack alert and creates a high-priority remediation task.
// Workflow-invoked (no user session) — all SDK calls use the service role.

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      control_id = '',
      title = '',
      category = '',
      owner_name = '',
      severity = 'medium',
      tenant_id = '',
    } = body;

    const text =
      `:chart_with_downwards_trend: Control regression detected: *${title || control_id}* (category: ${category || 'n/a'}) ` +
      `dropped from PASSING to FAILING. Owner: ${owner_name || 'unassigned'}. Severity: ${severity}. ` +
      `Immediate remediation required — review in CertiGuard.`;

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

    // 2. Create a remediation task
    let taskId = null;
    let taskError = null;
    try {
      const task = await base44.asServiceRole.entities.ComplianceTask.create({
        tenant_id: tenant_id || undefined,
        title: `Remediate control regression: ${title || control_id}`,
        type: 'remediation',
        status: 'todo',
        priority: severity === 'critical' ? 'critical' : 'high',
        related_control_id: control_id,
        notes:
          `Control "${title || control_id}" regressed from PASSING to FAILING. ` +
          `Investigate root cause and restore control effectiveness before next audit cycle.`,
      });
      taskId = task?.id || null;
    } catch (e) {
      taskError = e?.message || 'task creation failed';
      console.error('Task creation error:', taskError);
    }

    return Response.json({ ok: true, slackOk, slackError, taskId, taskError });
  } catch (error) {
    console.error('handleControlRegression error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Control regression handling failed' }, { status: 500 });
  }
});