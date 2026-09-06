import jsPDF from "jspdf";

/**
 * Generates a clean, professional PDF compliance report from Auditor Dashboard data.
 * Designed for handover to bank examiners during site visits.
 */
export function generateAuditorPdf({ controls, policies, ledger, user }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Colors
  const NAVY = [10, 36, 99];
  const ACCENT = [62, 146, 204];
  const MUTED = [120, 130, 145];
  const LIGHT_BG = [245, 247, 250];
  const EMERALD = [22, 163, 74];
  const ROSE = [220, 38, 38];
  const AMBER = [217, 119, 6];

  // --- Header band ---
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 70, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Compliance Readiness Report", margin, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString("en-ZA")}`, margin, 48);
  if (user?.email) doc.text(`Prepared for: ${user.full_name || user.email}`, margin, 60);

  y = 90;

  // --- Readiness summary ---
  const passing = controls.filter((c) => c.status === "passing");
  const failing = controls.filter((c) => c.status === "failing");
  const notTested = controls.filter((c) => c.status === "not_tested" || !c.status);
  const tested = passing.length + failing.length;
  const score = tested > 0 ? Math.round((passing.length / tested) * 100) : 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  const scoreColor = score >= 80 ? EMERALD : score >= 60 ? AMBER : ROSE;

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("1. Readiness Summary", margin, y);
  y += 8;

  doc.setDrawColor(220, 225, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // Score box
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(margin, y, 120, 60, 6, 6, "F");
  doc.setTextColor(...scoreColor);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(`${score}%`, margin + 60, y + 36, { align: "center" });
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Grade ${grade}`, margin + 60, y + 52, { align: "center" });

  // Stat boxes
  const stats = [
    { label: "Passing", value: passing.length, color: EMERALD },
    { label: "Failing", value: failing.length, color: ROSE },
    { label: "Not Tested", value: notTested.length, color: AMBER },
    { label: "Evidence Items", value: ledger.length, color: ACCENT },
  ];
  stats.forEach((s, i) => {
    const x = margin + 140 + i * 90;
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, 80, 60, 6, 6, "F");
    doc.setTextColor(...s.color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(String(s.value), x + 40, y + 34, { align: "center" });
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(s.label, x + 40, y + 50, { align: "center" });
  });

  y += 80;

  if (failing.length > 0) {
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentW, 24, 4, 4, "F");
    doc.setTextColor(...ROSE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`! ${failing.length} control(s) currently failing — remediation required before audit sign-off.`, margin + 8, y + 16);
    y += 32;
  }

  // --- Controls table ---
  y = checkPageBreak(doc, y, 60, margin, pageH);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("2. Controls Register", margin, y);
  y += 8;
  doc.setDrawColor(220, 225, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  // Table header
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("ID", margin + 6, y + 13);
  doc.text("Title", margin + 70, y + 13);
  doc.text("Category", margin + 300, y + 13);
  doc.text("Status", margin + 420, y + 13);
  doc.text("Owner", margin + 490, y + 13);
  y += 20;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  controls.slice(0, 100).forEach((c, i) => {
    y = checkPageBreak(doc, y, 18, margin, pageH);
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(margin, y, contentW, 16, "F");
    }
    doc.setTextColor(...MUTED);
    doc.text(truncate(c.control_id || "—", 12), margin + 6, y + 11);
    doc.setTextColor(40, 40, 50);
    doc.text(truncate(c.title || "—", 40), margin + 70, y + 11);
    doc.setTextColor(...MUTED);
    doc.text(truncate((c.category || "—").replace(/_/g, " "), 20), margin + 300, y + 11);
    const statusColor = c.status === "passing" ? EMERALD : c.status === "failing" ? ROSE : AMBER;
    doc.setTextColor(...statusColor);
    doc.text(truncate(c.status || "not_tested", 14), margin + 420, y + 11);
    doc.setTextColor(...MUTED);
    doc.text(truncate(c.owner_name || "—", 16), margin + 490, y + 11);
    y += 16;
  });
  y += 12;

  // --- Policies table ---
  y = checkPageBreak(doc, y, 60, margin, pageH);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("3. Approved Policies", margin, y);
  y += 8;
  doc.setDrawColor(220, 225, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Title", margin + 6, y + 13);
  doc.text("Category", margin + 250, y + 13);
  doc.text("Version", margin + 380, y + 13);
  doc.text("Next Review", margin + 450, y + 13);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  policies.slice(0, 80).forEach((p, i) => {
    y = checkPageBreak(doc, y, 18, margin, pageH);
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(margin, y, contentW, 16, "F");
    }
    doc.setTextColor(40, 40, 50);
    doc.text(truncate(p.title || "—", 38), margin + 6, y + 11);
    doc.setTextColor(...MUTED);
    doc.text(truncate((p.category || "—").replace(/_/g, " "), 20), margin + 250, y + 11);
    doc.text(truncate(p.version || "—", 12), margin + 380, y + 11);
    doc.text(truncate(p.next_review_date || "—", 14), margin + 450, y + 11);
    y += 16;
  });
  y += 12;

  // --- Evidence ledger ---
  y = checkPageBreak(doc, y, 60, margin, pageH);
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("4. Evidence Ledger (SHA-256 Integrity)", margin, y);
  y += 8;
  doc.setDrawColor(220, 225, 230);
  doc.line(margin, y, pageW - margin, y);
  y += 16;

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 20, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Timestamp", margin + 6, y + 13);
  doc.text("Submitted By", margin + 130, y + 13);
  doc.text("File Name", margin + 260, y + 13);
  doc.text("SHA-256 Hash", margin + 420, y + 13);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  ledger.slice(0, 120).forEach((l, i) => {
    y = checkPageBreak(doc, y, 18, margin, pageH);
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT_BG);
      doc.rect(margin, y, contentW, 16, "F");
    }
    doc.setTextColor(...MUTED);
    doc.text(truncate(l.timestamp ? new Date(l.timestamp).toLocaleDateString("en-ZA") : "—", 18), margin + 6, y + 11);
    doc.text(truncate(l.user_name || "—", 18), margin + 130, y + 11);
    doc.setTextColor(40, 40, 50);
    doc.text(truncate(l.file_name || "—", 24), margin + 260, y + 11);
    doc.setTextColor(...MUTED);
    doc.text(truncate(l.sha256_hash || "—", 24), margin + 420, y + 11);
    y += 16;
  });

  // --- Footer on every page ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(220, 225, 230);
    doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("CertiGuard GRC — Confidential Compliance Report", margin, pageH - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 18, { align: "right" });
  }

  doc.save(`Auditor_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function checkPageBreak(doc, y, needed, margin, pageH) {
  if (y + needed > pageH - 50) {
    doc.addPage();
    return margin;
  }
  return y;
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}