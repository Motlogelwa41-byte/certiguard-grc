import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Calculates effectiveness scores (0-100) for all controls based on:
// - Test pass rate (35%): ratio of passing tests from ControlTestResult
// - Evidence freshness (25%): how recently evidence was collected
// - Failure frequency (20%): inverse of how often the control fails
// - Remediation speed (20%): how quickly failures are resolved
// Updates each Control with effectiveness_score, effectiveness_grade, and effectiveness_factors.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = user?.data?.tenant_id;
    if (!tenantId) return Response.json({ error: 'No tenant context' }, { status: 403 });

    const [controls, testResults, evidence] = await Promise.all([
      base44.asServiceRole.entities.Control.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.ControlTestResult.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId }).catch(() => []),
    ]);

    const now = new Date();
    const updates = [];
    const summary = { total: controls.length, scored: 0, grades: { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0, untested: 0 } };

    for (const control of controls) {
      // Gather test results linked to this control
      const controlTests = testResults.filter(
        (tr) => tr.linked_control_ids?.includes(control.id) || tr.controls_updated?.includes(control.id)
      );

      // 1. Test pass rate (35%)
      const passCount = controlTests.filter((t) => t.result === "pass").length;
      const totalTests = controlTests.length;
      const testPassRate = totalTests > 0 ? (passCount / totalTests) * 100 : null;

      // 2. Evidence freshness (25%)
      const controlEvidence = evidence.filter((e) => e.control_id === control.id);
      let evidenceFreshness = 0;
      if (controlEvidence.length > 0) {
        const latest = controlEvidence
          .map((e) => new Date(e.collected_date || e.created_date).getTime())
          .filter((t) => !isNaN(t))
          .sort((a, b) => b - a)[0];
        if (latest) {
          const daysSince = Math.max(0, (now.getTime() - latest) / (1000 * 60 * 60 * 24));
          evidenceFreshness = Math.max(0, 100 - (daysSince / 90) * 100); // decay over 90 days
        }
      }

      // 3. Failure frequency (20%) — inverse of failure rate
      const failCount = controlTests.filter((t) => t.result === "fail").length;
      const failureFrequency = totalTests > 0 ? Math.max(0, 100 - (failCount / totalTests) * 100) : 50;

      // 4. Remediation speed (20%) — based on control status and last_tested recency
      let remediationSpeed = 50;
      if (control.status === "passing") remediationSpeed = 100;
      else if (control.status === "failing") remediationSpeed = 20;
      else if (control.status === "not_applicable") remediationSpeed = 80;
      if (control.last_tested) {
        const daysSinceTest = (now.getTime() - new Date(control.last_tested).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceTest < 30) remediationSpeed = Math.min(100, remediationSpeed + 10);
        else if (daysSinceTest > 180) remediationSpeed = Math.max(0, remediationSpeed - 20);
      }

      // Weighted composite
      let score = 0;
      let weightSum = 0;
      if (testPassRate !== null) {
        score += testPassRate * 0.35;
        weightSum += 0.35;
      }
      if (controlEvidence.length > 0) {
        score += evidenceFreshness * 0.25;
        weightSum += 0.25;
      }
      score += failureFrequency * 0.20;
      weightSum += 0.20;
      score += remediationSpeed * 0.20;
      weightSum += 0.20;

      const effectivenessScore = weightSum > 0 ? Math.round(score / weightSum) : 0;

      // Grade
      let grade = "untested";
      if (totalTests > 0 || controlEvidence.length > 0 || control.status !== "not_tested") {
        if (effectivenessScore >= 85) grade = "excellent";
        else if (effectivenessScore >= 70) grade = "good";
        else if (effectivenessScore >= 50) grade = "fair";
        else if (effectivenessScore >= 30) grade = "poor";
        else grade = "critical";
      }

      summary.scored++;
      summary.grades[grade]++;

      const factors = JSON.stringify({
        test_pass_rate: testPassRate !== null ? Math.round(testPassRate) : null,
        evidence_freshness: Math.round(evidenceFreshness),
        failure_frequency: Math.round(failureFrequency),
        remediation_speed: Math.round(remediationSpeed),
        total_tests: totalTests,
        pass_count: passCount,
        fail_count: failCount,
        evidence_count: controlEvidence.length,
      });

      updates.push({
        id: control.id,
        effectiveness_score: effectivenessScore,
        effectiveness_grade: grade,
        effectiveness_factors: factors,
        effectiveness_calculated_at: now.toISOString(),
      });
    }

    // Bulk update all controls
    if (updates.length > 0) {
      await base44.asServiceRole.entities.Control.bulkUpdate(updates);
    }

    return Response.json({
      status: "success",
      summary,
      updated: updates.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("calculateControlEffectiveness error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}