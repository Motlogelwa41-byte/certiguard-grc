import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendGmail } from '../../shared/gmailSender.ts';

// Daily scan for evidence expiring within 7 days or already expired.
// Posts a Slack alert listing flagged items, sends email reminders to
// evidence owners, and creates re-collection tasks for already-expired
// evidence. Workflow-invoked (service role).

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 7);

    const all = await base44.asServiceRole.entities.Evidence.list('-expiry_date', 500);
    const flagged = (all || []).filter((e) => {
      if (!e.expiry_date) return false;
      if (e.status === 'rejected' || e.status === 'expired') return false;
      return new Date(e.expiry_date) <= horizon;
    });

    let slackOk = false;
    let slackError = null;
    let emailsSent = 0;
    let emailsFailed = 0;
    const tasksCreated = [];

    if (flagged.length > 0) {
      const expired = flagged.filter((e) => new Date(e.expiry_date) < today);
      const expiring = flagged.filter((e) => new Date(e.expiry_date) >= today);
      const lines = [];
      expired.slice(0, 8).forEach((e) =>
        lines.push(`• EXPIRED: ${e.title} (control: ${e.control_title || e.control_id || 'n/a'}) — expired ${e.expiry_date}`)
      );
      expiring.slice(0, 8).forEach((e) => {
        const d = daysBetween(today, new Date(e.expiry_date));
        lines.push(`• Expiring in ${d}d: ${e.title} (control: ${e.control_title || e.control_id || 'n/a'}) — ${e.expiry_date}`);
      });
      const shown = Math.min(16, expired.length + expiring.length);
      const text =
        `:hourglass_flowing_sand: Evidence expiring/expired (${flagged.length} item${flagged.length === 1 ? '' : 's'}):\n` +
        `${lines.join('\n')}${flagged.length > shown ? `\n…and ${flagged.length - shown} more` : ''}\n` +
        `Re-collect in CertiGuard to keep audit evidence current.`;

      try {
        const conn = await base44.asServiceRole.connectors.getConnection('slackbot');
        const accessToken = conn?.accessToken;
        if (accessToken) {
          const postRes = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: COMPLIANCE_CHANNEL_ID, text, username: BOT_USERNAME, icon_emoji: BOT_ICON_EMOJI }),
          });
          const postData = await postRes.json();
          slackOk = !!postData.ok;
          if (!postData.ok) slackError = postData.error;
        } else {
          slackError = 'slackbot not connected';
        }
      } catch (e) {
        slackError = e?.message || 'slack post failed';
        console.error('Slack error:', slackError);
      }

      // --- Email reminders to evidence owners ---
      // Build a user lookup from owner_id / created_by_id -> email
      const userIds = new Set();
      for (const e of flagged) {
        if (e.owner_id) userIds.add(e.owner_id);
        if (e.created_by_id) userIds.add(e.created_by_id);
      }
      const userMap = {};
      if (userIds.size > 0) {
        try {
          const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
          for (const u of users || []) {
            if (u.email) userMap[u.id] = { email: u.email, name: u.full_name || '' };
          }
        } catch (e) {
          console.error('User lookup failed:', e?.message);
        }
      }

      // Group flagged evidence by recipient email (per tenant)
      const byEmail = {};
      for (const e of flagged) {
        const user = userMap[e.owner_id] || userMap[e.created_by_id];
        if (!user?.email) continue;
        const key = `${e.tenant_id || ''}|${user.email}`;
        (byEmail[key] = byEmail[key] || []).push(e);
      }

      for (const [key, items] of Object.entries(byEmail)) {
        const [, email] = key.split('|');
        const ownerName = items[0].owner_name || userMap[items[0].owner_id]?.name || userMap[items[0].created_by_id]?.name || 'team member';
        const rows = items.map((e) => {
          const isExp = new Date(e.expiry_date) < today;
          const d = isExp ? 0 : daysBetween(today, new Date(e.expiry_date));
          const statusText = isExp ? 'EXPIRED' : `Expires in ${d} day${d === 1 ? '' : 's'}`;
          return `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(e.title || '')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px">${escapeHtml(e.control_title || e.control_id || 'n/a')}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap;color:${isExp ? '#b91c1c' : '#b45309'};font-weight:600">${statusText}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:13px;white-space:nowrap">${e.expiry_date}</td>
          </tr>`;
        }).join('');

        const subject = `📋 CertiGuard GRC — ${items.length} evidence item(s) expiring soon`;
        const body = `<!DOCTYPE html><html><body style="font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;padding:20px;margin:0">
          <div style="max-width:640px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:#fff;padding:22px 26px;border-radius:12px 12px 0 0">
              <h1 style="margin:0 0 4px;font-size:18px">Evidence Expiry Reminder</h1>
              <p style="margin:0;opacity:.85;font-size:13px">${items.length} evidence item(s) you own are expiring within 7 days or have already expired.</p>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
              <p style="color:#475569;font-size:14px;margin:0 0 16px">Hi ${escapeHtml(ownerName)},</p>
              <p style="color:#475569;font-size:14px;margin:0 0 16px">Please re-collect the following evidence to maintain audit readiness. Expired evidence can cause controls to fail during compliance audits.</p>
              <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
                <thead>
                  <tr style="background:#f8fafc">
                    <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Evidence</th>
                    <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Control</th>
                    <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Status</th>
                    <th style="text-align:left;padding:8px 10px;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0">Expiry Date</th>
                  </tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
              <p style="color:#64748b;font-size:12px;margin:0">Log in to CertiGuard GRC to upload updated evidence. — CertiGuard GRC Automated Reminders</p>
            </div>
          </div>
        </body></html>`;

        try {
          await sendGmail(base44, email, subject, body);
          emailsSent++;
        } catch (e) {
          emailsFailed++;
          console.error('Evidence email failed:', e?.message);
        }
      }

      for (const e of expired.slice(0, 25)) {
        try {
          const task = await base44.asServiceRole.entities.ComplianceTask.create({
            tenant_id: e.tenant_id || undefined,
            title: `Re-collect expired evidence: ${e.title}`,
            type: 'evidence_collection',
            status: 'todo',
            priority: 'high',
            related_control_id: e.control_id,
            notes: `Evidence "${e.title}" expired on ${e.expiry_date}. Re-collect a current version to maintain audit readiness.`,
          });
          if (task?.id) tasksCreated.push(task.id);
        } catch (err) {
          console.error('Task create error:', err?.message);
        }
      }
    }

    return Response.json({
      ok: true,
      totalScanned: all.length,
      flagged: flagged.length,
      expired: flagged.filter((e) => new Date(e.expiry_date) < today).length,
      slackOk,
      slackError,
      emailsSent,
      emailsFailed,
      tasksCreated: tasksCreated.length,
    });
  } catch (error) {
    console.error('scanExpiringEvidence error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Evidence scan failed' }, { status: 500 });
  }
});