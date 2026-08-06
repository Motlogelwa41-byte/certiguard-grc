import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import {
  Shield, Users, Cloud, Database, Zap, Mail, Slack, Calendar,
  CreditCard, Bug, Workflow, Lock, GitBranch, Server, Cpu, FileCheck,
  ArrowRight, Brain, Radar, Scale, Building2, Activity, Network,
  ShieldAlert, FileLock, Globe, Layers
} from "lucide-react";

const LAYER_BASE = "bg-card rounded-2xl border border-border p-5";
const NODE_BASE = "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-center text-xs font-medium border transition-all hover:scale-105";

const roles = [
  "Admin", "Compliance Officer", "Risk Manager", "Auditor",
  "External Auditor", "Department Head", "HR", "CISO", "New Signup (Trial)",
];

const moduleGroups = [
  { label: "Overview", items: ["Dashboard", "Executive Dashboard", "SADC Executive", "Cross-Tenant Executive", "Security Command Center", "Protection Command Center"] },
  { label: "Compliance", items: ["Frameworks", "Controls", "Control Libraries", "Framework Map", "Gap Analysis", "Compliance Runs", "Audit Readiness", "SADC Frameworks"] },
  { label: "Risk", items: ["Risks", "Risk Heatmap", "Risk Appetite", "Risk Quantification", "FAIR Benchmarks", "Monte Carlo", "Cross-Org Risk", "KPI/KRI"] },
  { label: "Security Ops", items: ["Cloud Posture", "Real-Time CSPM", "EDR Dashboard", "Vulnerabilities", "SIEM Webhooks", "SOAR Playbooks", "IR Playbooks", "DLP Monitor"] },
  { label: "Privacy & GDPR", items: ["ROPA", "DPIA", "Privacy Requests", "Data Flow Mapping", "Cross-Border Matrix", "Data Privacy", "Data Residency"] },
  { label: "Governance", items: ["Policies", "Policy Exceptions", "Board Resolutions", "COI Portal", "Whistleblower", "Tabletop Simulator", "BCDR Tracker", "Statutory Calendar"] },
  { label: "Evidence & Audit", items: ["Evidence Manager", "Secure Evidence Pack", "Audit Trail", "Auditor Portal", "Auditor Export", "Audit Findings", "Audit Checklists"] },
  { label: "AI & Automation", items: ["AI Hub", "AI Control Mapper", "AI Gap Analysis", "AI Contract Scanner", "AI Cross-Mapping", "AI Assistant", "Automated Tests"] },
];

const entityDomains = [
  { label: "Core GRC", items: ["Tenant", "TenantSettings", "Control", "Framework", "FrameworkRequirement", "Risk", "Policy", "Evidence", "ComplianceTask", "AuditTrail"] },
  { label: "Security Ops", items: ["SecurityFinding", "SecurityAlert", "Incident", "PenTest", "PenTestFinding", "Connection", "ITAsset", "PqcAsset"] },
  { label: "Compliance & Audit", items: ["Certification", "CertificationMilestone", "Audit", "AuditFinding", "AuditChecklist", "GapAnalysis", "ComplianceRun", "ComplianceBenchmark", "MaturityAssessment"] },
  { label: "Vendor & Contracts", items: ["Vendor", "VendorAssessment", "Contract", "SecurityQuestionnaire", "QuestionnaireItem"] },
  { label: "Privacy", items: ["PrivacyRequest", "PrivacyRequestTask", "ROPA", "DPIA", "DataFlowMap"] },
  { label: "Risk & Governance", items: ["RiskQuantification", "KpiKri", "BusinessUnit", "BcdrPlan", "TabletopScenario", "BoardResolution", "ConflictOfInterest", "WhistleblowerReport", "PolicyException"] },
  { label: "Identity & Access", items: ["DirectoryUser", "IdentityProvider", "AccessAttestation", "AccessReviewCampaign", "AccessReviewItem", "TenantApiKey", "PolicyAttestation"] },
  { label: "RegTech & Reporting", items: ["RegulatoryFramework", "RegulatoryChange", "RegulatoryAlert", "UniversalControl", "RequirementControlMapping", "ManagementReport", "ReportSchedule", "EsgMetric", "TrustCenter", "AuditEvidenceLedger"] },
];

