import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { jsPDF } from 'npm:jspdf@4.2.1';
import {
  esc, scoreColor, pdfFooter, pdfHeader, pdfScoreHero,
  pdfMetricGrid, pdfSectionTitle, emailShell
} from "../../shared/reportBuilder.ts";

// Weekly board report — runs every Monday via the WeeklyBoardReportEmail workflow.
// Generates a board-ready PDF server-side, uploads it to app storage, stores a
// ManagementReport snapshot, and emails the management team (recipients of all
// active ReportSchedule records) a rich HTML summary with a one-click PDF
// download link so they can review compliance status without logging in.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const dryRun = body.dry_run === true;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // ── Gather live data ────────────────────────────────────────────────────
    const [controls, frameworks, risks, findings, tasks, incidents, schedules] = await Promise.all([
      sr.entities.Control.list('-updated_date', 1000).catch(() => []),
      sr.entities.Framework.list('-updated_date', 200).catch(() => []),
      sr.entities.Risk.list('-created_date', 300).catch(() => []),
      sr.entities.SecurityFinding.list('-created_date', 200).catch(() => []),
      sr.entities.ComplianceTask.list('-created_date', 300).catch(() => []),
      sr.entities.Incident.list('-created_date', 100).catch(() => []),
      sr.entities.ReportSchedule.filter({ is_active: true }).catch(() => []),
    ]);

    // ── Compute metrics ─────────────────────────────────────────────────────
    const passing = controls.filter((c) => c.status === 'passing').length;
    const total = controls.length;
    const complianceScore = total > 0 ? Math.round((passing / total) * 100) : 0;
    const fwScores = {};
    (frameworks || []).forEach((f) => {
      fwScores[f.name] = f.total_controls > 0
        ? Math.round((f.passing_controls / f.total_controls) * 100)
        : (f.readiness_score || 0);
    });
    const openRisks = (risks || []).filter((r) => r.status === 'open' || r.status === 'mitigating');
    const topRisks = [...openRisks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 6);
    const openFindings = (findings || []).filter((f) => f.status === 'open' || f.status === 'in_progress');
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    openFindings.forEach((f) => { sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1; });
    const overdueTasks = (tasks || []).filter((t) => t.status === 'overdue').length;
    const openIncidents = (incidents || []).filter((i) => i.status !== 'closed' && i.status !== 'false_positive').length;
    const completedTasks = (tasks || []).filter((t) => t.status === 'completed').length;

    const recs = [];
    if (total - passing > 0) recs.push(`Remediate ${total - passing} non-passing controls to lift the compliance score.`);
    if (sevCounts.critical + sevCounts.high > 0) recs.push(`Triage ${sevCounts.critical + sevCounts.high} critical/high security findings within SLA.`);
    if (overdueTasks > 0) recs.push(`Close ${overdueTasks} overdue compliance tasks.`);
    if (openRisks.length > 0) recs.push(`Mitigate ${openRisks.length} open risks — prioritise the top 3 by score.`);
    if (openIncidents > 0) recs.push(`Resolve ${openIncidents} open security incidents.`);
    if (recs.length === 0) recs.push('All indicators within acceptable ranges — maintain current posture and monitoring cadence.');

    // Risk trends — new risks opened per week (last 6) + current status breakdown
    const riskByStatus = { open: 0, mitigating: 0, accepted: 0, closed: 0 };
    (risks || []).forEach((r) => { riskByStatus[r.status] = (riskByStatus[r.status] || 0) + 1; });
    const nowMs = now.getTime();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const riskTrends = [];
    for (let i = 5; i >= 0; i--) {
      const wEnd = nowMs - i * weekMs;
      const wStart = wEnd - weekMs;
      const opened = (risks || []).filter((r) => {
        const d = new Date(r.created_date).getTime();
        return d >= wStart && d < wEnd;
      }).length;
      riskTrends.push({ week: new Date(wEnd).toISOString().slice(0, 10), opened });
    }
    const avgRiskScore = (risks || []).length > 0
      ? Math.round(((risks || []).reduce((s, r) => s + (r.risk_score || 0), 0) / (risks || []).length) * 10) / 10
      : 0;

    const report = {
      complianceScore, passing, total, fwScores, topRisks, sevCounts,
      openFindings: openFindings.length, overdueTasks, openIncidents,
      openRisks: openRisks.length, completedTasks, totalTasks: tasks.length, recs,
      riskByStatus, riskTrends, avgRiskScore,
    };

    // ── Build the board PDF (server-side, text/tables — no DOM) ─────────────
    const pdfBytes = buildBoardPdf({ report, dateStr, tenantName: body.tenant_name || '' });

    // ── Upload the PDF so it can be linked in the email ──────────────────────
    let pdfUrl = null;
    let uploadError = null;
    try {
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const file = new File([blob], `Board_Compliance_Report_${dateStr}.pdf`, { type: 'application/pdf' });
      const up = await sr.integrations.Core.UploadFile({ file });
      pdfUrl = up?.file_url || null;
    } catch (e) {
      uploadError = e?.message || 'upload failed';
      console.error('sendWeeklyBoardReport PDF upload failed:', uploadError);
    }

    // ── Persist a ManagementReport snapshot ────────────────────────────────
    try {
      await sr.entities.ManagementReport.create({
        title: `Weekly Board Report — ${dateStr}`,
        report_month: dateStr.slice(0, 7),
        status: 'completed',
        controls_passing: passing,
        controls_failing: total - passing,
        controls_total: total,
        compliance_score: complianceScore,
        risks_open: openRisks.length,
        overdue_tasks: overdueTasks,
        incidents_opened: openIncidents,
        completed_tasks: completedTasks,
        total_tasks: tasks.length,
        framework_readiness_scores: JSON.stringify(fwScores),
        top_risks: JSON.stringify(topRisks.map((r) => ({ title: r.title, score: r.risk_score, status: r.status }))),
        improvement_recommendations: recs.map((r) => `- ${r}`).join('\n'),
        executive_summary: `Weekly board snapshot for ${dateStr}: compliance score ${complianceScore}%, ${passing}/${total} controls passing, ${openRisks.length} open risks, ${openFindings.length} open findings, ${overdueTasks} overdue tasks. Risk trends (6wk): ${riskTrends.map((w) => w.opened).join('/')} new per week; avg risk score ${avgRiskScore}.`,
        generated_by: 'Weekly Board Report Workflow',
        generated_at: now.toISOString(),
      });
    } catch (e) {
      console.error('sendWeeklyBoardReport snapshot failed:', e?.message || e);
    }

    if (dryRun) {
      return Response.json({ ok: true, dryRun: true, dateStr, report, pdfUrl, uploadError, recipients: (schedules || []).length });
    }

    // ── Collect recipients across all active schedules ──────────────────────
    const recipients = new Set();
    (schedules || []).forEach((s) => {
      (s.recipients || '').split(',').map((e) => e.trim()).filter((e) => e.includes('@')).forEach((e) => recipients.add(e));
    });

    if (recipients.size === 0) {
      return Response.json({ ok: true, sent: 0, message: 'No recipients configured on active report schedules', pdfUrl });
    }

    // ── Email each recipient ────────────────────────────────────────────────
    const subject = `Board Compliance Report — Monday ${now.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const tablesHtml = buildBoardTablesHtml(report);
    let sent = 0, failed = 0;
    for (const email of recipients) {
      try {
        const html = emailShell({
          subject: `📊 ${subject}`, dateStr, score: report.complianceScore, verdict: '',
          metrics: [
            ['Controls Passing', `${report.passing} / ${report.total}`, '#10b981'],
            ['Open Risks', String(report.openRisks), report.openRisks > 5 ? '#ef4444' : '#f59e0b'],
            ['Open Findings', String(report.openFindings), report.sevCounts.critical > 0 ? '#ef4444' : '#0f172a'],
            ['Overdue Tasks', String(report.overdueTasks), report.overdueTasks > 0 ? '#ef4444' : '#10b981'],
            ['Open Incidents', String(report.openIncidents), report.openIncidents > 0 ? '#ef4444' : '#10b981'],
            ['Tasks Completed', `${report.completedTasks} / ${report.totalTasks}`, '#3b82f6'],
          ],
          tablesHtml, pdfUrl, pdfFilename: `Board_Compliance_Report_${dateStr}.pdf`,
          buttonLabel: '📄 Download Board Report (PDF)',
        });
        await sr.integrations.Core.SendEmail({ to: email, subject, body: html });
        sent++;
      } catch (e) {
        console.error('sendWeeklyBoardReport email failed:', email, e?.message || e);
        failed++;
      }
    }

    // ── Mark schedules as sent for this run ─────────────────────────────────
    for (const s of (schedules || [])) {
      try {
        await sr.entities.ReportSchedule.update(s.id, {
          last_sent_at: dateStr,
          last_sent_status: sent > 0 ? 'sent' : 'failed',
          total_sent: (s.total_sent || 0) + (sent > 0 ? 1 : 0),
        });
      } catch {}
    }

    return Response.json({ ok: true, sent, failed, recipients: recipients.size, pdfUrl, uploadError, complianceScore });
  } catch (error) {
    console.error('sendWeeklyBoardReport error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Weekly board report failed' }, { status: 500 });
  }
});

// ── Build a clean, multi-page A4 board report PDF with jsPDF (no DOM) ─────────
function buildBoardPdf({ report, dateStr, tenantName }) {
  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = pdfHeader(doc, pageW, margin, 'Board Compliance Report', `${tenantName || 'CertiGuard GRC'}  ·  ${dateStr}  ·  Confidential`);
  const ensureSpace = (need) => { if (y + need > pageH - 40) { doc.addPage(); y = margin; } };

  const c = scoreColor(report.complianceScore);
  pdfScoreHero(doc, margin, y, report.complianceScore, 'Compliance Score', c);
  const metrics = [
    ['Controls Passing', `${report.passing} / ${report.total}`],
    ['Open Risks', String(report.openRisks)],
    ['Open Findings', String(report.openFindings)],
    ['Open Incidents', String(report.openIncidents)],
    ['Overdue Tasks', String(report.overdueTasks)],
    ['Tasks Completed', `${report.completedTasks} / ${report.totalTasks}`],
  ];
  const colW = (contentW - 130) / 3;
  pdfMetricGrid(doc, margin + 130, y, metrics, colW);
  y += 80;

  // Framework readiness
  y = pdfSectionTitle(doc, 'Framework Readiness', margin, pageW, y);
  const fwEntries = Object.entries(report.fwScores);
  if (fwEntries.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text('No frameworks configured.', margin, y); y += 14;
  } else {
    fwEntries.forEach(([name, sc]) => {
      ensureSpace(18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(String(name).slice(0, 40), margin, y);
      const barX = margin + 220, barW = contentW - 220 - 44;
      doc.setFillColor(226, 232, 240); doc.roundedRect(barX, y - 8, barW, 10, 2, 2, 'F');
      const cc = scoreColor(sc);
      doc.setFillColor(...cc); doc.roundedRect(barX, y - 8, Math.max(2, (barW * sc) / 100), 10, 2, 2, 'F');
      doc.setTextColor(...cc); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(`${sc}%`, pageW - margin, y, { align: 'right' });
      y += 18;
    });
  }
  y += 6;

  // Top open risks
  y = pdfSectionTitle(doc, 'Top Open Risks', margin, pageW, y);
  if (report.topRisks.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text('No open risks.', margin, y); y += 14;
  } else {
    report.topRisks.forEach((r, i) => {
      ensureSpace(16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(`${i + 1}. ${r.title}`, contentW - 70);
      doc.text(lines, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(String(r.risk_score || '—'), pageW - margin - 40, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
      doc.text(String(r.status || ''), pageW - margin, y, { align: 'right' });
      y += lines.length * 12 + 4;
    });
  }
  y += 6;

  // Risk trends (last 6 weeks)
  y = pdfSectionTitle(doc, 'Risk Trends (last 6 weeks)', margin, pageW, y);
  if (report.riskTrends.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text('No risk history.', margin, y); y += 14;
  } else {
    report.riskTrends.forEach((w) => {
      ensureSpace(14);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(w.week, margin, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${w.opened} new`, pageW - margin, y, { align: 'right' });
      y += 14;
    });
  }
  y += 4;

  // Risk status breakdown
  y = pdfSectionTitle(doc, 'Risk Status', margin, pageW, y);
  Object.entries(report.riskByStatus).forEach(([k, v]) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(k.charAt(0).toUpperCase() + k.slice(1), margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), pageW - margin, y, { align: 'right' });
    y += 14;
  });
  ensureSpace(14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text(`Average risk score: ${report.avgRiskScore}`, margin, y); y += 14;
  y += 6;

  // Findings by severity
  y = pdfSectionTitle(doc, 'Open Findings by Severity', margin, pageW, y);
  ['critical', 'high', 'medium', 'low', 'info'].forEach((s) => {
    ensureSpace(14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(s.charAt(0).toUpperCase() + s.slice(1), margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(String(report.sevCounts[s] || 0), pageW - margin, y, { align: 'right' });
    y += 14;
  });
  y += 6;

  // Recommendations
  y = pdfSectionTitle(doc, 'Recommendations', margin, pageW, y);
  report.recs.forEach((r) => {
    const lines = doc.splitTextToSize(`•  ${r}`, contentW);
    ensureSpace(lines.length * 12 + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  });

  pdfFooter(doc, pageW, pageH, 'Confidential — CertiGuard GRC');
  return doc.output('arraybuffer');
}

// ── Board-specific HTML tables for the email shell ───────────────────────────
function buildBoardTablesHtml(report) {
  const fwRows = Object.entries(report.fwScores).map(([name, sc]) => {
    const bg = sc >= 80 ? '#dcfce7' : sc >= 50 ? '#fef3c7' : '#fee2e2';
    const t = sc >= 80 ? '#166534' : sc >= 50 ? '#92400e' : '#991b1b';
    return `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(name)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${bg};color:${t};padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px">${sc}%</span></td></tr>`;
  }).join('') || '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No frameworks configured.</td></tr>';

  const riskRows = report.topRisks.length ? report.topRisks.map((r) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(r.title)}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${esc(r.risk_score || '—')}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;text-transform:capitalize">${esc(r.status || '')}</td></tr>`
  ).join('') : '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No open risks.</td></tr>';

  const recList = report.recs.map((r) => `<p style="font-size:13px;margin:0 0 6px;padding-left:14px;border-left:3px solid #10b981;color:#1e293b">${esc(r)}</p>`).join('');

  const trendRows = (report.riskTrends || []).map((w) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(w.week)}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${w.opened} new</td></tr>`
  ).join('') || '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No history.</td></tr>';

  const statusRows = Object.entries(report.riskByStatus || {}).map(([k, v]) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;text-transform:capitalize">${esc(k)}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${v}</td></tr>`
  ).join('');

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Framework Readiness</th></tr>${fwRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="3" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Top Open Risks</th></tr>
      <tr style="color:#64748b;font-size:11px"><th style="padding:6px 14px;text-align:left">Risk</th><th style="padding:6px 14px;text-align:left">Score</th><th style="padding:6px 14px;text-align:left">Status</th></tr>${riskRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Risk Trends (last 6 weeks)</th></tr>${trendRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Risk Status · Avg score ${report.avgRiskScore}</th></tr>${statusRows}</table>
    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:8px">
      <p style="font-weight:700;font-size:13px;color:#475569;margin:0 0 10px">Recommendations</p>${recList}</div>`;
}