import React from "react";
import {
  ShieldCheck, Bot, FileSearch, Radar, Users, Building2,
  ScrollText, Lock, Workflow,
} from "lucide-react";

const FEATURES = [
  {
    icon: Bot,
    title: "AI-Powered Control Mapping",
    desc: "Automatically map your controls to framework requirements across SOC 2, ISO 27001, NIST CSF, POPIA, and SADC — no manual cross-referencing.",
  },
  {
    icon: Radar,
    title: "Continuous Control Monitoring",
    desc: "Real-time posture detection with automated evidence collection from 15+ native integrations. Drift alerts and closed-loop remediation built in.",
  },
  {
    icon: FileSearch,
    title: "Automated Evidence Collection",
    desc: "Stop chasing screenshots. Evidence is ingested, hashed, and ledgered with SHA-256 integrity for tamper-proof audit trails.",
  },
  {
    icon: ScrollText,
    title: "Policy Lifecycle Management",
    desc: "28 pre-built policy templates, approval workflows, version history, and employee attestation with typed signatures.",
  },
  {
    icon: Users,
    title: "People & Access Compliance",
    desc: "Track SOC 2 personnel controls, run access recertification campaigns, and sync your IDP directory automatically.",
  },
  {
    icon: Building2,
    title: "Vendor Risk Management",
    desc: "Send security questionnaires, score vendor risk, manage onboarding/offboarding, and share a secure vendor portal.",
  },
  {
    icon: Lock,
    title: "COSO ERM Risk Quantification",
    desc: "Qualitative and FAIR quantitative risk modeling with residual ALE, risk appetite bands, and executive heatmaps.",
  },
  {
    icon: Workflow,
    title: "60+ Automated Workflows",
    desc: "Trial scanning, evidence expiry, certification renewal, regulatory broadcasts, and Slack/email alerts — all automated.",
  },
  {
    icon: ShieldCheck,
    title: "Auditor Portal & Trust Center",
    desc: "Give auditors scoped, read-only access. Publish a public Trust Center to showcase your security posture to prospects.",
  },
];

export default function LandingFeatures() {
  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Platform</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">
            Everything you need to stay audit-ready
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            One platform replaces spreadsheets, shared drives, and point tools — with the depth enterprises need
            and the speed startups love.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 border border-primary/15 group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="mt-4 font-heading font-semibold text-foreground">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}