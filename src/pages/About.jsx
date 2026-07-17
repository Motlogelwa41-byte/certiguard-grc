import React from "react";
import { ShieldCheck, Sparkles, Activity, Lock, Target, Heart, Building2, ArrowDown } from "lucide-react";

const PILLARS = [
  { icon: Sparkles, title: "AI Cognitive Engine", desc: "AI-native intelligence that bridges human integrity with automated precision." },
  { icon: Activity, title: "Continuous Monitoring", desc: "Always-on compliance automation and predictive risk analytics." },
  { icon: Lock, title: "IGGL Trust Ledger", desc: "Our proprietary Immutable Governance Ledger for tamper-evidence." },
];

export default function About() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-primary p-8 sm:p-12 text-center text-white mb-10">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">Welcome to</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold mb-2">CertiGuard GRC</h1>
          <p className="text-white/70 font-medium">A Product of Ethical Edge GRC Consulting (Pty) Ltd</p>
        </div>
      </div>

      {/* Our Story */}
      <Section icon={Building2} title="Our Story">
        <SubHeading>Built on African Soil, Engineered for Global Trust</SubHeading>
        <p>
          At Ethical Edge GRC Consulting, we have always believed that governance is not about checking
          boxes or surviving an annual audit. True governance is a reflection of an organization's character.
        </p>
        <p>
          Based in Gaborone, Botswana, we have spent years standing side-by-side with businesses across the
          region, helping them navigate complex regulatory waters, protect their people, and build
          reputations that last. We saw firsthand how hard it is for organizations to maintain momentum when
          trapped in endless spreadsheets, fragmented frameworks, and reactive compliance cycles.
        </p>
        <p>
          We knew there had to be a better way — a way to turn compliance from a heavy corporate burden into an
          empowering asset. That is why we engineered <strong className="text-foreground">CertiGuard GRC</strong>.
        </p>
      </Section>

      {/* Why CertiGuard */}
      <Section icon={Sparkles} title="Why CertiGuard?">
        <p>
          CertiGuard GRC is the culmination of everything we stand for at Ethical Edge. It is an AI-native,
          Cognitive GRC platform built specifically to bridge the gap between human integrity and automated
          precision.
        </p>
        <p>
          By combining continuous compliance automation with predictive risk analytics, climate resilience,
          and our proprietary Immutable Governance Ledger (IGGL), CertiGuard ensures your organization is not
          just ready for today's audit, but resilient against tomorrow's challenges.
        </p>
      </Section>

      {/* Architecture diagram */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-8">
        <div className="flex flex-col items-center gap-4">
          <DiagramCard accent="from-slate-600 to-slate-500" title="Ethical Edge GRC Consulting" subtitle="The Human Core" />
          <ArrowDown className="w-5 h-5 text-muted-foreground" />
          <div className="w-full max-w-md">
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5">
              <p className="text-center font-heading font-bold text-foreground mb-4">CertiGuard GRC Platform</p>
              <div className="grid gap-3">
                {PILLARS.map((p) => (
                  <div key={p.title} className="flex items-center gap-3 rounded-lg bg-background border border-border p-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <p.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Dividend */}
      <Section icon={Heart} title="The Trust Dividend: Our Promise to You">
        <p>
          When you build your compliance architecture on CertiGuard, you are doing more than adopting a software
          platform. You are gaining a dedicated partner rooted in a culture of high compliance standards, deep
          regional expertise, and a relentless commitment to ethical excellence.
        </p>
      </Section>

      {/* Mission */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-blue-700 p-8 text-white text-center mb-8">
        <Target className="w-8 h-8 mx-auto mb-3 opacity-90" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">Our Mission</p>
        <p className="text-lg font-heading font-semibold leading-relaxed max-w-2xl mx-auto">
          To give your organization the "ethical edge" it needs to win market trust, protect its assets, and
          scale with absolute confidence.
        </p>
      </div>

      {/* Closing */}
      <p className="text-center text-muted-foreground italic max-w-2xl mx-auto">
        Thank you for trusting us to protect what you build. Welcome to the future of proactive governance.
      </p>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
      </div>
      <div className="pl-12 space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}

function SubHeading({ children }) {
  return <p className="font-heading font-semibold text-foreground">{children}</p>;
}

function DiagramCard({ accent, title, subtitle }) {
  return (
    <div className={`w-full max-w-sm rounded-xl bg-gradient-to-br ${accent} px-5 py-4 text-white text-center`}>
      <p className="font-heading font-bold">{title}</p>
      <p className="text-xs text-white/80 mt-0.5">{subtitle}</p>
    </div>
  );
}