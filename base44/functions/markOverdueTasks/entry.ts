import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { sendGmail } from "../../shared/gmailSender.ts";

// Internal workflow engine: scans compliance tasks past their due date,
// marks them 'overdue', and sends a summary notification to each assignee.
// Runs daily via the "Daily Overdue Task Scanner" workflow.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const todayStr = new Date().toISOString().slice(0, 10);

    // Fetch all compliance tasks
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list("-due_date", 500);

    // Find tasks past their due date that are not completed or already overdue
    const overdue = (tasks || []).filter((t) => {
      if (!t.due_date) return false;
      if (t.status === "completed" || t.status === "overdue") return false;
      return String(t.due_date).slice(0, 10) < todayStr;
    });

    if (overdue.length === 0) {
      return Response.json({ markedOverdue: 0, notified: 0, runDate: todayStr });
    }

    // Bulk update all overdue tasks to 'overdue' status
    let markedCount = 0;
    try {
      await base44.asServiceRole.entities.ComplianceTask.bulkUpdate(
        overdue.map((t) => ({ id: t.id, status: "overdue" }))
      );
      markedCount = overdue.length;
    } catch (e) {
      // Fallback to individual updates
      for (const t of overdue) {
        try {
          await base44.asServiceRole.entities.ComplianceTask.update(t.id, { status: "overdue" });
          markedCount++;
        } catch (_) { /* skip */ }
      }
    }

    // Group by assignee email for summary notifications (tenant-scoped)
    const byEmail = {};
    for (const t of overdue) {
      const email = (t.assignee_email || "").trim().toLowerCase();
      if (!email) continue;
      const key = `${t.tenant_id || ""}|${email}`;
      (byEmail[key] = byEmail[key] || []).push(t);
    }

    let sent = 0;
    let failedEmails = 0;

    for (const [key, list] of Object.entries(byEmail)) {
      const [, email] = key.split("|");
      const rows = list.map((t) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(t.title || "")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap;color:#b91c1c;font-weight:600">${t.due_date}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;text-transform:capitalize">${escapeHtml((t.priority || "").replace(/_/g, " "))}</td>
        </tr>`
      ).join("");

      const subject = `🚨 CertiGuard GRC — ${list.length} task(s) are now OVERDUE`;
      const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
        <div style="max-width:640px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#991b1b,#dc2626);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
            <h1 style="margin:0 0 4px;font-size:18px">Overdue Compliance Tasks</h1>
            <p style="margin:0;opacity:.85;font-size:13px">${list.length} task(s) assigned to you have passed their deadline and been marked overdue.</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
            <p style="color:#475569;font-size:14px;margin:0 0 16px">Hi ${escapeHtml(list[0].assignee_name || "team member")},</p>
            <p style="color:#475569;font-size:14px;margin:0 0 16px">The following compliance tasks have passed their due date and are now marked as <strong style="color:#b91c1c">overdue</strong>. Please complete the required evidence collection or audit preparation and update the task status immediately.</p>
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
            <p style="color:#64748b;font-size:12px;margin:0">Log in to CertiGuard GRC to update task status and upload evidence. — CertiGuard GRC Automated Workflow</p>
          </div>
        </div>
      </body></html>`;

      try {
        await sendGmail(base44, email, subject, body);
        sent++;
      } catch (e) {
        failedEmails++;
      }
    }

    return Response.json({
      markedOverdue: markedCount,
      notified: sent,
      failedEmails,
      totalOverdue: overdue.length,
      runDate: todayStr,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}