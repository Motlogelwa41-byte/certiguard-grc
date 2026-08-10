import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Computes the weighted compliance readiness score (same model as calculateComplianceScore)
// and stores a daily snapshot per tenant in ComplianceScoreSnapshot for month-over-month
// trend analysis. Runs daily via the "Daily Compliance Score Snapshot" workflow.
// Append-only by design — snapshots are never edited once written.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const today = new Date().toISOString().slice(0, 10);

    const [controls, evidence, tests, findings, risks, policies] = await Promise.all([
      sr.entities.Control.list("-created_date", 500).catch(() => []),
      sr.entities.Evidence.list("-created_date", 500).catch(() => []),
      sr.entities.ControlTest.list("-created_date", 500).catch(() => []),
      sr.entities.SecurityFinding.list("-created_date", 500).catch(() => []),
      sr.entities.Risk.list("-created_date", 500).catch(() => []),
      sr.entities.Policy.list("-created_date", 500).catch(() => []),
    ]);

    // Group by tenant for correct multi-tenant isolation
    const tenants = {};
    const bucket = (tid) => {
      const t = tid || "_default";
      return (tenants[t] = tenants[t] || { controls: [], evidence: [], tests: [], findings: [], risks: [], policies: [] });
    };
    for (const c of controls) bucket(c.tenant_id).controls.push(c);
    for (const e of evidence) bucket(e.tenant_id).evidence.push(e);
    for (const t of tests) bucket(t.tenant_id).tests.push(t);
    for (const f of findings) bucket(f.tenant_id).findings.push(f);
    for (const r of risks) bucket(r.tenant_id).risks.push(r);
    for (const p of policies) bucket(p.tenant_id).policies.push(p);

    const snapshotIds = [];

    for (const [tenantId, data] of Object.entries(tenants)) {
      // Skip entities with no tenant_id — can't attribute a snapshot to an unknown tenant
      if (tenantId === "_default") continue;
      const tid = tenantId;

      // Skip if a snapshot already exists for today (idempotent daily run)
      const existing = await sr.entities.ComplianceScoreSnapshot.filter(
        { tenant_id: tid, snapshot_date: today }, "-snapshot_at", 1
      ).catch(() => []);
      if (existing && existing.length > 0) { snapshotIds.push(existing[0].id); continue; }

      const cs = data.controls;
      const passingControls = cs.filter((c) => c.status === "passing").length;
      const controlScore = cs.length > 0 ? (passingControls / cs.length) * 100 : 0;

      const ev = data.evidence;
      const approvedEvidence = ev.filter((e) => e.status === "approved").length;
      const evidenceScore = ev.length > 0 ? (approvedEvidence / ev.length) * 100 : 0;

      const ts = data.tests;
      const runTests = ts.filter((t) => t.last_result === "pass" || t.last_result === "fail");
      const passedTests = ts.filter((t) => t.last_result === "pass").length;
      const testScore = runTests.length > 0 ? (passedTests / runTests.length) * 100 : 0;

      const fn = data.findings;
      const resolvedFindings = fn.filter((f) => f.status === "remediated" || f.status === "false_positive").length;
      const findingScore = fn.length > 0 ? (resolvedFindings / fn.length) * 100 : 100;

      const rk = data.risks;
      const mitigatedRisks = rk.filter((r) => r.status !== "open").length;
      const riskScore = rk.length > 0 ? (mitigatedRisks / rk.length) * 100 : 100;

      const pol = data.policies;
      const publishedPolicies = pol.filter((p) => p.status === "published" || p.status === "approved").length;
      const policyScore = pol.length > 0 ? (publishedPolicies / pol.length) * 100 : 100;

      const compositeScore = Math.round(
        controlScore * 0.40 + evidenceScore * 0.25 + testScore * 0.20 + findingScore * 0.10 + riskScore * 0.05
      );

      const criticalOpen = fn.filter((f) => f.status === "open" && f.severity === "critical").length;
      const highOpen = fn.filter((f) => f.status === "open" && f.severity === "high").length;
      const penalty = Math.min(20, criticalOpen * 5 + highOpen * 2);
      const finalScore = Math.max(0, compositeScore - penalty);

      let grade = "F";
      if (finalScore >= 95) grade = "A+";
      else if (finalScore >= 90) grade = "A";
      else if (finalScore >= 80) grade = "B";
      else if (finalScore >= 70) grade = "C";
      else if (finalScore >= 60) grade = "D";
      else if (finalScore >= 50) grade = "E";

      const snap = await sr.entities.ComplianceScoreSnapshot.create({
        tenant_id: tid,
        score: finalScore,
        raw_score: compositeScore,
        grade,
        penalty,
        components: JSON.stringify({
          controls: { score: Math.round(controlScore), total: cs.length, passing: passingControls },
          evidence: { score: Math.round(evidenceScore), total: ev.length, approved: approvedEvidence },
          tests: { score: Math.round(testScore), total: runTests.length, passed: passedTests },
          findings: { score: Math.round(findingScore), total: fn.length, resolved: resolvedFindings, critical_open: criticalOpen, high_open: highOpen },
          risks: { score: Math.round(riskScore), total: rk.length, mitigated: mitigatedRisks },
          policies: { score: Math.round(policyScore), total: pol.length, published: publishedPolicies },
        }),
        snapshot_date: today,
        snapshot_at: new Date().toISOString(),
      });
      snapshotIds.push(snap.id);
    }

    return Response.json({
      ok: true,
      tenants: Object.keys(tenants).length,
      snapshots: snapshotIds.length,
      snapshot_ids: snapshotIds,
      date: today,
    });
  } catch (error) {
    console.error("snapshotComplianceScore error:", error?.message || error);
    return Response.json({ error: error?.message || "Compliance score snapshot failed" }, { status: 500 });
  }
});