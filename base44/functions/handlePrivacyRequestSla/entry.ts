import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { sendGmail } from '../../shared/gmailSender.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const reqs = await sr.entities.PrivacyRequest.list("-created_date", 500);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const newlyOverdue = [];
    let resolved = 0;
    for (const r of reqs || []) {
      if (["closed", "rejected", "response_sent"].includes(r.status)) continue;
      if (!r.due_date) continue;
      const due = new Date(r.due_date);
      const breached = due < today;
      if (breached && (!r.sla_breached || r.status !== "overdue")) {
        try {
          await sr.entities.PrivacyRequest.update(r.id, { sla_breached: true, status: "overdue" });
          newlyOverdue.push(r);
        } catch (_) { /* ignore */ }
      } else if (!breached && r.sla_breached) {
        try {
          await sr.entities.PrivacyRequest.update(r.id, { sla_breached: false });
          resolved++;
        } catch (_) { /* ignore */ }
      }
    }

    // Email SLA-breach alerts to admins + compliance officers for newly overdue requests.
    let emailsSent = 0;
    if (newlyOverdue.length) {
      try {
        const users = await sr.entities.User.list("-created_date", 200);
        const recipients = (users || [])
          .filter((u) => ["admin", "compliance_officer"].includes(u.role))
          .map((u) => u.email)
          .filter(Boolean);
        if (recipients.length) {
          const subject = `⚠️ ${newlyOverdue.length} privacy request${newlyOverdue.length > 1 ? "s" : ""} overdue — SLA breached`;
          const html = buildOverdueEmail(newlyOverdue);
          for (const to of recipients) {
            try {
              await sendGmail(base44, to, subject, html);
              emailsSent++;
            } catch (e) {
              console.error(`DSAR alert email to ${to} failed:`, e.message);
            }
          }
        }
      } catch (e) {
        console.error("DSAR alert dispatch failed:", e.message);
      }
    }

    return Response.json({ scanned: (reqs || []).length, flagged: newlyOverdue.length, resolved, emailsSent, scannedAt: todayStr });
  } catch (error) {
    console.error("handlePrivacyRequestSla error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOverdueEmail(items) {
  const rows = items.map((r) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#0f172a">${escapeHtml(r.request_id)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569">${escapeHtml(r.requester_name)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569;text-transform:capitalize">${escapeHtml((r.request_type || "").replace(/_/g, " "))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#b91c1c;font-weight:600">${escapeHtml(r.due_date)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#475569">${escapeHtml(r.assigned_to || "Unassigned")}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
  <div style="max-width:640px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
      <h1 style="margin:0 0 4px;font-size:18px">Privacy Request SLA Breach Alert</h1>
      <p style="margin:0;opacity:.9;font-size:13px">${items.length} data-subject request${items.length > 1 ? "s have" : " has"} passed the statutory deadline and must be actioned immediately.</p>
    </div>
    <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:20px 26px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#fef2f2">
            <th style="padding:8px 12px;text-align:left;color:#7f1d1d">Request</th>
            <th style="padding:8px 12px;text-align:left;color:#7f1d1d">Requester</th>
            <th style="padding:8px 12px;text-align:left;color:#7f1d1d">Type</th>
            <th style="padding:8px 12px;text-align:left;color:#7f1d1d">Due date</th>
            <th style="padding:8px 12px;text-align:left;color:#7f1d1d">Assigned</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="color:#64748b;font-size:12px;margin:16px 0 0">Log in to CertiGuard → Privacy Requests to action these overdue items before regulator notification thresholds are crossed. — CertiGuard SLA Monitoring</p>
    </div>
  </div>
  </body></html>`;
}