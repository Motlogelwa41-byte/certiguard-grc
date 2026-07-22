import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { jsPDF } from "npm:jspdf@4.2.1";
import { sendGmail } from "../../shared/gmailSender.ts";
import {
  esc, scoreColor, verdictFromScore, pdfFooter, pdfHeader, pdfScoreHero,
  pdfMetricGrid, pdfSectionTitle, emailShell
} from "../../shared/reportBuilder.ts";

// Generates a clean Audit Readiness PDF server-side, uploads it, and emails
// each recipient a branded HTML summary with a one-click PDF download link via
// the shared Gmail integration (so it can reach external executives).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const recipients = String(body.recipients || "").split(",").map((e) => e.trim()).filter((e) => e.includes("@"));
    if (recipients.length === 0) return Response.json({ error: "No recipients provided" }, { status: 400 });

    const sr = base44.asServiceRole;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    const [controls, frameworks, findings, risks, incidents] = await Promise.all([
      sr.entities.Control.list("-updated_date", 1000).catch(() => []),
      sr.entities.Framework.list("-updated_date", 200).catch(() => []),
      sr.entities.AuditFinding.list("-updated_date", 200).catch(() => []),
      sr.entities.Risk.list("-created_date", 300).catch(() => []),
      sr.entities.Incident.list("-created_date", 100).catch(() => []),
    ]);

    const passing = controls.filter((c) => c.status === "passing").length;
    const failing = controls.filter((c) => c.status === "failing").length;
    const notTested = controls.filter((c) => c.status === "not_tested").length;
    const total = controls.length;
    const readiness = total > 0 ? Math.round((passing / total) * 100) : 0;
    const verdict = verdictFromScore(readiness);

    const fwScores = {};
    (frameworks || []).forEach((f) => {
      fwScores[f.name] = f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : (f.readiness_score || 0);
    });

    const sevRank = { critical: 4, high: 3, medium: 2, low: 1 };
    const topFailing = [...(controls || [])].filter((c) => c.status === "failing")
      .sort((a, b) => (sevRank[b.severity] || 0) - (sevRank[a.severity] || 0)).slice(0, 10);

    const openFindings = (findings || []).filter((f) => f.status === "open" || f.status === "in_remediation");
    const risksExceeding = (risks || []).filter((r) => r.exceeds_tolerance || (r.risk_score || 0) > 12);
    const openIncidents = (incidents || []).filter((i) => i.status !== "closed" && i.status !== "false_positive").length;

    const report = { readiness, verdict, passing, failing, notTested, total, fwScores, topFailing, openFindings, risksExceeding, openIncidents };

    const pdfBytes = buildPdf({ report, dateStr });
    let pdfUrl = null;
    let uploadError = null;
    try {
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const file = new File([blob], `Audit_Readiness_Report_${dateStr}.pdf`, { type: "application/pdf" });
      const up = await sr.integrations.Core.UploadFile({ file });
      pdfUrl = up?.file_url || null;
    } catch (e) {
      uploadError = e?.message || "upload failed";
      console.error("sendAuditReadinessReport PDF upload failed:", uploadError);
    }

    const subject = `Audit Readiness Report — ${now.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`;
    const tablesHtml = buildTablesHtml(report);
    let sent = 0, failed = 0;
    for (const email of recipients) {
      try {
        const html = emailShell({
          subject: `📋 ${subject}`, dateStr, score: report.readiness, verdict: report.verdict,
          metrics: [
            ["Controls Passing", `${report.passing} / ${report.total}`, "#10b981"],
            ["Controls Failing", String(report.failing), "#ef4444"],
            ["Open Findings", String(report.openFindings.length), "#0f172a"],
            ["Risks > Tolerance", String(report.risksExceeding.length), "#ef4444"],
          ],
          tablesHtml, pdfUrl, message: body.message || "",
          pdfFilename: `Audit_Readiness_Report_${dateStr}.pdf`,
          buttonLabel: "📄 Download Report (PDF)",
        });
        await sendGmail(base44, email, subject, html);
        sent++;
      } catch (e) {
        console.error("sendAuditReadinessReport email failed:", email, e?.message || e);
        failed++;
      }
    }

    return Response.json({ ok: true, sent, failed, recipients: recipients.length, pdfUrl, uploadError, readiness, verdict });
  } catch (error) {
    console.error("sendAuditReadinessReport error:", error?.message || error);
    return Response.json({ ok: false, error: error?.message || "Audit readiness report failed" }, { status: 500 });
  }
});

