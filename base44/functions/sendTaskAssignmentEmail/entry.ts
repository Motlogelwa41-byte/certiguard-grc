import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";
import { sendGmail } from "../../shared/gmailSender.ts";

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const base44 = createClientFromRequest(req);

    // Accept either a nested `task` object (from the workflow trigger) or flat fields.
    const t = body.task || {};
    const task = {
      id: t.id || body.id || "",
      title: t.title || body.title || "Untitled task",
      description: t.description || body.description || "",
      due_date: t.due_date || body.due_date || "",
      priority: t.priority || body.priority || "medium",
      type: t.type || body.type || "other",
      assignee_name: t.assignee_name || body.assignee_name || "",
      assignee_email: t.assignee_email || body.assignee_email || "",
      status: t.status || body.status || "todo",
      tenant_id: t.tenant_id || body.tenant_id || "",
    };

    const to = (body.to || task.assignee_email || "").trim();
    if (!to) return Response.json({ error: "No recipient email provided" }, { status: 400 });

    const subject = `New compliance task assigned: ${task.title}`;
    const html = buildNewTaskEmail(task);

    let messageId = "";
    let delivered = false;
    try {
      const result = await sendGmail(base44, to, subject, html);
      messageId = result.id || "";
      delivered = true;
    } catch (e) {
      // Log the failure as a reminder record, then return the error.
      try {
        await base44.asServiceRole.entities.TaskReminder.create({
          task_id: task.id,
          task_title: task.title,
          assignee_name: task.assignee_name,
          assignee_email: to,
          due_date: task.due_date,
          days_before: 0,
          sent_at: new Date().toISOString(),
          status: "failed",
          priority: task.priority,
        });
      } catch (logErr) {
        // ignore
      }
      return Response.json({ error: e.message }, { status: 502 });
    }

    try {
      await base44.asServiceRole.entities.TaskReminder.create({
        task_id: task.id,
        task_title: task.title,
        assignee_name: task.assignee_name,
        assignee_email: to,
        due_date: task.due_date,
        days_before: 0,
        sent_at: new Date().toISOString(),
        status: "sent",
        priority: task.priority,
      });
    } catch (logErr) {
      // ignore logging failure
    }

    return Response.json({ sent: true, delivered, to, messageId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildNewTaskEmail(t) {
  const priorityColor = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#2563eb",
    low: "#16a34a",
  }[t.priority] || "#2563eb";

  const rows = [
    ["Priority", `<span style="color:${priorityColor};font-weight:600">${escapeHtml(t.priority)}</span>`],
    ["Type", escapeHtml((t.type || "").replace(/_/g, " "))],
    ["Due date", `<strong style="color:#b91c1c">${escapeHtml(t.due_date || "Not set")}</strong>`],
    ["Status", escapeHtml((t.status || "").replace(/_/g, " "))],
  ].filter((r) => r[1]);

  const metaTable = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:#64748b;white-space:nowrap">${r[0]}</td><td style="padding:6px 0;font-size:13px;color:#0f172a">${r[1]}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
  <div style="max-width:600px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <h1 style="margin:0 0 4px;font-size:18px">New Compliance Task Assigned to You</h1>
      <p style="margin:0;opacity:.85;font-size:13px">${escapeHtml(t.assignee_name ? "Hi " + t.assignee_name + "," : "Hi,")}</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
      <p style="color:#475569;font-size:14px;margin:0 0 16px">You have been assigned a new compliance task. Please review the details below and complete it before the due date.</p>
      <div style="background:#f8fafc;border-left:4px solid #2563eb;border-radius:6px;padding:14px 16px;margin-bottom:16px">
        <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#0f172a">${escapeHtml(t.title)}</p>
        ${t.description ? `<p style="margin:8px 0 0;font-size:13px;color:#475569;white-space:pre-wrap">${escapeHtml(t.description)}</p>` : ""}
      </div>
      <table style="border-collapse:collapse;margin-bottom:18px">${metaTable}</table>
      <p style="color:#64748b;font-size:12px;margin:0">Log in to CertiGuard to view the task, update its status, and upload any required evidence. — CertiGuard Notifications</p>
    </div>
  </div>
</body></html>`;
}