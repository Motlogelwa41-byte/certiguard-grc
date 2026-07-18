import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Posts an alert to the #compliance Slack channel as the CertiGuard bot.
// Invoked by workflows (Vendor high-risk status change, new ComplianceTask).
// The slackbot connector grants only chat scopes (no channels:read), so the
// channel ID must be hardcoded — we cannot resolve the channel name at runtime.
const COMPLIANCE_CHANNEL_ID = 'C0BJB8240RF';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
    if (!accessToken) {
      return Response.json({ ok: false, error: 'Slack bot not connected' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const text = body.text || 'CertiGuard GRC alert';
    const channelId = body.channel || COMPLIANCE_CHANNEL_ID;

    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelId,
        text,
        username: BOT_USERNAME,
        icon_emoji: BOT_ICON_EMOJI,
      }),
    });
    const postData = await postRes.json();
    if (!postData.ok) {
      console.error('Slack chat.postMessage failed:', postData.error);
      return Response.json({ ok: false, error: postData.error }, { status: 502 });
    }
    return Response.json({ ok: true, ts: postData.ts, channel: channelId });
  } catch (error) {
    console.error('sendSlackAlert error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Slack alert failed' }, { status: 500 });
  }
});