const functionCategories = [
  { label: "Sync & Collection", items: ["syncAwsSecurityHub", "syncEdrFindings", "syncGithubSecurity", "syncHrisDirectory", "syncIdpDirectory", "syncAllDirectories", "automatedEvidenceCollection", "runCspmScan"] },
  { label: "Risk & Remediation", items: ["calculateRiskMetrics", "aggregateCrossOrgRisk", "autoCreateRemediationTask", "generateRiskRemediationTasks", "escalateSlaBreachedFindings"] },
  { label: "Compliance & Controls", items: ["calculateComplianceScore", "runControlTests", "runAutomatedComplianceTest", "continuousControlMonitoring", "handleControlRegression", "importControlLibrary"] },
  { label: "AI / LLM", items: ["aiCrossMapFrameworks", "autoFillQuestionnaire", "fetchRegulatoryIntelligence"] },
  { label: "Audit & Integrity", items: ["logAudit", "verifyAuditChain", "hashEvidenceToLedger", "auditEntityRls", "validateEvidenceUpload"] },
  { label: "Notifications", items: ["sendDueReminders", "sendSlackAlert", "sendWeeklyBoardReport", "sendTaskAssignmentEmail", "sendControlFailureAlert", "postDeadlineSlackDigest"] },
  { label: "Privacy & Tenant", items: ["handlePrivacyRequestSla", "checkCrossBorderTransferRisk", "exportUserData", "eraseUserData", "provisionTenant", "runTenantIsolationTests", "verifyTenantApiKey"] },
];

const workflowCategories = [
  { label: "Daily Syncs", items: ["Security Hub Sync", "EDR Sync", "GitHub Security", "HRIS Directory", "IDP Directory", "Connections Monitor", "Control Test Runner", "Deadline Calendar"] },
  { label: "Weekly / Monthly", items: ["Board Report Email", "Compliance Reminders", "Evidence Reminders", "Readiness Summary", "Monthly Mgmt Report"] },
  { label: "Entity-Triggered", items: ["Auto-Remediation (Critical Risk)", "Auto-Remediation (Control Fail)", "Risk Remediation Tasks", "Control Regression Alert", "New Task Alert", "Vendor High-Risk Alert", "Slack Critical Risk", "Slack Pending Evidence"] },
  { label: "Scanners", items: ["Cert Expiry", "Evidence Expiry", "Evidence Retention", "Contract Renewal", "Vendor Contract Expiry", "Trial Expiration", "Privacy Request SLA", "SLA Breach Escalation"] },
  { label: "Recurring", items: ["Quarterly Access Recert", "Continuous Control Monitoring", "Automated Evidence Collection", "Broadcast Regulatory Update", "Risk Metrics Auto-Calc"] },
];

