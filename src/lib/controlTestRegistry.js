// Built-in automated control test evaluators available to the UI.
// The backend runner (runControlTests) has the matching execution logic per key.
export const CONTROL_TEST_REGISTRY = [
  {
    key: "iam.all_admins_mfa_enabled",
    label: "All admins have MFA enabled",
    description: "Fails if any active directory admin lacks MFA (from synced IdP directory).",
    service: "identity",
    defaultSeverity: "critical",
  },
  {
    key: "iam.all_users_mfa_enabled",
    label: "All active users have MFA enabled",
    description: "Fails if any active directory user lacks MFA.",
    service: "identity",
    defaultSeverity: "high",
  },
  {
    key: "iam.no_error_provisioning",
    label: "No users in provisioning error",
    description: "Fails if any directory user has a provisioning error status.",
    service: "identity",
    defaultSeverity: "medium",
  },
  {
    key: "findings.no_open_critical",
    label: "No open critical/high security findings",
    description: "Fails if any critical or high severity finding is open or in progress.",
    service: "security",
    defaultSeverity: "critical",
  },
  {
    key: "findings.no_sla_breached",
    label: "No SLA-breach security findings",
    description: "Fails if any security finding has breached its remediation SLA.",
    service: "security",
    defaultSeverity: "high",
  },
  {
    key: "vendors.no_unapproved_high_risk",
    label: "No unapproved high-risk vendors",
    description: "Fails if any critical/high risk vendor is not in approved status.",
    service: "vendor",
    defaultSeverity: "high",
  },
  {
    key: "connections.all_healthy",
    label: "All integrations healthy",
    description: "Fails if any connection is unhealthy or disconnected.",
    service: "cloud",
    defaultSeverity: "medium",
  },
  {
    key: "controls.evidence_attached",
    label: "Linked controls have evidence",
    description: "Per-control: fails if any linked control has no evidence attached.",
    service: "internal",
    defaultSeverity: "medium",
  },
  {
    key: "controls.no_failing_critical",
    label: "No critical controls failing",
    description: "Fails if any critical-severity control is currently failing.",
    service: "internal",
    defaultSeverity: "critical",
  },
];

export const controlTestByKey = (key) => CONTROL_TEST_REGISTRY.find((t) => t.key === key);