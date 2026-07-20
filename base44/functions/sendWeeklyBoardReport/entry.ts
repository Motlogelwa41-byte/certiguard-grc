import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { jsPDF } from 'npm:jspdf@4.2.1';

// Weekly board report — runs every Monday via the WeeklyBoardReportEmail workflow.
// Generates a board-ready PDF server-side, uploads it to app storage, stores a
// ManagementReport snapshot, and emails the management team (recipients of all
// active ReportSchedule records) a rich HTML summary with a one-click PDF
// download link so they can review compliance status without logging in.
//
// NOTE: the built-in SendEmail integration does not support file attachments,
// so the PDF is delivered as a download link inside the email (the full report
// is also rendered as HTML in the body so recipients can always review it).

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
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

    // ── Compute metrics (mirrors BoardReport.jsx) ──────────────────────────
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

    const report = {
      complianceScore, passing, total, fwScores, topRisks, sevCounts,
      openFindings: openFindings.length, overdueTasks, openIncidents,
      openRisks: openRisks.length, completedTasks, totalTasks: tasks.length, recs,
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
        executive_summary: `Weekly board snapshot for ${dateStr}: compliance score ${complianceScore}%, ${passing}/${total} controls passing, ${openRisks.length} open risks, ${openFindings.length} open findings, ${overdueTasks} overdue tasks.`,
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
    let sent = 0, failed = 0;
    for (const email of recipients) {
      try {
        const html = buildEmailHtml({ report, dateStr, pdfUrl, subject });
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
  let y = 0;

  const ensureSpace = (need) => {
    if (y + need > pageH - 40) { doc.addPage(); y = margin; }
  };

  // Header band
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 64, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Board Compliance Report', margin, 28);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`${tenantName || 'CertiGuard GRC'}  ·  ${dateStr}  ·  Confidential`, margin, 46);
  doc.text(`Generated ${new Date().toLocaleString('en-ZA')}`, pageW - margin, 46, { align: 'right' });
  y = 88;

  // Compliance score hero
  const scoreColor = report.complianceScore >= 80 ? [16, 185, 129] : report.complianceScore >= 50 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(...scoreColor); doc.roundedRect(margin, y, 110, 64, 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28);
  doc.text(`${report.complianceScore}%`, margin + 55, y + 38, { align: 'center' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('Compliance Score', margin + 55, y + 52, { align: 'center' });

  // Headline metrics beside the score
  doc.setTextColor(15, 23, 42);
  const metrics = [
    ['Controls Passing', `${report.passing} / ${report.total}`],
    ['Open Risks', String(report.openRisks)],
    ['Open Findings', String(report.openFindings)],
    ['Open Incidents', String(report.openIncidents)],
    ['Overdue Tasks', String(report.overdueTasks)],
    ['Tasks Completed', `${report.completedTasks} / ${report.totalTasks}`],
  ];
  let mx = margin + 130, my = y, colW = (contentW - 130) / 3;
  metrics.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = margin + 130 + col * colW, yy = y + row * 34;
    doc.setFillColor(248, 250, 252); doc.roundedRect(x, yy, colW - 8, 28, 4, 4, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(m[0], x + 8, yy + 12);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
    doc.text(m[1], x + 8, yy + 24);
  });
  y += 80;

  // Framework readiness
  ensureSpace(40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text('Framework Readiness', margin, y); y += 8;
  doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y); y += 14;
  const fwEntries = Object.entries(report.fwScores);
  if (fwEntries.length === 0) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text('No frameworks configured.', margin, y); y += 14;
  } else {
    fwEntries.forEach(([name, score]) => {
      ensureSpace(18);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(String(name).slice(0, 40), margin, y);
      // bar
      const barX = margin + 220, barW = contentW - 220 - 44;
      doc.setFillColor(226, 232, 240); doc.roundedRect(barX, y - 8, barW, 10, 2, 2, 'F');
      const c = score >= 80 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
      doc.setFillColor(...c); doc.roundedRect(barX, y - 8, Math.max(2, (barW * score) / 100), 10, 2, 2, 'F');
      doc.setTextColor(...c); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
      doc.text(`${score}%`, pageW - margin, y, { align: 'right' });
      y += 18;
    });
  }
  y += 6;

  // Top open risks
  ensureSpace(40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text('Top Open Risks', margin, y); y += 8;
  doc.line(margin, y, pageW - margin, y); y += 14;
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

  // Findings by severity
  ensureSpace(40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text('Open Findings by Severity', margin, y); y += 8;
  doc.line(margin, y, pageW - margin, y); y += 14;
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
  ensureSpace(40);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text('Recommendations', margin, y); y += 8;
  doc.line(margin, y, pageW - margin, y); y += 14;
  report.recs.forEach((r) => {
    const lines = doc.splitTextToSize(`•  ${r}`, contentW);
    ensureSpace(lines.length * 12 + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(51, 65, 85);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 4;
  });

  // Footer page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${totalPages} · Confidential — CertiGuard GRC`, pageW / 2, pageH - 16, { align: 'center' });
  }

  return doc.output('arraybuffer');
}

// ── Rich HTML email with embedded PDF download button ────────────────────────
function buildEmailHtml({ report, dateStr, pdfUrl, subject }) {
  const scoreColor = report.complianceScore >= 80 ? '#10b981' : report.complianceScore >= 50 ? '#f59e0b' : '#ef4444';
  const pdfBtn = pdfUrl
    ? `<a href="${esc(pdfUrl)}" download="Board_Compliance_Report_${esc(dateStr)}.pdf" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;margin:0 4px 8px 0">📄 Download Board Report (PDF)</a>`
    : '';

  const metric = (label, value, color = '#0f172a') =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${label}</td>
     <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${color}">${value}</td></tr>`;

  const fwRows = Object.entries(report.fwScores).map(([name, score]) => {
    const c = score >= 80 ? '#dcfce7' : score >= 50 ? '#fef3c7' : '#fee2e2';
    const t = score >= 80 ? '#166534' : score >= 50 ? '#92400e' : '#991b1b';
    return `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(name)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${c};color:${t};padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px">${score}%</span></td></tr>`;
  }).join('') || '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No frameworks configured.</td></tr>';

  const riskRows = report.topRisks.length ? report.topRisks.map((r) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(r.title)}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${esc(r.risk_score || '—')}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;text-transform:capitalize">${esc(r.status || '')}</td></tr>`
  ).join('') : '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No open risks.</td></tr>';

  const recList = report.recs.map((r) => `<p style="font-size:13px;margin:0 0 6px;padding-left:14px;border-left:3px solid ${scoreColor};color:#1e293b">${esc(r)}</p>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>body{font-family:system-ui,sans-serif;background:#f8fafc;padding:20px;color:#1e293b}
  .w{max-width:920px;margin:0 auto}.h{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:24px 32px;border-radius:12px 12px 0 0}
  .h h1{font-size:20px;margin:0 0 4px}.h p{margin:0;opacity:.85;font-size:13px}
  .c{background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
  .f{text-align:center;padding:16px;font-size:11px;color:#94a3b8}</style></head><body>
  <div class="w"><div class="h"><h1>📊 ${esc(subject)}</h1>
  <p>Weekly board compliance report — ${new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p></div>
  <div class="c">
    ${pdfBtn ? `<div style="margin-bottom:20px;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px">
      <p style="margin:0 0 8px;font-size:13px;color:#1e3a5f"><strong>Board-ready PDF attached below</strong> — no login required to review.</p>${pdfBtn}</div>` : ''}
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:18px 26px;color:white;text-align:center">
        <div style="font-size:36px;font-weight:900">${report.complianceScore}%</div><div style="font-size:11px;opacity:.85">Compliance Score</div>
      </div>
      <div style="flex:1"><table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Key Metrics</th></tr>
        ${metric('Controls Passing', `${report.passing} / ${report.total}`, '#10b981')}
        ${metric('Open Risks', report.openRisks, report.openRisks > 5 ? '#ef4444' : '#f59e0b')}
        ${metric('Open Findings', report.openFindings, report.sevCounts.critical > 0 ? '#ef4444' : '#0f172a')}
        ${metric('Overdue Tasks', report.overdueTasks, report.overdueTasks > 0 ? '#ef4444' : '#10b981')}
        ${metric('Open Incidents', report.openIncidents, report.openIncidents > 0 ? '#ef4444' : '#10b981')}
        ${metric('Tasks Completed', `${report.completedTasks} / ${report.totalTasks}`, '#3b82f6')}
      </table></div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Framework Readiness</th></tr>${fwRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="3" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Top Open Risks</th></tr>
      <tr style="color:#64748b;font-size:11px"><th style="padding:6px 14px;text-align:left">Risk</th><th style="padding:6px 14px;text-align:left">Score</th><th style="padding:6px 14px;text-align:left">Status</th></tr>${riskRows}</table>
    <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:8px">
      <p style="font-weight:700;font-size:13px;color:#475569;margin:0 0 10px">Recommendations</p>${recList}</div>
    <p style="font-size:11px;color:#94a3b8;margin-top:16px">${pdfUrl ? 'The PDF report is linked above for download. ' : ''}This report is generated automatically every Monday from live data — no login required to review.</p>
  </div><div class="f">Confidential — CertiGuard GRC · ${dateStr}</div></div></body></html>`;
}