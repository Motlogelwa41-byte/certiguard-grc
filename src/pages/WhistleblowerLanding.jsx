import React from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  ArrowRight,
  Lock,
  MessageSquare,
  FileText,
  Hash,
  Eye,
  Heart,
  CheckCircle2,
  Building2,
  Users,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Hash,
    title: "Unique case numbers",
    description: "Every report gets a permanent case number. Reporters can check status and receive updates without ever revealing their identity.",
  },
  {
    icon: MessageSquare,
    title: "Two-way anonymous messaging",
    description: "Investigators can ask follow-up questions and share updates through an anonymous channel. The reporter responds — without either side knowing who the other is.",
  },
  {
    icon: FileText,
    title: "Evidence submission",
    description: "Reporters can upload documents, screenshots, and supporting evidence securely. Files are encrypted and access-restricted to the case investigation team.",
  },
  {
    icon: Eye,
    title: "Zero-knowledge identity protection",
    description: "No IP addresses, no email required, no metadata retention. The platform cannot identify the reporter even if compelled to.",
  },
];

const NGO_BENEFITS = [
  {
    icon: Heart,
    title: "Free forever for NGOs",
    description: "No trial expiry. No credit card. No hidden limits. Certified non-profits and community organisations get the full portal at zero cost.",
  },
  {
    icon: Building2,
    title: "Your own branded portal",
    description: "Whistleblowers land on a page with your organisation's name and logo — not a generic third-party form. Builds trust at the most critical moment.",
  },
  {
    icon: Users,
    title: "Case management built in",
    description: "Your integrity team receives cases, assigns investigators, tracks resolution, and reports to your board — all within the same platform.",
  },
  {
    icon: Globe,
    title: "Multi-language ready",
    description: "Serve whistleblowers in their preferred language. The portal auto-detects locale and supports SADC and international languages out of the box.",
  },
];

const STEPS = [
  { step: "1", title: "Sign up for free", description: "Register your NGO with a trial plan. The whistleblower portal is activated automatically — no setup required." },
  { step: "2", title: "Share your portal link", description: "Distribute your unique /whistleblower/report link to staff, volunteers, and stakeholders via your intranet, policies, and onboarding." },
  { step: "3", title: "Receive and investigate", description: "Reports arrive in your case dashboard. Assign investigators, message anonymously, collect evidence, and track resolution." },
];

const SIGNUP_URL = "/register?plan=trial&source=whistleblower";

export default function WhistleblowerLanding() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
              <Shield className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground tracking-tight">CertiGuard GRC</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/landing" className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors">
              ← Back to platform
            </Link>
            <Link to={SIGNUP_URL}>
              <Button size="sm" className="gap-1.5">
                Get your free portal <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 mb-4 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400">
              <Heart className="w-3.5 h-3.5" />
              Free for NGOs — forever
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground tracking-tight leading-tight">
              Give your people a safe way to speak up
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              A secure, anonymous whistleblower portal — with case numbers, two-way anonymous messaging, and evidence submission. Free, standalone, and branded for your organisation. No GRC purchase required.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={SIGNUP_URL}>
                <Button size="lg" className="gap-2">
                  Get your free whistleblower portal <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">See how it works</Button>
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> No trial expiry for NGOs</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Set up in minutes</span>
            </div>
          </div>
        </div>
      </section>

      {/* How anonymous reporting works */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">How anonymous reporting works</h2>
            <p className="mt-3 text-muted-foreground">Reporters stay anonymous. Investigators get the information they need. Everyone stays safe.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-6 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-primary/10 shrink-0">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{f.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why it's free for NGOs */}
      <section className="py-16 lg:py-20 bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Built for non-profits and community organisations</h2>
            <p className="mt-3 text-muted-foreground">Every organisation deserves a safe reporting channel. We remove the cost barrier.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {NGO_BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-emerald-50 shrink-0 dark:bg-emerald-950/40">
                    <b.icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{b.title}</h3>
                    <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to get started */}
      <section id="how-it-works" className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Get started in three steps</h2>
            <p className="mt-3 text-muted-foreground">From sign-up to your first report in under ten minutes.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className="relative">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-heading font-bold mb-4">
                  {s.step}
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & privacy */}
      <section className="py-16 lg:py-20 bg-muted/30 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-5">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Privacy is the product</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            The portal collects no personally identifiable information from reporters. No login, no email, no IP retention. Reports are encrypted at rest with AES-256 and in transit with TLS 1.3. Every action is written to an immutable, hash-chained audit trail — so you can prove the integrity of the case file to your board, your regulators, and the courts.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> POPIA compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> GDPR compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> King IV aligned</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Immutable audit trail</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Ready to give your people a voice?</h2>
          <p className="mt-4 text-muted-foreground">Sign up your NGO today. The whistleblower portal is free, standalone, and live in minutes.</p>
          <div className="mt-8">
            <Link to={SIGNUP_URL}>
              <Button size="lg" className="gap-2">
                Get your free whistleblower portal <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
            {" "}·{" "}
            <Link to="/whistleblower/report" className="text-muted-foreground hover:text-foreground underline">Submit a report</Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-foreground text-sm">CertiGuard GRC</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/landing" className="hover:text-foreground transition-colors">Platform</Link>
              <Link to="/trust-center" className="hover:text-foreground transition-colors">Trust Center</Link>
              <Link to="/security-overview" className="hover:text-foreground transition-colors">Security</Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            </div>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} CertiGuard GRC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}