function buildPdf({ report, dateStr }) {
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = pdfHeader(doc, pageW, margin, "Audit Readiness Report", `${dateStr}  ·  Confidential`);
  const ensureSpace = (need) => { if (y + need > pageH - 40) { doc.addPage(); y = margin; } };

  const c = scoreColor(report.readiness);
  pdfScoreHero(doc, margin, y, report.readiness, report.verdict, c);
  const metrics = [
    ["Controls Passing", `${report.passing} / ${report.total}`],
    ["Controls Failing", String(report.failing)],
    ["Not Tested", String(report.notTested)],
    ["Open Findings", String(report.openFindings.length)],
    ["Risks > Tolerance", String(report.risksExceeding.length)],
    ["Open Incidents", String(report.openIncidents)],
  ];
  const colW = (contentW - 130) / 3;
  pdfMetricGrid(doc, margin + 130, y, metrics, colW);
  y += 80;

  // Framework readiness
  y = pdfSectionTitle(doc, "Framework Readiness", margin, pageW, y);
  const fwEntries = Object.entries(report.fwScores);
  if (fwEntries.length === 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No frameworks configured.", margin, y); y += 14;
  } else {
    fwEntries.forEach(([name, sc]) => {
      ensureSpace(18);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(String(name).slice(0, 40), margin, y);
      const barX = margin + 220, barW = contentW - 220 - 44;
      doc.setFillColor(226, 232, 240); doc.roundedRect(barX, y - 8, barW, 10, 2, 2, "F");
      const cc = scoreColor(sc);
      doc.setFillColor(...cc); doc.roundedRect(barX, y - 8, Math.max(2, (barW * sc) / 100), 10, 2, 2, "F");
      doc.setTextColor(...cc); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(`${sc}%`, pageW - margin, y, { align: "right" });
      y += 18;
    });
  }
  y += 6;

  // Top failing controls
  y = pdfSectionTitle(doc, "Top Failing Controls", margin, pageW, y);
  if (report.topFailing.length === 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No failing controls.", margin, y); y += 14;
  } else {
    report.topFailing.forEach((c2, i) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(`${i + 1}. ${c2.control_id ? "[" + c2.control_id + "] " : ""}${c2.title}`, contentW - 60);
      doc.text(lines, margin, y);
      doc.setFont("helvetica", "bold");
      doc.text(String(c2.severity || ""), pageW - margin, y, { align: "right" });
      y += lines.length * 12 + 4;
    });
  }
  y += 6;

  // Open findings
  y = pdfSectionTitle(doc, `Open Audit Findings (${report.openFindings.length})`, margin, pageW, y);
  if (report.openFindings.length === 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No open audit findings.", margin, y); y += 14;
  } else {
    report.openFindings.slice(0, 12).forEach((f) => {
      ensureSpace(16);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      const lines = doc.splitTextToSize(f.title || "", contentW - 60);
      doc.text(lines, margin, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(239, 68, 68);
      doc.text(String(f.severity || ""), pageW - margin, y, { align: "right" });
      y += lines.length * 12 + 4;
    });
  }
  y += 6;

  // Risks above tolerance
  y = pdfSectionTitle(doc, `Risks Above Tolerance (${report.risksExceeding.length})`, margin, pageW, y);
  if (report.risksExceeding.length === 0) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("No risks above tolerance.", margin, y); y += 14;
  } else {
    report.risksExceeding.slice(0, 10).forEach((r) => {
      ensureSpace(14);
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
      doc.text(String(r.title || "").slice(0, 70), margin, y);
      doc.setFont("helvetica", "bold"); doc.setTextColor(239, 68, 68);
      doc.text(String(r.risk_score || "—"), pageW - margin, y, { align: "right" });
      y += 14;
    });
  }

  pdfFooter(doc, pageW, pageH, "Confidential — CertiGuard GRC");
  return doc.output("arraybuffer");
}

function buildTablesHtml(report) {
  const fwRows = Object.entries(report.fwScores).map(([name, sc]) => {
    const bg = sc >= 80 ? "#dcfce7" : sc >= 50 ? "#fef3c7" : "#fee2e2";
    const t = sc >= 80 ? "#166534" : sc >= 50 ? "#92400e" : "#991b1b";
    return `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(name)}</td>
      <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${bg};color:${t};padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px">${sc}%</span></td></tr>`;
  }).join("") || '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No frameworks configured.</td></tr>';

  const failRows = report.topFailing.length ? report.topFailing.map((c) =>
    `<tr><td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(c.control_id ? "[" + c.control_id + "] " : "")}${esc(c.title)}</td>
     <td style="padding:8px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:700">${esc(c.severity || "")}</td></tr>`
  ).join("") : '<tr><td style="padding:9px 14px;font-size:13px;color:#64748b">No failing controls.</td></tr>';

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Framework Readiness</th></tr>${fwRows}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Top Failing Controls</th></tr>${failRows}</table>`;
}