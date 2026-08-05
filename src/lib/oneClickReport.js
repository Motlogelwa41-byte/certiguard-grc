import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

const C = {
  navy: [15, 23, 42], blue: [37, 99, 235], slate: [100, 116, 139],
  light: [241, 245, 249], muted: [148, 163, 184],
  green: [16, 185, 129], red: [239, 68, 68], amber: [245, 158, 11], white: [255, 255, 255],
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString(); } catch { return String(d); }
}

async function gather() {
  const [frameworks, controls, risks, tasks, evidence, trust, audits, policies, incidents] = await Promise.all([
    base44.entities.Framework.list().catch(() => []),
    base44.entities.Control.list().catch(() => []),
    base44.entities.Risk.list("-risk_score", 200).catch(() => []),
    base44.entities.ComplianceTask.list().catch(() => []),
    base44.entities.Evidence.list().catch(() => []),
    base44.entities.TrustCenter.list().catch(() => []),
    base44.entities.AuditTrail.list("-created_date", 500).catch(() => []),
    base44.entities.Policy.list().catch(() => []),
    base44.entities.Incident.list().catch(() => []),
  ]);
  const orgName = trust[0]?.company_name || "—";
  return { frameworks, controls, risks, tasks, evidence, orgName, audits, policies, incidents };
}

/**
 * One-click comprehensive auditor report PDF.
 * Includes: cover page, compliance score, framework readiness, control breakdown,
 * risk summary, task status, evidence status, policy status, audit trail summary.
 */
