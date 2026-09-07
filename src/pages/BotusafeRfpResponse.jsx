import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Shield, BarChart3, FileText, Users, Server, Clock, Award, TrendingUp, AlertTriangle, Lock, Database, Cloud, Smartphone, Mail, Phone, Calendar, Building2 } from "lucide-react";

const coverageData = [
  {
    requirement: "Enterprise Risk Register & Configurable Scoring",
    icon: TrendingUp,
    status: "fully_covered",
    capabilities: [
      "Configurable risk register with qualitative (5×5 matrix) and quantitative (FAIR/Monte Carlo) scoring models",
      "Custom RiskScoringModel entity — define weights for likelihood, impact, velocity, control effectiveness, and financial impact",
      "Risk appetite and tolerance thresholds with automatic band classification (within appetite / tolerance zone / above appetite / unacceptable)",
      "KRI tracking with breach detection and automated alerts (KpiKri module)",
      "Risk treatment plans: mitigate, accept, transfer, avoid — with formal acceptance signatures and expiry tracking",
      "Risk ownership, escalation workflows, and COSO ERM residual risk calculation",
      "Risk velocity scoring for emerging and rapidly materializing threats"
    ],
    modules: ["Risks", "Risk Scoring Models", "Risk Appetite Heatmap", "KPI/KRI Dashboard", "Monte Carlo Forecast", "FAIR Benchmarks"]
  },
  {
    requirement: "Compliance Obligations, Policies & Evidence Management",
    icon: FileText,
    status: "fully_covered",
    capabilities: [
      "Multi-framework compliance registers: SOC 2, ISO 27001, NIST CSF, POPIA, GDPR, King V, SADC frameworks",
      "Policy lifecycle management with version control, approval workflows, and attestations",
      "Automated evidence collection with versioning, expiry tracking, and integrity verification (blockchain-hashed audit ledger)",
      "Incident and breach management with response playbooks and timeline tracking",
      "Compliance tasks with reminders, due dates, priority, and assignment tracking",
      "Regulatory change monitoring with AI-powered impact assessment and action plan generation",
      "ROPA (Records of Processing Activities) for privacy compliance"
    ],
    modules: ["Frameworks", "Policies", "Evidence Manager", "Incidents", "Tasks & Reminders", "Regulatory Changes", "ROPA", "DPIA"]
  },
  {
    requirement: "Internal Audit Planning, Findings & Assurance Reporting",
    icon: Shield,
    status: "fully_covered",
    capabilities: [
      "Audit planning with scope management, auditor portals, and evidence request workflows",
      "Audit findings tracking with severity, recommendations, and remediation action plans",
      "Automated audit checklists and control test execution",
      "Assurance reporting with drill-down from board level to individual control evidence",
      "Auditor link sharing for external auditors with scoped, time-limited access",
      "Audit evidence packs with cryptographic integrity verification",
      "Penetration test tracking with finding remediation and verification"
    ],
    modules: ["Audits", "Audit Findings", "Audit Checklists", "Control Tests", "Auditor Portal", "Pen Tests", "Secure Evidence Pack"]
  },
  {
    requirement: "Dashboards & Board/Management Reporting",
    icon: BarChart3,
    status: "fully_covered",
    capabilities: [
      "Executive dashboard with compliance score, risk heatmap, and maturity tracking",
      "Board-ready reports with one-click generation (Board Report, Executive Report, Board Pack Generator)",
      "Risk heat maps (5×5 matrix) with drill-down to individual risks and controls",
      "Compliance trend charts showing score progression over time",
      "Overdue action tracking with automated escalation and notification",
      "Custom dashboard builder for role-specific views",
      "Management reports with scheduled delivery and stakeholder summaries",
      "Drill-down from KPI to underlying control, risk, or evidence"
    ],
    modules: ["Dashboard", "Board Report", "Executive Report", "Board Pack Generator", "Risk Heatmap", "Custom Dashboard", "Management Reports", "One-Click Report"]
  },
  {
    requirement: "Role-Based Access, Workflows, Audit Trail & Configurable Fields",
    icon: Users,
    status: "fully_covered",
    capabilities: [
      "Granular role-based access control: admin, compliance officer, risk manager, auditor, HR, department head, external auditor",
      "Workflow engine with approvals, conditions, branching, and multi-step processes",
      "Immutable audit trail with cryptographic chain hashing (blockchain-style) — tamper-evident logging",
      "Real-time notifications and configurable notification preferences",
      "Document attachments on controls, risks, evidence, and policies",
      "Custom fields on controls and risks (text, number, date, select, boolean) — configurable per tenant",
      "Comment threads with @mentions on any entity",
      "Multi-tenant isolation with strict data segregation"
    ],
    modules: ["User Management", "GRC Workflow Engine", "Audit Trail", "Notifications", "Custom Dashboard", "Comments"]
  },
  {
    requirement: "Security, SSO/MFA, Encryption, Backup/DR & API Integration",
    icon: Lock,
    status: "fully_covered",
    capabilities: [
      "SaaS deployment with SSO (SAML/OIDC) via Google, Microsoft, and custom identity providers",
      "MFA enforcement with configurable policies and screen lock",
      "Encryption at rest and in transit (TLS 1.2+)",
      "Data export and API access with tenant-scoped API keys",
      "Webhook management for event-driven integrations",
      "SCIM endpoint for automated user provisioning",
      "Mobile-responsive web access (iOS/Android publishable from same codebase)",
      "Data residency controls and configurable retention schedules",
      "Backup and disaster recovery with BCDR plan tracking",
      "DPO (Data Protection Officer) command center for privacy governance"
    ],
    modules: ["SSO Settings", "Security Center", "API Docs", "Webhooks", "Mobile Hub", "Data Residency", "BCDR Tracker", "DPO Command Center", "Data Retention"]
  }
];

