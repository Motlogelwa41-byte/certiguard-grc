// Shared helpers for compliance report PDF + email generation.
// Used by sendWeeklyBoardReport and sendAuditReadinessReport to avoid duplication.

export function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

export function scoreColor(score) {
  return score >= 80 ? [16, 185, 129] : score >= 60 ? [245, 158, 11] : [239, 68, 68];
}

export function scoreColorHex(score) {
  return score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
}

export function verdictFromScore(score) {
  return score >= 80 ? "Audit Ready" : score >= 60 ? "On Track" : "Needs Attention";
}

export function pdfFooter(doc, pageW, pageH, label) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setTextColor(150, 150, 150); doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${totalPages} · ${label}`, pageW / 2, pageH - 16, { align: "center" });
  }
}

export function pdfHeader(doc, pageW, margin, title, subtitle) {
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 64, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(title, margin, 28);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  if (subtitle) doc.text(subtitle, margin, 46);
  doc.text(`Generated ${new Date().toLocaleString("en-ZA")}`, pageW - margin, 46, { align: "right" });
  return 88;
}

export function pdfScoreHero(doc, x, y, score, label, color, width = 120) {
  doc.setFillColor(...color);
  doc.roundedRect(x, y, width, 64, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(28);
  doc.text(`${score}%`, x + width / 2, y + 38, { align: "center" });
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text(label, x + width / 2, y + 52, { align: "center" });
}

export function pdfMetricGrid(doc, x, y, metrics, colW) {
  metrics.forEach((m, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const xx = x + col * colW, yy = y + row * 34;
    doc.setFillColor(248, 250, 252); doc.roundedRect(xx, yy, colW - 8, 28, 4, 4, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text(m[0], xx + 8, yy + 12);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 42);
    doc.text(m[1], xx + 8, yy + 24);
  });
}

export function pdfSectionTitle(doc, text, margin, pageW, y) {
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
  doc.text(text, margin, y);
  y += 8;
  doc.setDrawColor(226, 232, 240); doc.line(margin, y, pageW - margin, y);
  return y + 14;
}

export function emailShell({ subject, dateStr, score, verdict, metrics, tablesHtml, pdfUrl, message, pdfFilename, buttonLabel }) {
  const pdfBtn = pdfUrl
    ? `<a href="${esc(pdfUrl)}" download="${esc(pdfFilename)}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:8px;margin:0 4px 8px 0">${esc(buttonLabel)}</a>`
    : "";
  const metricRows = metrics.map((m) =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(m[0])}</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${m[2] || "#0f172a"}">${esc(m[1])}</td></tr>`
  ).join("");
  const msgBlock = message ? `<div style="background:#f8fafc;border-left:3px solid #1e3a5f;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e293b">${esc(message)}</div>` : "";
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>body{font-family:system-ui,sans-serif;background:#f8fafc;padding:20px;color:#1e293b}
  .w{max-width:820px;margin:0 auto}.h{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:24px 32px;border-radius:12px 12px 0 0}
  .h h1{font-size:20px;margin:0 0 4px}.h p{margin:0;opacity:.85;font-size:13px}
  .c{background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
  .f{text-align:center;padding:16px;font-size:11px;color:#94a3b8}</style></head><body>
  <div class="w"><div class="h"><h1>${esc(subject)}</h1>
  <p>${new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div>
  <div class="c">
    ${pdfBtn ? `<div style="margin-bottom:20px;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px"><p style="margin:0 0 8px;font-size:13px;color:#1e3a5f"><strong>Report PDF attached below</strong> — no login required.</p>${pdfBtn}</div>` : ""}
    ${msgBlock}
    <div style="display:flex;align-items:center;gap:20px;margin-bottom:20px">
      <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:18px 26px;color:white;text-align:center">
        <div style="font-size:36px;font-weight:900">${score}%</div><div style="font-size:11px;opacity:.85">${esc(verdict)}</div>
      </div>
      <div style="flex:1"><table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Key Metrics</th></tr>${metricRows}</table></div>
    </div>
    ${tablesHtml}
    <p style="font-size:11px;color:#94a3b8;margin-top:16px">${pdfUrl ? "The PDF report is linked above for download. " : ""}Generated automatically from live data — no login required to review.</p>
  </div><div class="f">Confidential — CertiGuard GRC · ${esc(dateStr)}</div></div></body></html>`;
}