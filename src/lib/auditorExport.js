import { base44 } from "@/api/base44Client";

export async function gatherAuditorData() {
  const [frameworks, controls, evidence] = await Promise.all([
    base44.entities.Framework.list().catch(() => []),
    base44.entities.Control.list().catch(() => []),
    base44.entities.Evidence.list().catch(() => []),
  ]);
  return { frameworks, controls, evidence };
}

export function buildFrameworkProgressRows(frameworks, controls) {
  const rows = frameworks.map((fw) => {
    const fwControls = controls.filter(
      (c) => c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
    );
    const passing = fwControls.filter((c) => c.status === "passing").length;
    const failing = fwControls.filter((c) => c.status === "failing").length;
    const notTested = fwControls.filter((c) => c.status === "not_tested").length;
    const pct =
      fw.total_controls > 0
        ? Math.round((fw.passing_controls / fw.total_controls) * 100)
        : fw.readiness_score || 0;
    return {
      Framework: fw.name || "—",
      Version: fw.version || "",
      Status: fw.status || "—",
      Readiness_Pct: pct,
      Total_Controls: fw.total_controls || fwControls.length || 0,
      Passing: fw.passing_controls || passing,
      Failing: failing,
      Not_Tested: notTested,
      Certification_Date: fw.certification_date || "",
      Expiry_Date: fw.expiry_date || "",
    };
  });

  // Add overall summary row
  if (rows.length > 0) {
    const allControls = controls.length;
    const allPassing = controls.filter((c) => c.status === "passing").length;
    const allFailing = controls.filter((c) => c.status === "failing").length;
    const allNotTested = controls.filter((c) => c.status === "not_tested").length;
    const avgReadiness =
      frameworks.length > 0
        ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length)
        : 0;
    rows.unshift({
      Framework: "OVERALL SUMMARY",
      Version: "",
      Status: "",
      Readiness_Pct: avgReadiness,
      Total_Controls: allControls,
      Passing: allPassing,
      Failing: allFailing,
      Not_Tested: allNotTested,
      Certification_Date: "",
      Expiry_Date: "",
    });
  }

  return rows;
}

export function buildEvidenceTrackingRows(evidence) {
  return evidence.map((ev) => ({
    Evidence_Title: ev.title || "—",
    Control_ID: ev.control_id || "",
    Control_Title: ev.control_title || "",
    Type: ev.type || "—",
    Status: ev.status || "—",
    Collected_Date: ev.collected_date || "",
    Expiry_Date: ev.expiry_date || "",
    Reviewer: ev.reviewer_name || "",
    Reviewed_At: ev.reviewed_at || "",
    File_Name: ev.file_name || "",
    Review_Notes: ev.review_notes || "",
    Notes: ev.notes || "",
  }));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rowsToHtmlTable(rows, title) {
  if (!rows || rows.length === 0) {
    return `<h2>${escapeHtml(title)}</h2><p style="color:#999;">No records found.</p>`;
  }
  const cols = Object.keys(rows[0]);
  const header = cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        "<tr>" +
        cols.map((col) => `<td>${escapeHtml(row[col] ?? "")}</td>`).join("") +
        "</tr>"
    )
    .join("");
  return `<h2>${escapeHtml(title)}</h2><table border="1"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`;
}

export function exportAuditorExcel(frameworks, controls, evidence) {
  const fwRows = buildFrameworkProgressRows(frameworks, controls);
  const evRows = buildEvidenceTrackingRows(evidence);

  const fwTable = rowsToHtmlTable(fwRows, "Framework Progress");
  const evTable = rowsToHtmlTable(evRows, "Evidence Tracking");

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>${fwTable}<br><br>${evTable}</body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `CertiGuard_Auditor_Export_${new Date().toISOString().slice(0, 10)}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportFrameworkProgressCsv(frameworks, controls) {
  const rows = buildFrameworkProgressRows(frameworks, controls);
  exportCsv(rows, "framework-progress");
}

export function exportEvidenceTrackingCsv(evidence) {
  const rows = buildEvidenceTrackingRows(evidence);
  exportCsv(rows, "evidence-tracking");
}

function exportCsv(data, filename) {
  if (!data || data.length === 0) return;
  const cols = Object.keys(data[0]);
  const header = cols.join(",");
  const rows = data.map((row) =>
    cols
      .map((col) => {
        const val = row[col] ?? "";
        const str = Array.isArray(val) ? val.join("; ") : String(val);
        if (str.includes(",") || str.includes("\n") || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}