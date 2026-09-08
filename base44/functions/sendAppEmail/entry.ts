import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Authenticated app email sender — all client-side SendEmail calls route through here
// so integration credits are consumed server-side (asServiceRole), not from the user's quota.
// Requires an authenticated session; the caller builds the subject/body content.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { to, subject, body: textBody, html } = body;

    if (!to || !subject) {
      return Response.json({ error: 'to and subject are required' }, { status: 400 });
    }

    const emailParams: any = { to: String(to), subject: String(subject) };
    if (html) emailParams.html = String(html);
    else if (textBody) emailParams.body = String(textBody);
    else emailParams.body = '';

    await base44.asServiceRole.integrations.Core.SendEmail(emailParams);

    return Response.json({ ok: true });
  } catch (error) {
    console.error('sendAppEmail error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}