import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Daily scan for open/in-progress security findings past their SLA.
// Posts an escalating Slack alert and creates remediation tasks for
// critical/high breaches. Workflow-invoked (service role).

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const findings = await base44.asServiceRole.entities.SecurityFinding.list('-detected_date', 500);
    const breached = (findings || []).filter((f) => {
      if (f.status !== 'open' && f.status !== 'in_progress') return false;
      if (f.sla_breached === true) return true;
      if (f.due_date && new Date(f.due_date) < today) return true;
      return false;
    });

    let slackOk = false;
    let slackError = null;
    const tasksCreated = [];

    if (breached.length > 0) {
      const critical = breached.filter((f) => f.severity === 'critical' || f.severity === 'high');
      const lines = [];
      critical.slice(0, 8).forEach((f) =>
        lines.push(`• [${(f.severity || 'medium').toUpperCase()}] ${f.title} (asset: ${f.asset || 'n/a'}) — due ${f.due_date || 'n/a'}, status: ${f.status}`)
      );
      const shown = Math.min(8, critical.length);
      const text =
        `:rotating_light: SLA breach escalation — ${breached.length} security finding${breached.length === 1 ? '' : 's'} past SLA:\n` +
        `${lines.join('\n')}${critical.length > shown ? `\n…and ${critical.length - shown} more` : ''}\n` +
        `Immediate remediation required — review in CertiGuard.`;

      try {
        const conn = await base44.asServiceRole.connectors.getConnection('slackbot');
        const accessToken = conn?.accessToken;
        if (accessToken) {
          const postRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: COMPLIANCE_CHANNEL_ID, text, username: BOT_USERNAME, icon_emoji: BOT_ICON_EMOJI }),
          });
          const postData = await postRes.json();
          slackOk = !!postData.ok;
          if (!postData.ok) slackError = postData.error;
        } else {
          slackError = 'slackbot not connected';
        }
      } catch (e) {
        slackError = e?.message || 'slack post failed';
        console.error('Slack error:', slackError);
      }

      for (const f of critical.slice(0, 25)) {
        try {
          const task = await base44.asServiceRole.entities.ComplianceTask.create({
            tenant_id: f.tenant_id || undefined,
            title: `Escalate SLA-breached finding: ${f.title}`,
            type: 'remediation',
            status: 'todo',
            priority: f.severity === 'critical' ? 'critical' : 'high',
            notes: `Security finding "${f.title}" (ID: ${f.finding_id || f.id}) has breached SLA (due ${f.due_date || 'n/a'}). Escalated for immediate remediation.`,
          });
          if (task?.id) tasksCreated.push(task.id);
        } catch (err) {
          console.error('Task create error:', err?.message);
        }
      }
    }

    return Response.json({
      ok: true,
      totalScanned: findings.length,
      breached: breached.length,
      slackOk,
      slackError,
      tasksCreated: tasksCreated.length,
    });
  } catch (error) {
    console.error('escalateSlaBreachedFindings error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'SLA escalation failed' }, { status: 500 });
  }
});