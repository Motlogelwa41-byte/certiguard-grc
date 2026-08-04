import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const FRAMEWORKS = [
  { name: "SOC 2", tag: "Global", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { name: "ISO 27001", tag: "Global", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { name: "NIST CSF", tag: "US", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { name: "POPIA", tag: "South Africa", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { name: "SADC Model Law", tag: "SADC", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { name: "GDPR", tag: "EU", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { name: "COSO ERM", tag: "Global", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { name: "PCI DSS", tag: "Industry", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { name: "HIPAA", tag: "US", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20" },
  { name: "ISO 27017", tag: "Cloud", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20" },
  { name: "ISO 27018", tag: "Privacy", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
  { name: "CMMC", tag: "US Gov", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20" },
];

export default function LandingFrameworks() {
  return (
    <section id="frameworks" className="py-20 sm:py-24 bg-muted/30 border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Coverage</span>
          <h2 className="mt-2 text-3xl sm:text-4xl font-heading font-bold text-foreground tracking-tight">
            One platform, every framework that matters
          </h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Track multiple frameworks simultaneously with universal controls — map once, satisfy many.
            Native coverage for African regulations you won't find in Drata or Vanta.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {FRAMEWORKS.map((fw) => (
            <div
              key={fw.name}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-colors"
            >
              <span className="text-sm font-medium text-foreground">{fw.name}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border ${fw.color}`}>
                {fw.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/sadc-frameworks" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Explore the SADC framework library <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}