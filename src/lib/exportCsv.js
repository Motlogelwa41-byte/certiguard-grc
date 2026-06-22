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