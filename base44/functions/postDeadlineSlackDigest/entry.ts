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
    const taskHorizon = new Date(today);
    taskHorizon.setDate(taskHorizon.getDate() + 7);
    const auditHorizon = new Date(today);
    auditHorizon.setDate(auditHorizon.getDate() + 14);

    // Approaching compliance tasks (not yet completed)
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list('-due_date', 500);
    const dueTasks = (tasks || []).filter((t) => {
      if (!t.due_date || t.status === 'completed') return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= taskHorizon;
    });

    // Approaching audit deadlines
    let audits = [];
    try {
      audits = await base44.asServiceRole.entities.Audit.list('-start_date', 200);
    } catch (e) {
      audits = [];
    }
    const dueAudits = (audits || []).filter((a) => {
      if (!a.start_date || a.status === 'completed' || a.status === 'cancelled') return false;
      const d = new Date(a.start_date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= auditHorizon;
    });

    if (dueTasks.length === 0 && dueAudits.length === 0) {
      return Response.json({ ok: true, message: 'No approaching deadlines', tasks: 0, audits: 0 });
    }

    const lines = [];
    if (dueTasks.length > 0) {
      lines.push('*⏰ Compliance tasks due within 7 days:*');
      dueTasks.slice(0, 10).forEach((t) => {
        const owner = t.assignee_name ? ` · owner: ${t.assignee_name}` : '';
        const priority = t.priority ? ` · ${t.priority}` : '';
        lines.push(`• *${t.title || 'Untitled'}* — due ${t.due_date}${priority}${owner}`);
      });
      if (dueTasks.length > 10) lines.push(`_…and ${dueTasks.length - 10} more_`);
      lines.push('');
    }
    if (dueAudits.length > 0) {
      lines.push('*🔎 Audit deadlines in the next 14 days:*');
      dueAudits.slice(0, 10).forEach((a) => {
        const fw = a.framework_name ? ` (${a.framework_name})` : '';
        const auditor = a.auditor_name ? ` · auditor: ${a.auditor_name}` : '';
        lines.push(`• *${a.title || 'Untitled audit'}*${fw} — starts ${a.start_date}${auditor}`);
      });
      if (dueAudits.length > 10) lines.push(`_…and ${dueAudits.length - 10} more_`);
      lines.push('');
    }
    lines.push('▸ Open CertiGuard and action these before they slip — /tasks and /audits');

    const text = `:shield: *Deadline Digest — ${dateStr(today)}*\n\n${lines.join('\n')}`;

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

    return Response.json({ ok: true, tasks: dueTasks.length, audits: dueAudits.length, ts: postData.ts });
  } catch (error) {
    console.error('postDeadlineSlackDigest error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'digest failed' }, { status: 500 });
  }
});