import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { sendGmail } from "../../shared/gmailSender.ts";

function getBaseUrl(req) {
  const origin = req.headers.get('origin');
  if (origin) return origin;
  const referer = req.headers.get('referer');
  if (referer) { try { return new URL(referer).origin; } catch {} }
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (host) return `https://${host}`;
  return '';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "You must be signed in to invite a colleague." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { invitee_email } = body;

    if (!invitee_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(invitee_email))) {
      return Response.json({ error: "A valid colleague email is required." }, { status: 400 });
    }

    const tenantId = user.data?.tenant_id;
    if (!tenantId) {
      return Response.json({ error: "Your account is not linked to a tenant." }, { status: 400 });
    }

    const invitee = String(invitee_email).trim().toLowerCase();

    // Prevent duplicate pending invites to the same email in the same tenant
    const existing = await base44.asServiceRole.entities.TenantInvite.filter(
      { tenant_id: tenantId, invitee_email: invitee, status: "pending" },
      '-created_date',
      1
    );
    if (existing && existing.length > 0) {
      return Response.json({ error: "This colleague already has a pending invitation." }, { status: 409 });
    }

    const baseUrl = getBaseUrl(req);
    const inviteLink = `${baseUrl}/register?tenant_invite=${encodeURIComponent(tenantId)}`;

    await base44.asServiceRole.entities.TenantInvite.create({
      tenant_id: tenantId,
      inviter_id: user.id,
      inviter_name: user.full_name || user.email,
      invitee_email: invitee,
      status: "pending",
    });

    const inviterName = user.full_name || "a colleague";
    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#0A2463;padding:24px 40px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                CertiGuard GRC
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#0f172a;font-weight:700;">
              You're invited to join CertiGuard GRC
            </h1>
            <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
              ${inviterName} has invited you to join their team's workspace on CertiGuard GRC —
              the AI-powered governance, risk, and compliance platform.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
              You'll be able to collaborate on compliance controls, risk assessments, evidence
              collection, and audit readiness — all in one secure, tenant-isolated platform.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0A2463;border-radius:10px;">
                  <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                    Accept invitation &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
              Or copy this link: ${inviteLink}
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
              You received this email because ${inviterName} invited you to join CertiGuard GRC.
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await sendGmail(base44, invitee, "You're invited to join CertiGuard GRC", htmlBody);

    return Response.json({ success: true, message: `Invitation sent to ${invitee}` });
  } catch (error) {
    console.error("sendColleagueInvite error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to send invitation" }, { status: 500 });
  }
}