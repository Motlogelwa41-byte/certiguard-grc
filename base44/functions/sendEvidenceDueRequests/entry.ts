import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendGmail } from "../../shared/gmailSender.ts";

// Emails department heads (control owners) when evidence documentation for their
// controls is due (next_review within 14 days, or already overdue) and no
// pending/approved evidence is on file yet. Each email includes a direct link
// to the secure evidence portal where they can upload files.
// Runs on a daily schedule via the EvidenceDueRequestScanner workflow.

// Auto-derive the public app URL from BASE44_APP_ID (always available in the runtime).
const APP_ID = Deno.env.get("BASE44_APP_ID") || "";
const APP_URL = APP_ID ? `https://base44.app/apps/${APP_ID}` : "";
const PORTAL_PATH = "/evidence";

function escapeHtml(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 14);

    const controls = await base44.asServiceRole.entities.Control.list('-next_review', 500);
    const due = (controls || []).filter((c) => {
      if (!c.next_review) return false;
      const d = new Date(c.next_review);
      d.setHours(0, 0, 0, 0);
      // overdue OR due within the next 14 days
      return d <= horizon;
    });

    if (due.length === 0) {
      return Response.json({ ok: true, dueControls: 0, sent: 0, skipped: 0 });
    }

    // Skip controls that already have pending_review or approved evidence on file
    const evidence = await base44.asServiceRole.entities.Evidence.list('-collected_date', 500);
    const hasActiveEvidence = (controlId) =>
      (evidence || []).some(
        (e) => (e.control_id === controlId) && (e.status === 'pending_review' || e.status === 'approved')
      );
    const needsRequest = due.filter(
      (c) => !hasActiveEvidence(c.id) && !(c.control_id && hasActiveEvidence(c.control_id))
    );

    // Resolve owner emails via the User entity (owner_id → registered user)
    const ownerIds = [...new Set(needsRequest.map((c) => c.owner_id).filter(Boolean))];
    const ownerInfo = {};
    for (const uid of ownerIds) {
      try {
        const u = await base44.asServiceRole.entities.User.get(uid);
        if (u?.email) ownerInfo[uid] = { email: u.email, name: u.full_name || u.email };
      } catch (e) {
        /* owner not resolvable — skip */
      }
    }

    // Group by tenant_id + owner email so reminders never mix tenants
    const byEmail = {};
    for (const c of needsRequest) {
      const info = c.owner_id ? ownerInfo[c.owner_id] : null;
      if (!info) continue;
      const key = `${c.tenant_id || ""}|${info.email.toLowerCase()}`;
      (byEmail[key] = byEmail[key] || { name: info.name, email: info.email, items: [] }).items.push(c);
    }

    const portalBase = APP_URL ? `${APP_URL}${PORTAL_PATH}` : `Log in to CertiGuard → Evidence Manager (${PORTAL_PATH})`;
    let sent = 0;
    let failed = 0;

    for (const [, group] of Object.entries(byEmail)) {
      const email = group.email;
      const statusFor = (c) => {
        if (!c.next_review) return { label: "Due", color: "#475569" };
        const d = new Date(c.next_review); d.setHours(0, 0, 0, 0);
        if (d < today) return { label: "Overdue", color: "#b91c1c" };
        const days = Math.ceil((d - today) / 86400000);
        return { label: `Due in ${days}d`, color: days <= 3 ? "#b91c1c" : "#b45309" };
      };
      const rows = group.items
        .map((c) => {
          const s = statusFor(c);
          return `<tr>
              <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;font-family:monospace">${escapeHtml(c.control_id || "—")}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(c.title || "")}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap;color:${s.color};font-weight:600">${escapeHtml(c.next_review || "—")}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:12px;white-space:nowrap"><span style="background:${s.color};color:#fff;padding:2px 8px;border-radius:10px;font-weight:600">${s.label}</span></td>
            </tr>`;
        })
        .join("");

      const overdueCount = group.items.filter((c) => c.next_review && new Date(c.next_review) < today).length;
      const subject = `${overdueCount > 0 ? "⏰ Action needed:" : "📁"} [CertiGuard Evidence] ${group.items.length} control(s) need documentation`;
      const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
        <div style="max-width:640px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
            <h1 style="margin:0 0 4px;font-size:18px">Evidence Documentation Due</h1>
            <p style="margin:0;opacity:.85;font-size:13px">${group.items.length} control(s) you own need current evidence before their next review date.</p>
          </div>
          <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
            <p style="color:#475569;font-size:14px;margin:0 0 8px">Hi ${escapeHtml(group.name)},</p>
            <p style="color:#475569;font-size:14px;margin:0 0 16px">As the responsible owner, please upload the required evidence documentation (screenshots, reports, configurations, or certificates) for the controls below before their review date. This keeps our compliance program audit-ready.</p>
            <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
              <thead>
                <tr style="background:#f8fafc">
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Control ID</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Control</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Review Date</th>
                  <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Status</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin:0 0 16px">
              <a href="${escapeHtml(portalBase)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 22px;border-radius:8px">Upload evidence in CertiGuard →</a>
            </p>
            <div style="border:1px solid #bfdbfe;background:#eff6ff;border-radius:8px;padding:12px 14px;margin:0 0 16px">
              <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1e3a8a">📎 Prefer to reply by email?</p>
              <p style="margin:0;font-size:13px;color:#1e3a8a">Simply <strong>reply to this email and attach your evidence file(s)</strong> (screenshots, reports, certificates). Include the <strong>Control ID</strong> in your reply so we can match it to the right control — we'll capture your submission automatically.</p>
            </div>
            <p style="color:#64748b;font-size:12px;margin:0">If the button above doesn't work, log in to CertiGuard and go to <strong>Evidence → Upload</strong>. This is a secure portal — only authenticated members of your organisation can access it. — CertiGuard GRC</p>
          </div>
        </div>
      </body></html>`;

      try {
        await sendGmail(base44, email, subject, body);
        sent++;
      } catch (e) {
        console.error(`Evidence-due email to ${email} failed:`, e?.message);
        failed++;
      }
    }

    return Response.json({
      ok: true,
      dueControls: due.length,
      needsRequest: needsRequest.length,
      recipients: Object.keys(byEmail).length,
      sent,
      failed,
    });
  } catch (error) {
    console.error('sendEvidenceDueRequests error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'evidence due requests failed' }, { status: 500 });
  }
});