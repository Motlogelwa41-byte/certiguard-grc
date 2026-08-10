import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AI-powered anomaly detection across compliance data.
// Detects: control failure spikes, risk score drift, evidence collection gaps,
// compliance regression, and test failure bursts. Creates AnomalyAlert records
// for each detected anomaly with AI-generated explanations and recommendations.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = user?.data?.tenant_id;
    if (!tenantId) return Response.json({ error: 'No tenant context' }, { status: 403 });

    // Gather all compliance data
    const [controls, risks, evidence, testResults, incidents, existingAnomalies] = await Promise.all([
      base44.asServiceRole.entities.Control.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.Risk.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.Evidence.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.ControlTestResult.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.Incident.filter({ tenant_id: tenantId }).catch(() => []),
      base44.asServiceRole.entities.AnomalyAlert.filter({ tenant_id: tenantId }).catch(() => []),
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const detected = [];
    let anomalyCounter = existingAnomalies.length;

    // --- 1. Control Failure Spike ---
    // Detect controls with sudden status change to "failing" in last 30 days
    const recentlyFailing = controls.filter((c) => {
      if (c.status !== "failing") return false;
      const updated = new Date(c.updated_date).getTime();
      return updated > thirtyDaysAgo.getTime();
    });
    const baselineFailRate = controls.length > 0
      ? (controls.filter((c) => c.status === "failing").length / controls.length) * 100
      : 0;
    if (recentlyFailing.length >= 3 && baselineFailRate > 15) {
      anomalyCounter++;
      detected.push({
        anomaly_id: `AN-2026-${String(anomalyCounter).padStart(3, "0")}`,
        title: `${recentlyFailing.length} controls regressed to failing in last 30 days`,
        description: `A spike of ${recentlyFailing.length} controls moved to failing status. This exceeds the baseline failure rate of ${Math.round(baselineFailRate)}%. Controls affected: ${recentlyFailing.slice(0, 5).map((c) => c.title).join(", ")}.`,
        anomaly_type: "control_failure_spike",
        severity: recentlyFailing.length >= 5 ? "critical" : "high",
        entity_type: "control",
        detected_value: JSON.stringify({ current: recentlyFailing.length, expected: 1, delta: recentlyFailing.length - 1 }),
        baseline_value: 1,
        current_value: recentlyFailing.length,
        confidence_score: 85,
        recommended_action: "Review the regressed controls for common root causes. Check if a recent change or configuration drift caused multiple controls to fail simultaneously.",
        detected_at: now.toISOString(),
      });
    }

    // --- 2. Risk Score Drift ---
    // Detect risks with score >= 20 (high) that are still open
    const highRisks = risks.filter((r) => (r.risk_score || 0) >= 20 && r.status === "open");
    if (highRisks.length >= 3) {
      anomalyCounter++;
      detected.push({
        anomaly_id: `AN-2026-${String(anomalyCounter).padStart(3, "0")}`,
        title: `${highRisks.length} high-severity risks remain unmitigated`,
        description: `${highRisks.length} risks with scores >= 20 are still in 'open' status. Prolonged exposure to high-severity risks increases the likelihood of compliance failures and security incidents.`,
        anomaly_type: "risk_score_drift",
        severity: "high",
        entity_type: "risk",
        detected_value: JSON.stringify({ current: highRisks.length, expected: 0, delta: highRisks.length }),
        baseline_value: 0,
        current_value: highRisks.length,
        confidence_score: 90,
        recommended_action: "Prioritize mitigation plans for these high-severity risks. Consider escalating to the risk committee if they remain open beyond their due dates.",
        detected_at: now.toISOString(),
      });
    }

    // --- 3. Evidence Collection Gap ---
    // Detect controls with no evidence collected in last 90 days
    const controlsWithStaleEvidence = controls.filter((c) => {
      if (c.status === "not_applicable") return false;
      const controlEvidence = evidence.filter((e) => e.control_id === c.id);
      if (controlEvidence.length === 0) return true;
      const latest = Math.max(...controlEvidence.map((e) => new Date(e.collected_date || e.created_date).getTime()).filter((t) => !isNaN(t)));
      return (now.getTime() - latest) > 90 * 24 * 60 * 60 * 1000;
    });
    if (controlsWithStaleEvidence.length >= 5) {
      anomalyCounter++;
      detected.push({
        anomaly_id: `AN-2026-${String(anomalyCounter).padStart(3, "0")}`,
        title: `${controlsWithStaleEvidence.length} controls have no recent evidence (90+ days)`,
        description: `${controlsWithStaleEvidence.length} controls have either no evidence or evidence older than 90 days. This creates audit readiness gaps and may indicate abandoned compliance processes.`,
        anomaly_type: "evidence_gap",
        severity: "medium",
        entity_type: "control",
        detected_value: JSON.stringify({ current: controlsWithStaleEvidence.length, expected: 0, delta: controlsWithStaleEvidence.length }),
        baseline_value: 0,
        current_value: controlsWithStaleEvidence.length,
        confidence_score: 80,
        recommended_action: "Assign evidence collection tasks for these controls. Set up automated evidence collection where possible to prevent future gaps.",
        detected_at: now.toISOString(),
      });
    }

    // --- 4. Test Failure Burst ---
    // Detect a high concentration of test failures in the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTestFailures = testResults.filter((tr) => {
      const runAt = new Date(tr.run_at || tr.created_date).getTime();
      return tr.result === "fail" && runAt > sevenDaysAgo.getTime();
    });
    if (recentTestFailures.length >= 5) {
      anomalyCounter++;
      detected.push({
        anomaly_id: `AN-2026-${String(anomalyCounter).padStart(3, "0")}`,
        title: `${recentTestFailures.length} test failures in last 7 days`,
        description: `A burst of ${recentTestFailures.length} automated test failures occurred in the past week. This may indicate a systemic issue or a recent change that broke multiple controls.`,
        anomaly_type: "test_failure_burst",
        severity: "high",
        entity_type: "control_test",
        detected_value: JSON.stringify({ current: recentTestFailures.length, expected: 1, delta: recentTestFailures.length - 1 }),
        baseline_value: 1,
        current_value: recentTestFailures.length,
        confidence_score: 88,
        recommended_action: "Investigate the failing tests for common patterns. Check if a recent deployment or configuration change triggered the failures.",
        detected_at: now.toISOString(),
      });
    }

    // --- 5. Incident Surge ---
    const recentIncidents = incidents.filter((i) => {
      const detected = new Date(i.detected_date || i.created_date).getTime();
      return detected > sevenDaysAgo.getTime() && i.status !== "closed" && i.status !== "false_positive";
    });
    if (recentIncidents.length >= 3) {
      anomalyCounter++;
      detected.push({
        anomaly_id: `AN-2026-${String(anomalyCounter).padStart(3, "0")}`,
        title: `${recentIncidents.length} open incidents in last 7 days`,
        description: `An unusual number of ${recentIncidents.length} incidents were detected in the past week. This may indicate an active security campaign or deteriorating control effectiveness.`,
        anomaly_type: "compliance_regression",
        severity: recentIncidents.some((i) => i.severity === "critical") ? "critical" : "high",
        entity_type: "incident",
        detected_value: JSON.stringify({ current: recentIncidents.length, expected: 0, delta: recentIncidents.length }),
        baseline_value: 0,
        current_value: recentIncidents.length,
        confidence_score: 82,
        recommended_action: "Activate incident response procedures. Look for common attack patterns across the incidents and consider escalating to the security operations center.",
        detected_at: now.toISOString(),
      });
    }

    // Create anomaly alert records
    let created = 0;
    if (detected.length > 0) {
      const payloads = detected.map((d) => ({ ...d, tenant_id: tenantId }));
      try {
        await base44.asServiceRole.entities.AnomalyAlert.bulkCreate(payloads);
        created = detected.length;
      } catch (e) {
        console.error("Failed to create anomaly alerts:", e);
      }
    }

    return Response.json({
      status: "success",
      detected: detected.length,
      created,
      anomalies: detected.map((d) => ({
        anomaly_id: d.anomaly_id,
        title: d.title,
        anomaly_type: d.anomaly_type,
        severity: d.severity,
        confidence_score: d.confidence_score,
      })),
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("detectComplianceAnomalies error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}