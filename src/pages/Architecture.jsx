import React from "react";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import {
  Shield, Users, Cloud, Database, Zap, Mail, Slack, Calendar,
  CreditCard, Bug, Workflow, Lock, GitBranch, Server, Cpu, FileCheck, ArrowRight
} from "lucide-react";

const LAYER_BASE = "bg-card rounded-2xl border border-border p-5";
const NODE_BASE = "flex flex-col items-center gap-1.5 rounded-xl px-3 py-2.5 text-center text-xs font-medium border transition-all hover:scale-105";

const frontendPages = [
  "Dashboard", "Frameworks", "Controls", "Risks", "Policies", "Evidence",
  "Audits", "Vendors", "Tasks", "Reports", "Certifications", "Incidents",
  "Trust Center", "Pricing", "Login/Register", "Readiness Report",
];

const entities = [
  "Tenant", "Control", "Framework", "Risk", "Policy", "Evidence",
  "ComplianceTask", "Vendor", "Incident", "Certification", "AuditTrail",
  "PenTest", "SecurityFinding", "PrivacyRequest", "ControlTest",
];

const functions = [
  "provisionTenant", "sendDueReminders", "stripeWebhook", "createCheckoutSession",
  "syncAwsSecurityHub", "runControlTests", "scanCertificationExpiry", "logAudit",
  "verifyAuditChain", "syncIdpDirectory", "ingestSecurityFindings",
];

const workflows = [
  "Due Task Reminders", "Cert Expiry Scanner", "Evidence Expiry Scanner",
  "Daily Control Tests", "Weekly Board Report", "Continuous Monitoring",
  "Vendor Contract Scan", "Access Recertification", "SLA Breach Escalation",
  "Compliance Readiness Summary",
];

const connectors = [
  { name: "Gmail", icon: Mail, color: "text-rose-500 bg-rose-50 border-rose-200" },
  { name: "Slack Bot", icon: Slack, color: "text-purple-500 bg-purple-50 border-purple-200" },
  { name: "Google Drive", icon: FileCheck, color: "text-blue-500 bg-blue-50 border-blue-200" },
  { name: "Google Calendar", icon: Calendar, color: "text-emerald-500 bg-emerald-50 border-emerald-200" },
  { name: "Stripe", icon: CreditCard, color: "text-indigo-500 bg-indigo-50 border-indigo-200" },
  { name: "AWS Sec Hub", icon: Cloud, color: "text-amber-500 bg-amber-50 border-amber-200" },
  { name: "Jira", icon: Bug, color: "text-sky-500 bg-sky-50 border-sky-200" },
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
            <p className="text-sm text-slate-300 mt-0.5">Multi-tenant RegTech · React + Base44 BaaS · 35+ entities · 25+ workflows · 7 integrations</p>
          </div>
        </div>
      </div>

      {/* LAYER 1: Users / Entry */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 1 — Users & Access</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {["Admin", "Compliance Officer", "Risk Manager", "Auditor", "External Auditor", "Department Head", "HR", "New Signup (Trial)"].map((r) => (
            <span key={r} className={`${NODE_BASE} bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800/50 dark:border-slate-700`}>
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* LAYER 2: Frontend */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 2 — Frontend (React + Tailwind + Vite)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {frontendPages.map((p) => (
            <span key={p} className={`${NODE_BASE} bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300`}>
              {p}
            </span>
          ))}
          <span className={`${NODE_BASE} bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700`}>
            +50 more pages
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Auth Context</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Tenant Context (RLS)</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">React Query</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Radix UI / shadcn</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">Recharts</span>
          <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">RBAC Hooks</span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* LAYER 3: Auth + Security */}
      <div className={LAYER_BASE + " mb-4 border-amber-200 dark:border-amber-800/50"}>
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 3 — Authentication & Row-Level Security</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Email + OTP</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">12+ char policy</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Google OAuth</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">SSO provider</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Tenant Isolation</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">user.data.tenant_id</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 p-3 text-center">
            <p className="text-xs font-semibold text-foreground">Role-Based Access</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">admin → viewer</p>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* LAYER 4: Backend Functions */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 4 — Backend Functions (Deno / TypeScript)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {functions.map((f) => (
            <span key={f} className={`${NODE_BASE} bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300 font-mono`}>
              {f}
            </span>
          ))}
          <span className={`${NODE_BASE} bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700`}>
            +24 more
          </span>
        </div>
      </div>

      {/* LAYER 5: Workflows (side by side with functions) */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Workflow className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 5 — Automated Workflows (Scheduled + Event-Triggered)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {workflows.map((w) => (
            <span key={w} className={`${NODE_BASE} bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-900/20 dark:border-violet-800 dark:text-violet-300`}>
              {w}
            </span>
          ))}
          <span className={`${NODE_BASE} bg-violet-100 border-violet-300 text-violet-800 dark:bg-violet-900/30 dark:border-violet-700`}>
            +15 more
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* LAYER 6: Data */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 6 — Data Model (Base44 Entities + RLS)</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {entities.map((e) => (
            <span key={e} className={`${NODE_BASE} bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300`}>
              {e}
            </span>
          ))}
          <span className={`${NODE_BASE} bg-slate-200 border-slate-400 text-slate-800 dark:bg-slate-700 dark:border-slate-500`}>
            +20 more entities
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">Audit Trail</p>
            <p className="text-muted-foreground">Hash-chain integrity · WORM-style immutable logging</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">Multi-Tenant Isolation</p>
            <p className="text-muted-foreground">Every entity scoped by tenant_id via RLS rules</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="font-semibold text-foreground mb-1">File Storage</p>
            <p className="text-muted-foreground">Evidence uploads via UploadFile → signed URLs</p>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
      </div>

      {/* LAYER 7: Integrations */}
      <div className={LAYER_BASE + " mb-4"}>
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide">Layer 7 — External Integrations & Connectors</h3>
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
          <p><span className="font-semibold text-foreground">Signup:</span> Pricing → Register → OTP → provisionTenant → Tenant created → Dashboard</p>
          <p><span className="font-semibold text-foreground">Billing:</span> Pricing → createCheckoutSession → Stripe Checkout → stripeWebhook → Tenant upgraded</p>
          <p><span className="font-semibold text-foreground">Task Reminders:</span> Daily 8am → sendDueReminders → Gmail to assignees + Slack alert</p>
          <p><span className="font-semibold text-foreground">Control Monitoring:</span> Daily → runControlTests → Control status updated → Evidence auto-collected</p>
          <p><span className="font-semibold text-foreground">Audit:</span> Every entity mutation → logAudit → AuditTrail (hash-chained)</p>
          <p><span className="font-semibold text-foreground">Calendar Sync:</span> User connects Google Calendar → syncMyCalendarTasks → tasks appear in calendar</p>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/" className="text-xs text-primary hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );
}