/**
 * Generates an ICS (iCalendar) file from compliance events and triggers a download.
 * Supports both all-day and timed events.
 */

function escapeICS(text) {
  if (!text) return "";
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatICSDate(dateStr) {
  if (!dateStr) return "";
  // For all-day events, use YYYYMMDD format
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatICSDateTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function generateUID() {
  return `cgrd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@certguard`;
}

/**
 * @param {Array} items - Array of event objects with: title, start_date, end_date, description, type, assigned_to, framework_name
 * @param {string} calendarName - Name for the calendar product
 * @returns {string} ICS file content
 */
export function generateICS(items, calendarName = "CertiGuard Compliance Calendar") {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CertiGuard//Compliance Calendar//EN",
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const item of items) {
    if (!item.start_date) continue;

    const uid = generateUID();
    const dtStart = formatICSDate(item.start_date);
    const dtEnd = item.end_date ? formatICSDate(item.end_date) : dtStart;
    // If end date equals start date, make it a 1-day all-day event
    const summary = escapeICS(item.title || "Compliance Event");
    const descriptionParts = [
      item.description || "",
      item.type ? `Type: ${item.type}` : "",
      item.assigned_to ? `Assigned to: ${item.assigned_to}` : "",
      item.framework_name ? `Framework: ${item.framework_name}` : "",
      item.priority ? `Priority: ${item.priority}` : "",
    ].filter(Boolean);
    const description = escapeICS(descriptionParts.join("\\n"));
    const dtStamp = formatICSDateTime(new Date().toISOString());

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      description ? `DESCRIPTION:${description}` : "",
      "TRANSP:OPAQUE",
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

/**
 * Triggers a browser download of the ICS file.
 * @param {Array} items - Event objects
 * @param {string} filename - Download filename
 */
export function downloadICS(items, filename = "compliance-calendar.ics") {
  const icsContent = generateICS(items);
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}