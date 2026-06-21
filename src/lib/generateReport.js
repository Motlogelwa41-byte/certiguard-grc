import moment from "moment";

/**
 * Generate a ManagementReport for a tenant.
 * Collects data from all relevant entities for the given month.
 */
export async function generateManagementReport(base44, tenant) {
  const now = moment();
  const reportMonth = now.format("YYYY-MM");
  const monthStart = now.clone().startOf("month").toISOString();
  const monthEnd = now.clone().endOf("month").toISOString();

  const tenantFilter = tenant?.id ? { tenant_id: tenant.id } : {};

  // Fetch all relevant data in parallel
  const [
    tasks,
    controls,
    risks,
    auditLogs,
    incidents,
    policies,
    training,
    frameworks,
    securityAlerts,
  ] = await Promise.all([
    base44.entities.ComplianceTask.list("-created_date", 500),
    base44.entities.Control.list(),
    base44.entities.Risk.list("-created_date", 500),
    base44.entities.AuditTrail.list("-created_date", 500),
    base44.entities.Incident.list("-created_date", 200).catch(() => []),
    base44.entities.Policy.list().catch(() => []),
    base44.entities.Training.list().catch(() => []),
    base44.entities.Framework.list().catch(() => []),
    base44.entities.SecurityAlert.list("-created_date", 200).catch(() => []),
  ]);

  // Task stats
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const pendingTasks = tasks.filter(t => t.status === "todo" || t.status === "in_progress").length;
  const overdueTasks = tasks.filter(t => t.status === "overdue").length;
  const criticalTasks = tasks.filter(t => t.priority === "critical" && (t.status === "todo" || t.status === "in_progress" || t.status === "overdue"));
  const totalTasks = tasks.length;

  // Control stats
  const passing = controls.filter(c => c.status === "passing").length;
  const failing = controls.filter(c => c.status === "failing").length;
  const controlsTotal = controls.length;

  // Risk stats
  const openRisks = risks.filter(r => r.status === "open" || r.status === "mitigating");
  const closedRisks = risks.filter(r => r.status === "closed");
  const risksNew = risks.filter(r => moment(r.created_date).isAfter(monthStart)).length;
  const riskScore = Math.round(risks.reduce((sum, r) => sum + (r.risk_score || 0), 0) / Math.max(risks.length, 1));
  const topRisks = [...risks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5);

  // Audit
  const auditEntries = auditLogs.filter(l => moment(l.created_date).isAfter(monthStart)).length;
  const loginSuccesses = auditLogs.filter(l => l.action === "login").length;
  const loginFailures = auditLogs.filter(l => l.action === "login" && l.severity === "warning").length;
  const loginAnomalies = securityAlerts.filter(a => a.type === "geo_anomaly" || a.type === "brute_force").length;

  // Incidents
  const incidentsOpened = incidents.filter(i => moment(i.created_date).isAfter(monthStart)).length;
  const incidentsClosed = incidents.filter(i => i.status === "closed" && moment(i.resolved_date || i.updated_date).isAfter(monthStart)).length;

  // Policies & Training
  const policiesApproved = policies.filter(p => p.status === "approved").length;
  const trainingCompleted = training.filter(t => t.completed_count || 0).reduce((s, t) => s + (t.completed_count || 0), 0);

  // Framework readiness
  const frameworkScores = {};
  frameworks.forEach(fw => {
    const score = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
    frameworkScores[fw.name] = score;
  });

  // Overall compliance score
  const complianceScore = controlsTotal > 0 ? Math.round((passing / controlsTotal) * 100) : 0;

  // Generate improvement recommendations
  const recommendations = [];
  if (failing > 0) recommendations.push(`Address **${failing} failing controls** — these are your highest compliance risk. Start with critical-severity items.`);
  if (overdueTasks > 0) recommendations.push(`Resolve **${overdueTasks} overdue tasks** before they compound. Assign clear ownership and deadlines.`);
  if (openRisks.length > 0) recommendations.push(`Actively mitigate **${openRisks.length} open risks** — particularly the top 3 by risk score.`);
  if (loginFailures > 0) recommendations.push(`Investigate **${loginFailures} login anomalies** — review geo-anomalous sessions and failed attempts.`);
  if (trainingCompleted < 10) recommendations.push(`Boost training completion — only **${trainingCompleted} completions** recorded. Mandatory security awareness is critical.`);
  if (complianceScore < 70) recommendations.push(`Overall compliance score is **${complianceScore}%** — below the 70% threshold. Prioritize control remediation.`);
  if (policiesApproved < 3) recommendations.push(`Only **${policiesApproved} policies approved** — ensure key policies are reviewed and signed off.`);
  if (recommendations.length === 0) recommendations.push("✅ All indicators are within acceptable ranges. Maintain current posture and continue routine monitoring.");

  // Executive summary
  const summary = `During ${moment().format("MMMM YYYY")}, the organization managed **${totalTasks} compliance tasks**, achieving **${completedTasks} completions** (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%). **${passing}/${controlsTotal}** controls are passing with an overall compliance score of **${complianceScore}%**. **${openRisks.length} risks** remain open and **${incidentsOpened} new incidents** were recorded.`;

  const reportData = {
    title: `Management Report — ${moment().format("MMMM YYYY")}`,
    report_month: reportMonth,
    tenant_id: tenant?.id || "",
    tenant_name: tenant?.name || "",
    status: "completed",
    total_tasks: totalTasks,
    completed_tasks: completedTasks,
    pending_tasks: pendingTasks,
    overdue_tasks: overdueTasks,
    critical_tasks: JSON.stringify(criticalTasks.map(t => t.title)),
    controls_passing: passing,
    controls_failing: failing,
    controls_total: controlsTotal,
    risks_open: openRisks.length,
    risks_closed: closedRisks.length,
    risks_new: risksNew,
    login_successes: loginSuccesses,
    login_failures: loginFailures,
    login_anomalies: loginAnomalies,
    audit_entries: auditEntries,
    incidents_opened: incidentsOpened,
    incidents_closed: incidentsClosed,
    policies_approved: policiesApproved,
    training_completed: trainingCompleted,
    framework_readiness_scores: JSON.stringify(frameworkScores),
    compliance_score: complianceScore,
    risk_score: riskScore,
    top_risks: JSON.stringify(topRisks.map(r => ({ title: r.title, score: r.risk_score, status: r.status }))),
    improvement_recommendations: recommendations.map(r => `- ${r}`).join("\n"),
    executive_summary: summary,
    generated_by: "System",
    generated_at: now.toISOString(),
  };

  return reportData;
}