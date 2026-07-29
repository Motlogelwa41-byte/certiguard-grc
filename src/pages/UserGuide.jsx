import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Rocket, ShieldCheck, FileCheck, Paperclip, Award, AlertTriangle, Building2,
  Lock, BarChart3, Zap, CreditCard, Users, ListChecks, BookOpen, ChevronRight,
  Workflow, Mail, Plug, Bell, ScrollText, Target
} from "lucide-react";
import SampleWalkthrough from "@/components/user-guide/SampleWalkthrough";

const ROLES = [
  { role: "admin", desc: "Full access — manages the tenant, users, billing, security, and all modules." },
  { role: "compliance_officer", desc: "Runs the compliance program — frameworks, controls, evidence, policies, certifications, audits." },
  { role: "risk_manager", desc: "Owns the risk register, quantification, appetite, heatmaps, and remediation." },
  { role: "auditor / external_auditor", desc: "Observation-only access to the Auditor Portal, certifications, pen tests, and scoped evidence." },
  { role: "user", desc: "Limited access — dashboard, policies, tasks, training, calendar, and the AI assistant." },
];

const PLAN_TIERS = [
  { tier: "Trial", users: 3, frameworks: 2, note: "14-day full access to evaluate the platform." },
  { tier: "Starter", users: 10, frameworks: 5, note: "For small teams getting systematic about compliance." },
  { tier: "Professional", users: 100, frameworks: 20, note: "Full automation, AI, and reporting for growing orgs." },
  { tier: "Enterprise", users: "Unlimited", frameworks: "Unlimited", note: "Custom limits, SSO, and dedicated support." },
];

const SECTIONS = [
  { id: "start", icon: Rocket, title: "1. Getting Started", to: null },
  { id: "setup", icon: Plug, title: "2. Setup & Connections", to: "/guided-onboarding" },
  { id: "lifecycle", icon: Workflow, title: "3. The Compliance Lifecycle", to: null },
  { id: "modules", icon: ListChecks, title: "4. Core Modules", to: null },
  { id: "risk", icon: Target, title: "5. Risk Management", to: "/risks" },
  { id: "vendors", icon: Building2, title: "6. Vendors & Third Parties", to: "/vendors" },
  { id: "privacy", icon: Lock, title: "7. Privacy & Governance", to: "/privacy-requests" },
  { id: "automation", icon: Zap, title: "8. Automation & Integrations", to: "/ai-hub" },
  { id: "reporting", icon: BarChart3, title: "9. Reporting", to: "/reports" },
  { id: "security", icon: ShieldCheck, title: "10. Security & Multi-Tenancy", to: "/security" },
  { id: "billing", icon: CreditCard, title: "11. Billing & Plans", to: "/billing" },
  { id: "sample", icon: Building2, title: "12. Sample Company Walkthrough", to: null },
];

