import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Daily scan for contracts approaching their renewal notice window or already expired.
// Creates renewal review tasks for expiring contracts and posts a Slack digest.
// Workflow-invoked (service role).

const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

function daysBetween(a, b) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const all = await base44.asServiceRole.entities.Contract.list('-end_date', 500);
    const relevant = (all || []).filter((c) => c.end_date && c.status !== 'terminated' && c.status !== 'draft');

    const expired = relevant.filter((c) => new Date(c.end_date) < today);
    const expiring = relevant.filter((c) => {
      const d = daysBetween(today, new Date(c.end_date));
      return d >= 0 && d <= (c.renewal_notice_days || 60);
    });

    const tasksCreated = [];
    let slackOk = false;
    let slackError = null;

    if (expired.length > 0 || expiring.length > 0) {
      // Post Slack digest
      const lines = [];
      expired.slice(0, 8).forEach((c) =>
        lines.push(`• EXPIRED: ${c.title} (${c.counterparty}) — ended ${c.end_date}`)
      );
      expiring.slice(0, 8).forEach((c) => {
        const d = daysBetween(today, new Date(c.end_date));
        lines.push(`• Expires in ${d}d: ${c.title} (${c.counterparty}) — ${c.end_date}${c.auto_renew ? ' [auto-renew]' : ''}`);
      });
      const total = expired.length + expiring.length;
      const shown = Math.min(16, total);
      const text =
        `:page_facing_up: Contract renewals requiring attention (${total} contract${total === 1 ? '' : 's'}):\n` +
        `${lines.join('\n')}${total > shown ? `\n…and ${total - shown} more` : ''}\n` +
        `Review renewals in CertiGuard → Contracts.`;

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

      // Create renewal review tasks for expiring contracts
      for (const c of expiring.slice(0, 50)) {
        try {
          const d = daysBetween(today, new Date(c.end_date));
          const task = await base44.asServiceRole.entities.ComplianceTask.create({
            tenant_id: c.tenant_id || undefined,
            title: `Review contract renewal: ${c.title}`,
            type: 'vendor_review',
            status: 'todo',
            priority: d <= 14 ? 'high' : 'medium',
            due_date: c.end_date,
            notes: `Contract "${c.title}" with ${c.counterparty} expires on ${c.end_date} (in ${d} days).${c.auto_renew ? ' Auto-renewal is enabled — confirm or cancel.' : ' Review renewal terms or initiate offboarding.'}${c.linked_vendor_name ? ` Linked vendor: ${c.linked_vendor_name}.` : ''}`,
          });
          if (task?.id) tasksCreated.push(task.id);
        } catch (err) {
          console.error('Contract renewal task error:', err?.message);
        }
      }

      // Mark expired contracts
      for (const c of expired.slice(0, 50)) {
        try {
          if (c.status !== 'expired') {
            await base44.asServiceRole.entities.Contract.update(c.id, { status: 'expired' });
          }
        } catch (err) {
          console.error('Contract status update error:', err?.message);
        }
      }
    }

    return Response.json({
      ok: true,
      totalScanned: all.length,
      expired: expired.length,
      expiring: expiring.length,
      tasksCreated: tasksCreated.length,
      slackOk,
      slackError,
    });
  } catch (error) {
    console.error('scanContractRenewals error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Contract scan failed' }, { status: 500 });
  }
});