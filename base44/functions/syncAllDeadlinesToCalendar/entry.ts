import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Syncs ALL audit deadlines (compliance tasks with due dates) and internal
// control review dates (controls with next_review) to the builder's Google
// Calendar via the SHARED Google Calendar connector (platform OAuth app).
// Runs daily via the "Daily Deadline Calendar Sync" workflow.
// Unlike syncMyCalendarTasks (per-user APP_USER mode), this syncs every
// deadline to a single shared business calendar.

const CAL_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // SHARED connector (builder's Google Calendar via platform OAuth)
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getConnection("googlecalendar");
      accessToken = conn.accessToken;
    } catch (e) {
      return Response.json({
        connected: false,
        message: 'Google Calendar not connected. Authorize the Google Calendar connector in the Base44 dashboard.',
      });
    }

    const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // Fetch all compliance tasks with due dates (audit deadlines)
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list('-due_date', 500);
    const taskDeadlines = (tasks || []).filter((t) => t.due_date);

    // Fetch all controls with next_review dates (control review dates)
    const controls = await base44.asServiceRole.entities.Control.list('-next_review', 500);
    const controlReviews = (controls || []).filter((c) => c.next_review);

    // Fetch all policies with next_review_date (policy review tasks)
    const policies = await base44.asServiceRole.entities.Policy.list('-next_review_date', 500);
    const policyReviews = (policies || []).filter((p) => p.next_review_date);

    // List existing events we previously synced (filtered by our private property)
    const existing = {};
    let pageToken = '';
    for (let i = 0; i < 5; i++) {
      let url = `${CAL_API}?privateExtendedProperty=base44_source=regtech_deadlines&maxResults=250&singleEvents=true&timeMin=2020-01-01T00:00:00Z`;
      if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ connected: true, error: `Google API error: ${res.status}`, detail: errText }, { status: 502 });
      }
      const data = await res.json();
      for (const ev of data.items || []) {
        const id = ev.extendedProperties?.private?.base44_deadline_id;
        if (id) existing[id] = ev.id;
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    }

    let created = 0, updated = 0, failed = 0;
    const seen = new Set();

    // Sync task deadlines (audit deadlines)
    for (const t of taskDeadlines) {
      const eventId = `task_${t.id}`;
      seen.add(eventId);
      const due = t.due_date;
      const end = fmtDate(new Date(new Date(due).getTime() + 24 * 60 * 60 * 1000));
      const event = {
        summary: `📋 ${t.title || "Compliance deadline"}`,
        description: [
          `Type: ${t.type || "task"}`,
          `Priority: ${t.priority || "medium"}`,
          `Status: ${t.status || "todo"}`,
          t.assignee_name ? `Assignee: ${t.assignee_name}` : "",
          t.description ? `\n${t.description}` : "",
          "\n— Synced from CertiGuard GRC",
        ].filter(Boolean).join("\n"),
        start: { date: due, timeZone: "Africa/Johannesburg" },
        end: { date: end, timeZone: "Africa/Johannesburg" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }, { method: "popup", minutes: 60 }] },
        extendedProperties: { private: { base44_source: "regtech_deadlines", base44_deadline_id: eventId } },
      };
      try {
        if (existing[eventId]) {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(existing[eventId])}`, { method: "PUT", headers, body: JSON.stringify(event) });
          if (r.ok) updated++; else failed++;
        } else {
          const r = await fetch(CAL_API, { method: "POST", headers, body: JSON.stringify(event) });
          if (r.ok) created++; else failed++;
        }
      } catch (e) { failed++; }
    }

    // Sync control review dates
    for (const c of controlReviews) {
      const eventId = `control_${c.id}`;
      seen.add(eventId);
      const due = c.next_review;
      const end = fmtDate(new Date(new Date(due).getTime() + 24 * 60 * 60 * 1000));
      const event = {
        summary: `🔍 Control Review: ${c.control_id || ""} ${c.title || ""}`.trim(),
        description: [
          `Category: ${c.category || "—"}`,
          `Status: ${c.status || "not_tested"}`,
          `Owner: ${c.owner_name || "—"}`,
          c.notes ? `\n${c.notes}` : "",
          "\n— Synced from CertiGuard GRC",
        ].filter(Boolean).join("\n"),
        start: { date: due, timeZone: "Africa/Johannesburg" },
        end: { date: end, timeZone: "Africa/Johannesburg" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }] },
        extendedProperties: { private: { base44_source: "regtech_deadlines", base44_deadline_id: eventId } },
      };
      try {
        if (existing[eventId]) {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(existing[eventId])}`, { method: "PUT", headers, body: JSON.stringify(event) });
          if (r.ok) updated++; else failed++;
        } else {
          const r = await fetch(CAL_API, { method: "POST", headers, body: JSON.stringify(event) });
          if (r.ok) created++; else failed++;
        }
      } catch (e) { failed++; }
    }

    // Sync policy review dates
    for (const p of policyReviews) {
      const eventId = `policy_${p.id}`;
      seen.add(eventId);
      const due = p.next_review_date;
      const end = fmtDate(new Date(new Date(due).getTime() + 24 * 60 * 60 * 1000));
      const event = {
        summary: `📄 Policy Review: ${p.title || "Policy"}`,
        description: [
          `Category: ${(p.category || "").replace(/_/g, " ")}`,
          `Status: ${p.status || "draft"}`,
          `Version: v${p.version || "1.0"}`,
          p.owner_name ? `Owner: ${p.owner_name}` : "",
          p.description ? `\n${p.description}` : "",
          "\n— Synced from CertiGuard GRC",
        ].filter(Boolean).join("\n"),
        start: { date: due, timeZone: "Africa/Johannesburg" },
        end: { date: end, timeZone: "Africa/Johannesburg" },
        reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }, { method: "popup", minutes: 60 }] },
        extendedProperties: { private: { base44_source: "regtech_deadlines", base44_deadline_id: eventId } },
      };
      try {
        if (existing[eventId]) {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(existing[eventId])}`, { method: "PUT", headers, body: JSON.stringify(event) });
          if (r.ok) updated++; else failed++;
        } else {
          const r = await fetch(CAL_API, { method: "POST", headers, body: JSON.stringify(event) });
          if (r.ok) created++; else failed++;
        }
      } catch (e) { failed++; }
    }

    // Delete events whose tasks/controls/policies no longer exist
    let removed = 0;
    for (const [eventId, evId] of Object.entries(existing)) {
      if (!seen.has(eventId)) {
        try {
          const r = await fetch(`${CAL_API}/${encodeURIComponent(evId)}`, { method: "DELETE", headers });
          if (r.ok || r.status === 410) removed++;
        } catch (e) { /* ignore */ }
      }
    }

    return Response.json({
      connected: true,
      taskDeadlines: taskDeadlines.length,
      controlReviews: controlReviews.length,
      policyReviews: policyReviews.length,
      created, updated, removed, failed,
      lastSync: new Date().toISOString(),
    });
  } catch (error) {
    console.error('syncAllDeadlinesToCalendar error:', error?.message || error);
    return Response.json({ error: error?.message || 'calendar sync failed' }, { status: 500 });
  }
});