const additionalModules = [
  { name: "Third-Party / Vendor Risk Management", description: "Vendor onboarding, due diligence, risk scoring, assessment questionnaires, incident monitoring, subprocessor tracking, and offboarding workflows", icon: Building2 },
  { name: "Business Continuity Management (BCM)", description: "BCDR plan tracking, tabletop simulation exercises, and vendor business impact assessments", icon: Shield },
  { name: "Cyber GRC", description: "Vulnerability management, EDR dashboard, cloud posture monitoring (CSPM), threat detection, SIEM webhooks, SOAR playbooks, and DevSecOps pipeline scanning", icon: Lock },
  { name: "ESG Reporting", description: "Environmental, social, and governance metric tracking with benchmarking against industry peers", icon: TrendingUp },
  { name: "AI Governance", description: "AI activity logging, AI auditor portal, AI-powered control mapping, and AI risk cross-mapping across frameworks", icon: Award },
  { name: "Regulatory Intelligence", description: "Automated regulatory change monitoring for SADC, African Union, and global frameworks with AI impact assessment", icon: FileText },
  { name: "Physical Security Controls", description: "Badge access, visitor management, CCTV surveillance, data center access, and environmental control tracking", icon: Server },
  { name: "Privileged Access Management (PAM)", description: "Just-in-time elevation, session recording, password vaulting, and credential rotation tracking", icon: Lock },
  { name: "Data Classification & Protection", description: "Data classification register, data flow mapping, data protection rules, and DLP monitoring", icon: Database },
  { name: "Whistleblower Portal", description: "Anonymous reporting channel with case management and investigation tracking", icon: AlertTriangle },
];

const evaluationCriteria = [
  { criterion: "Fit & Functionality", weight: "30%", ourScore: "Exceptional — all minimum outcomes met plus 10+ additional modules at no extra cost" },
  { criterion: "Security & Architecture", weight: "20%", ourScore: "Multi-tenant isolation, blockchain audit trail, SSO/MFA, encryption, data residency controls" },
  { criterion: "Implementation/Support", weight: "15%", ourScore: "Guided onboarding wizard, autopilot setup, training materials, and ongoing support included" },
  { criterion: "Experience/References", weight: "10%", ourScore: "Built for African regulatory landscape (POPIA, King V, SADC) with global framework coverage" },
  { criterion: "Demo/Usability", weight: "10%", ourScore: "Live interactive demo available — all modules functional and production-ready" },
  { criterion: "Commercial Value", weight: "15%", ourScore: "Transparent tiered pricing (Starter / Professional / Enterprise) with no hidden module fees" },
];

