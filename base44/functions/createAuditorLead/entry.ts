import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint (no user auth) — external auditors are not app users.
// Creates an AuditorLead record using service role to bypass RLS.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { name, email, firm_name, engagement_context } = body;

    if (!name || !email || !firm_name) {
      return Response.json(
        { error: "Name, email, and firm name are required." },
        { status: 400 }
      );
    }

    const lead = await base44.asServiceRole.entities.AuditorLead.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      firm_name: String(firm_name).trim(),
      engagement_context: engagement_context ? String(engagement_context).trim() : "",
      status: "new",
      source: "for-auditors-page",
    });

    return Response.json({
      success: true,
      lead_id: lead.id,
      message: "Lead created successfully. Our team will reach out within one business day.",
    });
  } catch (error) {
    console.error("createAuditorLead error:", error?.message || error);
    return Response.json(
      { error: error?.message || "Request failed" },
      { status: 500 }
    );
  }
}