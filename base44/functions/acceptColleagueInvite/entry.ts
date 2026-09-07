import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Called from the Register page after a new user verifies their email.
// Marks matching pending invites as accepted.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tenant_id, invitee_email } = body;

    if (!tenant_id || !invitee_email) {
      return Response.json({ error: "tenant_id and invitee_email are required." }, { status: 400 });
    }

    const email = String(invitee_email).trim().toLowerCase();

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

    // Try to get the new user's ID for record-keeping
    let acceptedById = "";
    try {
      const me = await base44.auth.me();
      if (me) acceptedById = me.id;
    } catch (e) { /* best-effort */ }

    const now = new Date().toISOString();
    for (const invite of pending) {
      await base44.asServiceRole.entities.TenantInvite.update(invite.id, {
        status: "accepted",
        accepted_at: now,
        accepted_by_id: acceptedById,
      });
    }

    return Response.json({ success: true, accepted: pending.length });
  } catch (error) {
    console.error("acceptColleagueInvite error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to accept invitation" }, { status: 500 });
  }
}