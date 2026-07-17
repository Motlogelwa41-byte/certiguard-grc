import { jsPDF } from "jspdf";
import { base44 } from "@/api/base44Client";

const C = {
  navy: [15, 23, 42], blue: [37, 99, 235], slate: [100, 116, 139],
  light: [241, 245, 249], muted: [148, 163, 184],
  green: [16, 185, 129], red: [239, 68, 68], amber: [245, 158, 11], white: [255, 255, 255],
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

async function gather() {
  const [frameworks, controls, risks, tasks, trust, audits] = await Promise.all([
    base44.entities.Framework.list().catch(() => []),
    base44.entities.Control.list().catch(() => []),
    base44.entities.Risk.list().catch(() => []),
    base44.entities.ComplianceTask.list().catch(() => []),
    base44.entities.TrustCenter.list().catch(() => []),
    base44.entities.AuditTrail.list("-created_date", 1000).catch(() => []),
  ]);
  const orgName = trust[0]?.company_name || "—";
  return { frameworks, controls, risks, tasks, orgName, audits };
}

/**
 * Generate a professional, branded PDF "Evidence Pack" containing the current
 * compliance status and the full audit trail — suitable for auditors and board.
 * @param {object} opts
 * @param {Array} [opts.auditLogs] - pass already-loaded audit logs to use them; otherwise fetched.
 */
export async function exportEvidencePack({ auditLogs } = {}) {
  const data = await gather();
  const logs = auditLogs && auditLogs.length ? auditLogs : data.audits;

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
    doc.text("Compliance Evidence Pack", M, 46);
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
    doc.text("Confidential — prepared for auditor / board review", M, H - 26);
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
        doc.text(String(cell ?? "—").slice(0, 70), x, y + 13, { maxWidth: widths[i] - 8 });
        x += widths[i];
      });
      y += rowH;
    });
    y += 10;
  };

  header();

  // Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.navy);
  ensure(36);
  doc.text("Compliance Evidence Pack", M, y);
  y += 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.slate);
  [
    `Organization: ${data.orgName}`,
    `Prepared: ${new Date().toLocaleString()}`,
    `Scope: Compliance status and complete audit trail`,
    `Tiers covered: Frameworks, Controls, Risks, Tasks, Audit Trail`,
  ].forEach((l) => {
    ensure(16);
    doc.text(l, M, y);
    y += 16;
  });
  y += 8;

  // 1. Compliance status
  const ctrl = data.controls;
  const ctrlPass = ctrl.filter((c) => c.status === "passing").length;
  const ctrlFail = ctrl.filter((c) => c.status === "failing").length;
  const risks = data.risks;
  const riskOpen = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
  const riskClosed = risks.filter((r) => r.status === "closed").length;
  const tasks = data.tasks;
  const taskDone = tasks.filter((t) => t.status === "completed").length;
  const taskOver = tasks.filter((t) => t.status === "overdue").length;
  const fwTotal = data.frameworks.length;
  const fwAvg = fwTotal ? Math.round(data.frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / fwTotal) : 0;

  sectionTitle("1. Compliance Status Summary");
  const cards = [
    { label: "Frameworks", value: fwTotal, sub: `${fwAvg}% avg readiness`, color: C.blue },
    { label: "Controls", value: ctrl.length, sub: `${ctrlPass} passing · ${ctrlFail} failing`, color: C.green },
    { label: "Risks", value: risks.length, sub: `${riskOpen} open · ${riskClosed} closed`, color: C.amber },
    { label: "Tasks", value: tasks.length, sub: `${taskDone} done · ${taskOver} overdue`, color: C.blue },
  ];
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

  sectionTitle("2. Frameworks");
  if (data.frameworks.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No frameworks configured.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Framework", "Status", "Readiness", "Controls"],
      data.frameworks.map((f) => [f.name || "—", f.status || "—", `${f.readiness_score || 0}%`, `${f.passing_controls || 0}/${f.total_controls || 0}`]),
      [0.42, 0.2, 0.2, 0.18]
    );
  }

  sectionTitle("3. Risk Summary");
  drawTable(
    ["Risk", "Category", "Score", "Status", "Owner"],
    risks.slice(0, 25).map((r) => [r.title || "—", r.category || "—", String(r.risk_score ?? "—"), r.status || "—", r.owner_name || "—"]),
    [0.34, 0.18, 0.1, 0.18, 0.2]
  );
  if (risks.length > 25) {
    ensure(14);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`…and ${risks.length - 25} more risks (see Risk Register).`, M, y);
    y += 14;
  }

  // 4. Audit trail
  sectionTitle(`4. Audit Trail (${logs.length} entries)`);
  if (logs.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No audit trail entries recorded.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Timestamp", "Action", "Entity", "Entity Name", "Performed By"],
      logs.map((l) => [fmtDate(l.created_date), l.action || "—", l.entity_type || "—", l.entity_name || "—", l.performed_by_name || "System"]),
      [0.26, 0.1, 0.16, 0.24, 0.24]
    );
  }

  footer();
  doc.save(`CertiGuard_Evidence_Pack_${new Date().toISOString().slice(0, 10)}.pdf`);
  return { pages: page, auditEntries: logs.length };
}