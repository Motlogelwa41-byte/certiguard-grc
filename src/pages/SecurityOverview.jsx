import React from "react";
import { Link } from "react-router-dom";
import {
  Shield, Lock, KeyRound, Users, Eye, Zap, Activity, Server,
  FileCheck, Bug, RefreshCw, AlertTriangle, CheckCircle2, Database, Cloud, Fingerprint
} from "lucide-react";

const PILLARS = [
  { icon: Lock, title: "Encryption Everywhere", desc: "AES-256-GCM at rest, TLS 1.3 in transit, KMS-managed keys with 90-day rotation." },
  { icon: KeyRound, title: "Identity & Access", desc: "OIDC SSO, 12+ char password policy, MFA-ready, least-privilege RBAC." },
  { icon: Fingerprint, title: "Tenant Isolation", desc: "Row-Level Security (RLS) on every entity — one tenant can never see another's data." },
  { icon: Eye, title: "Immutable Audit Trail", desc: "Hash-chained, WORM-style event logs — tamper-evident by design (IGGL)." },
];

const CONTROLS = [
  { icon: Users, title: "Access Control", points: [
    "Role-based access control (RBAC): admin, compliance officer, risk manager, auditor, department head, viewer",
    "Row-Level Security (RLS) enforced server-side on every database query",
    "Service-role credentials isolated from app-user credentials",
    "Session tokens are Secure, HttpOnly, SameSite=Strict cookies",
    "Automatic session timeout and idle lock for sensitive operations",
  ]},
  { icon: Database, title: "Data Protection", points: [
    "AES-256-GCM encryption for all stored data (database, files, backups)",
    "TLS 1.3 with HSTS for all network communication — no fallback to TLS 1.2",
    "Evidence files stored with signed, time-limited access URLs",
    "PII fields never logged in plaintext in audit trails or application logs",
    "Secure data export and cryptographic erasure on request",
  ]},
  { icon: Eye, title: "Audit & Monitoring", points: [
    "Every entity mutation (create/update/delete) logged with user, timestamp, and change diff",
    "Audit trail entries are hash-chained — any tampering breaks the chain visibly",
    "ControlTestResult entity is append-only (update/delete denied via RLS)",
    "Real-time security alerts via Slack for critical findings and control regressions",
    "Continuous control monitoring runs daily with automated evidence collection",
  ]},
  { icon: Zap, title: "Vulnerability Management", points: [
    "Dependency scanning on every build — vulnerable packages blocked from deployment",
    "Regular penetration testing by independent third-party firms",
    "Responsible disclosure program — security researchers can report vulnerabilities",
    "Critical security patches deployed within 48 hours of availability",
    "OWASP Top 10 and CWE coverage in automated security tests",
  ]},
  { icon: AlertTriangle, title: "Incident Response", points: [
    "Documented incident response plan with defined roles (incident commander, comms, forensics)",
    "Automated escalation chains for critical and high-severity incidents",
    "Customer notification within 30 minutes for confirmed Critical/High incidents",
    "MTTR (Mean Time to Resolve) tracked per incident with continuous improvement targets",
    "Post-incident reviews with root-cause analysis and remediation tracking",
  ]},
  { icon: RefreshCw, title: "Business Continuity", points: [
    "Multi-availability-zone deployment with automatic failover",
    "Database snapshots every 15 minutes (RPO ≤ 15 min)",
    "Full service restoration within 4 hours (RTO ≤ 4 hours)",
    "Quarterly disaster recovery exercises with documented results",
    "Immutable backup vaults protect against ransomware and destructive attacks",
  ]},
];

const COMPLIANCE = [
  { name: "SOC 2 Type II", status: "In Progress", desc: "Security, availability, and confidentiality criteria" },
  { name: "ISO 27001", status: "In Progress", desc: "Information security management system" },
  { name: "POPIA (South Africa)", status: "Aligned", desc: "Protection of Personal Information Act" },
  { name: "GDPR (EU)", status: "Aligned", desc: "General Data Protection Regulation" },
  { name: "FSRA Cyber Rules (Botswana)", status: "Aligned", desc: "Financial Sector Regulatory Authority" },
  { name: "Kenya DPA", status: "Aligned", desc: "Data Protection Act, 2019" },
];

export default function SecurityOverview() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/90 flex items-center justify-center mx-auto mb-5">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Security Overview</h1>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">
            How CertiGuard GRC protects your data, secures your tenant, and maintains the trust of banks,
            governments, and enterprises across SADC and beyond.
          </p>
          <p className="text-xs text-slate-400 mt-3">Last updated: January 2026 · Version 2.0</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Security Pillars */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-slate-200 p-5 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <p.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Detailed Controls */}
        {CONTROLS.map((c, i) => (
          <section key={c.title}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <c.icon className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">{i + 1}. {c.title}</h2>
            </div>
            <div className="pl-12 space-y-2">
              {c.points.map((pt, j) => (
                <div key={j} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Compliance Posture */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Compliance Posture</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pl-0 md:pl-12">
            {COMPLIANCE.map((c) => (
              <div key={c.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-slate-900 text-sm">{c.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === "Aligned" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>{c.status}</span>
                </div>
                <p className="text-xs text-slate-500">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Commitment */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-slate-50 border border-slate-200 p-6 text-center">
          <Shield className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Our Commitment to Your Trust</h2>
          <p className="text-slate-600 text-sm leading-relaxed max-w-2xl mx-auto">
            CertiGuard GRC is engineered to meet the security and compliance requirements of the most demanding organisations —
            central banks, government ministries, financial institutions, mining houses, manufacturers, and educational institutions.
            We continuously invest in security hardening, independent audits, and transparency because your trust is our core DNA.
          </p>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400 space-y-1">
          <p>CertiGuard GRC · A product of Ethical Edge GRC Consulting (Pty) Ltd · Gaborone, Botswana</p>
          <p>Security questions? Contact our security team for due diligence packages and right-to-audit provisions.</p>
          <p className="flex items-center justify-center gap-3 pt-2">
            <Link to="/trust-center" className="underline hover:text-slate-600">Trust Center</Link>
            <span>·</span>
            <Link to="/sla" className="underline hover:text-slate-600">SLA</Link>
            <span>·</span>
            <Link to="/data-residency" className="underline hover:text-slate-600">Data Residency</Link>
            <span>·</span>
            <Link to="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="underline hover:text-slate-600">Terms</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}