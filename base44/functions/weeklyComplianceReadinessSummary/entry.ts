import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

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
      ``,
      `Review the full dashboard: https://app.base44.com/`,
    ];

    const text = lines.join('\n');

    // Post to Slack via the existing sendSlackAlert function
    const slackRes = await sr.functions.invoke('sendSlackAlert', { text });
    const slackData = slackRes?.data || slackRes;

    console.log('Weekly readiness summary posted:', JSON.stringify({
      weekOf, avgReadiness, ctlPassRate, openRisks, criticalRisks, openIncidents, slackOk: slackData?.ok,
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
    });
  } catch (error) {
    console.error('weeklyComplianceReadinessSummary error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Weekly summary failed' }, { status: 500 });
  }
});