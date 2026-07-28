import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Posts a single actionable Slack digest to #compliance combining:
//   - compliance tasks due within 7 days
//   - audit engagements (Audit entity) starting within 14 days
// Runs on a daily schedule so the whole team stays ahead of deadlines.
const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

function dateStr(d) {
  return new Date(d).toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const daysUntil = (ds) => {
      const d = new Date(ds); d.setHours(0, 0, 0, 0);
      return Math.round((d - today) / 86400000);
    };

    // Compliance tasks: split overdue (past due, not completed) vs approaching (≤7 days)
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list('-due_date', 500);
    const activeTasks = (tasks || []).filter((t) => t.due_date && t.status !== 'completed');
    const overdueTasks = activeTasks.filter((t) => daysUntil(t.due_date) < 0)
      .sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));
    const upcomingTasks = activeTasks.filter((t) => {
      const dd = daysUntil(t.due_date);
      return dd >= 0 && dd <= 7;
    }).sort((a, b) => daysUntil(a.due_date) - daysUntil(b.due_date));

    // Audits: split overdue/in-progress (start passed, not done) vs starting (≤14 days)
    let audits = [];
    try {
      audits = await base44.asServiceRole.entities.Audit.list('-start_date', 200);
    } catch (e) {
      audits = [];
    }
    const activeAudits = (audits || []).filter((a) => a.start_date && a.status !== 'completed' && a.status !== 'cancelled');
    const overdueAudits = activeAudits.filter((a) => daysUntil(a.start_date) < 0)
      .sort((a, b) => daysUntil(a.start_date) - daysUntil(b.start_date));
    const upcomingAudits = activeAudits.filter((a) => {
      const dd = daysUntil(a.start_date);
      return dd >= 0 && dd <= 14;
    }).sort((a, b) => daysUntil(a.start_date) - daysUntil(b.start_date));

    const totalTasks = overdueTasks.length + upcomingTasks.length;
    const totalAudits = overdueAudits.length + upcomingAudits.length;
    if (totalTasks === 0 && totalAudits === 0) {
      return Response.json({ ok: true, message: 'No deadlines need attention', tasks: 0, audits: 0 });
    }

    const lines = [];
    const taskLine = (t) => {
      const owner = t.assignee_name ? ` · owner: ${t.assignee_name}` : '';
      const priority = t.priority ? ` · ${t.priority}` : '';
      const dd = daysUntil(t.due_date);
      const when = dd < 0 ? `${Math.abs(dd)}d overdue` : `in ${dd}d`;
      return `• *${t.title || 'Untitled'}* — ${when} (due ${t.due_date})${priority}${owner}`;
    };
    const auditLine = (a) => {
      const fw = a.framework_name ? ` (${a.framework_name})` : '';
      const auditor = a.auditor_name ? ` · auditor: ${a.auditor_name}` : '';
      const dd = daysUntil(a.start_date);
      const when = dd < 0 ? `started ${Math.abs(dd)}d ago` : `in ${dd}d`;
      return `• *${a.title || 'Untitled audit'}*${fw} — ${when} (starts ${a.start_date})${auditor}`;
    };

    if (overdueTasks.length > 0) {
      lines.push(`*🔴 Overdue compliance tasks (${overdueTasks.length}):*`);
      overdueTasks.slice(0, 10).forEach((t) => lines.push(taskLine(t)));
      if (overdueTasks.length > 10) lines.push(`_…and ${overdueTasks.length - 10} more_`);
      lines.push('');
    }
    if (upcomingTasks.length > 0) {
      lines.push(`*⏰ Compliance tasks due within 7 days (${upcomingTasks.length}):*`);
      upcomingTasks.slice(0, 10).forEach((t) => lines.push(taskLine(t)));
      if (upcomingTasks.length > 10) lines.push(`_…and ${upcomingTasks.length - 10} more_`);
      lines.push('');
    }
    if (overdueAudits.length > 0) {
      lines.push(`*🔴 Overdue / in-progress audits (${overdueAudits.length}):*`);
      overdueAudits.slice(0, 10).forEach((a) => lines.push(auditLine(a)));
      if (overdueAudits.length > 10) lines.push(`_…and ${overdueAudits.length - 10} more_`);
      lines.push('');
    }
    if (upcomingAudits.length > 0) {
      lines.push(`*🔎 Audits starting within 14 days (${upcomingAudits.length}):*`);
      upcomingAudits.slice(0, 10).forEach((a) => lines.push(auditLine(a)));
      if (upcomingAudits.length > 10) lines.push(`_…and ${upcomingAudits.length - 10} more_`);
      lines.push('');
    }

    lines.push('▸ Action these in CertiGuard — open the Tasks and Audits pages');

    const summary = `${totalTasks} task${totalTasks === 1 ? '' : 's'} · ${totalAudits} audit${totalAudits === 1 ? '' : 's'} need attention`;
    const text = `:shield: *Deadline Digest — ${dateStr(today)}*\n${summary}\n\n${lines.join('\n')}`;

    const conn = await base44.asServiceRole.connectors.getConnection('slackbot');
    const accessToken = conn?.accessToken;
    if (!accessToken) {
      return Response.json({ ok: false, error: 'slackbot not connected' }, { status: 503 });
    }

    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: COMPLIANCE_CHANNEL_ID, text, username: BOT_USERNAME, icon_emoji: BOT_ICON_EMOJI }),
    });
    const postData = await postRes.json();
    if (!postData.ok) {
      console.error('Slack post failed:', postData.error);
      return Response.json({ ok: false, error: postData.error }, { status: 502 });
    }

    return Response.json({ ok: true, tasks: totalTasks, audits: totalAudits, ts: postData.ts });
  } catch (error) {
    console.error('postDeadlineSlackDigest error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'digest failed' }, { status: 500 });
  }
});