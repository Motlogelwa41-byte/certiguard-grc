import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building2, ShieldCheck, FileCheck, Paperclip, AlertTriangle, Award,
  Zap, CheckCircle2, XCircle, Clock, Calendar, TrendingUp, UserCheck, Lock
} from "lucide-react";

// A fictional, fully-illustrated example of what a mature CertiGuard setup
// looks like. None of this is real data — it's a teaching aid showing clients
// "what good looks like" across frameworks, controls, risk, and certification.

const COMPANY = {
  name: "Acme Financial Services",
  industry: "Fintech / Payments",
  size: "Mid-market (240 employees)",
  framework: "SOC 2 Type II",
  readiness: 78,
  totalControls: 64,
  passing: 42,
  failing: 8,
  notApplicable: 6,
  notTested: 8,
};

const SAMPLE_CONTROL = {
  id: "AC-012",
  title: "Multi-factor authentication enforced on all privileged accounts",
  category: "access_control",
  status: "passing",
  severity: "critical",
  owner: "Thabo Molefe — Head of IT Security",
  automation: "automated",
  evidenceCount: 4,
  lastTested: "2026-07-15",
  nextReview: "2026-10-15",
  testResult: "pass",
  testSummary: "12/12 privileged accounts have MFA enforced via Okta. No exceptions found.",
  frameworks: ["SOC 2 CC6.1", "ISO 27001 A.9.4.2", "NIST CSF PR.AC-7"],
};

const SAMPLE_RISK = {
  id: "RISK-007",
  title: "Third-party payment processor outage disrupts settlement",
  category: "third_party",
  likelihood: 3,
  impact: 4,
  score: 12,
  band: "tolerance_zone",
  treatment: "mitigate",
  owner: "Lerato Nkosi — COO",
  mitigation: "Dual-processor failover contract (DPO Group + PayFast); quarterly failover test; SLA 99.5%.",
  acceptedBy: "Kabelo Sithole — CEO",
  acceptedAt: "2026-06-01",
  expiresAt: "2027-06-01",
};

const CERT_MILESTONES = [
  { phase: "Gap Assessment", date: "2026-02", done: true },
  { phase: "Implementation", date: "2026-04", done: true },
  { phase: "Readiness Review", date: "2026-06", done: true },
  { phase: "Audit Fieldwork", date: "2026-08", done: false, current: true },
  { phase: "Remediation", date: "2026-10", done: false },
  { phase: "Certified", date: "2026-12", done: false },
];

