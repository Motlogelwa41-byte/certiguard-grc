import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { sendGmail } from "../../shared/gmailSender.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const in7 = new Date(today.getTime() + 7 * 86400000);
    const in7Str = in7.toISOString().slice(0, 10);

    // Fetch all compliance tasks (covers evidence_collection + audit_preparation types)
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list("-due_date", 500);

    const due = tasks.filter((t) => {
      if (!t.due_date) return false;
      if (t.status === "completed") return false;
      const d = String(t.due_date).slice(0, 10);
      return d >= todayStr && d <= in7Str;
    });

    // Group tasks by assignee email
    // Group by tenant_id + email so reminders never mix tenants for the same address
    const byEmail = {};
    for (const t of due) {
      const email = (t.assignee_email || "").trim().toLowerCase();
      if (!email) continue;
      const key = `${t.tenant_id || ""}|${email}`;
      (byEmail[key] = byEmail[key] || []).push(t);
    }

    let sent = 0;
    let failed = 0;
    const reminders = [];

    for (const [key, list] of Object.entries(byEmail)) {
      const [tenantId, email] = key.split("|");
      const rows = list.map((t) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(t.title || "")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap;color:#b91c1c;font-weight:600">${t.due_date}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;text-transform:capitalize">${escapeHtml((t.priority || "").replace(/_/g, " "))}</td>
        </tr>`
      ).join("");

      const subject = `⏰ CertiGuard GRC — ${list.length} task(s) due in the next 7 days`;
      const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
        <div style="max-width:640px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
            <h1 style="margin:0 0 4px;font-size:18px">Upcoming Compliance Tasks</h1>
            <p style="margin:0;opacity:.85;font-size:13px">${list.length} task(s) assigned to you are due on or before ${in7Str}.</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
            <p style="color:#475569;font-size:14px;margin:0 0 16px">Hi ${escapeHtml(list[0].assignee_name || "team member")},</p>
            <p style="color:#475569;font-size:14px;margin:0 0 16px">This is an automated reminder that the following compliance tasks are due within the next 7 days. Please complete the required evidence collection or audit preparation before the due date to keep the program on track.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Task</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Due Date</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Priority</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="color:#64748b;font-size:12px;margin:0">Log in to CertiGuard GRC to update task status and upload evidence. — CertiGuard GRC Automated Reminders</p>
          </div>
        </div>
      </body></html>`;

      let delivered = false;
      try {
        await sendGmail(base44, email, subject, body);
        delivered = true;
        sent++;
      } catch (e) {
        failed++;
      }

      for (const t of list) {
        reminders.push({
          task_id: t.id,
          task_title: t.title,
          assignee_name: t.assignee_name,
          assignee_email: email,
          tenant_id: t.tenant_id,
          due_date: t.due_date,
          days_before: 7,
          sent_at: new Date().toISOString(),
          status: delivered ? "sent" : "failed",
          priority: t.priority,
        });
      }
    }

    // Post a single aggregated Slack alert to #compliance when tasks are due soon,
    // so the whole team (not just assignees) stays informed of approaching deadlines.
    if (due.length > 0) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection("slackbot");
        if (accessToken) {
          const top = due.slice(0, 8).map((t) => `• *${t.title || "Untitled"}* — due ${t.due_date}${t.assignee_name ? ` (@${t.assignee_name})` : ""}`).join("\n");
          const more = due.length > 8 ? `\n…and ${due.length - 8} more` : "";
          const text = `:alarm_clock: *${due.length} compliance task(s) due within 7 days:*\n${top}${more}`;
          await fetch("https://slack.com/api/chat.postMessage", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ channel: "C0BJB8240RF", text, username: "CertiGuard", icon_emoji: ":shield:" }),
          });
        }
      } catch (e) { /* Slack alert is best-effort; never fail the reminder run */ }
    }

    if (reminders.length) {
      await base44.asServiceRole.entities.TaskReminder.bulkCreate(reminders);
    }

    return Response.json({
      sent,
      failed,
      dueCount: due.length,
      assignees: Object.keys(byEmail).length,
      runDate: todayStr,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}