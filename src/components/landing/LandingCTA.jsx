import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const INCLUDED = [
  "14-day free trial — no credit card required",
  "Pre-loaded frameworks, policies, and control tests",
  "AI-powered control mapping and evidence collection",
  "Auditor portal and public Trust Center included",
];

export default function LandingCTA() {
  return (
    <section className="py-20 sm:py-24 bg-muted/30 border-t border-border">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(217_33%_15%)] to-[hsl(215_28%_9%)] p-8 sm:p-12 text-center">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[hsl(160_84%_37%)]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-[hsl(160_84%_45%)]/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white tracking-tight">
              Get audit-ready in weeks, not months
            </h2>
            <p className="mt-3 text-slate-300 max-w-xl mx-auto leading-relaxed">
              Join the RegTech platform built for African enterprises and global teams alike.
              Start your free trial today.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(222_47%_11%)] bg-[hsl(160_84%_45%)] hover:bg-[hsl(160_84%_50%)] rounded-lg px-6 py-3 transition-colors shadow-lg shadow-emerald-500/20">
                Start free trial <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-6 py-3 transition-colors">
                Compare plans
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {INCLUDED.map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(160_84%_55%)]" /> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}