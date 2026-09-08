import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Called from the Register page after a new user verifies their email.
// Marks matching pending invites as accepted — requires authentication and
// verifies the caller's email matches the invitation email.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Require authentication — no silent fallback
    let me;
    try {
      me = await base44.auth.me();
    } catch (e) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!me || !me.email) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tenant_id, invitee_email } = body;

    if (!tenant_id || !invitee_email) {
      return Response.json({ error: "tenant_id and invitee_email are required." }, { status: 400 });
    }

    const email = String(invitee_email).trim().toLowerCase();
    const callerEmail = String(me.email).trim().toLowerCase();

    // Verify the caller's email matches the invitation email (ownership proof)
    if (callerEmail !== email) {
      return Response.json({ error: "Email verification failed: caller email does not match the invitation email." }, { status: 403 });
    }

    // Find pending invites matching this tenant + email
    const pending = await base44.asServiceRole.entities.TenantInvite.filter({
      tenant_id: String(tenant_id),
      invitee_email: email,
      status: "pending",
    });

    if (!pending || pending.length === 0) {
      // No matching invite — not an error, just nothing to accept
      return Response.json({ success: true, accepted: 0 });
    }

    const now = new Date().toISOString();
    for (const invite of pending) {
      await base44.asServiceRole.entities.TenantInvite.update(invite.id, {
        status: "accepted",
        accepted_at: now,
        accepted_by_id: me.id,
      });
    }

    return Response.json({ success: true, accepted: pending.length });
  } catch (error) {
    console.error("acceptColleagueInvite error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to accept invitation" }, { status: 500 });
  }
}