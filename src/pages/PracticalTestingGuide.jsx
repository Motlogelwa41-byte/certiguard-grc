import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Rocket, ShieldCheck, FileCheck, AlertTriangle, Paperclip, Award, Building2,
  Lock, Zap, BarChart3, CreditCard, Users, ListChecks, BookOpen, PlayCircle,
  KeyRound, Brain, Globe, Server, ClipboardList, Mail, Bell, ScrollText, Target, FileSearch
} from "lucide-react";
import GuideSection, { Steps, StepItem, Expect, NoteBox, FailExpect, Example } from "@/components/testing-guide/GuideSection";
import TestAccountsCard from "@/components/testing-guide/TestAccountsCard";

const SECTIONS = [
  { id: "intro", icon: BookOpen, title: "0. Introduction & How to Use This Guide" },
  { id: "auth", icon: KeyRound, title: "1. Authentication & Onboarding" },
  { id: "frameworks", icon: ShieldCheck, title: "2. Framework & Control Management" },
  { id: "risk", icon: Target, title: "3. Risk Management" },
  { id: "vendors", icon: Building2, title: "4. Vendor & Third-Party Management" },
  { id: "policies", icon: FileCheck, title: "5. Policy Management" },
  { id: "certifications", icon: Award, title: "6. Certification & Audit Readiness" },
  { id: "incidents", icon: AlertTriangle, title: "7. Incident Management" },
  { id: "evidence", icon: Paperclip, title: "8. Evidence Management" },
  { id: "dashboard", icon: BarChart3, title: "9. Dashboard & Reporting" },
  { id: "tenancy", icon: Server, title: "10. Multi-Tenant Isolation" },
  { id: "billing", icon: CreditCard, title: "11. Billing & Plans" },
  { id: "trust", icon: Globe, title: "12. Trust Center (Public Pages)" },
  { id: "ai", icon: Brain, title: "13. AI & Automation" },
  { id: "security", icon: ShieldCheck, title: "14. Security & Governance" },
  { id: "privacy", icon: Lock, title: "15. Privacy & Data Protection" },
  { id: "ops", icon: Zap, title: "16. Operations & Security Monitoring" },
  { id: "reporting", icon: FileSearch, title: "17. Reporting & Exports" },
];

