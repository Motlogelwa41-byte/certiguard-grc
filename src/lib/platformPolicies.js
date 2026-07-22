// Platform Governance Policy Library — the formal policies that govern the
// CertiGuard GRC RegTech Platform itself. These are version-controlled,
// review-dated, and aligned to POPIA, King IV, ISO 27001, and SOC 2.
// Rendered on the Platform Governance page and publishable into the tenant
// Policy Register (where they flow through the existing approval workflow).

export const PLATFORM_POLICY_VERSION = "1.0";
export const PLATFORM_POLICY_OWNER = "CertiGuard Platform Governance Committee";
export const LAST_REVIEWED = "2026-07-01";
export const NEXT_REVIEW = "2027-07-01";

export const PLATFORM_POLICIES = [
  {
    id: "pau-001",
    title: "Platform Acceptable Use Policy",
    category: "acceptable_use",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Defines permitted and prohibited use of the CertiGuard GRC Platform by all users.",
    content: `This policy governs the acceptable use of the CertiGuard GRC RegTech Platform ("the Platform") by all users, including administrators, compliance officers, risk managers, auditors, and invited stakeholders.

Authorised users may access the Platform solely for legitimate governance, risk, and compliance activities of their organisation. Users must authenticate using their own credentials and must never share, transfer, or otherwise compromise credentials.

Prohibited activities include: attempting to access data belonging to other tenants; tampering with audit logs, controls, evidence, or risk records; introducing malware or malicious code; using the Platform to store unlawful content; or circumventing access controls and security mechanisms.

Users must report suspected security incidents or policy violations to the Platform Administrator immediately. Violation of this policy may result in suspension of access and, where applicable, regulatory or legal action.`,
  },
  {
    id: "pac-002",
    title: "Access Control & Authentication Policy",
    category: "access_control",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Mandates least-privilege RBAC, MFA/SSO, and secure session management across the Platform.",
    content: `Access to the Platform is governed by role-based access control (RBAC) with least-privilege principles. Roles include admin, compliance officer, risk manager, auditor, and user; each role is granted only the permissions necessary for its function.

Multi-factor authentication (MFA) and single sign-on (SSO) via enterprise identity providers (Okta, Azure AD, Google Workspace) are enforced for administrative access. Session tokens are cryptographically secured with Secure, HttpOnly, SameSite=Strict cookies and expire automatically.

Privileged actions — user management, tenant configuration, policy approval, and audit log access — are restricted to administrators and are themselves logged in the tamper-evident audit trail. Access reviews are conducted at least quarterly to certify that permissions remain appropriate.`,
  },
  {
    id: "pdc-003",
    title: "Data Classification, Retention & Disposal Policy",
    category: "data_privacy",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Classifies platform data and defines retention periods and secure disposal procedures.",
    content: `All data processed by the Platform is classified as Public, Internal, Confidential, or Restricted. Tenant compliance data (risks, controls, policies, evidence, audit logs) is classified Confidential or Restricted by default.

Retention periods: audit trail entries are retained for a minimum of seven (7) years to satisfy regulatory and forensic requirements. Evidence and policy records are retained for the active lifecycle of the related framework plus three (3) years.

Disposal is performed via secure, irreversible deletion. Records subject to legal hold or regulatory retention are excluded from disposal until the hold is released. All disposal events are recorded in the audit trail with the actor and timestamp.`,
  },
  {
    id: "pmt-004",
    title: "Multi-Tenant Isolation & Data Segregation Policy",
    category: "information_security",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Enforces strict logical and physical separation between tenant data.",
    content: `The Platform is a multi-tenant SaaS. Every tenant record carries a tenant_id isolation key, and row-level security (RLS) enforces that a user may only read, create, update, or delete records within their own tenant — with the exception of platform administrators acting under logged, privileged access.

Data segregation is enforced at the database query layer: no tenant query may return, modify, or reference another tenant's records. Cross-tenant access attempts are denied and logged as security events.

Platform-wide administrative access is restricted to named platform operators and is subject to dual-control and full audit logging. No tenant data is commingled in storage, processing, or reporting.`,
  },
  {
    id: "pal-005",
    title: "Audit Logging & Immutability Policy",
    category: "information_security",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Mandates tamper-evident, hash-chained, append-only audit logging for all material actions.",
    content: `Every material action on the Platform — create, update, and delete of risks, policies, controls, tasks, and configuration — is recorded in a tamper-evident audit trail. Each entry is hash-chained to the previous entry (SHA-256) so that any after-the-fact modification or deletion is detectable.

The audit trail is append-only: update and delete operations on audit records are denied to all users. Hash-chain integrity is verified on demand and the result is surfaced to administrators.

Audit entries capture the actor (authenticated user), timestamp, entity, before-and-after change diff, source IP, and user agent. Audit logs are exported only through signed export mechanisms and are retained per the Data Retention Policy.`,
  },
  {
    id: "pcm-006",
    title: "Change Management & SDLC Policy",
    category: "change_management",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Governs how the Platform itself is changed, tested, and released.",
    content: `All changes to the Platform — application code, configuration, infrastructure, and data schema — follow a controlled change management process. Changes are requested, reviewed, approved, tested, and released through tracked work items and version control.

Changes are segregated across environments (development, test, production). No unreviewed change reaches production. Higher-risk changes require additional approval and a documented rollback plan.

Production deployments are performed by authorised operators and are logged. Emergency changes are permitted only under defined break-glass procedures, are time-boxed, and are retroactively reviewed within two business days.`,
  },
  {
    id: "pvm-007",
    title: "Vulnerability & Patch Management Policy",
    category: "information_security",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Defines vulnerability scanning cadence and remediation SLAs by severity.",
    content: `The Platform and its dependencies are scanned for vulnerabilities on a recurring cadence (at least monthly, with continuous dependency monitoring). Findings are triaged and assigned a severity.

Remediation SLAs: Critical — 7 days, High — 30 days, Medium — 90 days, Low — next scheduled release. Security findings ingested from connected sources (e.g. AWS Security Hub) are tracked in the Security Findings register with SLA breach alerts.

Patch management is automated where possible. Critical security patches are expedited and may trigger an emergency change under the Change Management Policy.`,
  },
  {
    id: "pir-008",
    title: "Incident Response & Breach Notification Policy",
    category: "incident_response",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Defines detection, containment, escalation, and regulator notification for security incidents.",
    content: `Security incidents affecting the Platform or tenant data are managed through a defined incident response lifecycle: detect, contain, eradicate, recover, and learn. Incidents are tracked in the Incident register with severity, status, timeline, and an escalation chain.

Critical and high-severity incidents trigger automated escalation and Slack/email notification to the response team. Mean time to contain (MTTC) and mean time to resolve (MTTR) are measured and reported.

Where an incident constitutes a notifiable breach under POPIA, GDPR, or sectoral regulation (e.g. SARB/Prudential Authority), the affected tenant and the relevant regulator are notified within the statutory timeframe. Notifications are themselves logged.`,
  },
  {
    id: "ppd-009",
    title: "Privacy & Data Protection Policy (POPIA / GDPR)",
    category: "data_privacy",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Aligns Platform processing of personal information with POPIA, GDPR, and regional privacy law.",
    content: `The Platform processes personal information as a processor on behalf of tenant customers. Processing is governed by data protection by design and by default, and is aligned to the Protection of Personal Information Act (POPIA), the GDPR, and applicable SADC data protection frameworks.

Records of Processing Activities (ROPA) and Data Protection Impact Assessments (DPIAs) are supported as first-class Platform features. Data subject rights requests are facilitated through the tenant administrator.

Personal information is encrypted in transit (TLS 1.3) and at rest. Sub-processors are bound by written agreements and are listed in the Trust Center. Cross-border transfers are disclosed and minimised.`,
  },
  {
    id: "pvm-010",
    title: "Vendor & Sub-processor Management Policy",
    category: "vendor_management",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Governs due diligence, assessment, and ongoing monitoring of sub-processors and suppliers.",
    content: `Sub-processors and suppliers that support the Platform (cloud infrastructure, email, monitoring, identity) are subject to risk-based due diligence before onboarding and re-assessed at least annually or upon material change.

Vendors are classified by risk level (critical, high, medium, low) based on data access and business impact. Critical and high-risk vendors must demonstrate SOC 2, ISO 27001, or equivalent assurance, and are tracked in the Vendor register with assessment status and next review dates.

Vendor risk events (e.g. a breach, status downgrade, or expired certification) trigger automated alerting and, where warranted, remediation or offboarding.`,
  },
  {
    id: "pbc-011",
    title: "Business Continuity & Disaster Recovery Policy",
    category: "business_continuity",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Defines RTO/RPO targets, backups, and failover to ensure Platform resilience.",
    content: `The Platform maintains a business continuity and disaster recovery capability to protect tenant access to compliance data. Target Recovery Time Objective (RTO) is 8 hours; target Recovery Point Objective (RPO) is 1 hour for operational data and 24 hours for audit archives.

Backups are encrypted, geographically separated, and tested for restorability at least quarterly. Failover procedures are documented and rehearsed annually.

Continuity is reviewed after any major incident or significant Platform change. Tenants are notified of material continuity events through established communication channels.`,
  },
  {
    id: "pck-012",
    title: "Cryptographic & Key Management Policy",
    category: "information_security",
    version: "1.0",
    status: "approved",
    owner: PLATFORM_POLICY_OWNER,
    lastReviewed: LAST_REVIEWED,
    nextReview: NEXT_REVIEW,
    summary: "Mandates strong cryptography, TLS 1.3, HSTS, and secure key lifecycle management.",
    content: `All data in transit is protected by TLS 1.3 with HSTS enforced. Data at rest is encrypted using industry-standard algorithms. Cryptographic keys are managed through a controlled lifecycle: generation, distribution, rotation, and retirement.

Secrets (API tokens, OAuth credentials, signing keys) are stored in the Platform secret store, never committed to source control, and rotated on a defined schedule or immediately upon suspected compromise.

Cryptographic standards are reviewed at least annually to ensure alignment with current best practice. Deprecated algorithms and protocols are phased out within documented timeframes.`,
  },
];