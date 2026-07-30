import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Daily scan for vendor contracts expiring within 60 days or already expired.
// Posts a Slack alert listing flagged vendors and, for expired contracts, marks
// the vendor inactive + starts the offboarding lifecycle and creates tasks.
// Workflow-invoked (service role).

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';
const HORIZON_DAYS = 60;

function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + HORIZON_DAYS);

    const all = await base44.asServiceRole.entities.Vendor.list('-contract_end', 500);
    const active = (all || []).filter((v) => v.status !== 'inactive' && v.status !== 'rejected');
    const flagged = active.filter((v) => v.contract_end && new Date(v.contract_end) <= horizon);

    let slackOk = false;
    let slackError = null;
    const tasksCreated = [];
    let offboarded = 0;

    if (flagged.length > 0) {
      const expired = flagged.filter((v) => new Date(v.contract_end) < today);
      const expiring = flagged.filter((v) => new Date(v.contract_end) >= today);

      const lines = [];
      expired.slice(0, 8).forEach((v) =>
        lines.push(`• EXPIRED: ${v.name} (risk: ${v.risk_level || 'n/a'}) — contract ended ${v.contract_end}`)
      );
      expiring.slice(0, 8).forEach((v) => {
        const d = daysBetween(today, new Date(v.contract_end));
        lines.push(`• Expires in ${d}d: ${v.name} (risk: ${v.risk_level || 'n/a'}) — ${v.contract_end}`);
      });
      const shown = Math.min(16, expired.length + expiring.length);
      const text =
        `:card_box: Vendor contracts expiring/expired (${flagged.length} vendor${flagged.length === 1 ? '' : 's'}):\n` +
        `${lines.join('\n')}${flagged.length > shown ? `\n…and ${flagged.length - shown} more` : ''}\n` +
        `Review renewals or start offboarding in CertiGuard.`;

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

      // Expired contracts → mark inactive, start offboarding, create task
      for (const v of expired.slice(0, 50)) {
        try {
          if (v.status !== 'inactive' || v.offboarding_status !== 'in_progress') {
            await base44.asServiceRole.entities.Vendor.update(v.id, {
              status: 'inactive',
              offboarding_status: 'in_progress',
            });
            offboarded++;
          }
          const task = await base44.asServiceRole.entities.ComplianceTask.create({
            tenant_id: v.tenant_id || undefined,
            title: `Offboard expired vendor: ${v.name}`,
            type: 'vendor_review',
            status: 'todo',
            priority: v.risk_level === 'critical' || v.risk_level === 'high' ? 'high' : 'medium',
            notes: `Vendor "${v.name}" contract expired on ${v.contract_end}. Revoke access, credentials and confirm data return/destruction via the vendor offboarding checklist.`,
          });
          if (task?.id) tasksCreated.push(task.id);
        } catch (err) {
          console.error('Vendor offboard error:', err?.message);
        }
      }
    }

    return Response.json({
      ok: true,
      totalScanned: all.length,
      flagged: flagged.length,
      expired: flagged.filter((v) => new Date(v.contract_end) < today).length,
      offboarded,
      slackOk,
      slackError,
      tasksCreated: tasksCreated.length,
    });
  } catch (error) {
    console.error('scanVendorContractExpiry error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Vendor scan failed' }, { status: 500 });
  }
});