const pricingTiers = [
  {
    name: "Starter",
    description: "For small teams getting started with GRC",
    features: ["Up to 2 frameworks", "Up to 5 users", "Core risk & compliance modules", "Standard dashboards", "Email support"],
    implementation: "Self-service guided onboarding included",
    recurring: "Contact for pricing",
    badge: "Entry"
  },
  {
    name: "Professional",
    description: "For growing organizations with active compliance programs",
    features: ["Up to 5 frameworks", "Up to 25 users", "All core + advanced modules", "Custom dashboards & reports", "Vendor risk management", "Audit portal", "Priority support", "API access"],
    implementation: "Guided implementation + data migration included",
    recurring: "Contact for pricing",
    badge: "Recommended",
    highlighted: true
  },
  {
    name: "Enterprise",
    description: "For large organizations with complex multi-entity needs",
    features: ["Unlimited frameworks", "Unlimited users", "All modules included", "White-label branding", "Multi-tenant hierarchy", "SSO + SCIM", "Dedicated support", "Custom integrations", "Data residency controls"],
    implementation: "Full implementation, migration & training included",
    recurring: "Contact for pricing",
    badge: "Full Suite"
  }
];

const implementationTimeline = [
  { phase: "Week 1", title: "Discovery & Configuration", activities: ["Requirements workshop", "Tenant setup & SSO configuration", "Risk/compliance methodology mapping", "User roles & access configuration"] },
  { phase: "Week 2", title: "Data Migration & Framework Setup", activities: ["Migrate existing risk registers", "Import compliance frameworks", "Policy library configuration", "Custom field setup"] },
  { phase: "Week 3", title: "Training & Handover", activities: ["Administrator training (2 sessions)", "End-user training (2 sessions)", "Dashboard & report configuration", "Workflow & notification setup"] },
  { phase: "Week 4", title: "Go-Live & Support", activities: ["Production go-live", "Post-go-live support (2 weeks)", "Admin handover documentation", "30-day health check"] }
];

