import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Scans all tenants for risks whose formal acceptance has expired (acceptance_expires_at < today
// and status === "accepted"). Reverts each to "open", clears the acceptance fields, creates an
// AnomalyAlert, and notifies the CRO via Slack so the risk must be re-signed-off.
// Runs daily via the "Risk Acceptance Expiry Scanner" workflow.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const today = new Date().toISOString().slice(0, 10);

    // Fetch all accepted risks (service role sees across tenants; we group by tenant_id)
    const risks = await sr.entities.Risk.filter({ status: "accepted" }, "-acceptance_expires_at", 500);

    const expired = (risks || []).filter((r) => {
      if (!r.acceptance_expires_at) return false;
      return new Date(r.acceptance_expires_at) < new Date(today);
    });

    let reverted = 0;
    const byTenant = {};

    for (const r of expired) {
      const tid = r.tenant_id;
      try {
        await sr.entities.Risk.update(r.id, {
          status: "open",
          treatment: "mitigate",
          accepted_by_name: null,
          accepted_by_id: null,
          accepted_at: null,
          acceptance_expires_at: null,
          acceptance_signature: null,
          tolerance_justification: `Risk acceptance expired on ${r.acceptance_expires_at}. Auto-reverted to open by Risk Acceptance Expiry Scanner.`,
        });

        await sr.entities.AnomalyAlert.create({
          tenant_id: tid,
          anomaly_id: `AE-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: `Risk acceptance expired: ${r.title}`,
          description: `Risk "${r.title}" (risk_id: ${r.risk_id || r.id}) was formally accepted by ${r.accepted_by_name || "unknown"} and expired on ${r.acceptance_expires_at}. It has been automatically reverted to OPEN status and must be re-assessed and re-signed-off by the Chief Risk Officer.`,
          anomaly_type: "compliance_regression",
          severity: (r.risk_score >= 16) ? "high" : "medium",
          entity_type: "risk",
          entity_id: r.id,
          entity_name: r.title,
          detected_value: JSON.stringify({ expired_on: r.acceptance_expires_at, previous_status: "accepted", reverted_to: "open" }),
          baseline_value: r.risk_score || 0,
          current_value: r.risk_score || 0,
          confidence_score: 100,
          recommended_action: "Re-assess the risk and either re-accept with a new expiry date, mitigate, or escalate to the board risk committee.",
          status: "open",
          detected_at: new Date().toISOString(),
        });

        reverted++;
        byTenant[tid] = (byTenant[tid] || 0) + 1;
      } catch (e) {
        console.error(`Failed to revert risk ${r.id}:`, e?.message || e);
      }
    }

    // Aggregate Slack alert to CRO if any acceptances expired
    if (reverted > 0) {
      try {
        const msg = `⚠️ *Risk Acceptance Expiry Scanner* reverted ${reverted} expired risk acceptance(s) to OPEN on ${today}. Each must be re-signed-off by the Chief Risk Officer. Tenants affected: ${Object.keys(byTenant).length}.`;
        await sr.functions.invoke("sendSlackAlert", { message: msg, channel: "C0BJB8240RF" });
      } catch (_) { /* best-effort */ }
    }

    return Response.json({
      ok: true,
      scanned: (risks || []).length,
      expired: expired.length,
      reverted,
      by_tenant: byTenant,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("expireRiskAcceptances error:", error?.message || error);
    return Response.json({ error: error?.message || "Risk acceptance expiry scan failed" }, { status: 500 });
  }
});