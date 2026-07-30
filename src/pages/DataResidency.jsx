import React from "react";
import { Link } from "react-router-dom";
import { Globe, Database, Shield, Lock, MapPin, Server, Trash2, FileCheck, Cloud, ArrowRight } from "lucide-react";

const REGIONS = [
  { region: "Primary (EU-West)", location: "Frankfurt, Germany", flag: "🇩🇪", purpose: "Primary application & database hosting", sovereignty: "GDPR-compliant EU data centre" },
  { region: "Secondary (US-East)", location: "Virginia, USA", flag: "🇺🇸", purpose: "CDN & static asset delivery", sovereignty: "No customer data stored" },
  { region: "Backup Storage", location: "Multi-region encrypted", flag: "🔒", purpose: "Encrypted backup snapshots", sovereignty: "AES-256 encrypted, 35-day retention" },
];

const DATA_CATEGORIES = [
  { type: "Customer Data", desc: "Controls, risks, policies, evidence, tasks, vendors, incidents", stored: "Primary region (EU-West)", encrypted: true, retained: "Active subscription + 90 days post-termination" },
  { type: "Authentication Data", desc: "Email, hashed passwords, session tokens, OAuth tokens", stored: "Primary region (EU-West)", encrypted: true, retained: "Active account lifetime" },
  { type: "Audit Trail", desc: "Immutable hash-chained event logs (IGGL)", stored: "Primary region (EU-West)", encrypted: true, retained: "7 years (regulatory requirement)" },
  { type: "Evidence Files", desc: "Uploaded documents, screenshots, certificates", stored: "Primary region (EU-West)", encrypted: true, retained: "Active subscription + 90 days post-termination" },
  { type: "Usage Analytics", desc: "Aggregated, anonymised platform metrics", stored: "Primary region (EU-West)", encrypted: true, retained: "13 months" },
];

const SOVEREIGNTY_ITEMS = [
  { icon: Shield, title: "POPIA (South Africa)", desc: "Compliant with the Protection of Personal Information Act. Data subjects can exercise access, correction, and erasure rights via the Privacy Request portal." },
  { icon: FileCheck, title: "GDPR (European Union)", desc: "Compliant with the General Data Protection Regulation. Lawful basis, data minimisation, and purpose limitation principles applied throughout." },
  { icon: Globe, title: "SADC Data Sovereignty", desc: "We support data localisation requirements for SADC member states. Government and financial sector clients can request in-region data residency consultations." },
  { icon: Lock, title: "Cross-Border Transfer Controls", desc: "All cross-border data transfers use TLS 1.3 encryption and Standard Contractual Clauses (SCCs). No data is transferred to jurisdictions without adequate protection." },
  { icon: Database, title: "Data Minimisation", desc: "We collect only the data necessary to deliver the GRC platform. No secondary use of customer data for advertising or training external models." },
  { icon: Trash2, title: "Right to Erasure", desc: "Customers can initiate full data export and erasure at any time via the Data Privacy portal. Erasure is completed within 30 days with cryptographic verification." },
];

export default function DataResidency() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 to-blue-950">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/90 flex items-center justify-center mx-auto mb-5">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Data Residency & Sovereignty</h1>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">Where your data lives, how it's protected, and how we comply with data sovereignty laws across SADC and beyond.</p>
          <p className="text-xs text-slate-400 mt-3">Effective Date: 1 January 2026 · Version 2.0</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Hosting Regions */}
        <section>
          <SectionHeader icon={MapPin} title="1. Data Hosting Regions" />
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            CertiGuard GRC is hosted on enterprise-grade cloud infrastructure with the following regional distribution.
            Customer data is stored in the primary region unless a specific data localisation arrangement is in place.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {REGIONS.map((r) => (
              <div key={r.region} className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{r.flag}</span>
                  <h3 className="font-bold text-slate-900 text-sm">{r.region}</h3>
                </div>
                <p className="text-xs text-slate-500 mb-2">{r.location}</p>
                <p className="text-xs text-slate-700 mb-2">{r.purpose}</p>
                <div className="flex items-start gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-2">
                  <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{r.sovereignty}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Categories */}
        <section>
          <SectionHeader icon={Database} title="2. Data Categories & Storage" />
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data Category</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Encrypted</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Retention</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DATA_CATEGORIES.map((d) => (
                  <tr key={d.type} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{d.type}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{d.desc}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Lock className="w-3 h-3" /> AES-256
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">{d.retained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sovereignty Compliance */}
        <section>
          <SectionHeader icon={Shield} title="3. Data Sovereignty Compliance" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOVEREIGNTY_ITEMS.map((item) => (
              <div key={item.title} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SADC Government & Banking */}
        <section className="rounded-2xl bg-gradient-to-br from-slate-50 to-emerald-50 border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <Cloud className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">SADC Government & Financial Sector Data Localisation</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            We understand that SADC government ministries, central banks (including the Bank of Botswana), and financial
            regulators may require data to be stored within national borders. CertiGuard GRC offers:
          </p>
          <div className="space-y-2">
            {[
              "Dedicated in-region deployment consultations for government and banking clients",
              "Data processing agreements (DPAs) tailored to national data protection laws",
              "Independent security assessments and right-to-audit provisions for enterprise contracts",
              "Sub-processor disclosure and contractual flow-down of data protection obligations",
              "Data localisation attestations and hosting region certificates upon request",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Encryption Details */}
        <section>
          <SectionHeader icon={Lock} title="4. Encryption Standards" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Server className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Data at Rest</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All database records, file uploads, and backups are encrypted using AES-256-GCM. Encryption keys are managed
                via the cloud provider's Key Management Service (KMS) with automatic key rotation every 90 days.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-900 text-sm">Data in Transit</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                All network communication uses TLS 1.3 with HSTS, certificate pinning, and forward secrecy. API endpoints
                reject connections below TLS 1.3. No plaintext protocols are used anywhere in the platform.
              </p>
            </div>
          </div>
        </section>

        {/* Data Subject Rights */}
        <section>
          <SectionHeader icon={FileCheck} title="5. Data Subject Rights" />
          <p className="text-slate-600 text-sm leading-relaxed mb-3">
            Data subjects (individuals whose personal data is processed on the platform) have the following rights, exercisable
            through the in-app Privacy Request portal or by contacting the Data Protection Officer:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {["Right of Access", "Right to Rectification", "Right to Erasure", "Right to Portability",
              "Right to Object", "Right to Restriction", "Right to Withdraw Consent", "Right to Complain"].map((right) => (
              <div key={right} className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                <p className="text-xs font-medium text-slate-700">{right}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400 space-y-1">
          <p>CertiGuard GRC · A product of Ethical Edge GRC Consulting (Pty) Ltd · Gaborone, Botswana</p>
          <p className="flex items-center justify-center gap-3">
            <Link to="/trust-center" className="underline hover:text-slate-600">Trust Center</Link>
            <span>·</span>
            <Link to="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
            <span>·</span>
            <Link to="/sla" className="underline hover:text-slate-600">SLA</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}