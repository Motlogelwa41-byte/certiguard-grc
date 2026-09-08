import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Authenticated app email sender — all client-side SendEmail calls route through here
// so integration credits are consumed server-side (asServiceRole), not from the user's quota.
// Requires an authenticated session; recipients must be registered app users in the same tenant.
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

    // Parse recipients (comma-separated string or array) and cap to prevent abuse
    const recipients = Array.isArray(to)
      ? to.map(e => String(e).trim()).filter(Boolean)
      : String(to).split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return Response.json({ error: 'At least one recipient is required' }, { status: 400 });
    }
    if (recipients.length > 50) {
      return Response.json({ error: 'Too many recipients (max 50)' }, { status: 400 });
    }

    // Verify every recipient is a registered app user in the same tenant
    const tenantId = user.data?.tenant_id;
    for (const recipient of recipients) {
      const normalizedEmail = recipient.toLowerCase();
      const matchedUsers = await base44.asServiceRole.entities.User
        .filter({ email: normalizedEmail })
        .catch(() => []);
      const matched = (matchedUsers || []).find(u =>
        u.email?.toLowerCase() === normalizedEmail &&
        (!tenantId || u.data?.tenant_id === tenantId || u.role === 'admin')
      );
      if (!matched) {
        return Response.json(
          { error: `Recipient ${recipient} is not a verified member of your tenant` },
          { status: 403 }
        );
      }
    }

    const emailParams: any = {
      to: recipients.join(','),
      subject: String(subject).slice(0, 200),
    };
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