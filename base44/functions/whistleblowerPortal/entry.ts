import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public endpoint (no user auth) — whistleblowers are anonymous.
// Security: anonymous_token (UUID) gates two-way communication.
// asServiceRole bypasses RLS to create/read records on behalf of anonymous submitters.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ── SUBMIT: Create a new anonymous report ──
    if (action === "submit") {
      const { category, subject, description, evidence_hashes } = body;
      if (!description || !description.trim()) {
        return Response.json({ error: "Description is required." }, { status: 400 });
      }
      const year = new Date().getFullYear();
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      const caseNumber = `WB-${year}-${rand}`;
      const anonymousToken = crypto.randomUUID();

      const messages = JSON.stringify([{
        from: "whistleblower",
        text: description,
        timestamp: new Date().toISOString(),
        is_admin: false
      }]);

      await base44.asServiceRole.entities.WhistleblowerReport.create({
        case_number: caseNumber,
        category: category || "other",
        subject: subject || "Untitled Report",
        description: description,
        status: "submitted",
        priority: "medium",
        anonymous_token: anonymousToken,
        messages: messages,
        evidence_hashes: evidence_hashes || [],
        submitted_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        case_number: caseNumber,
        anonymous_token: anonymousToken
      });
    }

    // ── STATUS: Check report status using anonymous token ──
    if (action === "status") {
      const { anonymous_token } = body;
      if (!anonymous_token) return Response.json({ error: "Token required." }, { status: 400 });

      const reports = await base44.asServiceRole.entities.WhistleblowerReport.filter({ anonymous_token });
      if (reports.length === 0) return Response.json({ error: "Report not found." }, { status: 404 });

      const report = reports[0];
      return Response.json({
        case_number: report.case_number,
        status: report.status,
        priority: report.priority,
        category: report.category,
        subject: report.subject,
        messages: report.messages,
        submitted_at: report.submitted_at,
      });
    }

    // ── REPLY: Whistleblower adds a message using anonymous token ──
    if (action === "reply") {
      const { anonymous_token, text } = body;
      if (!anonymous_token || !text || !text.trim()) {
        return Response.json({ error: "Token and message text required." }, { status: 400 });
      }

      const reports = await base44.asServiceRole.entities.WhistleblowerReport.filter({ anonymous_token });
      if (reports.length === 0) return Response.json({ error: "Report not found." }, { status: 404 });

      const report = reports[0];
      const messages = JSON.parse(report.messages || "[]");
      messages.push({
        from: "whistleblower",
        text: text,
        timestamp: new Date().toISOString(),
        is_admin: false
      });

      await base44.asServiceRole.entities.WhistleblowerReport.update(report.id, {
        messages: JSON.stringify(messages),
      });

      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action. Use 'submit', 'status', or 'reply'." }, { status: 400 });
  } catch (error) {
    console.error("whistleblowerPortal error:", error?.message || error);
    return Response.json({ error: error?.message || "Request failed" }, { status: 500 });
  }
}