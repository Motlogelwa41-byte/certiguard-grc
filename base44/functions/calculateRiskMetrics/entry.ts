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

    // --- Quantitative calculation: inherent ALE = single_loss × annual_rate ---
    const singleLoss = risk.quantitative_single_loss != null
      ? Number(risk.quantitative_single_loss)
      : null;
    const annualRate = risk.quantitative_annual_rate != null
      ? Number(risk.quantitative_annual_rate)
      : null;
    const calculatedALE = (singleLoss != null && annualRate != null)
      ? singleLoss * annualRate
      : 0;

    // --- COSO ERM residual calculation: residual ALE = residual_financial_impact × (residual_likelihood_pct / 100) ---
    const residualImpact = risk.residual_financial_impact != null
      ? Number(risk.residual_financial_impact)
      : null;
    const residualPct = risk.residual_likelihood_pct != null
      ? Number(risk.residual_likelihood_pct)
      : null;
    const calculatedResidualALE = (residualImpact != null && residualPct != null)
      ? residualImpact * (residualPct / 100)
      : 0;

    // --- COSO ERM appetite breach check ---
    // Fetch the tenant's risk_appetite_limit from TenantSettings
    let appetiteLimit: number | null = null;
    try {
      const settings = await base44.asServiceRole.entities.TenantSettings
        .filter({ tenant_id: ctx.tenantId }, '-created_date', 1);
      if (settings && settings.length > 0) {
        appetiteLimit = settings[0].risk_appetite_limit != null
          ? Number(settings[0].risk_appetite_limit)
          : null;
      }
    } catch (e) {
      console.error('Failed to fetch tenant appetite limit:', e?.message || e);
    }

    const inherentExceedsAppetite = appetiteLimit != null && calculatedALE > appetiteLimit;
    const residualExceedsAppetite = appetiteLimit != null && calculatedResidualALE > appetiteLimit;
    const exceedsAppetite = inherentExceedsAppetite || residualExceedsAppetite;

    // --- Idempotency check: skip update if values already match ---
    const currentRiskScore = Number(risk.risk_score ?? 0);
    const currentALE = Number(risk.annualized_loss_expectancy ?? 0);
    const currentResidualALE = Number(risk.residual_annualized_loss_expectancy ?? 0);
    const currentExceedsAppetite = Boolean(risk.exceeds_appetite_limit ?? false);

    const riskScoreMatches = currentRiskScore === calculatedRiskScore;
    const aleMatches = currentALE === calculatedALE;
    const residualAleMatches = currentResidualALE === calculatedResidualALE;
    const appetiteMatches = currentExceedsAppetite === exceedsAppetite;

    if (riskScoreMatches && aleMatches && residualAleMatches && appetiteMatches) {
      return Response.json({
        ok: true,
        skipped: true,
        risk_id,
        risk_score: calculatedRiskScore,
        annualized_loss_expectancy: calculatedALE,
        residual_annualized_loss_expectancy: calculatedResidualALE,
        exceeds_appetite_limit: exceedsAppetite,
        message: "Metrics already up to date — no update needed",
      });
    }

    // --- Persist the calculated metrics ---
    const updatePayload: Record<string, any> = {};
    if (!riskScoreMatches) updatePayload.risk_score = calculatedRiskScore;
    if (!aleMatches) updatePayload.annualized_loss_expectancy = calculatedALE;
    if (!residualAleMatches) updatePayload.residual_annualized_loss_expectancy = calculatedResidualALE;
    if (!appetiteMatches) updatePayload.exceeds_appetite_limit = exceedsAppetite;

    await base44.asServiceRole.entities.Risk.update(risk_id, updatePayload);

    // --- COSO ERM appetite breach escalation ---
    // If the risk exposure crosses the tenant's appetite limit and it wasn't
    // already flagged, create a dashboard SecurityAlert for executive escalation.
    if (exceedsAppetite && !currentExceedsAppetite) {
      try {
        await base44.asServiceRole.entities.SecurityAlert.create({
          tenant_id: ctx.tenantId,
          tenant_name: '',
          title: `Risk Appetite Breach: ${risk.title || risk_id}`,
          description: `Risk "${risk.title}" financial exposure ($${calculatedALE.toLocaleString()} inherent / $${calculatedResidualALE.toLocaleString()} residual) exceeds the corporate Risk Appetite Limit ($${appetiteLimit?.toLocaleString()}). Executive escalation required per COSO ERM.`,
          type: 'remediation_alert',
          severity: 'critical',
          status: 'open',
          detected_at: new Date().toISOString(),
          affected_user: risk.owner_name || '',
          details: `Inherent ALE: $${calculatedALE.toLocaleString()} | Residual ALE: $${calculatedResidualALE.toLocaleString()} | Appetite Limit: $${appetiteLimit?.toLocaleString()}`,
        });
      } catch (e) {
        console.error('Failed to create appetite breach alert:', e?.message || e);
      }
    }

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
        residual_financial_impact: residualImpact,
        residual_likelihood_pct: residualPct,
        residual_annualized_loss_expectancy: calculatedResidualALE,
        exceeds_appetite_limit: exceedsAppetite,
        appetite_limit: appetiteLimit,
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