import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Calculates a weighted continuous compliance score from controls, evidence,
// tests, findings, risks, and policies. Returns score, grade, and component breakdown.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [controls, evidence, tests, findings, risks, policies] = await Promise.all([
      base44.entities.Control.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
      base44.entities.ControlTest.list().catch(() => []),
      base44.entities.SecurityFinding.list().catch(() => []),
      base44.entities.Risk.list().catch(() => []),
      base44.entities.Policy.list().catch(() => []),
    ]);

    // Control pass rate (40%)
    const passingControls = controls.filter(c => c.status === "passing").length;
    const controlScore = controls.length > 0 ? (passingControls / controls.length) * 100 : 0;

    // Evidence coverage (25%)
    const approvedEvidence = evidence.filter(e => e.status === "approved").length;
    const evidenceScore = evidence.length > 0 ? (approvedEvidence / evidence.length) * 100 : 0;

    // Test pass rate (20%)
    const runTests = tests.filter(t => t.last_result === "pass" || t.last_result === "fail");
    const passedTests = tests.filter(t => t.last_result === "pass").length;
    const testScore = runTests.length > 0 ? (passedTests / runTests.length) * 100 : 0;

    // Finding resolution rate (10%)
    const resolvedFindings = findings.filter(f => f.status === "remediated" || f.status === "false_positive").length;
    const findingScore = findings.length > 0 ? (resolvedFindings / findings.length) * 100 : 100;

    // Risk mitigation (5%)
    const mitigatedRisks = risks.filter(r => r.status !== "open").length;
    const riskScore = risks.length > 0 ? (mitigatedRisks / risks.length) * 100 : 100;

    // Policy publication (contextual)
    const publishedPolicies = policies.filter(p => p.status === "published" || p.status === "approved").length;
    const policyScore = policies.length > 0 ? (publishedPolicies / policies.length) * 100 : 100;

    // Weighted composite
    const compositeScore = Math.round(
      controlScore * 0.40 + evidenceScore * 0.25 + testScore * 0.20 + findingScore * 0.10 + riskScore * 0.05
    );

    // Severity-weighted finding penalty
    const criticalOpen = findings.filter(f => f.status === "open" && f.severity === "critical").length;
    const highOpen = findings.filter(f => f.status === "open" && f.severity === "high").length;
    const penalty = Math.min(20, criticalOpen * 5 + highOpen * 2);
    const finalScore = Math.max(0, compositeScore - penalty);

    let grade = "F";
    if (finalScore >= 95) grade = "A+";
    else if (finalScore >= 90) grade = "A";
    else if (finalScore >= 80) grade = "B";
    else if (finalScore >= 70) grade = "C";
    else if (finalScore >= 60) grade = "D";
    else if (finalScore >= 50) grade = "E";

    return Response.json({
      score: finalScore, rawScore: compositeScore, grade, penalty,
      components: {
        controls: { score: Math.round(controlScore), weight: 40, total: controls.length, passing: passingControls },
        evidence: { score: Math.round(evidenceScore), weight: 25, total: evidence.length, approved: approvedEvidence },
        tests: { score: Math.round(testScore), weight: 20, total: runTests.length, passed: passedTests },
        findings: { score: Math.round(findingScore), weight: 10, total: findings.length, resolved: resolvedFindings, open: findings.length - resolvedFindings },
        risks: { score: Math.round(riskScore), weight: 5, total: risks.length, mitigated: mitigatedRisks },
        policies: { score: Math.round(policyScore), total: policies.length, published: publishedPolicies },
      },
      criticalOpenFindings: criticalOpen,
      highOpenFindings: highOpen,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}