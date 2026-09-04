import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveTenantContext, tenantScopedFilter } from "../../shared/tenantGuard.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action || "calculate";
    const ctx = await resolveTenantContext(base44);

    if (action === "calculate") {
      return await calculateScore(base44, body, ctx);
    } else if (action === "list_models") {
      return await listModels(base44, ctx);
    } else if (action === "apply_to_all") {
      return await applyToAll(base44, body, ctx);
    } else if (action === "preview") {
      return await previewScore(base44, body);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("calculateRiskScoreWithModel error:", err);
    return Response.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

async function calculateScore(base44, body, ctx) {
  const { risk_id, model_id } = body;
  if (!risk_id) {
    return Response.json({ error: "risk_id is required" }, { status: 400 });
  }

  const risk = await base44.asServiceRole.entities.Risk.get(risk_id);
  if (!risk) {
    return Response.json({ error: "Risk not found" }, { status: 404 });
  }

  let model;
  if (model_id) {
    model = await base44.asServiceRole.entities.RiskScoringModel.get(model_id);
  } else {
    const models = await base44.asServiceRole.entities.RiskScoringModel.filter(
      tenantScopedFilter(ctx, { status: "active" })
    );
    model = models.find(m => m.register_type === risk.category && m.is_default) ||
            models.find(m => m.register_type === "all" && m.is_default) ||
            models.find(m => m.register_type === risk.category) ||
            models.find(m => m.register_type === "all");
  }

  if (!model) {
    const fallbackScore = (risk.likelihood || 3) * (risk.impact || 3);
    return Response.json({
      score: fallbackScore,
      grade: classifyGrade(fallbackScore, 5, 10, 15, 20),
      band: classifyBand(fallbackScore, 5, 10, 15, 20),
      model_used: null,
      warning: "No scoring model found — used default likelihood × impact"
    });
  }

  const result = computeScore(risk, model);

  await base44.asServiceRole.entities.Risk.update(risk_id, {
    risk_score: result.score,
    inherent_risk_score: result.inherent_score
  });

  return Response.json({
    score: result.score,
    inherent_score: result.inherent_score,
    grade: result.grade,
    band: result.band,
    model_used: { id: model.id, name: model.name, scoring_method: model.scoring_method },
    formula_breakdown: result.breakdown
  });
}

function computeScore(risk, model) {
  const likelihood = risk.likelihood || 3;
  const impact = risk.impact || 3;
  const velocity = risk.velocity || 3;
  const controlEff = risk.control_effectiveness_pct || 0;
  const ale = risk.annualized_loss_expectancy || 0;

  let inherentScore;
  const breakdown = {};

  if (model.scoring_method === "weighted_formula") {
    const lw = model.likelihood_weight ?? 1;
    const iw = model.impact_weight ?? 1;
    const vw = model.velocity_weight ?? 0;
    const fw = model.financial_impact_weight ?? 0;
    const base = (likelihood * lw) + (impact * iw) + (velocity * vw);
    const financialComponent = fw > 0 && ale > 0 ? Math.min(ale / 100000, 5) * fw : 0;
    inherentScore = base + financialComponent;
    breakdown.likelihood_component = likelihood * lw;
    breakdown.impact_component = impact * iw;
    breakdown.velocity_component = velocity * vw;
    breakdown.financial_component = financialComponent;
  } else if (model.scoring_method === "fair_model") {
    const sle = risk.quantitative_single_loss || 0;
    const aro = risk.quantitative_annual_rate || 0;
    inherentScore = sle * aro;
    if (inherentScore > 25) inherentScore = 20 + Math.min(5, inherentScore / 1000000);
    breakdown.single_loss_expectancy = sle;
    breakdown.annual_rate = aro;
    breakdown.ale = inherentScore;
  } else if (model.scoring_method === "cvss_style") {
    inherentScore = (likelihood * (model.likelihood_weight ?? 1) * 0.4 +
                     impact * (model.impact_weight ?? 1) * 0.6) * 5;
    breakdown.likelihood_component = likelihood * (model.likelihood_weight ?? 1) * 0.4 * 5;
    breakdown.impact_component = impact * (model.impact_weight ?? 1) * 0.6 * 5;
  } else {
    inherentScore = (likelihood * (model.likelihood_weight ?? 1)) *
                    (impact * (model.impact_weight ?? 1));
    if ((model.velocity_weight ?? 0) > 0) {
      inherentScore += velocity * model.velocity_weight;
    }
    breakdown.base_matrix = (likelihood * (model.likelihood_weight ?? 1)) * (impact * (model.impact_weight ?? 1));
    breakdown.velocity_component = (model.velocity_weight ?? 0) > 0 ? velocity * model.velocity_weight : 0;
  }

  let finalScore = inherentScore;
  if (model.use_control_reduction && controlEff > 0) {
    const reduction = (controlEff / 100) * (model.control_effectiveness_weight ?? 1);
    finalScore = inherentScore * (1 - Math.min(reduction, 0.9));
    breakdown.control_reduction_pct = (reduction * 100).toFixed(1) + "%";
    breakdown.score_before_reduction = inherentScore;
  }

  finalScore = Math.min(finalScore, model.max_score || 25);

  const grade = classifyGrade(finalScore, model.threshold_low, model.threshold_medium, model.threshold_high, model.threshold_critical);
  const band = classifyBand(finalScore, model.threshold_low, model.threshold_medium, model.threshold_high, model.threshold_critical);

  return { score: finalScore, inherent_score: inherentScore, grade, band, breakdown };
}

function classifyGrade(score, low, med, high, crit) {
  if (score >= crit) return "critical";
  if (score >= high) return "high";
  if (score >= med) return "medium";
  if (score >= low) return "low";
  return "minimal";
}

function classifyBand(score, low, med, high, crit) {
  if (score >= crit) return "unacceptable";
  if (score >= high) return "above_appetite";
  if (score >= med) return "tolerance_zone";
  return "within_appetite";
}

async function listModels(base44, ctx) {
  const models = await base44.asServiceRole.entities.RiskScoringModel.filter(
    tenantScopedFilter(ctx, { status: "active" })
  );
  return Response.json({ models });
}

async function applyToAll(base44, body, ctx) {
  const { model_id } = body;
  if (!model_id) {
    return Response.json({ error: "model_id is required" }, { status: 400 });
  }

  const model = await base44.asServiceRole.entities.RiskScoringModel.get(model_id);
  if (!model) {
    return Response.json({ error: "Model not found" }, { status: 404 });
  }

  const query = tenantScopedFilter(ctx, { status: { $ne: "closed" } });
  if (model.register_type !== "all") {
    query.category = model.register_type;
  }

  const risks = await base44.asServiceRole.entities.Risk.filter(query);
  let updated = 0;
  const updates = [];

  for (const risk of risks) {
    const result = computeScore(risk, model);
    updates.push({
      id: risk.id,
      risk_score: result.score,
      inherent_risk_score: result.inherent_score
    });
    updated++;
  }

  if (updates.length > 0) {
    await base44.asServiceRole.entities.Risk.bulkUpdate(updates);
  }

  await base44.asServiceRole.entities.RiskScoringModel.update(model_id, {
    applied_risk_count: updated
  });

  return Response.json({ updated, model_name: model.name });
}

async function previewScore(base44, body) {
  const { risk_data, model_id } = body;
  if (!risk_data || !model_id) {
    return Response.json({ error: "risk_data and model_id are required" }, { status: 400 });
  }

  const model = await base44.asServiceRole.entities.RiskScoringModel.get(model_id);
  if (!model) {
    return Response.json({ error: "Model not found" }, { status: 404 });
  }

  const result = computeScore(risk_data, model);
  return Response.json(result);
}