import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  resolveTenantContext,
  assertTenantMatch,
} from "../../shared/tenantGuard.ts";

/**
 * Risk Metrics Auto-Calculation Trigger
 *
 * Acts as a database trigger: whenever a risk is saved (created or updated),
 * this function recalculates:
 *   - risk_score = qualitative_likelihood × qualitative_impact
 *   - annualized_loss_expectancy = quantitative_single_loss × quantitative_annual_rate
 *
 * Invoked by the RiskMetricsAutoCalculation workflow (entity trigger on Risk).
 * Also callable directly from the frontend after a risk save.
 *
 * Idempotent: if the calculated values already match, it skips the update
 * to avoid unnecessary write triggers.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { risk_id } = body;

    if (!risk_id) {
      return Response.json({ ok: false, error: "risk_id is required" }, { status: 400 });
    }

    // Resolve session tenant context — enforces the mandatory tenant_id rule
    const ctx = await resolveTenantContext(base44);

    // Fetch the risk record (service role to read regardless of RLS, then validate tenant)
    const risk = await base44.asServiceRole.entities.Risk.get(risk_id);
    assertTenantMatch(ctx, risk);

    // --- Qualitative calculation: risk_score = likelihood × impact ---
    const likelihood = Number(risk.likelihood ?? 3);
    const impact = Number(risk.impact ?? 3);
    const calculatedRiskScore = likelihood * impact;

    // --- Quantitative calculation: ALE = single_loss × annual_rate ---
    const singleLoss = risk.quantitative_single_loss != null
      ? Number(risk.quantitative_single_loss)
      : null;
    const annualRate = risk.quantitative_annual_rate != null
      ? Number(risk.quantitative_annual_rate)
      : null;
    const calculatedALE = (singleLoss != null && annualRate != null)
      ? singleLoss * annualRate
      : 0;

    // --- Idempotency check: skip update if values already match ---
    const currentRiskScore = Number(risk.risk_score ?? 0);
    const currentALE = Number(risk.annualized_loss_expectancy ?? 0);

    const riskScoreMatches = currentRiskScore === calculatedRiskScore;
    const aleMatches = currentALE === calculatedALE;

    if (riskScoreMatches && aleMatches) {
      return Response.json({
        ok: true,
        skipped: true,
        risk_id,
        risk_score: calculatedRiskScore,
        annualized_loss_expectancy: calculatedALE,
        message: "Metrics already up to date — no update needed",
      });
    }

    // --- Persist the calculated metrics ---
    const updatePayload: Record<string, any> = {};
    if (!riskScoreMatches) updatePayload.risk_score = calculatedRiskScore;
    if (!aleMatches) updatePayload.annualized_loss_expectancy = calculatedALE;

    await base44.asServiceRole.entities.Risk.update(risk_id, updatePayload);

    return Response.json({
      ok: true,
      risk_id,
      metrics: {
        likelihood,
        impact,
        risk_score: calculatedRiskScore,
        quantitative_single_loss: singleLoss,
        quantitative_annual_rate: annualRate,
        annualized_loss_expectancy: calculatedALE,
      },
      updated_fields: Object.keys(updatePayload),
    });
  } catch (error) {
    const status = error?.status || 500;
    const message = error?.message || "Risk metrics calculation failed";
    console.error("calculateRiskMetrics error:", message);
    return Response.json({ ok: false, error: message }, { status });
  }
}