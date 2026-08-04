import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Zap, FileCheck, Globe2 } from "lucide-react";

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient + glows */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(217_33%_15%)] to-[hsl(215_28%_9%)]" />
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[hsl(160_84%_37%)]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full bg-[hsl(160_84%_45%)]/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(160_84%_60%)] bg-[hsl(160_84%_37%)]/10 border border-[hsl(160_84%_37%)]/25 rounded-full px-3 py-1">
            <Zap className="w-3.5 h-3.5" /> AI-Powered RegTech GRC Platform
          </span>
          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-white tracking-tight leading-[1.1]">
            Compliance automation built for{" "}
            <span className="text-[hsl(160_84%_55%)]">Africa</span> and the world
          </h1>
          <p className="mt-5 text-lg text-slate-300 max-w-2xl leading-relaxed">
            CertiGuard GRC unifies SOC 2, ISO 27001, NIST CSF, POPIA, and the SADC Model Law into one
            intelligent platform — with AI-driven evidence collection, continuous control monitoring,
            and audit-ready reporting out of the box.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link to="/register" className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(222_47%_11%)] bg-[hsl(160_84%_45%)] hover:bg-[hsl(160_84%_50%)] rounded-lg px-5 py-3 transition-colors shadow-lg shadow-emerald-500/20">
              Start free trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-5 py-3 transition-colors">
              View pricing
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5"><Shield className="w-4 h-4 text-[hsl(160_84%_55%)]" /> No credit card required</span>
            <span className="inline-flex items-center gap-1.5"><FileCheck className="w-4 h-4 text-[hsl(160_84%_55%)]" /> 14-day trial</span>
            <span className="inline-flex items-center gap-1.5"><Globe2 className="w-4 h-4 text-[hsl(160_84%_55%)]" /> SADC & global frameworks</span>
          </div>
        </div>
      </div>
    </section>
  );
}