const connectors = [
  { name: "Gmail", icon: Mail, color: "text-rose-500 bg-rose-50 border-rose-200" },
  { name: "Slack Bot", icon: Slack, color: "text-purple-500 bg-purple-50 border-purple-200" },
  { name: "Google Drive", icon: FileCheck, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { name: "Google Calendar", icon: Calendar, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { name: "GitHub", icon: GitBranch, color: "text-slate-600 bg-slate-50 border-slate-300" },
  { name: "AWS Sec Hub", icon: Cloud, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { name: "Jira", icon: Bug, color: "text-sky-500 bg-sky-50 border-sky-200" },
];

const dataFlows = [
  { label: "Signup & Provisioning", flow: "Pricing → Register → OTP → provisionTenant → Tenant + TenantSettings created → Dashboard" },
  { label: "Billing", flow: "Pricing → Stripe Checkout → Tenant subscription tier upgraded" },
  { label: "Daily EDR Sync", flow: "Scheduled → syncEdrFindings → CrowdStrike + Defender APIs → SecurityFinding (with SLA + control linkage)" },
  { label: "Critical Risk → Kanban", flow: "Risk score ≥ 20 → Auto-Remediation workflow → autoCreateRemediationTask → ComplianceTask (48h deadline) + Slack alert" },
  { label: "Evidence Pack", flow: "Select controls/evidence → generate PDF (SHA-256 + file content hashes) → UploadFile → AuditEvidenceLedger (append-only)" },
  { label: "Cross-Org Risk", flow: "aggregateCrossOrgRisk → walks holding-company hierarchy → scoped rollup (no cross-tenant leakage)" },
  { label: "AI Control Mapping", flow: "Select framework + cloud provider → InvokeLLM → control-to-requirement mapping with confidence scores" },
  { label: "Weekly Board Report", flow: "Monday 8 AM → sendWeeklyBoardReport → PDF generated + uploaded → emailed to schedule recipients" },
  { label: "Audit Integrity", flow: "Every entity mutation → logAudit → AuditTrail (hash-chained) · Evidence upload → hashEvidenceToLedger → AuditEvidenceLedger (WORM)" },
  { label: "Regulatory Change", flow: "fetchRegulatoryIntelligence → RegulatoryChange → BroadcastRegulatoryUpdate workflow → generateRegulatoryChangeTasks" },
];

export default function Architecture() {
  return (
    <div>
      <PageHeader
        title="Platform Architecture"
        subtitle="CertiGuard GRC · RegTech — system design and data flow"
      />

      {/* Title banner */}
      <div className="mb-6 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6">
        <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/90 flex items-center justify-center shrink-0">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-white">CertiGuard GRC Platform</h2>
            <p className="text-sm text-slate-300 mt-0.5">Multi-tenant RegTech · React + Base44 BaaS · 60+ entities · 90+ backend functions · 40+ workflows · 150+ pages · 7 integrations</p>
          </div>
        </div>
      </div>

      {/* LAYER 1: Users / Entry */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 1 — Users & Access Roles</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <span key={r} className={`${NODE_BASE} bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700`}>
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 2: Frontend */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 2 — Frontend SPA (React + Tailwind + Vite)</h3>
        </div>
        <div className="space-y-3">
          {moduleGroups.map((g) => (
            <div key={g.label}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.items.map((p) => (
                  <span key={p} className={`${NODE_BASE} bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300`}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Auth Context</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Tenant Context (RLS)</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">React Query</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Radix UI / shadcn</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Recharts</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">RBAC Hooks</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Language / i18n</span>
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 3: Auth + Security */}
      <div className={LAYER_BASE + " mb-4 border-amber-200 dark:border-amber-800/50"}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 3 — Authentication & Multi-Tenant Isolation</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Email + OTP</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">12+ char policy</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Google OAuth / SSO</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">SCIM provisioning</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Tenant Isolation</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">user.data.tenant_id + RLS</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Holding-Company Hierarchy</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">parent_tenant_id rollup</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Role-Based Access</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">admin → external_auditor</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">MFA Enforcement</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Idle timeout + screen lock</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">API Key Auth</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">TenantApiKey + rate limiting</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Internal Token</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Workflow → function auth</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 4: AI & Automation */}
      <div className={LAYER_BASE + " mb-4 border-violet-200 dark:border-violet-800/50"}>
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 4 — AI & Automation Engine</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50 p-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-violet-500" /> InvokeLLM</p>
            <p className="text-[11px] text-muted-foreground mt-1">Multi-model LLM calls (Gemini, Claude, GPT) for control mapping, gap analysis, questionnaire auto-fill, and regulatory intelligence with web search context.</p>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50 p-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-violet-500" /> Automated Testing</p>
            <p className="text-[11px] text-muted-foreground mt-1">Closed-loop control testing, CSPM scans, DevSecOps pipeline checks, DLP pattern monitoring, and continuous compliance scoring.</p>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800/50 p-3">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Radar className="w-3.5 h-3.5 text-violet-500" /> SOAR / IR Playbooks</p>
            <p className="text-[11px] text-muted-foreground mt-1">Automated incident response and security orchestration playbooks with escalation chains and war-room coordination.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 5: Backend Functions */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 5 — Backend Functions (Deno / TypeScript · 90+ endpoints)</h3>
        </div>
        <div className="space-y-3">
          {functionCategories.map((cat) => (
            <div key={cat.label}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((f) => (
                  <span key={f} className={`${NODE_BASE} bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300 font-mono`}>
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LAYER 6: Workflows */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Workflow className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 6 — Automated Workflows (Scheduled + Event-Triggered · 40+)</h3>
        </div>
        <div className="space-y-3">
          {workflowCategories.map((cat) => (
            <div key={cat.label}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{cat.label}</p>
              <div className="flex flex-wrap gap-2">
                {cat.items.map((w) => (
                  <span key={w} className={`${NODE_BASE} bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300`}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 7: Data */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 7 — Data Model (60+ Entities · RLS-Scoped)</h3>
        </div>
        <div className="space-y-3">
          {entityDomains.map((dom) => (
            <div key={dom.label}>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{dom.label}</p>
              <div className="flex flex-wrap gap-2">
                {dom.items.map((e) => (
                  <span key={e} className={`${NODE_BASE} bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300`}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><FileLock className="w-3.5 h-3.5" /> Audit Evidence Ledger</p>
            <p className="text-muted-foreground">Append-only WORM ledger · SHA-256 file hashes · tamper-evident evidence packs</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Audit Trail</p>
            <p className="text-muted-foreground">Hash-chain integrity · every mutation logged · immutable</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Multi-Tenant Hierarchy</p>
            <p className="text-muted-foreground">Holding company → subsidiaries · cross-org risk rollup · scoped aggregation</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> SADC Regulatory</p>
            <p className="text-muted-foreground">POPIA, GDPR, King IV, SADC frameworks · cross-border data sovereignty</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center py-1"><ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" /></div>

      {/* LAYER 8: Integrations */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Network className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 8 — External Integrations & Connectors</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {connectors.map((c) => (
            <div key={c.name} className={`flex flex-col items-center gap-2 rounded-xl p-3 border ${c.color}`}>
              <c.icon className="w-6 h-6" />
              <span className="text-xs font-medium">{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data Flow Legend */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900/50 dark:to-emerald-900/20 rounded-2xl border border-border p-5">
        <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" /> Key Data Flows
        </h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          {dataFlows.map((df) => (
            <p key={df.label}>
              <span className="font-semibold text-foreground">{df.label}:</span> {df.flow}
            </p>
          ))}
        </div>
      </div>

      {/* Architecture Principles */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <Scale className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm font-semibold text-foreground">Tenant Isolation by Design</p>
          <p className="text-xs text-muted-foreground mt-1">Every entity carries tenant_id, enforced via RLS. Holding-company hierarchy enables cross-org rollup without leaking across groups.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Layers className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm font-semibold text-foreground">Evidence Integrity</p>
          <p className="text-xs text-muted-foreground mt-1">Append-only audit ledger with SHA-256 file hashing and tamper-evident evidence packs. WORM-style RLS blocks all edits and deletes.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Brain className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-sm font-semibold text-foreground">AI-Native Compliance</p>
          <p className="text-xs text-muted-foreground mt-1">LLM-powered control mapping, gap analysis, and regulatory intelligence. Automated testing and SOAR playbooks reduce manual audit overhead.</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/" className="text-xs text-primary hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );
}