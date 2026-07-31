import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendGmail } from "../../shared/gmailSender.ts";

// Sends a weekly digest to each employee who has pending evidence collection
// tasks, reminding them to upload their evidence documents. Each email
// includes a direct link to the Evidence Manager in the app.
// Runs weekly via the "Weekly Evidence Reminders" workflow.

const APP_URL = Deno.env.get("BASE44_APP_URL") || "";
const PORTAL_PATH = "/evidence";

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Fetch all evidence_collection tasks that are not yet completed
    const tasks = await base44.asServiceRole.entities.ComplianceTask.list('-created_date', 500);
    const pending = (tasks || []).filter((t) =>
      t.type === 'evidence_collection' &&
      t.status !== 'completed'
    );

    if (pending.length === 0) {
      return Response.json({ ok: true, pendingTasks: 0, sent: 0, failed: 0 });
    }

    // Resolve assignee info via the User entity (assignee_id → registered user)
    const assigneeIds = [...new Set(pending.map((t) => t.assignee_id).filter(Boolean))];
    const userInfo = {};
    for (const uid of assigneeIds) {
      try {
        const u = await base44.asServiceRole.entities.User.get(uid);
        if (u?.email) userInfo[uid] = { email: u.email, name: u.full_name || u.email };
      } catch (e) { /* skip unresolvable */ }
    }

    // Group by tenant_id + assignee email so reminders never mix tenants
    const byEmail = {};
    for (const t of pending) {
      let email = t.assignee_email || (t.assignee_id && userInfo[t.assignee_id]?.email);
      let name = t.assignee_name || (t.assignee_id && userInfo[t.assignee_id]?.name) || email;
      if (!email) continue;
      const key = `${t.tenant_id || ""}|${email.toLowerCase()}`;
      (byEmail[key] = byEmail[key] || { name, email, items: [] }).items.push(t);
    }

    const portalBase = APP_URL ? `${APP_URL}${PORTAL_PATH}` : `Log in to CertiGuard → Evidence Manager (${PORTAL_PATH})`;
    let sent = 0;
    let failed = 0;

    for (const [email, group] of Object.entries(byEmail)) {
      const rows = group.items.map((t) => {
        const pc = (t.priority === 'critical' || t.priority === 'high') ? '#b91c1c' : '#b45309';
        return `<tr>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(t.title || "")}</td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:12px;white-space:nowrap"><span style="background:${pc};color:#fff;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:capitalize">${escapeHtml(t.priority || "medium")}</span></td>
          <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap">${escapeHtml(t.due_date || "—")}</td>
        </tr>`;
      }).join("");

      const subject = `📁 Weekly Evidence Reminder: ${group.items.length} pending document${group.items.length !== 1 ? "s" : ""}`;
      const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
        <div style="max-width:640px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
            <h1 style="margin:0 0 4px;font-size:18px">Weekly Evidence Reminder</h1>
            <p style="margin:0;opacity:.85;font-size:13px">You have ${group.items.length} evidence document${group.items.length !== 1 ? "s" : ""} pending upload.</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
            <p style="color:#475569;font-size:14px;margin:0 0 8px">Hi ${escapeHtml(group.name)},</p>
            <p style="color:#475569;font-size:14px;margin:0 0 16px">This is your weekly reminder to upload pending evidence documentation. Keeping evidence current ensures our compliance program stays audit-ready.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Evidence Task</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Priority</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Due Date</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin:0 0 16px">
              <a href="${escapeHtml(portalBase)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px">Upload Evidence in CertiGuard →</a>
            </p>
            <p style="color:#64748b;font-size:12px;margin:0">This is an automated weekly reminder. If you've already uploaded all pending evidence, no action is needed. — CertiGuard GRC</p>
          </div>
        </div>
      </body></html>`;

      try {
        await sendGmail(base44, email, subject, body);
        sent++;
      } catch (e) {
        console.error(`Weekly evidence reminder to ${email} failed:`, e?.message);
        failed++;
      }
    }

    return Response.json({ ok: true, pendingTasks: pending.length, recipients: Object.keys(byEmail).length, sent, failed });
  } catch (error) {
    console.error('sendWeeklyEvidenceReminders error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'weekly evidence reminders failed' }, { status: 500 });
  }
});