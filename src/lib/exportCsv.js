/**
 * Export an array of objects to a CSV file download.
 * @param {Object[]} data - Array of row objects
 * @param {string} filename - File name without extension
 * @param {string[]} [columns] - Column keys to include (defaults to all keys from first row)
 */
export function exportToCsv(data, filename, columns) {
  if (!data || data.length === 0) return;
  const cols = columns || Object.keys(data[0]);
  const header = cols.join(",");
  const rows = data.map((row) =>
    cols.map((col) => {
      const val = row[col] ?? "";
      const str = Array.isArray(val) ? val.join("; ") : String(val);
      // Escape quotes and wrap in quotes if contains comma/newline/quote
      if (str.includes(",") || str.includes("\n") || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Export an array of objects to an Excel-readable (.xls) file download.
 * Uses an HTML table blob which Excel and Google Sheets open natively.
 * @param {Object[]} data - Array of row objects
 * @param {string} filename - File name without extension
 * @param {string[]} [columns] - Column keys to include (defaults to all keys from first row)
 */
export function exportToExcel(data, filename, columns, options) {
  if (!data || data.length === 0) return;
  const cols = columns || Object.keys(data[0]);
  const { title, subtitle } = options || {};
  const headerRow = cols.map((c) => `<th style="background-color:#1e293b;color:#ffffff;font-weight:bold;padding:6px;border:1px solid #1e293b;">${escapeHtml(c)}</th>`).join("");
  const bodyRows = data
    .map((row) =>
      "<tr>" +
      cols
        .map((col) => {
          const val = row[col] ?? "";
          const str = Array.isArray(val) ? val.join("; ") : String(val);
          return `<td style="padding:4px;border:1px solid #e2e8f0;">${escapeHtml(str)}</td>`;
        })
        .join("") +
      "</tr>"
    )
    .join("");
  const titleBlock = title
    ? `<tr><td colspan="${cols.length}" style="background-color:#1e293b;color:#ffffff;font-size:18px;font-weight:bold;padding:12px;border:1px solid #1e293b;">${escapeHtml(title)}</td></tr>` +
      (subtitle ? `<tr><td colspan="${cols.length}" style="background-color:#f1f5f9;color:#475569;font-size:11px;padding:6px;border:1px solid #e2e8f0;">${escapeHtml(subtitle)}</td></tr>` : "") +
      `<tr><td colspan="${cols.length}" style="padding:2px;border:none;"></td></tr>`
    : "";
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><thead>${titleBlock}<tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}