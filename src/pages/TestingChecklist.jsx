import React, { useState, useEffect } from "react";
import PageHeader from "@/components/shared/PageHeader";
import { ClipboardCheck, ShieldCheck, Users2, Database, FileText, Activity, Network, FlaskConical, Lock, BarChart3, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STORAGE_KEY = "certiguard_uat_checklist_v1";

const TEST_SECTIONS = [
  {
    id: "auth_rls",
    title: "Authentication & Multi-Tenant Isolation",
    icon: Lock,
    description: "Verify login flows, session security, and tenant data isolation.",
    items: [
      "Email/password login succeeds and redirects to the dashboard",
      "Google OAuth login completes and lands on the dashboard",
      "Password reset flow (request → email → reset → login) works end-to-end",
      "Unauthenticated users are redirected to /login",
      "A user in Tenant A cannot read Tenant B's controls, risks, or evidence",
      "Admin-only pages (Users, Tenant Admin, SSO) are blocked for non-admin roles",
      "Idle screen lock engages after inactivity and requires re-auth",
      "MFA enforcement gate prompts where applicable",
    ],
  },
  {
    id: "controls",
    title: "Controls Management",
    icon: ShieldCheck,
    description: "Control CRUD, framework mapping, and bulk import.",
    items: [
      "Controls list loads with all 24 seeded records visible",
      "Create a new control with all required fields and it persists",
      "Edit an existing control and confirm the change saves",
      "Delete a control and confirm it is removed from the list",
      "Filter controls by status (passing/failing/not_tested) works",
      "Filter controls by category works",
      "Controls display correct framework names (SOC 2, ISO 27001, etc.)",
      "CSV bulk import of controls completes without errors",
      "Control detail page shows all fields, evidence count, and remediation loop",
    ],
  },
  {
    id: "risk",
    title: "Risk Register & Quantification",
    icon: BarChart3,
    description: "Risk scoring, appetite, and FAIR quantification.",
    items: [
      "Create a risk with likelihood/impact and the risk_score auto-calculates",
      "Risk heatmap plots risks correctly by likelihood vs impact",
      "Risk appetite heatmap bands classify risks (within/tolerance/above/unacceptable)",
      "Formal risk acceptance records approver, signature, and expiry date",
      "Residual risk calculator updates residual likelihood/impact",
      "Risk remediation tasks auto-generate from an open risk",
      "Framework cross-map links risks to relevant controls",
    ],
  },
  {
    id: "evidence",
    title: "Evidence & Audit Trail",
    icon: FileText,
    description: "Evidence upload, approval, and immutable audit chain.",
    items: [
      "Upload an evidence file and it appears linked to a control",
      "Approve pending evidence and status flips to 'approved'",
      "Reject evidence with notes and status flips to 'rejected'",
      "Bulk evidence uploader processes multiple files",
      "Evidence expiry scanner flags evidence expiring within 60 days",
      "Audit trail records every create/update/delete with timestamp",
      "Audit chain integrity verification passes (no broken hashes)",
      "Export audit trail PDF generates a downloadable file",
    ],
  },
  {
    id: "automation",
    title: "Automated Compliance & Control Tests",
    icon: FlaskConical,
    description: "Control tests, compliance runs, and continuous monitoring.",
    items: [
      "Compliance run executes and updates control statuses",
      "Control test runner produces a ControlTestResult record",
      "Continuous monitoring workflow fires on schedule",
      "Connection monitor updates connection health status",
      "Failing control triggers a regression alert workflow",
      "Automated evidence collection creates evidence records from a connection",
    ],
  },
  {
    id: "frameworks",
    title: "Frameworks & Gap Analysis",
    icon: Network,
    description: "Framework readiness, gap analysis, and control mapping.",
    items: [
      "Frameworks list shows readiness scores for all 12 frameworks",
      "Gap analysis identifies failing/untested controls per framework",
      "Framework control map displays control-to-framework coverage",
      "SADC frameworks library lists regional regulatory frameworks",
      "Regulatory changes feed shows recent regulatory updates",
      "Compliance readiness report generates and is printable",
    ],
  },
  {
    id: "vendors",
    title: "Vendors & Third-Party Risk",
    icon: Users2,
    description: "Vendor lifecycle, assessments, and offboarding.",
    items: [
      "Create a vendor with risk level and compliance flags",
      "Vendor assessment flow completes start → submit → score",
      "Vendor scorecard aggregates risk and compliance posture",
      "High-risk vendor triggers escalation workflow",
      "Vendor offboarding checklist marks access/credentials/data revocations",
      "Vendor contract expiry scanner flags upcoming expiries",
    ],
  },
  {
    id: "auditor",
    title: "Auditor Portal & Certifications",
    icon: ClipboardCheck,
    description: "External auditor access, scope, and certification tracking.",
    items: [
      "Auditor portal lists scoped controls and evidence for external_auditor role",
      "Auditor scope admin assigns controls to an auditor engagement",
      "Certifications page shows lifecycle status and evidence coverage %",
      "Certification detail page displays milestones and timeline",
      "Expiring evidence count auto-updates on certification records",
      "Pen test findings link to controls and track remediation",
    ],
  },
  {
    id: "reporting",
    title: "Reporting & Dashboards",
    icon: BarChart3,
    description: "Dashboards, board reports, and scheduled reports.",
    items: [
      "Main dashboard renders compliance score, status cards, and charts",
      "Executive risk report populates with live risk data",
      "Board report generates a print-ready view",
      "Scheduled report creates a ReportSchedule and sends email",
      "Management dashboard shows KPIs across compliance/risk/tasks",
      "Security posture dashboard reflects current platform hardening status",
    ],
  },
  {
    id: "incidents",
    title: "Incidents & Security Findings",
    icon: Activity,
    description: "Incident lifecycle, escalation, and vulnerability tracking.",
    items: [
      "Create an incident and the timeline auto-populates detection event",
      "Escalation chain advances levels on status change",
      "MTTR/MTTC auto-calculate on containment/resolution dates",
      "Security findings ingest from a connection and create records",
      "High-severity finding triggers a Slack alert",
      "Jira ticket creation for a high-priority finding succeeds",
    ],
  },
  {
    id: "platform",
    title: "Platform Hardening & Governance",
    icon: Database,
    description: "Security headers, audit chain, and governance.",
    items: [
      "Security Command Center shows green posture and intact audit chain",
      "Platform governance page displays architecture and data flow",
      "CSP and security headers present in response (nosniff, frame-ancestors)",
      "Tenant admin can create/update/delete tenant records",
      "User invites respect plan user capacity caps",
      "Billing checkout session creates for Starter/Professional plans",
    ],
  },
];

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return {};
}

