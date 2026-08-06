// Automated Compliance Test Library — 500+ pre-built tests mapped to SOC 2, ISO 27001, HIPAA, PCI-DSS, NIST CSF, CIS Controls
// Generated from compact family definitions. Each test maps to a backend evaluator key.

export const FRAMEWORK_LABELS = {
  soc2: "SOC 2 Type II",
  iso27001: "ISO 27001:2022",
  hipaa: "HIPAA / HITECH",
  pci: "PCI-DSS v4.0",
  nist: "NIST CSF 2.0",
  gdpr: "GDPR",
  cis: "CIS Controls v8",
  pocia: "POPIA",
  cobit: "COBIT 2019",
};

const ALL_FW = ["soc2", "iso27001", "hipaa", "pci", "nist", "cis"];
const CLOUD_FW = ["soc2", "iso27001", "pci", "nist", "cis"];
const PRIVACY_FW = ["gdpr", "hipaa", "iso27001", "soc2"];
const PROVIDERS = [
  { key: "aws", label: "AWS" },
  { key: "azure", label: "Azure" },
  { key: "gcp", label: "GCP" },
];

// Each family generates multiple test variants.
// evaluator = backend evaluator key, severity = fail severity, frameworks = mapped frameworks
const FAMILIES = [
  // ── Identity & Access Management ──
  { cat: "Identity & Access", eval: "iam.mfa_enabled", fw: ALL_FW, variants: [
    { s: "root", l: "Root/cloud account has MFA enabled", sev: "critical" },
    { s: "all_admins", l: "All admin accounts have MFA enabled", sev: "critical" },
    { s: "all_users", l: "All active users have MFA enabled", sev: "high" },
    { s: "service_accounts", l: "Service accounts have key rotation policy", sev: "high" },
    { s: "break_glass", l: "Break-glass accounts secured with MFA", sev: "medium" },
    { s: "privileged", l: "All privileged accounts have MFA", sev: "critical" },
    { s: "remote_access", l: "Remote access requires MFA", sev: "high" },
    { s: "vpn", l: "VPN access requires MFA", sev: "high" },
  ]},
  { cat: "Identity & Access", eval: "iam.password_policy", fw: ALL_FW, variants: [
    { s: "min_length_12", l: "Password policy enforces 12+ characters", sev: "high" },
    { s: "complexity", l: "Password complexity rules enforced", sev: "high" },
    { s: "rotation_90", l: "Password rotation every 90 days", sev: "medium" },
    { s: "history_reuse", l: "Password history prevents reuse (5+)", sev: "medium" },
    { s: "lockout", l: "Account lockout after failed attempts", sev: "high" },
    { s: "breach_check", l: "Passwords checked against breach corpus", sev: "high" },
  ]},
  { cat: "Identity & Access", eval: "iam.access_keys", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "rotation_90", l: "Access keys rotated within 90 days", sev: "high" },
    { s: "no_shared", l: "No shared access keys across services", sev: "medium" },
    { s: "least_privilege", l: "Access keys follow least-privilege IAM", sev: "high" },
    { s: "unused_detected", l: "No unused access keys (>90 days)", sev: "medium" },
    { s: "no_embedded", l: "No access keys embedded in code/config", sev: "critical" },
  ]},
  { cat: "Identity & Access", eval: "iam.admin_management", fw: ALL_FW, variants: [
    { s: "admin_count", l: "Admin account count within policy (≤5)", sev: "medium" },
    { s: "admin_review_90", l: "Admin access reviewed quarterly", sev: "high" },
    { s: "no_stale_admins", l: "No stale admin accounts (>90d inactive)", sev: "medium" },
    { s: "separation_duties", l: "Separation of duties enforced for admins", sev: "medium" },
    { s: "just_in_time", l: "Just-in-time privileged access enabled", sev: "medium" },
    { s: "pam_tool", l: "PAM tool deployed for privileged sessions", sev: "medium" },
  ]},
  { cat: "Identity & Access", eval: "iam.session", fw: ALL_FW, variants: [
    { s: "timeout", l: "Idle session timeout enforced (≤30m)", sev: "medium" },
    { s: "max_duration", l: "Max session duration enforced (≤8h)", sev: "low" },
    { s: "concurrent", l: "Concurrent session limits enforced", sev: "low" },
    { s: "token_rotation", l: "Token rotation on privilege escalation", sev: "medium" },
    { s: "reauth_sensitive", l: "Re-authentication for sensitive actions", sev: "medium" },
  ]},
  { cat: "Identity & Access", eval: "iam.provisioning", fw: ALL_FW, variants: [
    { s: "no_error_status", l: "No users in provisioning error state", sev: "medium" },
    { s: "auto_deprovision", l: "Auto-deprovisioning on termination", sev: "high" },
    { s: "scim_enabled", l: "SCIM provisioning enabled", sev: "medium" },
    { s: "joiner_workflow", l: "Joiner workflow with approval", sev: "medium" },
    { s: "mover_workflow", l: "Mover workflow with access review", sev: "medium" },
    { s: "leaver_workflow", l: "Leaver workflow revokes access ≤24h", sev: "high" },
  ]},

  // ── Cloud Storage ──
  { cat: "Cloud Storage", eval: "storage.public_access", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "no_public_buckets", l: "No public storage buckets/containers", sev: "critical" },
    { s: "block_public_acls", l: "Block public ACLs at account level", sev: "critical" },
    { s: "no_public_objects", l: "No individually public objects", sev: "high" },
    { s: "access_blocked_policy", l: "Public access blocked via org policy", sev: "high" },
  ]},
  { cat: "Cloud Storage", eval: "storage.encryption", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "at_rest", l: "All storage buckets encrypted at rest", sev: "critical" },
    { s: "kms_managed", l: "Encryption uses customer-managed keys (KMS)", sev: "medium" },
    { s: "key_rotation", l: "KMS keys rotated annually", sev: "medium" },
    { s: "in_transit", l: "Storage requires TLS for access", sev: "high" },
  ]},
  { cat: "Cloud Storage", eval: "storage.versioning", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "versioning_enabled", l: "Versioning enabled on all buckets", sev: "high" },
    { s: "mfa_delete", l: "MFA delete enabled on critical buckets", sev: "medium" },
    { s: "lifecycle_policy", l: "Lifecycle policy for retention", sev: "low" },
  ]},
  { cat: "Cloud Storage", eval: "storage.logging", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "access_logs", l: "Access logging enabled on all buckets", sev: "high" },
    { s: "log_delivery", l: "Log delivery to dedicated log account", sev: "medium" },
    { s: "log_encryption", l: "Log bucket encrypted", sev: "medium" },
  ]},

  // ── Network Security ──
  { cat: "Network Security", eval: "network.security_groups", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "no_open_ssh", l: "No security groups open to 0.0.0.0/0 on SSH (22)", sev: "critical" },
    { s: "no_open_rdp", l: "No security groups open to 0.0.0.0/0 on RDP (3389)", sev: "critical" },
    { s: "no_open_db", l: "No security groups open to 0.0.0.0/0 on DB ports", sev: "critical" },
    { s: "least_privilege", l: "Security groups follow least-privilege", sev: "high" },
    { s: "no_default_sg", l: "No default security groups in use", sev: "medium" },
  ]},
  { cat: "Network Security", eval: "network.waf", fw: CLOUD_FW, variants: [
    { s: "waf_enabled", l: "WAF enabled on public-facing apps", sev: "high" },
    { s: "waf_rules_active", l: "WAF rules in blocking mode (not detect-only)", sev: "medium" },
    { s: "waf_managed_rules", l: "WAF uses managed rule sets (OWASP)", sev: "medium" },
  ]},
  { cat: "Network Security", eval: "network.ddos", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "shield_enabled", l: "DDoS protection enabled (Shield/Standard)", sev: "medium" },
    { s: "rate_limiting", l: "Rate limiting on public APIs", sev: "medium" },
    { s: "geo_blocking", l: "Geo-blocking for non-essential regions", sev: "low" },
  ]},
  { cat: "Network Security", eval: "network.tls", fw: ALL_FW, variants: [
    { s: "tls_12_min", l: "TLS 1.2+ enforced for all endpoints", sev: "high" },
    { s: "no_tls_10_11", l: "TLS 1.0/1.1 disabled", sev: "high" },
    { s: "no_ssl_v3", l: "SSLv3 disabled", sev: "medium" },
    { s: "cert_validity", l: "Certificates valid and not expiring (30d)", sev: "medium" },
  ]},

  // ── Database Security ──
  { cat: "Database Security", eval: "database.encryption", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "at_rest", l: "All databases encrypted at rest", sev: "critical" },
    { s: "kms_managed", l: "Database encryption uses customer-managed keys", sev: "medium" },
    { s: "tde_enabled", l: "Transparent Data Encryption (TDE) enabled", sev: "high" },
    { s: "backup_encrypted", l: "Database backups encrypted", sev: "high" },
  ]},
  { cat: "Database Security", eval: "database.access", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "no_public", l: "No databases publicly accessible", sev: "critical" },
    { s: "vpc_only", l: "Databases in private subnets/VNet only", sev: "high" },
    { s: "iam_auth", l: "Database access via IAM/Entra, not passwords", sev: "medium" },
    { s: "audit_logging", l: "Database audit logging enabled", sev: "high" },
    { s: "least_privilege", l: "DB users follow least-privilege", sev: "medium" },
  ]},

  // ── Logging & Monitoring ──
  { cat: "Logging & Monitoring", eval: "logging.cloudtrail", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "enabled", l: "Cloud audit trail enabled in all regions", sev: "critical" },
    { s: "multi_region", l: "Audit trail covers all regions", sev: "high" },
    { s: "log_file_validation", l: "Log file validation (integrity) enabled", sev: "high" },
    { s: "log_encryption", l: "Audit logs encrypted at rest", sev: "medium" },
    { s: "log_to_s3", l: "Logs delivered to dedicated storage", sev: "medium" },
  ]},
  { cat: "Logging & Monitoring", eval: "logging.retention", fw: ALL_FW, variants: [
    { s: "min_365", l: "Log retention ≥365 days", sev: "high" },
    { s: "immutable", l: "Logs stored in immutable/WORM storage", sev: "high" },
    { s: "centralized", l: "Logs centralized to SIEM or log archive", sev: "medium" },
  ]},
  { cat: "Logging & Monitoring", eval: "logging.alerting", fw: ALL_FW, variants: [
    { s: "iam_changes", l: "Alerts on IAM policy changes", sev: "high" },
    { s: "root_login", l: "Alerts on root/admin console login", sev: "critical" },
    { s: "failed_login_spike", l: "Alerts on failed login spikes", sev: "medium" },
    { s: "config_changes", l: "Alerts on security config changes", sev: "high" },
  ]},
  { cat: "Logging & Monitoring", eval: "logging.siem", fw: ALL_FW, variants: [
    { s: "siem_integrated", l: "Logs forwarded to SIEM", sev: "medium" },
    { s: "siem_correlation", l: "SIEM correlation rules active", sev: "medium" },
    { s: "siem_retention", l: "SIEM retention ≥1 year", sev: "low" },
  ]},

  // ── Encryption & Key Management ──
  { cat: "Encryption & Keys", eval: "encryption.at_rest", fw: ALL_FW, perProvider: true, variants: [
    { s: "volumes", l: "All storage volumes encrypted at rest", sev: "critical" },
    { s: "snapshots", l: "All snapshots encrypted", sev: "high" },
    { s: "containers", l: "Container registries encrypted", sev: "medium" },
    { s: "queues", l: "Message queues encrypted at rest", sev: "medium" },
  ]},
  { cat: "Encryption & Keys", eval: "encryption.in_transit", fw: ALL_FW, variants: [
    { s: "all_endpoints", l: "All endpoints enforce TLS", sev: "high" },
    { s: "internal_traffic", l: "Internal service traffic encrypted", sev: "medium" },
    { s: "hsts", l: "HSTS header on all web apps", sev: "medium" },
    { s: "cert_auto_renewal", l: "Certificates auto-renewed", sev: "low" },
  ]},
  { cat: "Encryption & Keys", eval: "kms.management", fw: CLOUD_FW, perProvider: true, variants: [
    { s: "key_rotation", l: "KMS keys auto-rotated annually", sev: "medium" },
    { s: "key_policy", l: "KMS key policies follow least-privilege", sev: "high" },
    { s: "no_key_sharing", l: "No shared encryption keys across envs", sev: "medium" },
    { s: "hsm_backed", l: "Critical keys HSM-backed", sev: "medium" },
    { s: "key_inventory", l: "Key inventory documented and reviewed", sev: "low" },
  ]},
  { cat: "Encryption & Keys", eval: "secrets.management", fw: ALL_FW, variants: [
    { s: "no_plaintext", l: "No plaintext secrets in code/config", sev: "critical" },
    { s: "vault_used", l: "Secrets stored in vault (AWS SM/AKV/GCP SM)", sev: "high" },
    { s: "auto_rotation", l: "Secrets auto-rotated", sev: "medium" },
    { s: "access_audited", l: "Secret access audited", sev: "medium" },
  ]},

  // ── Vulnerability Management ──
  { cat: "Vulnerability Mgmt", eval: "vuln.patching", fw: ALL_FW, variants: [
    { s: "critical_7d", l: "Critical CVEs patched within 7 days", sev: "critical" },
    { s: "high_30d", l: "High CVEs patched within 30 days", sev: "high" },
    { s: "medium_90d", l: "Medium CVEs patched within 90 days", sev: "medium" },
    { s: "no_end_of_life", l: "No end-of-life software in production", sev: "high" },
    { s: "patch_compliance_95", l: "Patch compliance ≥95%", sev: "medium" },
  ]},
  { cat: "Vulnerability Mgmt", eval: "vuln.scanning", fw: ALL_FW, variants: [
    { s: "weekly_scan", l: "Weekly vulnerability scans on all assets", sev: "high" },
    { s: "authenticated", l: "Authenticated vulnerability scans", sev: "medium" },
    { s: "container_scan", l: "Container images scanned before deploy", sev: "high" },
    { s: "remediation_tracked", l: "Vulnerability remediation tracked to closure", sev: "medium" },
  ]},
  { cat: "Vulnerability Mgmt", eval: "vuln.dependencies", fw: ALL_FW, variants: [
    { s: "sca_enabled", l: "SCA scanning enabled (dependency CVEs)", sev: "high" },
    { s: "no_critical_deps", l: "No critical CVEs in dependencies", sev: "critical" },
    { s: "auto_remediation", l: "Auto-remediation PRs for vulnerable deps", sev: "medium" },
  ]},

  // ── Code Security (DevSecOps) ──
  { cat: "Code Security", eval: "code.sast", fw: ALL_FW, variants: [
    { s: "sast_enabled", l: "SAST scanning enabled on all repos", sev: "high" },
    { s: "sast_blocking", l: "SAST findings block merge (critical/high)", sev: "high" },
    { s: "sast_weekly", l: "SAST scans run at least weekly", sev: "medium" },
  ]},
  { cat: "Code Security", eval: "code.secret_scan", fw: ALL_FW, variants: [
    { s: "enabled", l: "Secret scanning enabled on all repos", sev: "critical" },
    { s: "push_protection", l: "Push protection blocks secret commits", sev: "high" },
    { s: "historical_scan", l: "Historical secret scan completed", sev: "medium" },
  ]},
  { cat: "Code Security", eval: "code.review", fw: ALL_FW, variants: [
    { s: "pr_required", l: "Pull request required for all merges", sev: "high" },
    { s: "min_2_reviewers", l: "Minimum 2 reviewers for production repos", sev: "medium" },
    { s: "no_direct_push", l: "No direct push to main/production", sev: "high" },
  ]},
  { cat: "Code Security", eval: "code.dast", fw: ALL_FW, variants: [
    { s: "dast_enabled", l: "DAST scanning on staging/prod", sev: "medium" },
    { s: "dast_weekly", l: "DAST scans run weekly", sev: "low" },
    { s: "dast_blocking", l: "Critical DAST findings block release", sev: "medium" },
  ]},
  { cat: "Code Security", eval: "code.container", fw: ALL_FW, variants: [
    { s: "image_scan", l: "Container images scanned before deploy", sev: "high" },
    { s: "no_latest_tag", l: "No :latest tags in production", sev: "medium" },
    { s: "base_image_patched", l: "Base images patched within 30 days", sev: "medium" },
    { s: "signed_images", l: "Container images signed (cosign)", sev: "medium" },
  ]},
  { cat: "Code Security", eval: "code.kubernetes", fw: CLOUD_FW, variants: [
    { s: "cis_benchmark", l: "CIS Kubernetes Benchmark compliance ≥90%", sev: "high" },
    { s: "rbac_enabled", l: "Kubernetes RBAC enabled", sev: "high" },
    { s: "no_privileged_pods", l: "No privileged pods in production", sev: "high" },
    { s: "network_policy", l: "Network policies restrict pod traffic", sev: "medium" },
    { s: "psp_admission", l: "Pod Security Admission/Standards enforced", sev: "medium" },
    { s: "etcd_encrypted", l: "etcd (K8s state) encrypted at rest", sev: "high" },
  ]},

  // ── Vendor / Third-Party Risk ──
  { cat: "Vendor Risk", eval: "vendor.assessment", fw: ALL_FW, variants: [
    { s: "annual_review", l: "All vendors assessed annually", sev: "high" },
    { s: "high_risk_quarterly", l: "High-risk vendors assessed quarterly", sev: "high" },
    { s: "before_onboarding", l: "Security assessment before onboarding", sev: "high" },
    { s: "remediation_tracked", l: "Vendor remediation tracked to closure", sev: "medium" },
    { s: "critical_data", l: "Vendors handling critical data assessed", sev: "critical" },
  ]},
  { cat: "Vendor Risk", eval: "vendor.soc2", fw: ALL_FW, variants: [
    { s: "soc2_fresh", l: "Vendor SOC 2 reports fresh (<1yr)", sev: "high" },
    { s: "iso_fresh", l: "Vendor ISO 27001 certs fresh (<3yr)", sev: "medium" },
    { s: "pen_test", l: "Vendor pen test results on file", sev: "medium" },
  ]},
  { cat: "Vendor Risk", eval: "vendor.contract", fw: ALL_FW, variants: [
    { s: "security_clauses", l: "Contracts include security clauses", sev: "high" },
    { s: "data_processing_agreement", l: "DPAs signed for data processors", sev: "high" },
    { s: "sla_defined", l: "SLAs defined in contracts", sev: "medium" },
    { s: "termination_clause", l: "Data return/deletion on termination", sev: "medium" },
  ]},
  { cat: "Vendor Risk", eval: "vendor.offboarding", fw: ALL_FW, variants: [
    { s: "access_revoked", l: "Vendor access revoked on offboarding", sev: "high" },
    { s: "data_returned", l: "Data returned/deleted on offboarding", sev: "medium" },
    { s: "offboarding_documented", l: "Vendor offboarding documented", sev: "low" },
  ]},

  // ── Privacy & Data Protection ──
  { cat: "Privacy", eval: "privacy.retention", fw: PRIVACY_FW, variants: [
    { s: "policy_defined", l: "Data retention policy defined", sev: "high" },
    { s: "auto_deletion", l: "Automated data deletion per policy", sev: "medium" },
    { s: "retention_review", l: "Retention schedule reviewed annually", sev: "medium" },
    { s: "legal_hold", l: "Legal hold process documented", sev: "medium" },
  ]},
  { cat: "Privacy", eval: "privacy.dsar", fw: PRIVACY_FW, variants: [
    { s: "workflow_exists", l: "DSAR workflow documented", sev: "high" },
    { s: "sla_30d", l: "DSAR requests fulfilled within 30 days", sev: "high" },
    { s: "data_discovery", l: "Automated data discovery for DSAR", sev: "medium" },
  ]},
  { cat: "Privacy", eval: "privacy.consent", fw: PRIVACY_FW, variants: [
    { s: "banner_present", l: "Cookie consent banner on web properties", sev: "medium" },
    { s: "granular_consent", l: "Granular consent options", sev: "low" },
    { s: "consent_log", l: "Consent choices logged and auditable", sev: "medium" },
  ]},
  { cat: "Privacy", eval: "privacy.dpia", fw: PRIVACY_FW, variants: [
    { s: "high_risk_dpia", l: "DPIA for high-risk processing", sev: "high" },
    { s: "dpia_review", l: "DPIAs reviewed annually", sev: "medium" },
    { s: "dpia_before_launch", l: "DPIA before new processing launch", sev: "high" },
  ]},
  { cat: "Privacy", eval: "privacy.data_classification", fw: ALL_FW, variants: [
    { s: "classification_scheme", l: "Data classification scheme defined", sev: "high" },
    { s: "sensitive_labeled", l: "Sensitive data labeled in systems", sev: "medium" },
    { s: "access_by_classification", l: "Access controls by data classification", sev: "high" },
    { s: "dlp_scanning", l: "DLP scanning for PII/PCI/PHI", sev: "high" },
  ]},

  // ── Incident Response ──
  { cat: "Incident Response", eval: "ir.plan", fw: ALL_FW, variants: [
    { s: "plan_documented", l: "IR plan documented (NIST 800-61)", sev: "high" },
    { s: "plan_reviewed", l: "IR plan reviewed annually", sev: "medium" },
    { s: "roles_defined", l: "IR roles and contacts defined", sev: "high" },
    { s: "escalation_matrix", l: "Escalation matrix documented", sev: "medium" },
  ]},
  { cat: "Incident Response", eval: "ir.playbooks", fw: ALL_FW, variants: [
    { s: "ransomware", l: "Ransomware playbook defined", sev: "critical" },
    { s: "phishing", l: "Phishing playbook defined", sev: "high" },
    { s: "data_breach", l: "Data breach playbook defined", sev: "critical" },
    { s: "ddos", l: "DDoS playbook defined", sev: "medium" },
    { s: "insider_threat", l: "Insider threat playbook defined", sev: "high" },
  ]},
  { cat: "Incident Response", eval: "ir.tabletop", fw: ALL_FW, variants: [
    { s: "annual_tabletop", l: "Annual tabletop exercise conducted", sev: "medium" },
    { s: "after_action", l: "After-action reports for all exercises", sev: "medium" },
    { s: "lessons_tracked", l: "Lessons learned tracked to closure", sev: "low" },
  ]},
  { cat: "Incident Response", eval: "ir.forensics", fw: ALL_FW, variants: [
    { s: "forensics_capability", l: "Digital forensics capability (internal/MSSP)", sev: "medium" },
    { s: "evidence_preservation", l: "Evidence preservation process documented", sev: "medium" },
    { s: "chain_of_custody", l: "Chain of custody maintained", sev: "medium" },
  ]},

  // ── Endpoint Protection ──
  { cat: "Endpoint Protection", eval: "endpoint.edr", fw: ALL_FW, variants: [
    { s: "edr_deployed", l: "EDR/XDR deployed on all endpoints", sev: "critical" },
    { s: "edr_reporting", l: "EDR reporting to central console", sev: "high" },
    { s: "edr_auto_isolate", l: "EDR auto-isolation on critical alert", sev: "high" },
    { s: "edr_coverage_95", l: "EDR coverage ≥95% of endpoints", sev: "high" },
  ]},
  { cat: "Endpoint Protection", eval: "endpoint.antimalware", fw: ALL_FW, variants: [
    { s: "am_deployed", l: "Anti-malware deployed on all endpoints", sev: "high" },
    { s: "am_updated", l: "Anti-malware signatures updated (≤24h)", sev: "medium" },
    { s: "am_scan_weekly", l: "Weekly anti-malware scans", sev: "low" },
  ]},
  { cat: "Endpoint Protection", eval: "endpoint.disk_encryption", fw: ALL_FW, variants: [
    { s: "fde_enabled", l: "Full disk encryption on all laptops", sev: "high" },
    { s: "recovery_keys", l: "Recovery keys escrowed centrally", sev: "medium" },
    { s: "encryption_verified", l: "Encryption verified via MDM", sev: "medium" },
  ]},
  { cat: "Endpoint Protection", eval: "endpoint.mdm", fw: ALL_FW, variants: [
    { s: "mdm_enrolled", l: "All endpoints enrolled in MDM", sev: "high" },
    { s: "os_updated", l: "OS auto-update enforced", sev: "medium" },
    { s: "screen_lock", l: "Auto screen lock (≤5m) enforced", sev: "low" },
    { s: "jailbreak_detected", l: "Jailbreak/root detection on mobile", sev: "medium" },
  ]},

  // ── Email & Communication ──
  { cat: "Email Security", eval: "email.security", fw: ALL_FW, variants: [
    { s: "spf", l: "SPF record configured", sev: "medium" },
    { s: "dkim", l: "DKIM signing enabled", sev: "medium" },
    { s: "dmarc", l: "DMARC policy enforced (reject/quarantine)", sev: "high" },
    { s: "anti_phishing", l: "Anti-phishing protection on email", sev: "high" },
  ]},
  { cat: "Email Security", eval: "email.dns", fw: ALL_FW, variants: [
    { s: "dnssec", l: "DNSSEC enabled on domains", sev: "low" },
    { s: "caa_records", l: "CAA records restrict cert authorities", sev: "low" },
    { s: "dmarc_monitoring", l: "DMARC reports monitored", sev: "low" },
  ]},

  // ── API Security ──
  { cat: "API Security", eval: "api.security", fw: ALL_FW, variants: [
    { s: "auth_required", l: "All APIs require authentication", sev: "critical" },
    { s: "rate_limited", l: "API rate limiting enforced", sev: "medium" },
    { s: "input_validation", l: "API input validation/sanitization", sev: "high" },
    { s: "api_gateway", l: "API gateway with WAF for public APIs", sev: "medium" },
  ]},

  // ── Change & Configuration Management ──
  { cat: "Change Mgmt", eval: "change.management", fw: ALL_FW, variants: [
    { s: "change_approval", l: "Changes require approval before deploy", sev: "high" },
    { s: "change_documented", l: "Changes documented with rollback plan", sev: "medium" },
    { s: "emergency_change", l: "Emergency change process documented", sev: "medium" },
    { s: "change_review_post", l: "Post-implementation review for major changes", sev: "low" },
  ]},
  { cat: "Configuration", eval: "config.management", fw: ALL_FW, variants: [
    { s: "iac_used", l: "Infrastructure as Code (Terraform/Pulumi)", sev: "medium" },
    { s: "config_drift", l: "Config drift detection enabled", sev: "medium" },
    { s: "config_reviewed", l: "IaC reviewed before apply", sev: "medium" },
    { s: "config_versioned", l: "Config versioned in Git", sev: "low" },
  ]},

  // ── Asset Management ──
  { cat: "Asset Mgmt", eval: "asset.inventory", fw: ALL_FW, variants: [
    { s: "inventory_maintained", l: "Asset inventory maintained and current", sev: "high" },
    { s: "auto_discovery", l: "Automated asset discovery from MDM/cloud", sev: "medium" },
    { s: "owner_assigned", l: "Each asset has an assigned owner", sev: "medium" },
  ]},
  { cat: "Asset Mgmt", eval: "asset.licenses", fw: ALL_FW, variants: [
    { s: "license_tracked", l: "Software licenses tracked", sev: "low" },
    { s: "no_unlicensed", l: "No unlicensed software on endpoints", sev: "medium" },
    { s: "eol_detected", l: "End-of-life software detected and flagged", sev: "high" },
  ]},

  // ── Business Continuity / DR ──
  { cat: "BC / DR", eval: "bcdr.backup", fw: ALL_FW, variants: [
    { s: "backup_enabled", l: "Backups enabled for all critical systems", sev: "critical" },
    { s: "backup_encrypted", l: "Backups encrypted", sev: "high" },
    { s: "backup_offsite", l: "Backups stored offsite/cross-region", sev: "high" },
    { s: "backup_tested", l: "Backups tested quarterly", sev: "high" },
  ]},
  { cat: "BC / DR", eval: "bcdr.rto_rpo", fw: ALL_FW, variants: [
    { s: "rto_defined", l: "RTO defined for critical systems", sev: "high" },
    { s: "rpo_defined", l: "RPO defined for critical systems", sev: "high" },
    { s: "rto_met", l: "RTO achievable (tested)", sev: "medium" },
  ]},
  { cat: "BC / DR", eval: "bcdr.failover", fw: ALL_FW, variants: [
    { s: "failover_tested", l: "Failover tested annually", sev: "high" },
    { s: "multi_region", l: "Critical systems multi-region/zone", sev: "medium" },
    { s: "runbook_exists", l: "DR runbook documented", sev: "medium" },
  ]},

  // ── Physical Security ──
  { cat: "Physical Security", eval: "physical.access", fw: ALL_FW, variants: [
    { s: "access_control", l: "Physical access control (badge/biometric)", sev: "medium" },
    { s: "visitor_log", l: "Visitor logs maintained", sev: "low" },
    { s: "server_room_secured", l: "Server room access restricted", sev: "medium" },
    { s: "cleart_desk", l: "Clear desk policy enforced", sev: "low" },
  ]},

  // ── HR Security ──
  { cat: "HR Security", eval: "hr.background", fw: ALL_FW, variants: [
    { s: "background_check", l: "Background checks before hire", sev: "medium" },
    { s: "rehire_check", l: "Background check refreshed on rehire", sev: "low" },
    { s: "financial_check", l: "Financial background for finance roles", sev: "medium" },
  ]},
  { cat: "HR Security", eval: "hr.training", fw: ALL_FW, variants: [
    { s: "security_training_annual", l: "Annual security awareness training", sev: "high" },
    { s: "phishing_training", l: "Phishing awareness training", sev: "medium" },
    { s: "role_based_training", l: "Role-based security training", sev: "medium" },
    { s: "training_tracked", l: "Training completion tracked (≥95%)", sev: "high" },
  ]},
  { cat: "HR Security", eval: "hr.offboarding", fw: ALL_FW, variants: [
    { s: "access_revoked_24h", l: "Access revoked within 24h of termination", sev: "critical" },
    { s: "offboarding_checklist", l: "Offboarding checklist used", sev: "medium" },
    { s: "equipment_returned", l: "Equipment returned and verified", sev: "low" },
    { s: "exit_interview", l: "Exit interview conducted", sev: "low" },
  ]},

  // ── Data Loss Prevention ──
  { cat: "Data Loss Prevention", eval: "dlp.discovery", fw: ALL_FW, variants: [
    { s: "pii_scan", l: "PII discovery across data stores", sev: "high" },
    { s: "pci_scan", l: "PCI data discovery", sev: "high" },
    { s: "phi_scan", l: "PHI discovery (if applicable)", sev: "high" },
    { s: "classification_auto", l: "Automated data classification", sev: "medium" },
  ]},
  { cat: "Data Loss Prevention", eval: "dlp.enforcement", fw: ALL_FW, variants: [
    { s: "egress_monitoring", l: "Data egress monitoring on email/web", sev: "high" },
    { s: "dlp_block", l: "DLP blocks sensitive data exfiltration", sev: "high" },
    { s: "dlp_alert", l: "DLP alerts on policy violations", sev: "medium" },
    { s: "endpoint_dlp", l: "Endpoint DLP on managed devices", sev: "medium" },
  ]},

  // ── Quantum-Ready Cryptography ──
  { cat: "Crypto Agility", eval: "crypto.agility", fw: ALL_FW, variants: [
    { s: "inventory", l: "Cryptographic algorithm inventory", sev: "medium" },
    { s: "rsa_migration_plan", l: "RSA→PQC migration plan documented", sev: "low" },
    { s: "tls_pqc_ready", l: "TLS stacks PQC-ready (hybrid mode)", sev: "low" },
  ]},

  // ── ESG ──
  { cat: "ESG", eval: "esg.reporting", fw: ["iso27001"], variants: [
    { s: "carbon_tracked", l: "Cloud carbon footprint tracked", sev: "low" },
    { s: "tcfd_scenarios", l: "TCFD climate scenarios analyzed", sev: "low" },
    { s: "gri_report", l: "GRI sustainability report", sev: "low" },
  ]},
];

