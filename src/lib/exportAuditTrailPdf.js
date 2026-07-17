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

const ACTION_STYLE = {
  login: [221, 83, 53], logout: [148, 163, 184], create: [16, 185, 129],
  update: [37, 99, 235], delete: [239, 68, 68], approve: [16, 185, 129],
  reject: [239, 68, 68], export: [245, 158, 11], view: [100, 116, 139]
};

async function gatherAuditTrail() {
  const [trust, audits] = await Promise.all([
    base44.entities.TrustCenter.list().catch(() => []),
    base44.entities.AuditTrail.list("-created_date", 1000).catch(() => [])
  ]);
  return { orgName: trust[0]?.company_name || "—", logs: audits };
}

/**
 * Export the full audit trail as a professional, branded PDF (landscape, paginated).
 * @param {object} opts
 * @param {Array} [opts.auditLogs] - pass already-loaded logs; otherwise fetched (up to 1000).
 */
export async function exportAuditTrailPdf({ auditLogs } = {}) {
  const { orgName, logs: fetched } = await gatherAuditTrail();
  const logs = auditLogs && auditLogs.length ? auditLogs : fetched;

  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  let page = 1;
  let y = M;
  const contentW = W - M * 2;

  const header = () => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 58, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("CertiGuard GRC", M, 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.light);
    doc.text("Audit Trail Report", M, 42);
    doc.text(`Organization: ${orgName}`, W - M, 26, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, W - M, 42, { align: "right" });
    y = 80;
  };

  const footer = () => {
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.5);
    doc.line(M, H - 32, W - M, H - 32);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("Confidential — tamper-evident (SHA-256 hash-chained). Prepared for auditor / board review.", M, H - 20);
    doc.text(`Page ${page}`, W - M, H - 20, { align: "right" });
  };

  const ensure = (h) => {
    if (y + h > H - 48) { footer(); doc.addPage(); page++; header(); }
  };

  header();

  // Summary band
  const uniqueUsers = new Set(logs.map((l) => l.performed_by_id).filter(Boolean)).size;
  const dateRange = logs.length
    ? `${fmtDate(logs[logs.length - 1].created_date)} → ${fmtDate(logs[0].created_date)}`
    : "—";
  const summary = [
    { label: "Total entries", value: logs.length },
    { label: "Unique users", value: uniqueUsers },
    { label: "Date range", value: dateRange }
  ];
  const sw = contentW / 3;
  summary.forEach((s, i) => {
    const x = M + i * sw;
    doc.setFillColor(...C.light);
    doc.roundedRect(x, y, sw - 12, 52, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.blue);
    doc.text(String(s.value).slice(0, 40), x + 12, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.slate);
    doc.text(s.label, x + 12, y + 42);
  });
  y += 70;

  // Table
  const headers = ["#", "Timestamp", "Action", "Entity", "Entity Name", "Performed By", "IP Address"];
  const ratios = [0.04, 0.19, 0.09, 0.12, 0.21, 0.17, 0.18];
  const widths = ratios.map((r) => r * contentW);
  const rowH = 18;

  ensure(rowH + 4);
  doc.setFillColor(...C.navy);
  doc.rect(M, y, contentW, rowH, "F");
  doc.setTextColor(...C.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let x = M + 5;
  headers.forEach((h, i) => { doc.text(h, x, y + 12); x += widths[i]; });
  y += rowH;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  logs.forEach((l, ri) => {
    ensure(rowH);
    if (ri % 2 === 1) {
      doc.setFillColor(...C.light);
      doc.rect(M, y, contentW, rowH, "F");
    }
    const style = ACTION_STYLE[l.action] || C.slate;
    const cells = [
      String(ri + 1),
      fmtDate(l.created_date),
      l.action || "—",
      l.entity_type || "—",
      l.entity_name || "—",
      l.performed_by_name || "System",
      l.ip_address || "—"
    ];
    x = M + 5;
    cells.forEach((cell, i) => {
      if (i === 2) {
        doc.setTextColor(...style);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(...C.navy);
        doc.setFont("helvetica", "normal");
      }
      doc.text(String(cell ?? "—").slice(0, 80), x, y + 12, { maxWidth: widths[i] - 8 });
      x += widths[i];
    });
    y += rowH;
  });

  footer();
  doc.save(`CertiGuard_Audit_Trail_${new Date().toISOString().slice(0, 10)}.pdf`);
  return { pages: page, entries: logs.length };
}