export default function TestingChecklist() {
  const [checked, setChecked] = useState({});

  useEffect(() => {
    setChecked(loadState());
  }, []);

  function toggle(sectionId, itemIdx) {
    const key = `${sectionId}:${itemIdx}`;
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  function resetAll() {
    setChecked({});
    localStorage.removeItem(STORAGE_KEY);
  }

  const totalItems = TEST_SECTIONS.reduce((n, s) => n + s.items.length, 0);
  const doneItems = Object.values(checked).filter(Boolean).length;
  const pct = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Testing Checklist (UAT)"
        subtitle="Cross-functional acceptance test plan to validate CertiGuard before an external audit."
        actions={
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        }
      />

      {/* Progress summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-heading font-bold text-foreground">{pct}%</div>
              <p className="text-sm text-muted-foreground">
                {doneItems} of {totalItems} checks completed across {TEST_SECTIONS.length} areas
              </p>
            </div>
            <div className="flex-1 sm:max-w-md">
              <Progress value={pct} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                Hand the remaining goals to Base44's Testing Agent (test-tube icon, side panel) for automated execution.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="grid gap-5 md:grid-cols-2">
        {TEST_SECTIONS.map((section) => {
          const sectionDone = section.items.reduce((n, _, i) => n + (checked[`${section.id}:${i}`] ? 1 : 0), 0);
          const sectionPct = Math.round((sectionDone / section.items.length) * 100);
          const Icon = section.icon;
          return (
            <Card key={section.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{section.description}</CardDescription>
                    </div>
                  </div>
                  <span className={`text-xs font-mono font-semibold px-2 py-1 rounded ${sectionPct === 100 ? "bg-success/15 text-success" : sectionPct > 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>
                    {sectionDone}/{section.items.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-1.5">
                {section.items.map((item, idx) => {
                  const key = `${section.id}:${idx}`;
                  const done = !!checked[key];
                  return (
                    <button
                      key={idx}
                      onClick={() => toggle(section.id, idx)}
                      className={`w-full flex items-start gap-2.5 text-left rounded-md px-2.5 py-2 transition-colors ${done ? "bg-success/5" : "hover:bg-muted/60"}`}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                      )}
                      <span className={`text-sm leading-snug ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {item}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* External partner note */}
      <Card className="border-primary/30 bg-accent/40">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-accent-foreground shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading font-semibold text-foreground">After internal UAT passes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Bring in an independent GRC consultant or CISA-qualified IT auditor to validate that the evidence CertiGuard
                generates would pass a real SOC 2 Type II audit. Suitable firm types: Big Four risk advisory (Deloitte, PwC, EY, KPMG),
                boutique cyber-risk firms (Protiviti, ACA Group, Crowe), or an MSSP for integration testing against your security stack.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}