export default function BotusafeRfpResponse() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10" />
            <span className="text-2xl font-heading font-bold">CertiGuard GRC</span>
          </div>
          <h1 className="text-3xl font-heading font-bold mb-2">Proposal Response — BOTUSAFE INVESTMENTS (PTY) LTD</h1>
          <p className="text-lg opacity-90 mb-4">Governance, Risk, Compliance, Audit and Executive Reporting Platform</p>
          <div className="flex flex-wrap gap-4 text-sm opacity-80">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Response Date: September 2026</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Demo: Within 5 working days of request</span>
            <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Provider: Ethical Edge GRC Consulting</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-0 z-10 bg-card border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { key: "overview", label: "1. Product & Deployment" },
              { key: "coverage", label: "2. Functional Coverage" },
              { key: "security", label: "3. Security & Hosting" },
              { key: "implementation", label: "4. Implementation & Support" },
              { key: "modules", label: "5. Additional Modules" },
              { key: "pricing", label: "6. Pricing & Timeline" },
              { key: "evaluation", label: "7. Evaluation Response" },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="w-5 h-5 text-primary" /> Product / Platform Proposed & Deployment Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Platform: CertiGuard GRC</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    CertiGuard is an AI-native Governance, Risk, and Compliance platform designed for the African regulatory
                    landscape while meeting global standards. It provides an integrated suite covering enterprise risk management,
                    compliance, internal audit, vendor risk, cybersecurity GRC, privacy (POPIA/GDPR), and executive reporting —
                    all within a single multi-tenant, role-based, secure SaaS environment.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Deployment Model</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Cloud className="w-5 h-5 text-primary" />
                        <span className="font-medium">Primary: Secure SaaS</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Cloud-hosted, multi-tenant SaaS with per-tenant data isolation. Accessible via web browser and mobile. No infrastructure required from BOTUSAFE.</p>
                    </div>
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-5 h-5 text-primary" />
                        <span className="font-medium">Optional: Dedicated Instance</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Single-tenant dedicated deployment available for Enterprise tier with data residency controls and custom integration requirements.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Key Differentiators</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border">
                      <Award className="w-5 h-5 text-primary mb-1" />
                      <p className="text-sm font-medium">AI-Native</p>
                      <p className="text-xs text-muted-foreground">AI-powered control mapping, risk forecasting, gap analysis, and remediation planning</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <Shield className="w-5 h-5 text-primary mb-1" />
                      <p className="text-sm font-medium">African Regulatory Focus</p>
                      <p className="text-xs text-muted-foreground">POPIA, King V, SADC frameworks built-in alongside SOC 2, ISO 27001, NIST</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <BarChart3 className="w-5 h-5 text-primary mb-1" />
                      <p className="text-sm font-medium">Full GRC Stack</p>
                      <p className="text-xs text-muted-foreground">Risk, compliance, audit, vendor, cyber, privacy, ESG — one platform, one license</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relevant Clients / References</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  CertiGuard is designed and built by Ethical Edge GRC Consulting, a specialist GRC advisory firm. The platform
                  is purpose-built for organizations operating under both African regulatory frameworks (POPIA, King V, SADC)
                  and international standards (SOC 2, ISO 27001, NIST CSF, GDPR). References from advisory engagements and
                  platform deployments are available upon request following NDA execution.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">GRC Advisory Experience</Badge>
                  <Badge variant="secondary">ISO 27001 Implementation</Badge>
                  <Badge variant="secondary">SOC 2 Readiness</Badge>
                  <Badge variant="secondary">POPIA Compliance</Badge>
                  <Badge variant="secondary">King V Governance</Badge>
                  <Badge variant="secondary">SADC Regulatory Expertise</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Functional Coverage Tab */}
        {activeTab === "coverage" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-heading font-bold">Functional Coverage — Minimum Outcomes</h2>
              <Badge className="bg-success text-success-foreground">100% Coverage</Badge>
            </div>
            {coverageData.map((item, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{item.requirement}</CardTitle>
                        <CardDescription className="mt-1">All minimum functional outcomes fully addressed</CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-success text-success-foreground flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Fully Covered
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Capabilities Delivered:</h5>
                      <ul className="space-y-1.5">
                        {item.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                            <span>{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold mb-2 text-muted-foreground">Platform Modules:</h5>
                      <div className="flex flex-wrap gap-2">
                        {item.modules.map((mod, i) => (
                          <Badge key={i} variant="outline">{mod}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Security, Data Hosting/Residency & Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Security Architecture</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[
                      { icon: Lock, title: "Authentication & Access", points: ["SSO via SAML/OIDC (Google, Microsoft, custom IdP)", "Multi-factor authentication (MFA) enforcement", "Role-based access control (8+ roles)", "Screen lock with idle timeout", "SCIM-based automated user provisioning"] },
                      { icon: Database, title: "Data Protection", points: ["Encryption at rest and in transit (TLS 1.2+)", "Multi-tenant data isolation with RLS enforcement", "Cryptographic audit trail (blockchain-style hashing)", "Data export and erasure capabilities (GDPR/POPIA)", "Configurable data retention schedules"] },
                      { icon: Shield, title: "Platform Security", points: ["Immutable, tamper-evident audit logging", "Tenant isolation testing and validation", "PAM (Privileged Access Management) module", "Data classification register", "DLP monitoring capabilities"] },
                      { icon: Server, title: "Infrastructure & DR", points: ["Cloud-hosted with high availability", "Automated backup and recovery", "BCDR plan tracking module", "Data residency configuration options", "Performance monitoring dashboard"] },
                    ].map((section, i) => (
                      <div key={i} className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          <section.icon className="w-5 h-5 text-primary" />
                          <h5 className="font-medium">{section.title}</h5>
                        </div>
                        <ul className="space-y-1.5">
                          {section.points.map((p, j) => (
                            <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Data Hosting & Residency</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    CertiGuard is deployed as a cloud-hosted SaaS platform. Data is stored with encryption at rest in
                    compliant cloud infrastructure. For Enterprise tier clients, dedicated instances with specific data
                    residency requirements can be configured. The platform includes a Data Residency module and Data
                    Retention Schedule manager to ensure compliance with POPIA cross-border transfer requirements and
                    regulatory retention obligations.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Integrations & API</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    {[
                      "REST API with tenant-scoped API keys",
                      "Webhook management for event automation",
                      "Google Workspace (Calendar, Drive, Gmail)",
                      "Slack notifications & alerts",
                      "Microsoft Defender / EDR integration",
                      "Jira ticket synchronization",
                      "GitHub security scanning",
                      "HRIS directory sync",
                      "SCIM endpoint for IdP provisioning",
                      "DPO Pay payment integration",
                      "CSV/Excel bulk import & export",
                      "Custom integration via backend functions",
                    ].map((integ, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border">
                        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>{integ}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Mobile & Web Access</h4>
                  <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                    <Smartphone className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      The platform is fully responsive and accessible via any modern web browser. The same codebase can be
                      published as native iOS and Android applications, providing full mobile access to dashboards, tasks,
                      approvals, and notifications on the go.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Implementation Tab */}
        {activeTab === "implementation" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Implementation, Migration, Training & Support</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3">Implementation Approach</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    Our implementation methodology is structured over 4 weeks with a guided onboarding wizard, autopilot
                    configuration, and hands-on support. We configure the platform to BOTUSAFE's specific risk and compliance
                    methodology, migrate existing registers, and provide comprehensive training before go-live.
                  </p>
                  <div className="space-y-3">
                    {implementationTimeline.map((phase, i) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                            {i + 1}
                          </div>
                          {i < implementationTimeline.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2"></div>}
                        </div>
                        <div className="pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{phase.phase}</Badge>
                            <h5 className="font-medium">{phase.title}</h5>
                          </div>
                          <ul className="space-y-1 mt-2">
                            {phase.activities.map((a, j) => (
                              <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                                <span>{a}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h5 className="font-medium mb-2 flex items-center gap-2"><Database className="w-4 h-4 text-primary" /> Data Migration</h5>
                    <p className="text-sm text-muted-foreground">
                      We migrate existing risk registers, compliance frameworks, policies, and control libraries from
                      spreadsheets or legacy systems via bulk CSV/Excel import. Framework templates for SOC 2, ISO 27001,
                      NIST, and POPIA are pre-loaded and can be customized to BOTUSAFE's methodology.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h5 className="font-medium mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Training & Handover</h5>
                    <p className="text-sm text-muted-foreground">
                      Administrator training (2 sessions), end-user training (2 sessions), and comprehensive admin handover
                      documentation are included. The platform includes an in-app user guide, GRC education module, and
                      practical testing guide for self-service onboarding of new users.
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">SLA & Support Model</h4>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm font-medium mb-1">Standard Support</p>
                      <p className="text-xs text-muted-foreground">Email support, 48-hour response, included in all tiers</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm font-medium mb-1">Priority Support</p>
                      <p className="text-xs text-muted-foreground">Email + phone, 24-hour response, Professional tier</p>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <p className="text-sm font-medium mb-1">Dedicated Support</p>
                      <p className="text-xs text-muted-foreground">Dedicated CSM, 4-hour response, Enterprise tier</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Upgrade Policy</h4>
                  <p className="text-sm text-muted-foreground">
                    Platform updates and new feature releases are included in all subscription tiers at no additional cost.
                    Major releases are deployed with 30-day advance notice. The platform maintains backward compatibility
                    and provides release notes for all updates. Enterprise tier clients can request scheduled maintenance
                    windows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Additional Modules Tab */}
        {activeTab === "modules" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Additional Modules (Value-Add, Included)</CardTitle>
                <CardDescription>
                  The following modules are included in the platform at no additional cost, providing capabilities beyond
                  the minimum RFP requirements. These are identified as optional value-add items per the RFP.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {additionalModules.map((mod, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                          <mod.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h5 className="font-medium mb-1">{mod.name}</h5>
                          <p className="text-sm text-muted-foreground">{mod.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> All additional modules are included in Professional and
                    Enterprise tiers. BOTUSAFE may activate modules as needed — no separate licensing required. This
                    represents significant commercial value versus competitors who charge per-module.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pricing Tab */}
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pricing: Implementation + Recurring Licences/Support</CardTitle>
                <CardDescription>
                  Transparent tiered pricing with no hidden module fees. All GRC core modules included in every tier.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {pricingTiers.map((tier, i) => (
                    <div
                      key={i}
                      className={`p-5 rounded-lg border-2 relative ${
                        tier.highlighted ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      {tier.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className={tier.highlighted ? "bg-primary text-primary-foreground" : ""}>{tier.badge}</Badge>
                        </div>
                      )}
                      <h4 className="font-heading font-bold text-lg mt-2">{tier.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
                      <div className="space-y-2 mb-4">
                        {tier.features.map((f, j) => (
                          <div key={j} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Implementation:</p>
                        <p className="text-sm">{tier.implementation}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-2">Recurring:</p>
                        <p className="text-sm font-semibold">{tier.recurring}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 rounded-lg bg-muted/30 border">
                  <h5 className="font-medium mb-2">Assumptions & Exclusions</h5>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Pricing is quoted in USD and billed via DPO Pay (secure payment gateway)</li>
                    <li>• Implementation timeline assumes data availability and stakeholder availability for workshops</li>
                    <li>• Custom integrations beyond the standard set are available at an additional professional services rate</li>
                    <li>• On-premise deployment is available for Enterprise tier — quoted separately based on infrastructure requirements</li>
                    <li>• Training is delivered remotely (in-person training available at additional cost for travel)</li>
                    <li>• All prices exclude applicable taxes (VAT where applicable)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Earliest Demo & Implementation Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <h5 className="font-medium mb-2">Earliest Demo</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Available within 5 working days of request. Demo includes:
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> Live platform walkthrough (60–90 min)</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> Risk register & scoring demonstration</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> Dashboard & board reporting showcase</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> Q&A with GRC advisory team</li>
                      <li className="flex items-start gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> Sandbox access for hands-on evaluation</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h5 className="font-medium mb-2">Implementation Timeline</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Discovery & Config</span><Badge variant="outline">Week 1</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Data Migration & Framework Setup</span><Badge variant="outline">Week 2</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Training & Handover</span><Badge variant="outline">Week 3</Badge></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Go-Live & Support</span><Badge variant="outline">Week 4</Badge></div>
                      <div className="pt-2 border-t font-medium">Total: 4 weeks to go-live</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Evaluation Tab */}
        {activeTab === "evaluation" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Criteria Response</CardTitle>
                <CardDescription>
                  Evaluation: Fit & functionality 30% | Security & architecture 20% | Implementation/support 15% |
                  Experience/references 10% | Demo/usability 10% | Commercial value 15%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {evaluationCriteria.map((item, i) => (
                    <div key={i} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-primary text-primary-foreground">{item.weight}</Badge>
                          <h5 className="font-medium">{item.criterion}</h5>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground ml-1">{item.ourScore}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-primary">Summary Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  CertiGuard GRC meets 100% of BOTUSAFE's minimum functional outcomes and exceeds them with 10+ additional
                  modules included at no extra cost. The platform is purpose-built for the African regulatory environment
                  (POPIA, King V, SADC) while maintaining full international framework coverage (SOC 2, ISO 27001, NIST).
                  With AI-native capabilities, blockchain-secured audit trails, configurable risk scoring, and a 4-week
                  implementation timeline, CertiGuard delivers exceptional commercial value and functionality fit.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We are available for a live demonstration within 5 working days and can commence implementation
                  immediately upon agreement. We welcome the opportunity to refine the scope following demonstrations
                  and are flexible in accommodating BOTUSAFE's specific methodology and requirements.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    <span>Ethical Edge GRC Consulting</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>Available upon request</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Demo within 5 working days</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}