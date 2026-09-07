import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Get current user's risks and controls (RLS-filtered to their tenant)
    const [risks, controls] = await Promise.all([
      base44.entities.Risk.list("-created_date", 200).catch(() => []),
      base44.entities.Control.list("-created_date", 500).catch(() => []),
    ]);

    const openRisks = (risks || []).filter((r) => r.status === "open" || r.status === "mitigating");
    const failingControls = (controls || []).filter((c) => c.status === "failing").length;
    const passingControls = (controls || []).filter((c) => c.status === "passing").length;
    const totalControls = (controls || []).length;
    const currentScore = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;

    // Prepare risk summary for LLM
    const riskSummary = openRisks.slice(0, 20).map((r) => ({
      title: r.title,
      category: r.category,
      risk_score: r.risk_score,
      status: r.status,
      treatment: r.treatment,
      has_mitigation: !!r.mitigation_plan,
    }));

    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a predictive risk analyst for a GRC platform. Based on the current risk and control posture, predict the organization's risk score in 90 days.

Current state:
- Compliance score: ${currentScore}%
- Total controls: ${totalControls} (${passingControls} passing, ${failingControls} failing)
- Open risks: ${openRisks.length}
- Top risks: ${JSON.stringify(riskSummary)}

Predict:
1. The predicted risk score (0-100, where 100 = maximum risk exposure) in 90 days
2. Whether the trend is increasing, stable, or decreasing
3. Top 3 factors driving the prediction
4. Confidence level (0-100)
5. One actionable recommendation

Be concise and data-driven.`,
      response_json_schema: {
        type: "object",
        properties: {
          predicted_score: { type: "number", description: "Predicted risk score 0-100 in 90 days" },
          trend: { type: "string", enum: ["increasing", "stable", "decreasing"], description: "Predicted trend direction" },
          key_factors: { type: "array", items: { type: "string" }, description: "Top 3 factors driving the prediction" },
          confidence: { type: "number", description: "Confidence level 0-100" },
          recommendation: { type: "string", description: "One actionable recommendation" },
        },
        required: ["predicted_score", "trend", "key_factors", "confidence"],
      },
    });

    return Response.json({
      ok: true,
      current_score: currentScore,
      prediction: llmRes || { predicted_score: currentScore, trend: "stable", key_factors: [], confidence: 50, recommendation: "" },
      open_risks: openRisks.length,
      failing_controls: failingControls,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("predictRiskScore error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});