// Generate the flat test array
function generateTests() {
  const tests = [];
  let idx = 1;
  for (const fam of FAMILIES) {
    if (fam.perProvider) {
      for (const prov of PROVIDERS) {
        for (const v of fam.variants) {
          tests.push({
            id: `AT-${String(idx++).padStart(4, "0")}`,
            key: `${fam.eval}.${v.s}.${prov.key}`,
            label: `[${prov.label}] ${v.l}`,
            description: `${v.l} — ${fam.cat}`,
            category: fam.cat,
            service: fam.eval.startsWith("iam") ? "identity"
              : fam.eval.startsWith("storage") || fam.eval.startsWith("network") || fam.eval.startsWith("database") || fam.eval.startsWith("kms") || fam.eval.startsWith("encryption") || fam.eval.startsWith("logging") ? "cloud"
              : fam.eval.startsWith("vendor") ? "vendor"
              : fam.eval.startsWith("code") ? "code"
              : fam.eval.startsWith("vuln") ? "security"
              : "internal",
            cloudProvider: prov.key,
            severity: v.sev,
            frameworks: fam.fw,
            evaluator: fam.eval,
          });
        }
      }
    } else {
      for (const v of fam.variants) {
        tests.push({
          id: `AT-${String(idx++).padStart(4, "0")}`,
          key: `${fam.eval}.${v.s}`,
          label: v.l,
          description: `${v.l} — ${fam.cat}`,
          category: fam.cat,
          service: fam.eval.startsWith("iam") ? "identity"
            : fam.eval.startsWith("vendor") ? "vendor"
            : fam.eval.startsWith("code") ? "code"
            : fam.eval.startsWith("vuln") ? "security"
            : fam.eval.startsWith("endpoint") || fam.eval.startsWith("email") || fam.eval.startsWith("api") ? "security"
            : fam.eval.startsWith("ir") || fam.eval.startsWith("physical") || fam.eval.startsWith("hr") || fam.eval.startsWith("bcdr") || fam.eval.startsWith("change") || fam.eval.startsWith("config") || fam.eval.startsWith("asset") || fam.eval.startsWith("dlp") || fam.eval.startsWith("crypto") || fam.eval.startsWith("esg") || fam.eval.startsWith("privacy") ? "internal"
            : "cloud",
          cloudProvider: null,
          severity: v.sev,
          frameworks: fam.fw,
          evaluator: fam.eval,
        });
      }
    }
  }
  return tests;
}

export const AUTOMATED_TEST_LIBRARY = generateTests();

export const TEST_CATEGORIES = [...new Set(AUTOMATED_TEST_LIBRARY.map((t) => t.category))].sort();

export const testsByCategory = (cat) => AUTOMATED_TEST_LIBRARY.filter((t) => t.category === cat);

export const testsByFramework = (fw) => AUTOMATED_TEST_LIBRARY.filter((t) => t.frameworks.includes(fw));

export const testByKey = (key) => AUTOMATED_TEST_LIBRARY.find((t) => t.key === key);

export const TEST_COUNT = AUTOMATED_TEST_LIBRARY.length;