import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const reqs = await sr.entities.PrivacyRequest.list("-created_date", 500);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let flagged = 0;
    let resolved = 0;
    for (const r of reqs || []) {
      if (["closed", "rejected", "response_sent"].includes(r.status)) continue;
      if (!r.due_date) continue;
      const due = new Date(r.due_date);
      const breached = due < today;
      if (breached && (!r.sla_breached || r.status !== "overdue")) {
        try {
          await sr.entities.PrivacyRequest.update(r.id, { sla_breached: true, status: "overdue" });
          flagged++;
        } catch (_) { /* ignore */ }
      } else if (!breached && r.sla_breached) {
        try {
          await sr.entities.PrivacyRequest.update(r.id, { sla_breached: false });
          resolved++;
        } catch (_) { /* ignore */ }
      }
    }

    return Response.json({ scanned: (reqs || []).length, flagged, resolved, scannedAt: todayStr });
  } catch (error) {
    console.error("handlePrivacyRequestSla error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});