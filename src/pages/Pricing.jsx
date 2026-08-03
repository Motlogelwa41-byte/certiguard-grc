import React, { useState } from "react";
import { Check, X, Shield, Zap, Building2, ArrowRight, Star, Lock, Sparkles, Heart, Building, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startDpoCheckout } from "@/lib/billing";

const plans = [
  {
    tier: "trial",
    name: "Free Trial",
    description: "Full access for 14 days — no card required.",
    priceMonthly: 0,
    priceAnnual: 0,
    color: "border-slate-300",
    bg: "bg-slate-50",
    badge: null,
    cta: "Start Free Trial",
    features: [
      { name: "Full Professional features", included: true },
      { name: "3 users included", included: true },
      { name: "2 compliance frameworks", included: true },
      { name: "AI Compliance Auditor", included: true, highlight: true },
      { name: "Dashboard & analytics", included: true },
      { name: "14-day full access", included: true },
      { name: "Email support", included: true },
      { name: "Custom integrations", included: false },
      { name: "SSO / SAML", included: false },
      { name: "Dedicated support", included: false },
    ]
  },
  {
    tier: "ngo",
    name: "NGO / Non-Profit",
    description: "Special impact pricing for registered non-profits and charities.",
    priceMonthly: 199,
    priceAnnual: 149,
    color: "border-emerald-300",
    bg: "bg-emerald-50",
    badge: "Impact Pricing",
    cta: "Get Started",
    features: [
      { name: "Up to 25 users", included: true },
      { name: "10 compliance frameworks", included: true },
      { name: "Control management", included: true },
      { name: "Risk register & heatmap", included: true },
      { name: "Policy management", included: true },
      { name: "Evidence collection", included: true },
      { name: "AI Compliance Auditor", included: true, highlight: true },
      { name: "POPIA / GDPR ready", included: true },
      { name: "Donor reporting templates", included: true },
      { name: "SSO / SAML", included: false },
    ]
  },
  {
    tier: "starter",
    name: "Starter",
    description: "Essential compliance tracking for small teams.",
    priceMonthly: 499,
    priceAnnual: 399,
    color: "border-blue-300",
    bg: "bg-blue-50",
    badge: null,
    cta: "Get Started",
    features: [
      { name: "Up to 10 users", included: true },
      { name: "5 compliance frameworks", included: true },
      { name: "Control management", included: true },
      { name: "Risk register & heatmap", included: true },
      { name: "Policy management", included: true },
      { name: "Evidence collection", included: true },
      { name: "Vendor management", included: true },
      { name: "Audit trail & PDF reports", included: true },
      { name: "AI Auditor", included: false },
      { name: "SSO / SAML", included: false },
    ]
  },
  {
    tier: "professional",
    name: "Professional",
    description: "Complete GRC suite for teams pursuing certification.",
    priceMonthly: 1499,
    priceAnnual: 1199,
    color: "border-primary ring-2 ring-primary shadow-lg shadow-primary/20",
    bg: "bg-primary/5",
    badge: "Most Popular",
    cta: "Get Started",
    features: [
      { name: "Up to 100 users", included: true },
      { name: "20 compliance frameworks", included: true },
      { name: "Everything in Starter", included: true },
      { name: "AI Compliance Auditor", included: true, highlight: true },
      { name: "AI Gap Analysis & ROPA", included: true, highlight: true },
      { name: "Incident management", included: true },
      { name: "Training & awareness", included: true },
      { name: "King V, BDPA, POPIA ready", included: true },
      { name: "Priority email support", included: true },
      { name: "SSO / SAML", included: false },
    ]
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    description: "Unlimited scale with dedicated support.",
    priceMonthly: null,
    priceAnnual: null,
    color: "border-purple-300",
    bg: "bg-purple-50",
    badge: null,
    cta: "Contact Sales",
    features: [
      { name: "Unlimited users", included: true },
      { name: "Unlimited frameworks", included: true },
      { name: "Everything in Professional", included: true },
      { name: "SSO / SAML authentication", included: true, highlight: true },
      { name: "Full API access", included: true, highlight: true },
      { name: "Custom integrations", included: true, highlight: true },
      { name: "Dedicated account manager", included: true },
      { name: "99.9% SLA guarantee", included: true },
      { name: "24/7 priority support", included: true },
      { name: "Quarterly business review", included: true },
    ]
  }
];

const securityHighlights = [
  { icon: Shield, title: "Data Isolation", desc: "Each tenant runs in a logically isolated environment. Cross-tenant access is architecturally impossible." },
  { icon: Building2, title: "Dedicated Tenancy", desc: "Enterprise plans include dedicated infrastructure. Your compliance data is never co-mingled." },
  { icon: Zap, title: "Role-Based Access", desc: "Six granular roles ensure only authorized personnel access sensitive compliance data." },
];

const trustBadges = [
  { label: "Encrypted at rest", icon: Lock },
  { label: "TLS 1.3 in transit", icon: Lock },
  { label: "SOC 2 ready", icon: Shield },
  { label: "GDPR / POPIA ready", icon: Shield },
];

