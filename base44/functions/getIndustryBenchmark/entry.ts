import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Get current user's controls (RLS-filtered to their tenant)
    const userControls = await base44.entities.Control.list("-created_date", 500).catch(() => []);
    const userTenantId = (userControls && userControls[0]?.tenant_id) || "_default";

    // Calculate current tenant's score
    const userPassing = (userControls || []).filter((c) => c.status === "passing").length;
    const userTotal = (userControls || []).length;
    const yourScore = userTotal > 0 ? Math.round((userPassing / userTotal) * 100) : 0;

    // Get all controls across ALL tenants (service role bypasses RLS)
    const allControls = await sr.entities.Control.list("-created_date", 5000).catch(() => []);

    // Group by tenant and calculate score per tenant
    const byTenant = {};
    for (const c of (allControls || [])) {
      const t = c.tenant_id || "_default";
      (byTenant[t] = byTenant[t] || []).push(c);
    }

    const scores = [];
    for (const [tenantId, controls] of Object.entries(byTenant)) {
      const passing = controls.filter((c) => c.status === "passing").length;
      const total = controls.length;
      if (total >= 3) { // only include tenants with meaningful data
        scores.push({
          tenant_id: tenantId,
          score: Math.round((passing / total) * 100),
          control_count: total,
        });
      }
    }

    // Sort scores ascending
    scores.sort((a, b) => a.score - b.score);
    const n = scores.length;

    if (n === 0) {
      return Response.json({
        your_score: yourScore,
        industry_median: 0,
        top_quartile: 0,
        bottom_quartile: 0,
        percentile_rank: 50,
        total_organizations: 0,
        message: "Not enough data for benchmarking yet. Connect more organizations to enable peer comparison.",
      });
    }

    // Calculate median
    const median = n % 2 === 0
      ? Math.round((scores[n / 2 - 1].score + scores[n / 2].score) / 2)
      : scores[Math.floor(n / 2)].score;

    // Calculate quartiles
    const topQuartile = n >= 4 ? scores[Math.floor(n * 0.75)].score : scores[n - 1].score;
    const bottomQuartile = n >= 4 ? scores[Math.floor(n * 0.25)].score : scores[0].score;

    // Calculate current tenant's percentile rank
    const belowYou = scores.filter((s) => s.score < yourScore).length;
    const percentile = Math.round((belowYou / n) * 100);

    // Score distribution for histogram
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    for (const s of scores) {
      if (s.score <= 20) buckets[0]++;
      else if (s.score <= 40) buckets[1]++;
      else if (s.score <= 60) buckets[2]++;
      else if (s.score <= 80) buckets[3]++;
      else buckets[4]++;
    }

    // Find your position
    const yourRank = n - belowYou;
    const yourPosition = n > 1 ? Math.round((yourRank / n) * 100) : 100;

    return Response.json({
      your_score: yourScore,
      industry_median: median,
      top_quartile: topQuartile,
      bottom_quartile: bottomQuartile,
      percentile_rank: percentile,
      total_organizations: n,
      your_rank: yourRank,
      distribution: {
        "0-20%": buckets[0],
        "21-40%": buckets[1],
        "41-60%": buckets[2],
        "61-80%": buckets[3],
        "81-100%": buckets[4],
      },
      gap_to_median: yourScore - median,
      gap_to_top_quartile: yourScore - topQuartile,
    });
  } catch (error) {
    console.error("getIndustryBenchmark error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});