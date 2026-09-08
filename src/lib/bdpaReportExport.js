import { jsPDF } from "jspdf";

/**
 * Generates a regulator-ready PDF for the Botswana Data Protection Act compliance report.
 * @param {Object} data - { framework, requirements, controls, evidence, tasks, findings, orgName }
 */
export function exportBdpaReport(data) {
  const { framework, requirements = [], controls = [], evidence = [], tasks = [], findings = [], orgName = "Organization" } = data;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const colors = {
    primary: [222, 83, 21],
    dark: [30, 41, 59],
    muted: [100, 116, 139],
    light: [241, 245, 249],
    pass: [22, 163, 74],
    fail: [220, 38, 38],
    warn: [217, 119, 6],
  };
  const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
  const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

  const ensureSpace = (h) => {
    if (y + h > pageH - 50) { doc.addPage(); y = margin; }
  };

  // ── Header bar ──
  setFill(colors.primary); doc.rect(0, 0, pageW, 70, "F");
  setText([255, 255, 255]);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("Botswana Data Protection Act (DPA)", margin, 30);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Regulatory Compliance Report", margin, 48);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString("en-BW", { dateStyle: "full", timeStyle: "short" })}`, pageW - margin, 30, { align: "right" });
  y = 95;

  // ── Organization & Framework Info ──
  setText(colors.dark);
  doc.setFont("helvetica", "bold"); doc.setFontSize(12);
  doc.text(orgName, margin, y); y += 18;

  setText(colors.muted);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  const fwName = framework?.name || "Botswana Data Protection Act (DPA)";
  const fwVersion = framework?.version || "2018 (Effective 2025)";
  const fwAuthority = framework?.authority || "Botswana Communications Regulatory Authority (BOCRA)";
  const fwEffective = framework?.effective_date || "2025-01-01";
  const fwReqs = framework?.total_requirements || requirements.length || 42;

  doc.text(`Framework: ${fwName}`, margin, y); y += 13;
  doc.text(`Version: ${fwVersion}`, margin, y); y += 13;
  doc.text(`Authority: ${fwAuthority}`, margin, y); y += 13;
  doc.text(`Effective Date: ${fwEffective}`, margin, y); y += 13;
  doc.text(`Total Requirements: ${fwReqs}`, margin, y); y += 20;

  // ── Compliance Summary ──
  const passingControls = controls.filter((c) => c.status === "passing").length;
  const failingControls = controls.filter((c) => c.status === "failing").length;
  const notTested = controls.filter((c) => c.status === "not_tested").length;
  const approvedEvidence = evidence.filter((e) => e.status === "approved").length;
  const pendingEvidence = evidence.filter((e) => e.status === "pending_review").length;
  const openTasks = tasks.filter((t) => !["completed", "overdue"].includes(t.status)).length;
  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
  const openFindings = findings.filter((f) => ["open", "in_remediation"].includes(f.status)).length;
  const criticalFindings = findings.filter((f) => f.severity === "critical" && f.status !== "closed").length;
  const readiness = controls.length > 0 ? Math.round((passingControls / controls.length) * 100) : 0;

  setFill(colors.light); doc.rect(margin, y, pageW - margin * 2, 90, "F");
  setText(colors.dark); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Compliance Summary", margin + 12, y + 18);
  y += 30;

  const stats = [
    { label: "Readiness", value: `${readiness}%`, color: readiness >= 75 ? colors.pass : readiness >= 50 ? colors.warn : colors.fail },
    { label: "Controls Passing", value: `${passingControls}/${controls.length}`, color: colors.dark },
    { label: "Controls Failing", value: `${failingControls}`, color: failingControls > 0 ? colors.fail : colors.dark },
    { label: "Not Tested", value: `${notTested}`, color: colors.warn },
    { label: "Evidence Approved", value: `${approvedEvidence}/${evidence.length}`, color: colors.dark },
    { label: "Evidence Pending", value: `${pendingEvidence}`, color: colors.warn },
    { label: "Open Tasks", value: `${openTasks}`, color: openTasks > 0 ? colors.warn : colors.dark },
    { label: "Overdue Tasks", value: `${overdueTasks}`, color: overdueTasks > 0 ? colors.fail : colors.dark },
    { label: "Open Findings", value: `${openFindings}`, color: openFindings > 0 ? colors.fail : colors.pass },
    { label: "Critical Findings", value: `${criticalFindings}`, color: criticalFindings > 0 ? colors.fail : colors.pass },
  ];

  const colW = (pageW - margin * 2 - 24) / 5;
  stats.forEach((s, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = margin + 12 + col * colW;
    const sy = y + row * 28;
    setText(s.color); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(String(s.value), x, sy);
    setText(colors.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text(s.label, x, sy + 11);
  });
  y += 70;

  // ── Requirements Checklist ──
  ensureSpace(40);
  setText(colors.dark); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("DPA Requirements Checklist", margin, y); y += 16;
  setDraw(colors.light); doc.setLineWidth(0.5); doc.line(margin, y, pageW - margin, y); y += 10;

  if (requirements.length === 0) {
    setText(colors.muted); doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text("No requirements imported yet. Import the BDPA framework from the SADC Frameworks Library to populate this section.", margin, y);
    y += 20;
  } else {
    requirements.forEach((req, i) => {
      ensureSpace(24);
      const status = req.status || req.compliance_status || "not_assessed";
      const statusIcon = status === "compliant" ? "✓" : status === "non_compliant" ? "✗" : status === "partial" ? "◐" : "○";
      const statusColor = status === "compliant" ? colors.pass : status === "non_compliant" ? colors.fail : status === "partial" ? colors.warn : colors.muted;
      setText(statusColor); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text(statusIcon, margin, y);
      setText(colors.dark); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      const ref = req.reference || req.requirement_id || req.clause || `R${i + 1}`;
      doc.text(`${ref}: ${req.title || req.description || "Requirement"}`.substring(0, 95), margin + 14, y);
      y += 14;
    });
  }

  // ── Controls Status ──
  ensureSpace(40);
  y += 10;
  setText(colors.dark); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Controls Status", margin, y); y += 16;
  setDraw(colors.light); doc.line(margin, y, pageW - margin, y); y += 10;

  if (controls.length === 0) {
    setText(colors.muted); doc.setFont("helvetica", "italic"); doc.setFontSize(9);
    doc.text("No controls mapped to the BDPA framework yet.", margin, y); y += 20;
  } else {
    controls.forEach((c) => {
      ensureSpace(22);
      const sColor = c.status === "passing" ? colors.pass : c.status === "failing" ? colors.fail : colors.muted;
      setText(sColor); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(`[${(c.status || "not_tested").toUpperCase()}]`, margin, y);
      setText(colors.dark); doc.setFont("helvetica", "normal");
      doc.text(`${c.control_id || ""} ${c.title || ""}`.substring(0, 80), margin + 70, y);
      setText(colors.muted); doc.setFontSize(7);
      if (c.owner_name) doc.text(`Owner: ${c.owner_name}`, margin + 70, y + 9);
      y += 18;
    });
  }

  // ── Open Findings ──
  if (findings.length > 0) {
    ensureSpace(40);
    y += 10;
    setText(colors.dark); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Audit Findings", margin, y); y += 16;
    setDraw(colors.light); doc.line(margin, y, pageW - margin, y); y += 10;
    findings.forEach((f) => {
      ensureSpace(22);
      const sColor = f.severity === "critical" ? colors.fail : f.severity === "high" ? colors.fail : f.severity === "medium" ? colors.warn : colors.muted;
      setText(sColor); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.text(`[${(f.severity || "medium").toUpperCase()}]`, margin, y);
      setText(colors.dark); doc.setFont("helvetica", "normal");
      doc.text(`${f.title || ""}`.substring(0, 85), margin + 65, y);
      y += 14;
    });
  }

  // ── Footer on every page ──
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    setDraw(colors.light); doc.setLineWidth(0.5);
    doc.line(margin, pageH - 35, pageW - margin, pageH - 35);
    setText(colors.muted); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
    doc.text("CertiGuard GRC — Confidential Compliance Report", margin, pageH - 22);
    doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 22, { align: "right" });
    doc.text("This report is generated for regulatory submission under the Botswana Data Protection Act (Act No. 8 of 2018).", margin, pageH - 12);
  }

  doc.save(`BDPA_Compliance_Report_${new Date().toISOString().split("T")[0]}.pdf`);
}