export default function PracticalTestingGuide() {
  const [active, setActive] = useState("intro");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }); },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="CertiGuard GRC — Practical Testing Guide"
        subtitle="A complete, step-by-step guide to test every module of the platform with examples and expected results."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><BookOpen className="w-3.5 h-3.5" /> v1.0</Badge>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <ScrollText className="w-3.5 h-3.5" /> Print / PDF
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-1 max-h-[calc(100vh-3rem)] overflow-y-auto">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active === s.id ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}>
                <s.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className="space-y-10 min-w-0">
          {/* 0. Introduction */}
          <GuideSection id="intro" icon={BookOpen} title="Introduction & How to Use This Guide"
            subtitle="Read this first — it explains the testing approach and conventions.">
            <TestAccountsCard />
            <p>This guide walks you through every module of the CertiGuard GRC platform. Each section contains numbered steps, expected results, and examples so you can test practically and verify the platform behaves correctly.</p>
            <div className="rounded-xl border border-border p-4 space-y-2">
              <p className="font-semibold text-foreground text-sm">How to read each test:</p>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold shrink-0">1</span>
                  <p><strong className="text-foreground">Numbered steps</strong> — follow these in order within each section.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold shrink-0 mt-0.5">✓ Expected</span>
                  <p>What you should see after completing the steps — if you don't see this, something is wrong.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center gap-1 text-blue-600 font-semibold shrink-0 mt-0.5">ℹ Note</span>
                  <p>Helpful context, tips, or prerequisites.</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-flex items-center gap-1 text-amber-600 font-semibold shrink-0 mt-0.5">⚠ Expected Failure</span>
                  <p>Some tests are designed to fail gracefully — this confirms error handling works.</p>
                </div>
              </div>
            </div>
            <NoteBox label="Before you begin">
              Log in with the Admin account first. Most tests require admin-level access. The Compliance Officer account can be used for role-restricted tests. Keep both browser sessions open if you want to test role switching.
            </NoteBox>
            <NoteBox label="Test Database vs Production">
              This app has a Test Database. By default, you are in Production mode where real data lives. Do not delete or modify critical records unless you are sure. For safe experimentation, ask the admin to switch to Test mode.
            </NoteBox>
          </GuideSection>

          {/* 1. Authentication */}
          <GuideSection id="auth" icon={KeyRound} title="1. Authentication & Onboarding"
            subtitle="Registration, login, OTP, password reset, and role-based access.">
            <Steps>
              <StepItem n={1} title="Register a new user account" link={{ to: "/register", label: "Go to Register page" }}>
                <p>Navigate to <Link className="text-primary underline" to="/register">/register</Link>. Enter:</p>
                <Example>Email: testuser@example.com{"\n"}Password: Test@12345678{"\n"}Confirm: Test@12345678</Example>
                <p>Click "Create Account". You'll be taken to an OTP verification screen.</p>
                <Expect>An OTP code is sent to the email. Enter the 6-digit code to verify. After verification, you land on the Dashboard.</Expect>
              </StepItem>
              <StepItem n={2} title="Log in as the admin" link={{ to: "/login", label: "Go to Login page" }}>
                <p>Log out and navigate to <Link className="text-primary underline" to="/login">/login</Link>. Enter:</p>
                <Example>Email: boitshwarelomotlogelwa41@gmail.com{"\n"}Password: [your admin password]</Example>
                <Expect>The admin Dashboard loads with all sidebar navigation sections visible (Overview, Integrations, Compliance, Risk, Policies & Evidence, AI & Automation, Operations, Vendors, Privacy & Governance, Reporting, Settings).</Expect>
              </StepItem>
              <StepItem n={3} title="Verify password complexity enforcement">
                <p>Try registering with a weak password (e.g. "password123").</p>
                <Expect>Registration is rejected with a password complexity error. The platform enforces 12+ character passwords.</Expect>
              </StepItem>
              <StepItem n={4} title="Test password reset flow" link={{ to: "/forgot-password", label: "Go to Forgot Password" }}>
                <p>Navigate to <Link className="text-primary underline" to="/forgot-password">/forgot-password</Link>. Enter your email and submit.</p>
                <Expect>A generic success message appears ("If an account exists, a reset link has been sent"). This is intentional — the platform never reveals whether an email is registered.</Expect>
              </StepItem>
              <StepItem n={5} title="Verify the Architecture page" link={{ to: "/architecture", label: "Go to Architecture" }}>
                <p>Navigate to <Link className="text-primary underline" to="/architecture">/architecture</Link>.</p>
                <Expect>The platform architecture diagram renders and lists DPO Pay as the billing connector (not Stripe or PayPal).</Expect>
              </StepItem>
              <StepItem n={6} title="Test Google OAuth login (if configured)">
                <p>On the Login page, click "Continue with Google".</p>
                <Expect>You're redirected to Google's consent screen. After consent, you return to the Dashboard. If Google OAuth is not configured, you'll see an error — this is acceptable for testing.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 2. Frameworks & Controls */}
          <GuideSection id="frameworks" icon={ShieldCheck} title="2. Framework & Control Management"
            subtitle="Frameworks, controls, gap analysis, and control testing.">
            <Steps>
              <StepItem n={1} title="Verify the SOC 2 framework exists" link={{ to: "/frameworks", label: "Go to Frameworks" }}>
                <p>Navigate to <Link className="text-primary underline" to="/frameworks">/frameworks</Link>.</p>
                <Expect>The "SOC 2 Type II" framework is listed with 4 of 6 controls passing and a readiness score of 65%.</Expect>
              </StepItem>
              <StepItem n={2} title="Verify controls list and filtering" link={{ to: "/controls", label: "Go to Controls" }}>
                <p>Navigate to <Link className="text-primary underline" to="/controls">/controls</Link>. Verify 6 controls: AC-001, CM-001, DE-001, IR-001, VM-001, RA-001. Then filter by status "failing".</p>
                <Expect>Filtering by "failing" shows IR-001 (Incident Response Plan).</Expect>
              </StepItem>
              <StepItem n={3} title="Open a control detail page" link={{ to: "/controls", label: "Go to Controls" }}>
                <p>Click on control AC-001 (Role-Based Access Control).</p>
                <Expect>The detail page shows 3 evidence items (or the Linked Evidence section), owner "Boitshwarelo Motlogelwa", and next review date 2026-10-15. The "Linked Evidence" section at the bottom lists evidence records linked to this control.</Expect>
              </StepItem>
              <StepItem n={4} title="Create a new control">
                <p>On the Controls page, click "Add Control" or "New Control". Fill in:</p>
                <Example>Title: Network Segmentation{"\n"}Category: network_security{"\n"}Severity: high{"\n"}Status: not_tested</Example>
                <Expect>The control is saved and appears in the controls list immediately.</Expect>
              </StepItem>
              <StepItem n={5} title="Run a control test">
                <p>Open any control and click "Run Test".</p>
                <Expect>The control's last_tested date updates to today, status changes to "passing" or "failing", and evidence_count increments. A toast notification confirms the result.</Expect>
              </StepItem>
              <StepItem n={6} title="Bulk import controls via CSV">
                <p>On the Controls page, look for a "Bulk Import" or "Import CSV" button. Upload a CSV with columns: title, category, severity, status.</p>
                <Example>title,category,severity,status{"\n"}Firewall Config,network_security,high,not_tested{"\n"}Patch Management,configuration,medium,passing</Example>
                <Expect>Both controls are created and appear in the list.</Expect>
              </StepItem>
              <StepItem n={7} title="View Gap Analysis" link={{ to: "/gap-analysis", label: "Go to Gap Analysis" }}>
                <p>Navigate to <Link className="text-primary underline" to="/gap-analysis">/gap-analysis</Link>.</p>
                <Expect>The page shows which controls are missing or failing against framework requirements, with a visual coverage breakdown.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 3. Risk Management */}
          <GuideSection id="risk" icon={Target} title="3. Risk Management"
            subtitle="Risk register, heatmaps, quantification, and acceptance workflows.">
            <Steps>
              <StepItem n={1} title="Verify the risk register" link={{ to: "/risks", label: "Go to Risks" }}>
                <p>Navigate to <Link className="text-primary underline" to="/risks">/risks</Link>.</p>
                <Expect>3 risks are listed: RISK-001, RISK-002, RISK-003. RISK-001 "Data Breach via Phishing Attack" has a risk score of 20 and status "mitigating". A "Critical" badge appears for scores ≥ 20.</Expect>
              </StepItem>
              <StepItem n={2} title="Create a new risk">
                <p>Click "Add Risk" and fill in:</p>
                <Example>Title: Ransomware Attack on File Servers{"\n"}Likelihood: 3{"\n"}Impact: 5{"\n"}Category: technical{"\n"}Treatment: mitigate</Example>
                <Expect>The risk is saved. The risk score is auto-calculated as 15 (likelihood × impact). It appears in the risk list.</Expect>
              </StepItem>
              <StepItem n={3} title="View formal risk acceptance">
                <p>Open RISK-003 "Third-Party Vendor Data Exposure".</p>
                <Expect>The detail panel shows formal risk acceptance by Boitshwarelo Motlogelwa with acceptance expiry date 2027-07-15 and a typed signature.</Expect>
              </StepItem>
              <StepItem n={4} title="View the Risk Heatmap" link={{ to: "/risk-heatmap", label: "Go to Risk Heatmap" }}>
                <p>Navigate to <Link className="text-primary underline" to="/risk-heatmap">/risk-heatmap</Link>.</p>
                <Expect>The 3 risks are plotted on a 5×5 likelihood vs impact grid, colour-coded by severity.</Expect>
              </StepItem>
              <StepItem n={5} title="Test the Risk Appetite Heatmap" link={{ to: "/risk-appetite-heatmap", label: "Go to Appetite Heatmap" }}>
                <p>Navigate to <Link className="text-primary underline" to="/risk-appetite-heatmap">/risk-appetite-heatmap</Link>.</p>
                <Expect>Risks are auto-classified into bands: within appetite, tolerance zone, above appetite, unacceptable. Risks above tolerance are flagged.</Expect>
              </StepItem>
              <StepItem n={6} title="Formally accept a risk">
                <p>Open any high-risk item and click "Accept Risk". You'll need to provide a typed signature, justifier, and expiry date.</p>
                <Expect>The risk status changes to "accepted" with the acceptor's name, signature, and expiry date recorded.</Expect>
              </StepItem>
              <StepItem n={7} title="Risk Quantification (FAIR)" link={{ to: "/risk-quantification", label: "Go to Risk Quantification" }}>
                <p>Navigate to <Link className="text-primary underline" to="/risk-quantification">/risk-quantification</Link>. Enter loss event frequency and loss magnitude values.</p>
                <Expect>The Annualised Loss Expectancy (ALE) is calculated in ZAR. The page models single loss expectancy × annualised rate.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 4. Vendors */}
          <GuideSection id="vendors" icon={Building2} title="4. Vendor & Third-Party Management"
            subtitle="Vendor onboarding, assessments, scorecards, and offboarding.">
            <Steps>
              <StepItem n={1} title="Verify vendors list" link={{ to: "/vendors", label: "Go to Vendors" }}>
                <p>Navigate to <Link className="text-primary underline" to="/vendors">/vendors</Link>.</p>
                <Expect>2 vendors are listed: Amazon Web Services (high risk, approved) and Datadog (medium risk, approved).</Expect>
              </StepItem>
              <StepItem n={2} title="Open the AWS vendor record">
                <p>Click on the Amazon Web Services vendor.</p>
                <Expect>The detail shows SOC 2, ISO 27001, and GDPR compliance as true, with next assessment date 2027-06-15.</Expect>
              </StepItem>
              <StepItem n={3} title="Create a new vendor">
                <p>Click "Add Vendor" and fill in:</p>
                <Example>Name: Microsoft 365{"\n"}Category: saas{"\n"}Risk level: medium{"\n"}Status: pending_review</Example>
                <Expect>The vendor is saved and appears in the vendor list.</Expect>
              </StepItem>
              <StepItem n={4} title="Initiate a vendor assessment" link={{ to: "/vendor-assessments", label: "Go to Vendor Assessments" }}>
                <p>Navigate to <Link className="text-primary underline" to="/vendor-assessments">/vendor-assessments</Link>. Start an assessment for the AWS vendor.</p>
                <Expect>The assessment workflow can be initiated — a questionnaire is created and linked to the vendor.</Expect>
              </StepItem>
              <StepItem n={5} title="View the Vendor Scorecard" link={{ to: "/vendor-scorecard", label: "Go to Vendor Scorecard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/vendor-scorecard">/vendor-scorecard</Link>.</p>
                <Expect>An aggregated risk view across the vendor portfolio renders with scores and status badges.</Expect>
              </StepItem>
              <StepItem n={6} title="Test vendor offboarding checklist">
                <p>Open any vendor and look for the "Offboard" or "Offboarding Checklist" option.</p>
                <Expect>A formal checklist appears: access revoked, credentials revoked, data returned/destroyed — each with confirmation flags.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 5. Policies */}
          <GuideSection id="policies" icon={FileCheck} title="5. Policy Management"
            subtitle="Policy authoring, approvals, acknowledgments, and exceptions.">
            <Steps>
              <StepItem n={1} title="Verify the Information Security Policy" link={{ to: "/policies", label: "Go to Policies" }}>
                <p>Navigate to <Link className="text-primary underline" to="/policies">/policies</Link>.</p>
                <Expect>The "Information Security Policy" (v2.0) exists with status "approved" and next review date 2027-07-01.</Expect>
              </StepItem>
              <StepItem n={2} title="Open the policy and verify content">
                <p>Click on the Information Security Policy.</p>
                <Expect>The full content renders including sections on Access Control, Data Protection, Incident Response, and Acceptable Use.</Expect>
              </StepItem>
              <StepItem n={3} title="Create a new policy">
                <p>Click "Add Policy" or "New Policy" and fill in:</p>
                <Example>Title: Data Retention Policy{"\n"}Category: data_privacy{"\n"}Status: draft{"\n"}Acknowledgment required: yes</Example>
                <Expect>The policy is saved and appears in the policies list.</Expect>
              </StepItem>
              <StepItem n={4} title="Test policy acknowledgment" link={{ to: "/policy-acknowledgments", label: "Go to Policy Acknowledgments" }}>
                <p>Navigate to <Link className="text-primary underline" to="/policy-acknowledgments">/policy-acknowledgments</Link>.</p>
                <Expect>The page shows which users have acknowledged which policies, with pending acknowledgments highlighted.</Expect>
              </StepItem>
              <StepItem n={5} title="Request a policy exception" link={{ to: "/policy-exceptions", label: "Go to Policy Exceptions" }}>
                <p>Navigate to <Link className="text-primary underline" to="/policy-exceptions">/policy-exceptions</Link>. Click "Request Exception" and fill in:</p>
                <Example>Title: Temporary VPN bypass for contractor{"\n"}Justification: Contractor needs 30-day access for project delivery{"\n"}Expiration date: [30 days from today]{"\n"}Exception type: temporary_waiver</Example>
                <Expect>The exception is saved with status "pending". It appears in the exceptions list.</Expect>
              </StepItem>
              <StepItem n={6} title="Approve a policy exception">
                <p>Open the pending exception and click "Approve". Provide a typed signature and approval comments.</p>
                <Expect>The exception status changes to "approved" with the approver's name, signature, and timestamp recorded.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 6. Certifications */}
          <GuideSection id="certifications" icon={Award} title="6. Certification & Audit Readiness"
            subtitle="Certification lifecycle, milestones, and audit readiness reporting.">
            <Steps>
              <StepItem n={1} title="Verify SOC 2 certification exists" link={{ to: "/certifications", label: "Go to Certifications" }}>
                <p>Navigate to <Link className="text-primary underline" to="/certifications">/certifications</Link>.</p>
                <Expect>"SOC 2 Type II 2026" (CERT-001) exists with status "audit_in_progress" and certifying body "Deloitte & Touche".</Expect>
              </StepItem>
              <StepItem n={2} title="Open CERT-001 and verify details">
                <p>Click on CERT-001.</p>
                <Expect>The detail shows audit window Aug-Oct 2026, 4 milestones with 2 completed, and 6 linked controls.</Expect>
              </StepItem>
              <StepItem n={3} title="Generate a Compliance Readiness Report" link={{ to: "/compliance-readiness-report", label: "Go to Readiness Report" }}>
                <p>Navigate to <Link className="text-primary underline" to="/compliance-readiness-report">/compliance-readiness-report</Link>.</p>
                <Expect>The report generates showing 65% readiness with 4 passing and 2 non-passing controls.</Expect>
              </StepItem>
              <StepItem n={4} title="Create a new certification">
                <p>On the Certifications page, click "Add Certification". Fill in:</p>
                <Example>Name: ISO 27001 2027{"\n"}Standard: ISO 27001{"\n"}Status: planned{"\n"}Target date: 2027-06-30</Example>
                <Expect>The certification is saved and appears in the list with a lifecycle timeline.</Expect>
              </StepItem>
              <StepItem n={5} title="Test the Auditor Portal" link={{ to: "/auditor-portal", label: "Go to Auditor Portal" }}>
                <p>Navigate to <Link className="text-primary underline" to="/auditor-portal">/auditor-portal</Link>.</p>
                <Expect>The auditor portal loads with scoped, read-only access to evidence, controls, and certifications. (Admins can see this; external auditors see only their scoped items.)</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 7. Incidents */}
          <GuideSection id="incidents" icon={AlertTriangle} title="7. Incident Management"
            subtitle="Incident logging, escalation chains, war room, and MTTR/MTTC.">
            <Steps>
              <StepItem n={1} title="Create a new incident" link={{ to: "/incidents", label: "Go to Incidents" }}>
                <p>Navigate to <Link className="text-primary underline" to="/incidents">/incidents</Link>. Click "Report Incident" or "New Incident" and fill in:</p>
                <Example>Title: Suspected Phishing Email{"\n"}Type: phishing{"\n"}Severity: medium{"\n"}Status: detected</Example>
                <Expect>The incident is saved and appears in the incidents list.</Expect>
              </StepItem>
              <StepItem n={2} title="View Incident Command" link={{ to: "/incident-command", label: "Go to Incident Command" }}>
                <p>Navigate to <Link className="text-primary underline" to="/incident-command">/incident-command</Link>.</p>
                <Expect>The incident escalation chain and timeline features are accessible. You can see escalation levels and notification status.</Expect>
              </StepItem>
              <StepItem n={3} title="Open the Incident War Room">
                <p>From the Incidents list, open any incident and click "Open War Room" or navigate to <code className="text-xs bg-muted px-1 rounded">/incident-war-room/[id]</code>.</p>
                <Expect>The war room loads with a collaboration feed, evidence artifacts, and timeline events. You can post messages.</Expect>
              </StepItem>
              <StepItem n={4} title="Update incident status through the lifecycle">
                <p>Edit the incident and progress it through: detected → investigating → contained → remediated → closed. Add containment and remediation dates.</p>
                <Expect>MTTR (Mean Time to Resolve) and MTTC (Mean Time to Contain) are auto-calculated in hours based on the dates you enter.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 8. Evidence */}
          <GuideSection id="evidence" icon={Paperclip} title="8. Evidence Management"
            subtitle="Evidence upload, review workflow, bulk upload, and secure evidence packs.">
            <Steps>
              <StepItem n={1} title="Verify the Evidence Manager" link={{ to: "/evidence", label: "Go to Evidence Manager" }}>
                <p>Navigate to <Link className="text-primary underline" to="/evidence">/evidence</Link>.</p>
                <Expect>The page loads with evidence filtering by control, status, and type.</Expect>
              </StepItem>
              <StepItem n={2} title="Upload test evidence">
                <p>Click "Add Evidence" or "Upload". Attach a screenshot file, link it to control IR-001, and save.</p>
                <Expect>The evidence is saved with status "pending_review". It appears in the list and in the control's "Linked Evidence" section on the Control Detail page.</Expect>
              </StepItem>
              <StepItem n={3} title="Review and approve evidence">
                <p>Open the pending evidence item and click "Approve" (or "Review" → "Approve"). Add review notes.</p>
                <Expect>The evidence status changes to "approved" with the reviewer's name and review date recorded.</Expect>
              </StepItem>
              <StepItem n={4} title="Bulk upload evidence" link={{ to: "/bulk-evidence", label: "Go to Bulk Evidence" }}>
                <p>Navigate to <Link className="text-primary underline" to="/bulk-evidence">/bulk-evidence</Link>. Either drag multiple files or click "Add entry without file" to create manual entries. Assign controls and frameworks, then click "Upload All".</p>
                <Expect>All evidence items are created and linked to their assigned controls. A success toast confirms the count.</Expect>
              </StepItem>
              <StepItem n={5} title="Generate a Secure Evidence Pack" link={{ to: "/secure-evidence-pack", label: "Go to Secure Evidence Pack" }}>
                <p>Navigate to <Link className="text-primary underline" to="/secure-evidence-pack">/secure-evidence-pack</Link>. Select controls and evidence, fill in organisational metadata, and click "Generate Pack".</p>
                <Expect>A tamper-evident PDF is generated with a SHA-256 hash and timestamp. The pack is logged to the Audit Evidence Ledger. The ledger section below shows the new entry with its hash for verification.</Expect>
              </StepItem>
              <StepItem n={6} title="Verify the audit ledger entry">
                <p>After generating the pack, scroll down to the "Audit Evidence Ledger" section on the same page.</p>
                <Expect>The most recent ledger entry shows the file name, SHA-256 hash, timestamp, and submitting user. This confirms the pack was cryptographically logged.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 9. Dashboard & Reporting */}
          <GuideSection id="dashboard" icon={BarChart3} title="9. Dashboard & Reporting"
            subtitle="Main dashboard, management dashboards, and board reports.">
            <Steps>
              <StepItem n={1} title="Load the main Dashboard" link={{ to: "/", label: "Go to Dashboard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/">/</Link> (the home/Dashboard route).</p>
                <Expect>The dashboard shows framework readiness, control status summary, risk overview, and recent activity feed.</Expect>
              </StepItem>
              <StepItem n={2} title="View the Management Dashboard" link={{ to: "/management-dashboard", label: "Go to Management Dashboard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/management-dashboard">/management-dashboard</Link>.</p>
                <Expect>The page renders compliance KPIs, risk distribution charts, and framework readiness visualizations.</Expect>
              </StepItem>
              <StepItem n={3} title="Generate a Board Report" link={{ to: "/board-report", label: "Go to Board Report" }}>
                <p>Navigate to <Link className="text-primary underline" to="/board-report">/board-report</Link>.</p>
                <Expect>The executive summary renders with compliance score, risk count, and framework status. A PDF download or export option is available.</Expect>
              </StepItem>
              <StepItem n={4} title="View the One-Click Report" link={{ to: "/one-click-report", label: "Go to One-Click Report" }}>
                <p>Navigate to <Link className="text-primary underline" to="/one-click-report">/one-click-report</Link>.</p>
                <Expect>A consolidated report generates quickly, combining compliance posture, risk, and framework status in one view.</Expect>
              </StepItem>
              <StepItem n={5} title="Test the SADC Executive Dashboard" link={{ to: "/sadc-executive-dashboard", label: "Go to SADC Dashboard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/sadc-executive-dashboard">/sadc-executive-dashboard</Link>.</p>
                <Expect>The dashboard renders SADC-region-specific regulatory compliance metrics and cross-border data sovereignty indicators.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 10. Multi-Tenant Isolation */}
          <GuideSection id="tenancy" icon={Server} title="10. Multi-Tenant Isolation"
            subtitle="Verify data isolation between tenants — a critical security guarantee.">
            <Steps>
              <StepItem n={1} title="Verify tenant-scoped data">
                <p>Log in as the admin user. Browse through Risks, Controls, Vendors, Policies, and Evidence.</p>
                <Expect>All visible data belongs to tenant "Ethical Edge GRC Consulting". No records from other tenants (e.g. "Prosperity Secret International" or "Botswana Financial Services") appear in any list view.</Expect>
              </StepItem>
              <StepItem n={2} title="Check the Tenant Isolation Monitor" link={{ to: "/tenant-isolation", label: "Go to Tenant Isolation" }}>
                <p>Navigate to <Link className="text-primary underline" to="/tenant-isolation">/tenant-isolation</Link>.</p>
                <Expect>The page shows isolation test results confirming every entity is scoped by tenant_id and RLS rules are enforced.</Expect>
              </StepItem>
              <StepItem n={3} title="Verify cross-tenant executive dashboard" link={{ to: "/cross-tenant-executive-dashboard", label: "Go to Cross-Tenant Dashboard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/cross-tenant-executive-dashboard">/cross-tenant-executive-dashboard</Link>.</p>
                <Expect>If the admin's tenant is a holding company, subsidiary risk metrics roll up here. Otherwise, only the single tenant's data is shown.</Expect>
              </StepItem>
            </Steps>
            <NoteBox label="Why this matters">
              Multi-tenant isolation is the core security guarantee of the platform. Every record carries a tenant_id, and Row-Level Security (RLS) enforces that users can only read/write their own tenant's data. This test confirms that enforcement is working.
            </NoteBox>
          </GuideSection>

          {/* 11. Billing */}
          <GuideSection id="billing" icon={CreditCard} title="11. Billing & Plans"
            subtitle="Pricing tiers, subscription status, and checkout (DPO Pay).">
            <Steps>
              <StepItem n={1} title="Verify the Pricing page" link={{ to: "/pricing", label: "Go to Pricing" }}>
                <p>Navigate to <Link className="text-primary underline" to="/pricing">/pricing</Link>.</p>
                <Expect>4 plan tiers are displayed: Free Trial, Starter, Professional, Enterprise. Only DPO Pay checkout is available — no PayPal or Stripe buttons should appear.</Expect>
              </StepItem>
              <StepItem n={2} title="Verify the Billing page" link={{ to: "/billing", label: "Go to Billing" }}>
                <p>Navigate to <Link className="text-primary underline" to="/billing">/billing</Link>.</p>
                <Expect>The subscription tier shows "Professional" with status "active". There is no "Manage billing in Stripe" or "Update payment method" button.</Expect>
              </StepItem>
              <StepItem n={3} title="Attempt DPO Pay checkout">
                <p>On the Pricing page, click to start a DPO Pay checkout for the Starter plan (monthly).</p>
                <FailExpect>This is expected to fail because DPO merchant credentials are not yet configured. Verify the error is displayed gracefully — a clear error message, not a crash or blank page.</FailExpect>
              </StepItem>
            </Steps>
            <NoteBox label="Test Card (if Stripe were enabled)">
              If Stripe is later enabled, use test card 4242 4242 4242 4242, any future expiry, any CVC. But currently, only DPO Pay is the billing connector.
            </NoteBox>
          </GuideSection>

          {/* 12. Trust Center */}
          <GuideSection id="trust" icon={Globe} title="12. Trust Center (Public Pages)"
            subtitle="Public-facing pages that don't require login.">
            <Steps>
              <StepItem n={1} title="Visit the public Trust Center" link={{ to: "/trust-center", label: "Go to Trust Center" }}>
                <p>Navigate to <Link className="text-primary underline" to="/trust-center">/trust-center</Link> (or open in an incognito window).</p>
                <Expect>The public trust center page loads with compliance certifications and security badges visible without login.</Expect>
              </StepItem>
              <StepItem n={2} title="Visit the SLA page" link={{ to: "/sla", label: "Go to SLA" }}>
                <p>Navigate to <Link className="text-primary underline" to="/sla">/sla</Link>.</p>
                <Expect>The SLA page renders with uptime guarantees and response time commitments.</Expect>
              </StepItem>
              <StepItem n={3} title="Visit the Data Residency page" link={{ to: "/data-residency", label: "Go to Data Residency" }}>
                <p>Navigate to <Link className="text-primary underline" to="/data-residency">/data-residency</Link>.</p>
                <Expect>The data residency page renders with hosting location information and data sovereignty details.</Expect>
              </StepItem>
              <StepItem n={4} title="Visit the Security Overview page" link={{ to: "/security-overview", label: "Go to Security Overview" }}>
                <p>Navigate to <Link className="text-primary underline" to="/security-overview">/security-overview</Link>.</p>
                <Expect>The security overview page renders with encryption, access control, and compliance certifications listed.</Expect>
              </StepItem>
              <StepItem n={5} title="Visit the Privacy Policy" link={{ to: "/privacy", label: "Go to Privacy Policy" }}>
                <p>Navigate to <Link className="text-primary underline" to="/privacy">/privacy</Link>.</p>
                <Expect>The privacy policy page renders with full GDPR/POPIA-style privacy policy text.</Expect>
              </StepItem>
              <StepItem n={6} title="Visit the Whistleblower Portal" link={{ to: "/whistleblower", label: "Go to Whistleblower Portal" }}>
                <p>Navigate to <Link className="text-primary underline" to="/whistleblower">/whistleblower</Link>.</p>
                <Expect>An anonymous whistleblower reporting form loads without requiring login.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 13. AI & Automation */}
          <GuideSection id="ai" icon={Brain} title="13. AI & Automation"
            subtitle="AI assistant, control mapper, AI auditor, and automated workflows.">
            <Steps>
              <StepItem n={1} title="Use the AI Assistant" link={{ to: "/ai-assistant", label: "Go to AI Assistant" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-assistant">/ai-assistant</Link>. Ask a question like:</p>
                <Example>"What is our current SOC 2 readiness score and which controls are failing?"</Example>
                <Expect>The AI assistant responds with an answer based on your compliance data, referencing the actual failing controls and readiness percentage.</Expect>
              </StepItem>
              <StepItem n={2} title="Test the AI Control Mapper" link={{ to: "/ai-control-mapper", label: "Go to AI Control Mapper" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-control-mapper">/ai-control-mapper</Link>. Upload a policy document or paste policy text and ask the AI to map it to controls.</p>
                <Expect>The AI analyses the document and suggests control mappings with confidence scores.</Expect>
              </StepItem>
              <StepItem n={3} title="Run the AI Auditor" link={{ to: "/ai-auditor", label: "Go to AI Auditor" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-auditor">/ai-auditor</Link>. Trigger an AI audit review.</p>
                <Expect>The AI auditor reviews your evidence and controls, identifying gaps and inconsistencies.</Expect>
              </StepItem>
              <StepItem n={4} title="Test AI Gap Analysis" link={{ to: "/ai-gap-analysis", label: "Go to AI Gap Analysis" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-gap-analysis">/ai-gap-analysis</Link>.</p>
                <Expect>The AI identifies gaps between your current controls and framework requirements, with prioritised recommendations.</Expect>
              </StepItem>
              <StepItem n={5} title="Test AI Cross-Framework Mapping" link={{ to: "/ai-cross-mapping", label: "Go to AI Cross-Mapping" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-cross-mapping">/ai-cross-mapping</Link>.</p>
                <Expect>The AI maps controls across multiple frameworks (e.g. SOC 2 ↔ ISO 27001) so you can see which controls satisfy multiple standards.</Expect>
              </StepItem>
              <StepItem n={6} title="View the AI Hub" link={{ to: "/ai-hub", label: "Go to AI Hub" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ai-hub">/ai-hub</Link>.</p>
                <Expect>The AI Hub lists all AI-powered features in one place: assistant, mapper, auditor, questionnaire auto-fill, gap analysis.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 14. Security & Governance */}
          <GuideSection id="security" icon={ShieldCheck} title="14. Security & Governance"
            subtitle="Audit trail, user management, SSO, tenant settings, and platform governance.">
            <Steps>
              <StepItem n={1} title="View the Audit Trail" link={{ to: "/audit-trail", label: "Go to Audit Trail" }}>
                <p>Navigate to <Link className="text-primary underline" to="/audit-trail">/audit-trail</Link>.</p>
                <Expect>A tamper-evident, append-only record of every significant action is displayed. Entries cannot be edited or deleted (the edit/delete buttons are absent or disabled).</Expect>
              </StepItem>
              <StepItem n={2} title="View the Activity Log" link={{ to: "/activity-log", label: "Go to Activity Log" }}>
                <p>Navigate to <Link className="text-primary underline" to="/activity-log">/activity-log</Link>.</p>
                <Expect>A detailed log of user actions renders with timestamps, actors, and entity types.</Expect>
              </StepItem>
              <StepItem n={3} title="Manage users" link={{ to: "/users", label: "Go to Users" }}>
                <p>Navigate to <Link className="text-primary underline" to="/users">/users</Link>. Invite a new user with role "user".</p>
                <Expect>An invite email is sent to the new user. They appear in the user list with status "invited" or "pending".</Expect>
              </StepItem>
              <StepItem n={4} title="Check SSO settings" link={{ to: "/sso", label: "Go to SSO Settings" }}>
                <p>Navigate to <Link className="text-primary underline" to="/sso">/sso</Link>.</p>
                <Expect>The SSO & Directory page shows SAML and SCIM provisioning configuration options.</Expect>
              </StepItem>
              <StepItem n={5} title="View Tenant Settings" link={{ to: "/tenant-settings", label: "Go to Tenant Settings" }}>
                <p>Navigate to <Link className="text-primary underline" to="/tenant-settings">/tenant-settings</Link>.</p>
                <Expect>The page shows active frameworks, jurisdictions, base currency (ZAR), risk appetite limit, and impact monetary ranges.</Expect>
              </StepItem>
              <StepItem n={6} title="View Platform Governance" link={{ to: "/platform-governance", label: "Go to Platform Governance" }}>
                <p>Navigate to <Link className="text-primary underline" to="/platform-governance">/platform-governance</Link>.</p>
                <Expect>The page shows platform-level governance policies, security configurations, and compliance with internal standards.</Expect>
              </StepItem>
              <StepItem n={7} title="Test White-Label Branding" link={{ to: "/white-label", label: "Go to White-Label" }}>
                <p>Navigate to <Link className="text-primary underline" to="/white-label">/white-label</Link>. Change the brand display name and primary colour.</p>
                <Expect>The sidebar header and reports update to reflect the new branding. (Changes may require a page refresh.)</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 15. Privacy & Data Protection */}
          <GuideSection id="privacy" icon={Lock} title="15. Privacy & Data Protection"
            subtitle="Privacy requests (DSARs), ROPA, DPIA, and data flow mapping.">
            <Steps>
              <StepItem n={1} title="View Privacy Requests" link={{ to: "/privacy-requests", label: "Go to Privacy Requests" }}>
                <p>Navigate to <Link className="text-primary underline" to="/privacy-requests">/privacy-requests</Link>.</p>
                <Expect>The page lists data subject access requests with statutory SLA countdowns and status tracking.</Expect>
              </StepItem>
              <StepItem n={2} title="Create a DSAR">
                <p>Click "New Request" and fill in:</p>
                <Example>Requester: john.doe@example.com{"\n"}Request type: access{"\n"}Description: Requesting copy of all personal data held</Example>
                <Expect>The request is saved with an SLA countdown timer. Tasks are auto-created for the privacy team.</Expect>
              </StepItem>
              <StepItem n={3} title="View ROPA" link={{ to: "/ropa", label: "Go to ROPA" }}>
                <p>Navigate to <Link className="text-primary underline" to="/ropa">/ropa</Link>.</p>
                <Expect>The Record of Processing Activities lists all processing activities with legal basis, retention periods, and data categories.</Expect>
              </StepItem>
              <StepItem n={4} title="Create a DPIA" link={{ to: "/dpia", label: "Go to DPIA" }}>
                <p>Navigate to <Link className="text-primary underline" to="/dpia">/dpia</Link>. Click "New DPIA" and fill in the processing description and risk assessment.</p>
                <Expect>The DPIA is saved with a risk level determination and recommended safeguards.</Expect>
              </StepItem>
              <StepItem n={5} title="View Data Flow Mapping" link={{ to: "/privacy-data-mapping", label: "Go to Data Flow Mapping" }}>
                <p>Navigate to <Link className="text-primary underline" to="/privacy-data-mapping">/privacy-data-mapping</Link>.</p>
                <Expect>Data flow maps render showing source → destination systems, data categories, cross-border transfer flags, and encryption status.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 16. Operations & Security Monitoring */}
          <GuideSection id="ops" icon={Zap} title="16. Operations & Security Monitoring"
            subtitle="Security findings, CSPM, EDR, DevSecOps, DLP, IT assets, and training.">
            <Steps>
              <StepItem n={1} title="View Security Findings" link={{ to: "/vulnerabilities", label: "Go to Security Findings" }}>
                <p>Navigate to <Link className="text-primary underline" to="/vulnerabilities">/vulnerabilities</Link>.</p>
                <Expect>The page lists security findings from various sources (Security Hub, Defender, etc.) with severity, SLA status, and linked controls.</Expect>
              </StepItem>
              <StepItem n={2} title="View Cloud Posture (CSPM)" link={{ to: "/cloud-posture", label: "Go to Cloud Posture" }}>
                <p>Navigate to <Link className="text-primary underline" to="/cloud-posture">/cloud-posture</Link>.</p>
                <Expect>The CSPM dashboard shows cloud provider posture scores, configuration checks, and compliance status across AWS/Azure/GCP.</Expect>
              </StepItem>
              <StepItem n={3} title="View the EDR Dashboard" link={{ to: "/edr-dashboard", label: "Go to EDR Dashboard" }}>
                <p>Navigate to <Link className="text-primary underline" to="/edr-dashboard">/edr-dashboard</Link>.</p>
                <Expect>The EDR/XDR dashboard shows endpoint detection findings with severity, SLA hours, and linked controls.</Expect>
              </StepItem>
              <StepItem n={4} title="Run the DevSecOps Scanner" link={{ to: "/devsecops", label: "Go to DevSecOps" }}>
                <p>Navigate to <Link className="text-primary underline" to="/devsecops">/devsecops</Link>. Trigger a pipeline scan.</p>
                <Expect>The scanner runs DevSecOps checks (SAST, dependency scanning, secret detection, IaC scanning) and reports findings.</Expect>
              </StepItem>
              <StepItem n={5} title="View IT Asset Management" link={{ to: "/itam", label: "Go to ITAM" }}>
                <p>Navigate to <Link className="text-primary underline" to="/itam">/itam</Link>.</p>
                <Expect>The ITAM dashboard lists hardware, software, and cloud assets with encryption status, patch level, and assignment info.</Expect>
              </StepItem>
              <StepItem n={6} title="View Training" link={{ to: "/training", label: "Go to Training" }}>
                <p>Navigate to <Link className="text-primary underline" to="/training">/training</Link>.</p>
                <Expect>The training page lists assigned courses with completion status and due dates.</Expect>
              </StepItem>
              <StepItem n={7} title="View the 24/7 Protection Command Center" link={{ to: "/protection-center", label: "Go to Protection Center" }}>
                <p>Navigate to <Link className="text-primary underline" to="/protection-center">/protection-center</Link>.</p>
                <Expect>The command center shows real-time monitoring of identity, access, and security posture across the tenant.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* 17. Reporting & Exports */}
          <GuideSection id="reporting" icon={FileSearch} title="17. Reporting & Exports"
            subtitle="On-demand reports, scheduled reports, and auditor exports.">
            <Steps>
              <StepItem n={1} title="View the Reports page" link={{ to: "/reports", label: "Go to Reports" }}>
                <p>Navigate to <Link className="text-primary underline" to="/reports">/reports</Link>.</p>
                <Expect>The reports hub lists all available report types with generation and download options.</Expect>
              </StepItem>
              <StepItem n={2} title="Schedule a recurring report" link={{ to: "/scheduled-reports", label: "Go to Scheduled Reports" }}>
                <p>Navigate to <Link className="text-primary underline" to="/scheduled-reports">/scheduled-reports</Link>. Create a weekly board report schedule.</p>
                <Expect>The schedule is saved with recipient, frequency, and section selection. (Note: emails deliver to registered app users only.)</Expect>
              </StepItem>
              <StepItem n={3} title="Generate an Auditor Export" link={{ to: "/auditor-export", label: "Go to Auditor Export" }}>
                <p>Navigate to <Link className="text-primary underline" to="/auditor-export">/auditor-export</Link>. Select scope and generate.</p>
                <Expect>A structured export (CSV/PDF) is generated containing scoped evidence, controls, and test results for auditor review.</Expect>
              </StepItem>
              <StepItem n={4} title="View the Executive Briefing" link={{ to: "/executive-briefing", label: "Go to Executive Briefing" }}>
                <p>Navigate to <Link className="text-primary underline" to="/executive-briefing">/executive-briefing</Link>.</p>
                <Expect>A concise executive briefing renders with key compliance metrics, risk highlights, and action items.</Expect>
              </StepItem>
            </Steps>
          </GuideSection>

          {/* Footer */}
          <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-primary p-8 text-center text-white">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-90" />
            <p className="text-lg font-heading font-semibold mb-1">You're ready to test the full platform.</p>
            <p className="text-sm text-white/70 mb-4">If you find a bug or have questions, use the AI Assistant (top nav) or contact the CertiGuard team.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Link to="/ai-assistant" className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium transition-colors">
                <Brain className="w-4 h-4" /> Open AI Assistant
              </Link>
              <Link to="/user-guide" className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium transition-colors">
                <BookOpen className="w-4 h-4" /> View User Guide
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}