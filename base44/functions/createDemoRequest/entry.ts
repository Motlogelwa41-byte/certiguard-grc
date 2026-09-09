import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public endpoint (no user auth) — prospects requesting a demo are not app users.
// Creates a DemoRequest record and emails the sales team.
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { name, email, company, company_size, role, frameworks_of_interest, preferred_date, message, source } = body;

    if (!name || !email || !company) {
      return Response.json(
        { error: "Name, work email, and company are required." },
        { status: 400 }
      );
    }

    const lead = await base44.asServiceRole.entities.DemoRequest.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      company: String(company).trim(),
      company_size: company_size ? String(company_size) : "",
      role: role ? String(role).trim() : "",
      frameworks_of_interest: Array.isArray(frameworks_of_interest) ? frameworks_of_interest : [],
      preferred_date: preferred_date ? String(preferred_date) : "",
      message: message ? String(message).trim() : "",
      source: source ? String(source) : "landing-page",
      status: "new",
    });

    // Notify sales team (best-effort — don't fail the request if email fails)
    try {
      const fwList = Array.isArray(frameworks_of_interest) && frameworks_of_interest.length
        ? frameworks_of_interest.join(", ")
        : "Not specified";
      const esc = escapeHtml;
      const bodyHtml = `
        <h2>New Demo Request</h2>
        <p><strong>Name:</strong> ${esc(String(name).trim())}</p>
        <p><strong>Email:</strong> ${esc(String(email).trim().toLowerCase())}</p>
        <p><strong>Company:</strong> ${esc(String(company).trim())}</p>
        <p><strong>Company Size:</strong> ${esc(company_size || "Not specified")}</p>
        <p><strong>Role:</strong> ${esc(role || "Not specified")}</p>
        <p><strong>Frameworks of Interest:</strong> ${esc(fwList)}</p>
        <p><strong>Preferred Date:</strong> ${esc(preferred_date || "Not specified")}</p>
        <p><strong>Message:</strong></p>
        <p>${message ? esc(String(message).trim()).replace(/\n/g, "<br/>") : "None"}</p>
        <p><strong>Source:</strong> ${esc(source || "landing-page")}</p>
        <hr/>
        <p>Follow up within one business day to schedule the demo.</p>
      `;
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: "sales@ethicaledgegrcconsulting.com",
        subject: `New Demo Request — ${esc(String(company).trim())}`,
        body: bodyHtml,
      });
    } catch (emailErr) {
      console.error("Demo request email notification failed:", emailErr?.message || emailErr);
    }

    return Response.json({
      success: true,
      lead_id: lead.id,
      message: "Demo request received. Our team will reach out within one business day to schedule your session.",
    });
  } catch (error) {
    console.error("createDemoRequest error:", error?.message || error);
    return Response.json(
      { error: error?.message || "Request failed" },
      { status: 500 }
    );
  }
}