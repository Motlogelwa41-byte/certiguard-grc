import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

// Weekly compliance reminder — runs every Monday via the WeeklyComplianceReminders workflow.
// Sends each employee a single digest email listing:
//   1. Their outstanding (non-completed) ComplianceTasks, with a deep link to the Tasks page.
//   2. Their incomplete people/training compliance requirements (parsed from employee Training
//      records), with a deep link to the People Compliance page.
// Recipients are keyed by assignee/training email so reminders never cross tenants.

function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const appUrl = req.headers.get("origin") || new URL(req.url).origin;
    const tasksLink = `${appUrl}/tasks`;
    const peopleLink = `${appUrl}/people`;
    const todayStr = new Date().toISOString().slice(0, 10);

    // 1. Outstanding compliance tasks (any non-completed status)
    const tasks = await sr.entities.ComplianceTask.list("-due_date", 1000).catch(() => []);
    const openTasks = (tasks || []).filter((t) => t.status && t.status !== "completed");

    // 2. Employee people-compliance records (stored as Training: category=role_based, type=document)
    const employees = await sr.entities.Training.filter({ category: "role_based", type: "document" }).catch(() => []);
    const CHECK_LABELS = {
      background_check: "Background check completed",
      security_training: "Security awareness training",
      policy_acknowledged: "Acceptable use / security policy signed",
      nda_signed: "NDA / confidentiality agreement",
      access_reviewed: "Access provisioning reviewed",
    };

    // Build per-email digest
    const byEmail = {};

    for (const t of openTasks) {
      const email = (t.assignee_email || "").trim().toLowerCase();
      if (!email) continue;
      const key = `${t.tenant_id || ""}|${email}`;
      (byEmail[key] = byEmail[key] || { email, name: t.assignee_name || "team member", tasks: [], training: [] }).tasks.push(t);
    }

    for (const rec of employees || []) {
      let extra = {};
      try { extra = JSON.parse(rec.description || "{}"); } catch {}
      const email = (extra.email || "").trim().toLowerCase();
      if (!email) continue;
      const key = `${rec.tenant_id || ""}|${email}`;
      const entry = byEmail[key] = byEmail[key] || { email, name: rec.title || "team member", tasks: [], training: [] };
      const incomplete = [];
      for (const [field, label] of Object.entries(CHECK_LABELS)) {
        if (!extra[field]) incomplete.push(label);
      }
      // security_training is tracked via completed_count on the Training record
      if (!rec.completed_count && !extra.security_training && !incomplete.includes(CHECK_LABELS.security_training)) {
        incomplete.push(CHECK_LABELS.security_training);
      }
      if (incomplete.length) {
        entry.training.push({
          due_date: rec.due_date,
          items: incomplete,
        });
      }
    }

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        dateStr: todayStr,
        recipients: Object.keys(byEmail).length,
        preview: Object.entries(byEmail).slice(0, 3).map(([k, v]) => ({ email: v.email, name: v.name, tasks: v.tasks.length, trainingItems: v.training.reduce((s, t) => s + t.items.length, 0) })),
      });
    }

    let sent = 0, failed = 0;

    for (const [key, entry] of Object.entries(byEmail)) {
      const hasTasks = entry.tasks.length > 0;
      const hasTraining = entry.training.length > 0;
      if (!hasTasks && !hasTraining) continue;

      const subject = `Weekly Compliance Summary — ${entry.tasks.length} task(s) + ${entry.training.reduce((s, t) => s + t.items.length, 0)} training item(s) outstanding`;

      // Tasks table
      const taskRows = entry.tasks.map((t) =>
        `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${esc(t.title)}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap;color:${t.status === "overdue" ? "#b91c1c" : "#92400e"};font-weight:600;text-transform:capitalize">${esc((t.status || "").replace(/_/g, " "))}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap">${esc(t.due_date || "—")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;text-transform:capitalize">${esc((t.priority || "").replace(/_/g, " "))}</td>
        </tr>`
      ).join("");

      // Training items
      const trainingRows = entry.training.map((tr) =>
        tr.items.map((it) =>
          `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${esc(it)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap">${esc(tr.due_date || "—")}</td>
          </tr>`
        ).join("")
      ).join("");

      const tasksSection = hasTasks ? `
        <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 10px">Outstanding Compliance Tasks (${entry.tasks.length})</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
          <thead><tr style="background:#f8fafc">
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Task</th>
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Status</th>
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Due</th>
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Priority</th>
          </tr></thead>
          <tbody>${taskRows}</tbody>
        </table>
        <a href="${esc(tasksLink)}" style="display:inline-block;background:#1e3a5f;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;margin-bottom:20px">View & update my tasks →</a>` : "";

      const trainingSection = hasTraining ? `
        <p style="color:#1e293b;font-size:14px;font-weight:700;margin:0 0 10px">Incomplete Training / People Compliance (${entry.training.reduce((s, t) => s + t.items.length, 0)})</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
          <thead><tr style="background:#f8fafc">
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Requirement</th>
            <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Due</th>
          </tr></thead>
          <tbody>${trainingRows}</tbody>
        </table>
        <a href="${esc(peopleLink)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;font-size:13px;padding:9px 18px;border-radius:8px;margin-bottom:20px">Complete my compliance items →</a>` : "";

      const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
        <div style="max-width:640px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
            <h1 style="margin:0 0 4px;font-size:18px">Weekly Compliance Summary</h1>
            <p style="margin:0;opacity:.85;font-size:13px">Hi ${esc(entry.name)}, here's what needs your attention this week.</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
            ${tasksSection}
            ${trainingSection}
            <p style="color:#64748b;font-size:12px;margin:0">This is an automated weekly reminder. Log in to complete your items and keep the compliance program on track.</p>
          </div>
        </div>
      </body></html>`;

      try {
        await sr.integrations.Core.SendEmail({ to: entry.email, subject, body });
        sent++;
      } catch (e) {
        console.error("weekly reminder failed:", entry.email, e?.message || e);
        failed++;
      }
    }

    // Log task reminders to TaskReminder for audit
    const reminders = [];
    for (const [, entry] of Object.entries(byEmail)) {
      for (const t of entry.tasks) {
        reminders.push({
          task_id: t.id,
          task_title: t.title,
          assignee_name: entry.name,
          assignee_email: entry.email,
          tenant_id: t.tenant_id,
          due_date: t.due_date,
          days_before: null,
          sent_at: new Date().toISOString(),
          status: "sent",
          priority: t.priority,
        });
      }
    }
    if (reminders.length) {
      try { await sr.entities.TaskReminder.bulkCreate(reminders); } catch {}
    }

    return Response.json({
      ok: true,
      sent,
      failed,
      recipients: Object.keys(byEmail).length,
      openTasks: openTasks.length,
      employeesChecked: (employees || []).length,
      runDate: todayStr,
    });
  } catch (error) {
    console.error("sendWeeklyComplianceReminders error:", error?.message || error);
    return Response.json({ ok: false, error: error?.message || "Weekly compliance reminders failed" }, { status: 500 });
  }
});