export async function generateOneClickReport() {
  const data = await gather();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let page = 1;
  let y = M;
  const contentW = W - M * 2;

  const header = () => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 64, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("CertiGuard GRC", M, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.light);
    doc.text("Compliance Status & Readiness Report", M, 46);
    doc.text(`Organization: ${data.orgName}`, W - M, 28, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, 46, { align: "right" });
    y = 92;
  };

  const footer = () => {
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.5);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("Confidential — Prepared for external auditor review", M, H - 26);
    doc.text(`Page ${page}`, W - M, H - 26, { align: "right" });
  };

  const ensure = (h) => {
    if (y + h > H - 60) {
      footer();
      doc.addPage();
      page++;
      header();
    }
  };

  const sectionTitle = (t) => {
    ensure(46);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.navy);
    doc.text(t, M, y);
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(2);
    doc.line(M, y + 4, M + 36, y + 4);
    y += 22;
  };

  const drawTable = (headers, rows, ratios) => {
    const widths = ratios.map((r) => r * contentW);
    const rowH = 20;
    ensure(rowH + 4);
    doc.setFillColor(...C.navy);
    doc.rect(M, y, contentW, rowH, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = M + 6;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 13);
      x += widths[i];
    });
    y += rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rows.forEach((row, ri) => {
      ensure(rowH);
      if (ri % 2 === 1) {
        doc.setFillColor(...C.light);
        doc.rect(M, y, contentW, rowH, "F");
      }
      x = M + 6;
      row.forEach((cell, i) => {
        doc.setTextColor(...C.navy);
        doc.text(String(cell ?? "—").slice(0, 60), x, y + 13, { maxWidth: widths[i] - 8 });
        x += widths[i];
      });
      y += rowH;
    });
    y += 10;
  };

  const drawKpiCards = (cards) => {
    const cardW = (contentW - 24) / 4;
    cards.forEach((c, i) => {
      const x = M + i * (cardW + 8);
      ensure(64);
      doc.setFillColor(...C.light);
      doc.roundedRect(x, y, cardW, 60, 6, 6, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(...c.color);
      doc.text(String(c.value), x + 12, y + 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.slate);
      doc.text(c.label, x + 12, y + 42);
      doc.setFontSize(7);
      doc.setTextColor(...C.muted);
      doc.text(c.sub, x + 12, y + 54);
    });
    y += 74;
  };

  // ===== COVER PAGE =====
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, H, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Compliance Status &", M, 200);
  doc.text("Readiness Report", M, 236);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...C.light);
  doc.text(`Organization: ${data.orgName}`, M, 280);
  doc.text(`Report Date: ${new Date().toLocaleDateString()}`, M, 300);
  doc.text(`Prepared by: CertiGuard GRC Platform`, M, 320);
  doc.text(`Scope: Full compliance posture summary for external auditor review`, M, 340);

  // Compliance score gauge on cover
  const ctrl = data.controls;
  const ctrlPass = ctrl.filter((c) => c.status === "passing").length;
  const complianceScore = ctrl.length ? Math.round((ctrlPass / ctrl.length) * 100) : 0;
  const scoreColor = complianceScore >= 70 ? C.green : complianceScore >= 40 ? C.amber : C.red;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(48);
  doc.setTextColor(...scoreColor);
  doc.text(`${complianceScore}%`, M, 400);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...C.light);
  doc.text("Overall Compliance Score", M, 420);

  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text("CONFIDENTIAL — This document contains sensitive compliance information.", M, H - 60);
  doc.text("Distribute only to authorized auditors and stakeholders.", M, H - 46);

  // ===== CONTENT PAGES =====
  doc.addPage();
  page++;
  header();

  // 1. Executive Summary
  sectionTitle("1. Executive Summary");
  const fwTotal = data.frameworks.length;
  const fwAvg = fwTotal ? Math.round(data.frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / fwTotal) : 0;
  const ctrlFail = ctrl.filter((c) => c.status === "failing").length;
  const ctrlNotTested = ctrl.filter((c) => c.status === "not_tested").length;
  const risks = data.risks;
  const riskOpen = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
  const tasks = data.tasks;
  const taskDone = tasks.filter((t) => t.status === "completed").length;
  const taskOver = tasks.filter((t) => t.status === "overdue").length;
  const evApproved = data.evidence.filter((e) => e.status === "approved").length;
  const polApproved = data.policies.filter((p) => p.status === "approved").length;

  drawKpiCards([
    { label: "Frameworks", value: fwTotal, sub: `${fwAvg}% avg readiness`, color: C.blue },
    { label: "Controls", value: ctrl.length, sub: `${ctrlPass} passing · ${ctrlFail} failing`, color: C.green },
    { label: "Risks", value: risks.length, sub: `${riskOpen} open`, color: C.amber },
    { label: "Tasks", value: tasks.length, sub: `${taskDone} done · ${taskOver} overdue`, color: C.blue },
  ]);

  ensure(60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.slate);
  const summaryLines = [
    `This report summarizes the current compliance posture of ${data.orgName} as of ${new Date().toLocaleDateString()}.`,
    `The organization tracks ${fwTotal} compliance framework(s) with an average readiness score of ${fwAvg}%.`,
    `Of ${ctrl.length} controls, ${ctrlPass} are passing (${complianceScore}%), ${ctrlFail} are failing, and ${ctrlNotTested} remain untested.`,
    `There are ${risks.length} risks in the register (${riskOpen} open) and ${tasks.length} compliance tasks (${taskOver} overdue).`,
    `Evidence library contains ${data.evidence.length} items (${evApproved} approved). ${polApproved} policies are approved and active.`,
  ];
  summaryLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, contentW);
    ensure(wrapped.length * 14 + 4);
    doc.text(wrapped, M, y);
    y += wrapped.length * 14 + 4;
  });

  // 2. Framework Readiness
  sectionTitle("2. Framework Readiness Scores");
  if (data.frameworks.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No frameworks configured.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Framework", "Status", "Readiness", "Controls", "Certification", "Expiry"],
      data.frameworks.map((f) => [
        f.name || "—",
        f.status || "—",
        `${f.readiness_score || 0}%`,
        `${f.passing_controls || 0}/${f.total_controls || 0}`,
        fmtDate(f.certification_date),
        fmtDate(f.expiry_date),
      ]),
      [0.28, 0.16, 0.14, 0.14, 0.14, 0.14]
    );
  }

  // 3. Control Status Breakdown
  sectionTitle("3. Control Status Breakdown");
  const categories = {};
  ctrl.forEach((c) => {
    const cat = c.category || "uncategorized";
    if (!categories[cat]) categories[cat] = { total: 0, passing: 0, failing: 0, not_tested: 0 };
    categories[cat].total++;
    if (c.status === "passing") categories[cat].passing++;
    if (c.status === "failing") categories[cat].failing++;
    if (c.status === "not_tested") categories[cat].not_tested++;
  });
  drawTable(
    ["Category", "Total", "Passing", "Failing", "Not Tested", "Pass Rate"],
    Object.entries(categories).map(([cat, s]) => [
      cat.replace(/_/g, " "),
      s.total,
      s.passing,
      s.failing,
      s.not_tested,
      `${s.total ? Math.round((s.passing / s.total) * 100) : 0}%`,
    ]),
    [0.34, 0.12, 0.14, 0.14, 0.14, 0.12]
  );

  // 4. Risk Summary
  sectionTitle("4. Risk Register Summary");
  const riskByLevel = { critical: 0, high: 0, medium: 0, low: 0 };
  risks.forEach((r) => {
    const score = r.risk_score || 0;
    if (score >= 20) riskByLevel.critical++;
    else if (score >= 12) riskByLevel.high++;
    else if (score >= 6) riskByLevel.medium++;
    else riskByLevel.low++;
  });
  drawKpiCards([
    { label: "Critical", value: riskByLevel.critical, sub: "score ≥ 20", color: C.red },
    { label: "High", value: riskByLevel.high, sub: "score 12–19", color: C.amber },
    { label: "Medium", value: riskByLevel.medium, sub: "score 6–11", color: C.blue },
    { label: "Low", value: riskByLevel.low, sub: "score < 6", color: C.green },
  ]);

  ensure(20);
  if (risks.length > 0) {
    drawTable(
      ["Risk", "Category", "Score", "Status", "Treatment", "Owner"],
      risks.slice(0, 20).map((r) => [
        r.title || "—",
        r.category || "—",
        String(r.risk_score ?? "—"),
        r.status || "—",
        r.treatment || "—",
        r.owner_name || "—",
      ]),
      [0.3, 0.16, 0.1, 0.14, 0.14, 0.16]
    );
    if (risks.length > 20) {
      ensure(14);
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`…and ${risks.length - 20} more risks in the register.`, M, y);
      y += 14;
    }
  }

  // 5. Task & Evidence Status
  sectionTitle("5. Compliance Tasks & Evidence");
  drawKpiCards([
    { label: "Tasks Done", value: taskDone, sub: `of ${tasks.length}`, color: C.green },
    { label: "Tasks Overdue", value: taskOver, sub: "needs attention", color: C.red },
    { label: "Evidence Items", value: data.evidence.length, sub: `${evApproved} approved`, color: C.blue },
    { label: "Policies", value: data.policies.length, sub: `${polApproved} approved`, color: C.amber },
  ]);

  // 6. Audit Trail Summary
  sectionTitle(`6. Audit Trail Summary (${data.audits.length} entries)`);
  if (data.audits.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No audit trail entries recorded.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Timestamp", "Action", "Entity", "Entity Name", "Performed By"],
      data.audits.slice(0, 30).map((l) => [
        fmtDate(l.created_date),
        l.action || "—",
        l.entity_type || "—",
        (l.entity_name || "—").slice(0, 30),
        l.performed_by_name || "System",
      ]),
      [0.22, 0.12, 0.16, 0.26, 0.24]
    );
    if (data.audits.length > 30) {
      ensure(14);
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text(`…and ${data.audits.length - 30} more entries in the full audit trail.`, M, y);
      y += 14;
    }
  }

  // 7. Auditor Attestation
  sectionTitle("7. Report Attestation");
  ensure(80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.slate);
  const attestation = [
    "This report was generated automatically by the CertiGuard GRC platform",
    `on ${new Date().toLocaleString()} and reflects the live compliance data`,
    `for ${data.orgName} at the time of generation.`,
    "",
    "All control statuses, risk scores, and framework readiness percentages",
    "are derived from real-time platform data and are audit-ready.",
    "",
    "Prepared by: CertiGuard GRC Platform (automated)",
    `Report ID: CG-RPT-${Date.now().toString(36).toUpperCase()}`,
  ];
  attestation.forEach((line) => {
    ensure(16);
    doc.text(line, M, y);
    y += 16;
  });

  footer();
  const filename = `CertiGuard_Compliance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  return { pages: page, filename, complianceScore, frameworks: fwTotal, controls: ctrl.length, risks: risks.length };
}