export default function SampleWalkthrough() {
  return (
    <div className="space-y-6">
      <Callout>
        <strong>Meet Acme Financial Services.</strong> A fictional 240-person fintech using CertiGuard to pursue
        <strong> SOC 2 Type II</strong>. What follows is what their workspace looks like at month six — a realistic,
        illustrative example of a mature compliance program. None of this data is real; it's here so you can see
        what "done" looks like before you build your own.
      </Callout>

      {/* Company snapshot + framework readiness */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{COMPANY.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{COMPANY.industry} · {COMPANY.size}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Pursuing" value={COMPANY.framework} />
            <Row label="Maturity level" value="Level 4 — Managed & Measurable" />
            <Row label="Plan" value="Professional (100 users, 20 frameworks)" />
            <Row label="Trial started" value="2026-01-15" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Framework Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">SOC 2 Type II</span>
                <span className="text-primary font-semibold">{COMPANY.readiness}%</span>
              </div>
              <Progress value={COMPANY.readiness} className="h-2.5" />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="Passing" value={COMPANY.passing} tone="success" />
              <Stat label="Failing" value={COMPANY.failing} tone="destructive" />
              <Stat label="N/A" value={COMPANY.notApplicable} tone="muted" />
              <Stat label="Not tested" value={COMPANY.notTested} tone="warning" />
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {COMPANY.passing} of {COMPANY.totalControls} controls passing. {COMPANY.failing} failing controls are
              in remediation with auto-generated tasks and owners.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sample control */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-primary" /> Sample Control — {SAMPLE_CONTROL.id}
            </CardTitle>
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Passing
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-medium">{SAMPLE_CONTROL.title}</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Category" value="Access Control" />
            <Row label="Severity" value={<Badge variant="outline" className="border-destructive/40 text-destructive">Critical</Badge>} />
            <Row label="Owner" value={SAMPLE_CONTROL.owner} />
            <Row label="Automation" value={<Badge variant="outline" className="gap-1"><Zap className="w-3 h-3" /> Automated</Badge>} />
            <Row label="Last tested" value={SAMPLE_CONTROL.lastTested} icon={Calendar} />
            <Row label="Next review" value={SAMPLE_CONTROL.nextReview} icon={Clock} />
            <Row label="Evidence on file" value={<span className="flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {SAMPLE_CONTROL.evidenceCount} items</span>} />
            <Row label="Test result" value={<Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> Pass</Badge>} />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Latest automated test</p>
            <p>{SAMPLE_CONTROL.testSummary}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SAMPLE_CONTROL.frameworks.map((f) => (
              <Badge key={f} variant="secondary" className="font-mono text-xs">{f}</Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            One control, mapped to three frameworks — so it's tested once and counts toward SOC 2, ISO 27001, and NIST CSF simultaneously.
          </p>
        </CardContent>
      </Card>

      {/* Sample risk */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" /> Sample Risk — {SAMPLE_RISK.id}
            </CardTitle>
            <Badge className="bg-warning text-warning-foreground">{SAMPLE_RISK.band.replace("_", " ")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="font-medium">{SAMPLE_RISK.title}</p>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Category" value="Third-party" />
            <Row label="Owner" value={SAMPLE_RISK.owner} />
            <Row label="Likelihood × Impact" value={`${SAMPLE_RISK.likelihood} × ${SAMPLE_RISK.impact} = ${SAMPLE_RISK.score}`} />
            <Row label="Treatment" value={<Badge variant="outline" className="capitalize">{SAMPLE_RISK.treatment}</Badge>} />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Mitigation plan</p>
            <p>{SAMPLE_RISK.mitigation}</p>
          </div>
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Formal risk acceptance (above tolerance)
            </p>
            <div className="grid sm:grid-cols-3 gap-x-6 gap-y-1">
              <Row label="Accepted by" value={SAMPLE_RISK.acceptedBy} />
              <Row label="Signed" value={SAMPLE_RISK.acceptedAt} />
              <Row label="Expires" value={SAMPLE_RISK.expiresAt} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            This risk sits in the <strong>tolerance zone</strong> — above appetite but acceptable with the mitigation in place. Because it exceeds appetite,
            CertiGuard required a typed signature and an expiry date, creating an auditable sign-off trail.
          </p>
        </CardContent>
      </Card>

      {/* Certification lifecycle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Certification Lifecycle — SOC 2 Type II
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {CERT_MILESTONES.map((m, i) => (
              <div key={m.phase} className="flex items-center shrink-0">
                <div className="flex flex-col items-center w-24 text-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1.5 ${
                    m.done ? "bg-success text-success-foreground"
                    : m.current ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {m.done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <p className={`text-xs font-medium ${m.current ? "text-primary" : "text-foreground"}`}>{m.phase}</p>
                  <p className="text-[10px] text-muted-foreground">{m.date}</p>
                </div>
                {i < CERT_MILESTONES.length - 1 && (
                  <div className={`w-6 h-0.5 mx-1 ${m.done ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground pt-2">
            Acme is currently in <strong>Audit Fieldwork</strong>. Their external auditor received a secure, tokenised
            link (passphrase + expiry) granting observation-only access to scoped evidence — no data export, no loose files.
          </p>
        </CardContent>
      </Card>

      {/* Board report excerpt */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Board Report — Excerpt (Q2 2026)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <BoardStat label="Overall readiness" value="78%" sub="+12 pts QoQ" tone="success" />
            <BoardStat label="Open risks" value="14" sub="2 above appetite" tone="warning" />
            <BoardStat label="Critical controls" value="100%" sub="all passing" tone="success" />
            <BoardStat label="Evidence coverage" value="89%" sub="6 expiring soon" tone="muted" />
          </div>
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
            <p className="font-medium text-foreground">Executive summary</p>
            <p>The compliance program remains on track for SOC 2 Type II certification in December 2026. Readiness
            improved 12 points quarter-over-quarter, driven by automated evidence collection from Okta, AWS, and
            GitHub. Two risks remain above appetite and have formal executive sign-off in place. No critical
            controls are failing; remediation is focused on 8 medium-severity controls ahead of audit fieldwork.</p>
          </div>
        </CardContent>
      </Card>

      <Callout>
        <strong>That's a complete, mature program in one screen.</strong> Frameworks scored, controls tested
        automatically, risks quantified and formally accepted, a certification on the horizon, and a board-ready
        summary — all maintained continuously by CertiGuard's automation rather than rebuilt in spreadsheets each
        audit cycle. Your workspace will look like this too, once you've walked the lifecycle above.
      </Callout>
    </div>
  );
}

function Callout({ children }) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground [&_strong]:text-foreground">
      {children}
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const tones = {
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    muted: "text-muted-foreground",
  };
  return (
    <div className="rounded-lg bg-muted/50 py-2">
      <p className={`text-lg font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function BoardStat({ label, value, sub, tone }) {
  const tones = { success: "text-success", warning: "text-warning", muted: "text-muted-foreground" };
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${tones[tone] || "text-foreground"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}