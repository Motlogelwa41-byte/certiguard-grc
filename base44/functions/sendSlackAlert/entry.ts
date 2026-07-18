import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Posts an alert to the #compliance Slack channel as the CertiGuard bot.
// Invoked by workflows (Vendor high-risk status change, new ComplianceTask).
const DEFAULT_CHANNEL = 'compliance';
const BOT_USERNAME = 'CertiGuard';
const BOT_ICON_EMOJI = ':shield:';

// Resolve a human channel name (e.g. "compliance") to its Slack channel ID,
// paginating conversations.list fully.
async function resolveChannelId(accessToken, name) {
  const clean = String(name || '').replace(/^#/, '');
  let cursor = '';
  for (let i = 0; i < 20; i++) {
    const url = `https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200${cursor ? `&cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json();
    if (!data.ok) return null;
    const found = (data.channels || []).find((c) => c.name === clean);
    if (found) return found.id;
    if (!data.response_metadata?.next_cursor) break;
    cursor = data.response_metadata.next_cursor;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
    if (!accessToken) {
      return Response.json({ ok: false, error: 'Slack bot not connected' }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const text = body.text || 'CertiGuard GRC alert';
    const channelName = body.channel || DEFAULT_CHANNEL;

    const channelId = (await resolveChannelId(accessToken, channelName)) || channelName.replace(/^#/, '');

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