const industries = [
  { icon: Heart, title: "NGOs & Non-Profits", desc: "POPIA-compliant donor data protection, governance reporting, and impact pricing for registered charities.", plan: "NGO / Non-Profit" },
  { icon: Building, title: "SMEs", desc: "Essential compliance tracking, risk register, and policy management for growing teams.", plan: "Starter" },
  { icon: Building2, title: "Enterprises", desc: "Full GRC suite with SSO, API access, and dedicated support for large organizations.", plan: "Enterprise" },
  { icon: Mountain, title: "Mining & Extractives", desc: "SADC cross-border sovereignty, environmental compliance, and King V governance for mining giants.", plan: "Enterprise" },
];

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState("annual");
  const [checkout, setCheckout] = useState(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="text-center pt-20 pb-12 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
          <Shield className="w-4 h-4" /> Enterprise-Grade Multi-Tenant Security
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
          CertiGuard Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose the plan that fits your organization. Every plan includes complete tenant isolation —
          your data is never visible to other companies.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 mt-8 bg-muted rounded-lg p-1">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billingCycle === "monthly" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >Monthly</button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${billingCycle === "annual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >Annual <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">Save 20%</span></button>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-stretch">
          {plans.map((plan) => (
            <div key={plan.tier} className={`relative rounded-2xl border-2 ${plan.color} ${plan.bg} p-6 flex flex-col`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Star className="w-3 h-3 fill-current" /> {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3 className="font-heading text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 min-h-[40px]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6 min-h-[72px]">
                {plan.priceMonthly === 0 ? (
                  <div>
                    <span className="text-4xl font-bold text-foreground">Free</span>
                    <span className="text-muted-foreground ml-1.5 text-sm">/ 14 days</span>
                  </div>
                ) : plan.priceMonthly === null ? (
                  <div>
                    <span className="text-4xl font-bold text-foreground">Custom</span>
                    <p className="text-sm text-muted-foreground mt-1">Contact sales for pricing</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-4xl font-bold text-foreground">
                      ${billingCycle === "annual" ? plan.priceAnnual?.toLocaleString() : plan.priceMonthly?.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground ml-1.5 text-sm">/mo</span>
                    {billingCycle === "annual" && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Billed annually (${(plan.priceAnnual * 12).toLocaleString()}/yr)
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${f.highlight ? "text-primary" : "text-emerald-500"}`} />
                    ) : (
                      <X className="w-4 h-4 mt-0.5 shrink-0 text-slate-300" />
                    )}
                    <span className={`text-sm ${f.included ? (f.highlight ? "text-foreground font-semibold" : "text-foreground") : "text-muted-foreground/70"}`}>
                      {f.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Button
                className="w-full"
                variant={plan.tier === "professional" ? "default" : plan.tier === "trial" ? "secondary" : "outline"}
                size="lg"
                disabled={checkout === plan.tier}
                onClick={async () => {
                  if (plan.tier === "trial") { window.location.href = "/register"; return; }
                  if (plan.tier === "enterprise") { window.location.href = "mailto:sales@certiguard.com"; return; }
                  setCheckout(plan.tier);
                  try { await startDpoCheckout(plan.tier, billingCycle); }
                  finally { setCheckout(null); }
                }}
              >
                {checkout === plan.tier ? "Redirecting…" : plan.cta}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>

            </div>
          ))}
        </div>

        {/* Trial nudge */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 inline mr-1 text-primary" />
            Not sure where to start? <a href="/register" className="text-primary font-medium underline">Start a free 14-day trial</a> — no credit card required.
          </p>
        </div>

        {/* Industries We Serve */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Built for Every Organization</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">From startups to mining giants — CertiGuard scales with your compliance needs.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {industries.map((ind, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <ind.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-1">{ind.title}</h3>
                <p className="text-sm text-muted-foreground">{ind.desc}</p>
                <p className="text-xs text-primary font-medium mt-3">Recommended: {ind.plan}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Tenant Isolation Block */}
        <div className="mt-16 bg-card rounded-2xl border border-border p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-heading text-2xl font-bold text-foreground">Complete Tenant Isolation</h2>
              <p className="text-muted-foreground">Your data is fully isolated — no cross-tenant visibility, ever.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {securityHighlights.map((item, i) => (
              <div key={i} className="bg-muted/50 rounded-xl p-5">
                <item.icon className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-heading font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustBadges.map((s, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 text-center flex flex-col items-center gap-1.5">
                <s.icon className="w-5 h-5 text-emerald-600" />
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-border">
        <p className="text-sm text-muted-foreground">
          All prices in USD. NGO impact pricing requires valid non-profit registration. Volume discounts available for 500+ users.{" "}
          <a href="mailto:sales@certiguard.com" className="text-primary underline">Contact sales</a>
        </p>
      </div>
    </div>
  );
}