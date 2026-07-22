import React from "react";
import {
  ShieldCheck, FileCheck, BarChart3, Globe, CheckCircle2
} from "lucide-react";

const TRUST_BADGES = ["SOC 2 Type II", "ISO 27001", "GDPR", "POPIA"];
const FEATURES = [
  { icon: FileCheck, text: "Automated control monitoring & evidence collection" },
  { icon: BarChart3, text: "Real-time compliance posture across 12+ frameworks" },
  { icon: Globe, text: "SADC & international regulatory change tracking" },
  { icon: ShieldCheck, text: "Tamper-evident audit trail with hash-chain integrity" },
];

export default function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col h-full px-12 py-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-heading font-bold text-lg leading-none tracking-tight">CERTIGUARD</div>
            <div className="text-emerald-300/90 text-xs font-medium tracking-wide mt-0.5">GRC · RegTech PLATFORM</div>
          </div>
        </div>

        <div className="mt-16 max-w-md">
          <h2 className="text-white font-heading font-bold text-3xl leading-tight tracking-tight">
            Compliance, automated<br />and audit-ready.
          </h2>
          <p className="text-slate-300 text-sm mt-4 leading-relaxed">
            The governance, risk and compliance platform that unifies controls, risks, vendors and audit evidence — built for multi-tenant teams across SADC and beyond.
          </p>
        </div>

        <ul className="mt-10 space-y-4 max-w-md">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex items-start gap-3">
              <div className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                <f.icon className="w-4 h-4 text-emerald-300" />
              </div>
              <span className="text-slate-200 text-sm leading-snug">{f.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-10">
          <div className="text-emerald-300/80 text-xs font-medium uppercase tracking-wider mb-3">Certified & Aligned</div>
          <div className="flex flex-wrap gap-2">
            {TRUST_BADGES.map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                {b}
              </span>
            ))}
          </div>
          <div className="text-slate-400 text-xs mt-6">
            Trusted by compliance teams & CISOs managing multi-tenant GRC programs.
          </div>
        </div>
      </div>
    </div>
  );
}