export default function UserGuide() {
  const [active, setActive] = useState("start");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="CertiGuard GRC — User Guide"
        subtitle="Everything you need to set up, run, and get value from your compliance program."
        actions={<Badge variant="secondary" className="gap-1"><BookOpen className="w-3.5 h-3.5" /> v1.0</Badge>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sticky Table of Contents */}
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active === s.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <s.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-10 min-w-0">
          {/* 1. Getting Started */}
          <Section id="start" icon={Rocket} title="Getting Started">
            <p>When you first sign up, CertiGuard automatically provisions a <strong>14-day trial workspace</strong> (a "tenant") for your organisation. This gives you full access to explore every module before committing to a plan.</p>
            <Callout title="Your first 5 steps">
              <ol className="list-decimal pl-5 space-y-1">
                <li>Sign in — you'll land on the <strong>Dashboard</strong>, your compliance command center.</li>
                <li>Complete <Link className="text-primary underline" to="/guided-onboarding">Guided Onboarding</Link> to set your industry, size, and first frameworks.</li>
                <li>Invite your team under <Link className="text-primary underline" to="/users">Users</Link> (each plan has a user cap).</li>
                <li>Connect your systems under <Link className="text-primary underline" to="/connections">Connections</Link> so evidence is collected automatically.</li>
                <li>Pick your first framework (e.g. SOC 2 or ISO 27001) and start mapping controls.</li>
              </ol>
            </Callout>
            <p className="mb-2">Each user is assigned a <strong>role</strong> that determines what they can see and do. Roles drive both the sidebar navigation and what data each user can access.</p>
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr><th className="text-left px-4 py-2 font-semibold">Role</th><th className="text-left px-4 py-2 font-semibold">What they do</th></tr>
                </thead>
                <tbody>
                  {ROLES.map((r) => (
                    <tr key={r.role} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-primary whitespace-nowrap">{r.role}</td>
                      <td className="px-4 py-2 text-muted-foreground">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* 2. Setup */}
          <Section id="setup" icon={Plug} title="Setup & Connections">
            <p><strong>Guided Onboarding</strong> walks you through configuring your organisation profile, choosing relevant frameworks, and connecting your data sources.</p>
            <p><strong>Connections</strong> are how CertiGuard collects evidence automatically. Instead of manually screenshotting configurations each month, you connect your cloud, identity, code, and monitoring systems once, and the platform pulls evidence on a schedule.</p>
            <Callout title="Supported connection types">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {["AWS", "GCP", "Azure", "GitHub", "Google Workspace", "Google Drive", "Datadog", "BambooHR", "Jamf / Kandji", "Slack", "CrowdStrike", "Splunk", "Jira"].map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 text-xs rounded-md bg-muted px-2.5 py-1.5"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{c}</span>
                ))}
              </div>
            </Callout>
            <p>Each connection monitors specific controls, collects evidence on an hourly/daily/weekly cadence, and reports a health status. You can also bring your own SSO via <Link className="text-primary underline" to="/sso">SSO & Directory</Link> (SAML + SCIM provisioning).</p>
          </Section>

          {/* 3. Lifecycle */}
          <Section id="lifecycle" icon={Workflow} title="The Compliance Lifecycle">
            <p>This is the heart of CertiGuard — a closed loop that takes you from "what do we need to do?" to "we're certified" and keeps you there continuously:</p>
            <div className="space-y-3">
              <Step n={1} icon={ShieldCheck} title="Choose Frameworks" to="/frameworks">
                Select the standards you're pursuing (SOC 2, ISO 27001, PCI DSS, GDPR, NIST CSF, or SADC regional frameworks). Each tracks a readiness score and total vs. passing controls.
              </Step>
              <Step n={2} icon={FileCheck} title="Define & Map Controls" to="/controls">
                Create or bulk-import the security controls that satisfy each framework. Map one control to multiple frameworks so you don't test twice. Assign owners and set test frequency.
              </Step>
              <Step n={3} icon={ListChecks} title="Identify Gaps" to="/gap-analysis">
                See which controls are missing or failing against a framework's requirements. Use the Framework Map to visualise coverage and the Cross-Map to reuse controls across standards.
              </Step>
              <Step n={4} icon={Paperclip} title="Collect Evidence" to="/evidence">
                Attach screenshots, documents, configs, and logs that prove each control is operating. Evidence flows through a review workflow: <em>pending → approved / rejected → expiry-tracked</em>. You can bulk-upload or have it collected automatically by your connections.
              </Step>
              <Step n={5} icon={Zap} title="Automate & Remediate" to="/control-tests">
                Scheduled control tests re-run and re-score controls automatically. Failing controls trigger <strong>Closed-Loop Remediation</strong> — auto-generated tasks that re-test the control until it passes.
              </Step>
              <Step n={6} icon={Award} title="Audit & Certify" to="/certifications">
                Track the full certification lifecycle (planned → gap assessment → implementation → audit → remediation → certified → renewal). Give external auditors a secure, tokenised link to review scoped evidence read-only.
              </Step>
              <Step n={7} icon={BarChart3} title="Report" to="/board-report">
                Generate board-ready PDFs, executive risk summaries, and audit-readiness reports — delivered on demand or on a schedule.
              </Step>
            </div>
          </Section>

          {/* 4. Modules */}
          <Section id="modules" icon={ListChecks} title="Core Modules — Quick Reference">
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: ShieldCheck, t: "Frameworks", d: "Standards you're pursuing, with readiness scores.", to: "/frameworks" },
                { icon: FileCheck, t: "Controls", d: "Security controls satisfying each framework; bulk-import via CSV.", to: "/controls" },
                { icon: Paperclip, t: "Evidence", d: "Proof of control operation, with review + expiry tracking.", to: "/evidence" },
                { icon: FileCheck, t: "Policies", d: "Policy authoring with version history, approvals & acknowledgments.", to: "/policies" },
                { icon: ListChecks, t: "Control Tests", d: "Scheduled automated tests that re-score controls.", to: "/control-tests" },
                { icon: ShieldCheck, t: "Auditor Portal", d: "Secure, scoped access for external auditors.", to: "/auditor-portal" },
                { icon: Award, t: "Certifications", d: "Full certification lifecycle & milestone tracking.", to: "/certifications" },
                { icon: Zap, t: "AI Hub", d: "AI assistant, control mapper, questionnaire auto-fill, AI auditor.", to: "/ai-hub" },
                { icon: ListChecks, t: "Tasks", d: "Remediation & evidence-collection tasks, with reminders.", to: "/tasks" },
                { icon: AlertTriangle, t: "Incidents", d: "Security incident logging with escalation chains & MTTR/MTTC.", to: "/incidents" },
              ].map((m) => (
                <Link key={m.t} to={m.to} className="group">
                  <Card className="h-full hover:border-primary/40 hover:shadow-sm transition-all">
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <m.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm flex items-center gap-1">{m.t}<ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" /></p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.d}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </Section>

          {/* 5. Risk */}
          <Section id="risk" icon={Target} title="Risk Management">
            <p>CertiGuard treats risk as a continuous, quantified discipline — not an annual spreadsheet exercise.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Risk Register</strong> — log risks with likelihood × impact scoring, owners, mitigation plans, and linked controls.</li>
              <li><strong>Risk Heatmap & Appetite Heatmap</strong> — visualise your risk landscape against defined appetite/tolerance thresholds. Risks are auto-classified into bands: <em>within appetite, tolerance zone, above appetite, unacceptable</em>.</li>
              <li><strong>Formal Risk Acceptance</strong> — risks above tolerance require a typed signature, justifier, and expiry date — creating an auditable sign-off trail.</li>
              <li><strong>Risk Quantification (FAIR-style)</strong> — model loss event frequency, primary/secondary loss magnitude, and Annualised Loss Expectancy (ALE) in ZAR.</li>
              <li><strong>Framework Cross-Map</strong> — see which controls mitigate which risks across frameworks.</li>
              <li><strong>Automated Remediation</strong> — risks exceeding appetite auto-generate remediation tasks with owners and deadlines.</li>
            </ul>
          </Section>

          {/* 6. Vendors */}
          <Section id="vendors" icon={Building2} title="Vendors & Third Parties">
            <p>Manage the full third-party risk lifecycle — onboarding through assessment to secure offboarding.</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Vendors</strong> — register vendors with risk levels, data access, and compliance attestations (SOC 2, ISO 27001, GDPR).</li>
              <li><strong>Vendor Assessments</strong> — send security questionnaires and track responses; critical findings auto-escalate.</li>
              <li><strong>Vendor Scorecard</strong> — aggregated risk view across your vendor portfolio.</li>
              <li><strong>Offboarding</strong> — a formal checklist: access revoked, credentials revoked, data returned/destroyed, with confirmation flags.</li>
              <li><strong>Contract Expiry</strong> — automatically scanned so renewals are never missed.</li>
            </ul>
          </Section>

          {/* 7. Privacy */}
          <Section id="privacy" icon={Lock} title="Privacy & Governance">
            <p>Built-in privacy program management for GDPR / POPIA-style obligations:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Privacy Requests (DSARs)</strong> — track subject access, erasure, portability, and objection requests with statutory SLA countdowns and breach escalation.</li>
              <li><strong>ROPA</strong> — Record of Processing Activities.</li>
              <li><strong>DPIA</strong> — Data Protection Impact Assessments with FAIR analysis.</li>
              <li><strong>Audit Trail & Activity Log</strong> — a tamper-evident, append-only record of every significant action (more on this in Security).</li>
              <li><strong>People Compliance</strong> — track SOC 2 personnel controls (training, background checks, acknowledgments).</li>
            </ul>
          </Section>

          {/* 8. Automation */}
          <Section id="automation" icon={Zap} title="Automation & Integrations">
            <p>This is where CertiGuard earns its "continuous" label. Scheduled workflows run in the background so compliance never goes stale:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: Mail, t: "Evidence-request emails", d: "Sends due/overdue evidence requests; owners reply with attachments and they're auto-ingested." },
                { icon: Paperclip, t: "Evidence-expiry scanning", d: "Flags evidence expiring within 60 days so it's refreshed before audits." },
                { icon: Award, t: "Certification-expiry scanning", d: "Tracks certification & surveillance dates; computes evidence coverage." },
                { icon: Building2, t: "Vendor contract expiry", d: "Alerts before vendor contracts lapse." },
                { icon: Zap, t: "Control test runners", d: "Daily automated control re-testing & re-scoring." },
                { icon: BarChart3, t: "Scheduled reports", d: "Weekly/monthly board & management reports emailed automatically." },
                { icon: Bell, t: "Slack deadline digests", d: "High-priority tasks & status changes pushed to Slack." },
                { icon: AlertTriangle, t: "Regression & escalation", d: "Control regressions, SLA breaches, and critical findings auto-escalate and create Jira tickets." },
              ].map((a) => (
                <div key={a.t} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <a.icon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <div><p className="text-sm font-semibold">{a.t}</p><p className="text-xs text-muted-foreground mt-0.5">{a.d}</p></div>
                </div>
              ))}
            </div>
            <Callout title="Inbound evidence by email (how the loop closes)">
              <p className="text-sm">CertiGuard sends evidence-request emails from your connected Gmail account. Control owners simply <strong>reply with their evidence attached</strong> and include the Control ID. The platform reads that inbox, downloads the attachments, and auto-creates pending Evidence records linked to the right control — no manual upload needed.</p>
            </Callout>
          </Section>

          {/* 9. Reporting */}
          <Section id="reporting" icon={BarChart3} title="Reporting">
            <p>CertiGuard turns your compliance data into stakeholder-ready outputs. Key reports available on-demand and via scheduled email delivery:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Board Report</strong> — executive-level compliance posture for the board.</li>
              <li><strong>Executive Risk Report / Summary</strong> — risk position for leadership.</li>
              <li><strong>Audit Readiness Report</strong> — are you ready for your upcoming audit?</li>
              <li><strong>Stakeholder Summary</strong> — concise one-pager for external parties.</li>
              <li><strong>Management / Industry / Financial / SADC Executive Dashboards</strong> — role & sector-specific views.</li>
              <li><strong>Scheduled Reports</strong> — configure recurring recipients, frequency, and sections.</li>
            </ul>
          </Section>

          {/* 10. Security */}
          <Section id="security" icon={ShieldCheck} title="Security & Multi-Tenancy">
            <p>Security is the DNA of the platform. Key guarantees:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Strict multi-tenant isolation</strong> — every record is scoped to a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">tenant_id</code>; Row-Level Security enforces it on every read/write. Users can never see another tenant's data.</li>
              <li><strong>Tamper-evident audit trail</strong> — the Audit Trail and control test results are <strong>append-only</strong> (cannot be edited or deleted), with cryptographic chain verification.</li>
              <li><strong>Secure auditor access</strong> — external auditors get tokenised links with passphrase + expiry + revocation, and observation-only rights.</li>
              <li><strong>Strong authentication</strong> — 12+ character password complexity, MFA enforcement, idle session lock, and SSO/SAML/SCIM directory sync.</li>
              <li><strong>Backend plan enforcement</strong> — framework creation and user invites are validated server-side against your plan caps, not just in the UI.</li>
            </ul>
          </Section>

          {/* 11. Billing */}
          <Section id="billing" icon={CreditCard} title="Billing & Plans">
            <p>Your <strong>Tenant</strong> record holds your subscription tier, status, and plan caps. Upgrade anytime under <Link className="text-primary underline" to="/billing">Billing</Link> or <Link className="text-primary underline" to="/pricing">Pricing</Link>.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PLAN_TIERS.map((p) => (
                <Card key={p.tier}>
                  <CardHeader className="pb-2"><CardTitle className="text-base">{p.tier}</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-xs text-muted-foreground">
                    <p><span className="text-foreground font-medium">{p.users}</span> users</p>
                    <p><span className="text-foreground font-medium">{p.frameworks}</span> frameworks</p>
                    <p className="pt-1">{p.note}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Checkout supports Stripe and PayPal. For regions where automated checkout isn't available, plans can be manually provisioned from the Billing page.</p>
          </Section>

          {/* 12. Sample Company Walkthrough */}
          <Section id="sample" icon={Building2} title="Sample Company Walkthrough">
            <SampleWalkthrough />
          </Section>

          {/* Footer */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-primary p-8 text-center text-white">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <p className="text-lg font-heading font-semibold mb-1">You're ready to build trust, not just pass audits.</p>
            <p className="text-sm text-white/70 mb-4">If you get stuck, the AI Assistant (top nav) can answer questions about your compliance data anytime.</p>
            <Link to="/ai-assistant" className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium transition-colors">
              <Zap className="w-4 h-4" /> Open AI Assistant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground pl-0 lg:pl-13 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Callout({ title, children }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ScrollText className="w-4 h-4 text-primary" />{title}</p>
      <div className="text-sm text-muted-foreground space-y-1">{children}</div>
    </div>
  );
}

function Step({ n, icon: Icon, title, to, children }) {
  return (
    <Link to={to} className="group block">
      <div className="flex items-start gap-4 rounded-xl border border-border p-4 hover:border-primary/40 hover:shadow-sm transition-all">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">{n}</div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground flex items-center gap-2">
            <Icon className="w-4 h-4 text-primary" /> {title}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </p>
          <p className="text-sm text-muted-foreground mt-1">{children}</p>
        </div>
      </div>
    </Link>
  );
}