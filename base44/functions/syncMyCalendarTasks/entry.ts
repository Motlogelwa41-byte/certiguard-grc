import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// App-user Google Calendar connector (registered workspace connector).
const CONNECTOR_ID = "6a5e216ec55111d5b32a0870";
const CAL_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function buildEvent(task) {
  const due = task.due_date; // "YYYY-MM-DD"
  const end = fmtDate(new Date(new Date(due).getTime() + 24 * 60 * 60 * 1000));
  const lines = [
    `Type: ${task.type || "task"}`,
    `Priority: ${task.priority || "medium"}`,
    `Status: ${task.status || "todo"}`,
    task.assignee_name ? `Assignee: ${task.assignee_name}` : "",
    task.description ? `\n${task.description}` : "",
    "\n— Synced from your RegTech GRC platform",
  ].filter(Boolean);
  return {
    summary: `${task.title || "Compliance task"}`,
    description: lines.join("\n"),
    start: { date: due, timeZone: "Africa/Johannesburg" },
    end: { date: end, timeZone: "Africa/Johannesburg" },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }, { method: "popup", minutes: 60 }] },
    extendedProperties: { private: { base44_task_id: task.id, base44_source: "regtech" } },
  };
}

export default Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const checkOnly = body.check_only === true;
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Resolve the current app user's Google Calendar connection.
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({ connected: false, message: "Google Calendar not connected for this user." });
    }

    // Tasks assigned to me with a due date (match by email or user id).
    const email = (user.email || "").toLowerCase();
    const all = await base44.entities.ComplianceTask.list("-created_date", 500);
    const mine = all.filter(
      (t) => t.due_date && (
        (t.assignee_email || "").toLowerCase() === email || t.assignee_id === user.id
      )
    );

    if (checkOnly) {
      return Response.json({
        connected: true,
        pending: mine.length,
        dueSoon: mine.filter((t) => t.status !== "completed").length,
        tasks: mine.map((t) => ({ id: t.id, title: t.title, due_date: t.due_date, status: t.status })),
      });
    }

    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // List existing events we previously synced (filtered by our private extended property).
    const existing = {};
    let pageToken = "";
    for (let i = 0; i < 5; i++) {
      let url = `${CAL_API}?privateExtendedProperty=base44_source=regtech&maxResults=250&singleEvents=true&timeMin=2020-01-01T00:00:00Z`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ connected: true, error: `Google API error: ${res.status}`, detail: errText }, { status: 502 });
      }
      const data = await res.json();
      for (const ev of data.items || []) {
        const tid = ev.extendedProperties?.private?.base44_task_id;
        if (tid) existing[tid] = ev.id;
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    let created = 0, updated = 0, removed = 0, failed = 0;
    const seen = new Set();

    for (const t of mine) {
      seen.add(t.id);
      const event = buildEvent(t);
      try {
        if (existing[t.id]) {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(existing[t.id])}`, {
            method: "PUT", headers, body: JSON.stringify(event),
          });
          if (r.ok) updated++; else failed++;
        } else {
          const r = await fetch(CAL_API, { method: "POST", headers, body: JSON.stringify(event) });
          if (r.ok) created++; else failed++;
        }
      } catch (e) {
        failed++;
      }
    }

    // Delete events whose tasks are no longer assigned to this user.
    for (const [tid, evId] of Object.entries(existing)) {
      if (!seen.has(tid)) {
        try {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(evId)}`, { method: "DELETE", headers });
          if (r.ok || r.status === 410) removed++;
        } catch (e) {
          // ignore
        }
      }
    }

    return Response.json({
      connected: true,
      synced: mine.length,
      created,
      updated,
      removed,
      failed,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});