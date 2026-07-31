import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { sendGmail } from "../../shared/gmailSender.ts";

const SUPPORT_EMAIL = "support.certiguardgrc@gmail.com";

// Computes a weekly compliance readiness summary and posts it to the
// #compliance Slack channel by reusing the existing sendSlackAlert function.
// Invoked weekly by the WeeklyComplianceReadinessSummary workflow (cron).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Pull current compliance data (service-role, tenant-wide read)
    const [frameworks, controls, risks, tasks, incidents] = await Promise.all([
      sr.entities.Framework.list('-updated_date', 200),
      sr.entities.Control.list('-updated_date', 500),
      sr.entities.Risk.list('-updated_date', 200),
      sr.entities.ComplianceTask.list('-updated_date', 300),
      sr.entities.Incident.list('-updated_date', 100),
    ]);

    const fw = frameworks || [];
    const ctl = controls || [];
    const rsk = risks || [];
    const tsk = tasks || [];
    const inc = incidents || [];

    // Frameworks
    const fwTotal = fw.length;
    const fwReady = fw.filter((f) => f.status === 'audit_ready' || f.status === 'certified').length;
    const avgReadiness = fwTotal > 0
      ? Math.round(fw.reduce((s, f) => s + (f.readiness_score || 0), 0) / fwTotal)
      : 0;

    // Controls
    const ctlTotal = ctl.length;
    const ctlPassing = ctl.filter((c) => c.status === 'passing').length;
    const ctlFailing = ctl.filter((c) => c.status === 'failing').length;
    const ctlNotTested = ctl.filter((c) => c.status === 'not_tested').length;
    const ctlPassRate = ctlTotal > 0 ? Math.round((ctlPassing / ctlTotal) * 100) : 0;

    // Risks
    const openRisks = rsk.filter((r) => r.status === 'open' || r.status === 'mitigating').length;
    const criticalRisks = rsk.filter((r) => (r.status === 'open' || r.status === 'mitigating') && (r.risk_score || 0) >= 15).length;

    // Tasks
    const overdueTasks = tsk.filter((t) => t.status === 'overdue').length;
    const openTasks = tsk.filter((t) => t.status === 'todo' || t.status === 'in_progress' || t.status === 'in_review').length;

    // Incidents
    const openIncidents = inc.filter((i) => i.status === 'detected' || i.status === 'investigating' || i.status === 'contained').length;
    const criticalIncidents = inc.filter((i) => i.status !== 'closed' && i.status !== 'remediated' && i.status !== 'false_positive' && i.severity === 'critical').length;

    // Week label
    const now = new Date();
    const weekOf = now.toISOString().slice(0, 10);

    // Health verdict
    const verdict =
      avgReadiness >= 80 && ctlFailing === 0 && criticalRisks === 0 ? '🟢 Strong'
      : avgReadiness >= 60 && criticalRisks <= 1 ? '🟡 On track'
      : '🔴 Needs attention';

    const lines = [
      `*:shield: Weekly Compliance Readiness Summary*`,
      `_Week of ${weekOf} — ${verdict}_`,
      ``,
      `*Frameworks:* ${fwTotal} tracked · ${fwReady} audit-ready/certified · avg readiness ${avgReadiness}%`,
      `*Controls:* ${ctlPassing}/${ctlTotal} passing (${ctlPassRate}%) · ${ctlFailing} failing · ${ctlNotTested} untested`,
      `*Risks:* ${openRisks} open (${criticalRisks} critical)`,
      `*Tasks:* ${openTasks} open · ${overdueTasks} overdue`,
      `*Incidents:* ${openIncidents} open (${criticalIncidents} critical)`,
    ];

    // Pending high-priority tasks (critical/high, not completed) — actionable list for stakeholders
    const highPriority = tsk
      .filter((t) => (t.priority === 'critical' || t.priority === 'high') && t.status !== 'completed')
      .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
      .slice(0, 8);

    if (highPriority.length > 0) {
      lines.push('', `*🔴 Pending high-priority tasks (${highPriority.length}):*`);
      highPriority.forEach((t) => {
        const when = t.due_date ? ` — due ${t.due_date}` : '';
        const owner = t.assignee_name ? ` · ${t.assignee_name}` : '';
        const icon = t.priority === 'critical' ? '🔴' : '🟠';
        lines.push(`${icon} *${t.title || 'Untitled'}*${when}${owner}`);
      });
    }

    lines.push('', `Review the full dashboard: https://app.base44.com/`);

    const text = lines.join('\n');

    // Post to Slack via the existing sendSlackAlert function
    const slackRes = await sr.functions.invoke('sendSlackAlert', { text });
    const slackData = slackRes?.data || slackRes;

    // Send HTML email summary to the support team
    const verdictClean = verdict.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '').trim();
    const taskRows = highPriority.length > 0
      ? highPriority.map((t) => {
          const icon = t.priority === 'critical' ? '🔴' : '🟠';
          const when = t.due_date ? ` — due ${t.due_date}` : '';
          const owner = t.assignee_name ? ` · ${t.assignee_name}` : '';
          return `<tr><td style="padding:6px 0;">${icon} <strong>${t.title || 'Untitled'}</strong>${when}${owner}</td></tr>`;
        }).join('')
      : '<tr><td style="padding:6px 0;color:#64748B;">No pending high-priority tasks.</td></tr>';

    const emailHtml = `
      <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1E293B;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">🛡️ Weekly Compliance Readiness Summary</h1>
          <p style="color:#94A3B8;margin:4px 0 0;font-size:13px;">Week of ${weekOf} — ${verdict}</p>
        </div>
        <div style="background:#F8FAFC;padding:24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
            <tr style="background:#E2E8F0;"><td style="padding:10px;font-weight:700;color:#1E293B;" colspan="2">Frameworks</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Tracked / Audit-ready</td><td style="padding:6px 0;color:#1E293B;font-weight:600;text-align:right;">${fwTotal} / ${fwReady}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Average readiness</td><td style="padding:6px 0;color:${avgReadiness >= 80 ? '#10B981' : '#F59E0B'};font-weight:700;text-align:right;">${avgReadiness}%</td></tr>
            <tr style="background:#E2E8F0;"><td style="padding:10px;font-weight:700;color:#1E293B;" colspan="2">Controls</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Passing / Total</td><td style="padding:6px 0;color:#1E293B;font-weight:600;text-align:right;">${ctlPassing} / ${ctlTotal} (${ctlPassRate}%)</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Failing</td><td style="padding:6px 0;color:${ctlFailing > 0 ? '#EF4444' : '#10B981'};font-weight:700;text-align:right;">${ctlFailing}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Not tested</td><td style="padding:6px 0;color:#F59E0B;font-weight:600;text-align:right;">${ctlNotTested}</td></tr>
            <tr style="background:#E2E8F0;"><td style="padding:10px;font-weight:700;color:#1E293B;" colspan="2">Risks</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Open / Mitigating</td><td style="padding:6px 0;color:#1E293B;font-weight:600;text-align:right;">${openRisks}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Critical (score ≥ 15)</td><td style="padding:6px 0;color:${criticalRisks > 0 ? '#EF4444' : '#10B981'};font-weight:700;text-align:right;">${criticalRisks}</td></tr>
            <tr style="background:#E2E8F0;"><td style="padding:10px;font-weight:700;color:#1E293B;" colspan="2">Tasks & Incidents</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Open tasks</td><td style="padding:6px 0;color:#1E293B;font-weight:600;text-align:right;">${openTasks}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Overdue tasks</td><td style="padding:6px 0;color:${overdueTasks > 0 ? '#EF4444' : '#1E293B'};font-weight:700;text-align:right;">${overdueTasks}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Open incidents</td><td style="padding:6px 0;color:#1E293B;font-weight:600;text-align:right;">${openIncidents}</td></tr>
            <tr><td style="padding:6px 0;color:#64748B;">Critical incidents</td><td style="padding:6px 0;color:${criticalIncidents > 0 ? '#EF4444' : '#10B981'};font-weight:700;text-align:right;">${criticalIncidents}</td></tr>
          </table>
          <div style="margin-top:16px;padding:12px;background:#FFF7ED;border-radius:6px;border-left:4px solid #F59E0B;">
            <strong style="color:#92400E;">Pending high-priority tasks (${highPriority.length}):</strong>
            <table style="width:100%;font-size:13px;margin-top:6px;">${taskRows}</table>
          </div>
          <p style="margin-top:20px;color:#64748B;font-size:12px;">Automated weekly summary from CertiGuard GRC · ${new Date().toISOString()}</p>
        </div>
      </div>
    `;

    let emailResult = null;
    try {
      emailResult = await sendGmail(base44, SUPPORT_EMAIL, `Weekly Compliance Readiness Summary — ${verdictClean}`, emailHtml);
    } catch (e) {
      console.error('Weekly summary email failed:', e?.message || e);
    }

    console.log('Weekly readiness summary posted:', JSON.stringify({
      weekOf, avgReadiness, ctlPassRate, openRisks, criticalRisks, openIncidents, slackOk: slackData?.ok, emailOk: !!emailResult,
    }));

    return Response.json({
      ok: true,
      week_of: weekOf,
      verdict,
      metrics: {
        frameworks: { total: fwTotal, ready: fwReady, avgReadiness },
        controls: { total: ctlTotal, passing: ctlPassing, failing: ctlFailing, notTested: ctlNotTested, passRate: ctlPassRate },
        risks: { open: openRisks, critical: criticalRisks },
        tasks: { open: openTasks, overdue: overdueTasks },
        incidents: { open: openIncidents, critical: criticalIncidents },
      },
      slack: slackData,
      email: emailResult ? { ok: true, messageId: emailResult.id, to: SUPPORT_EMAIL } : { ok: false },
    });
  } catch (error) {
    console.error('weeklyComplianceReadinessSummary error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Weekly summary failed' }, { status: 500 });
  }
});