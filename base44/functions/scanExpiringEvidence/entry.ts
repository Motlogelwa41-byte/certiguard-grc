import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Daily scan for evidence expiring within 7 days or already expired.
// Posts a Slack alert listing flagged items and creates re-collection
// tasks for already-expired evidence. Workflow-invoked (service role).

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
      tasksCreated: tasksCreated.length,
    });
  } catch (error) {
    console.error('scanExpiringEvidence error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Evidence scan failed' }, { status: 500 });
  }
});