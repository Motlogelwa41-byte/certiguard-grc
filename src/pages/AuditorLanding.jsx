import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Shield,
  ArrowRight,
  Lock,
  FileCheck,
  ClipboardList,
  Eye,
  Clock,
  KeyRound,
  CheckCircle2,
  Loader2,
  Mail,
  Building2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const PORTAL_FEATURES = [
  {
    icon: Eye,
    title: "Scoped, view-only access",
    description: "See exactly the controls, evidence, and framework mappings the client has assigned to your engagement — nothing more, nothing less.",
  },
  {
    icon: FileCheck,
    title: "Evidence packs on demand",
    description: "Download organized evidence bundles with version history, collection dates, and reviewer sign-off — ready for your working papers.",
  },
  {
    icon: ClipboardList,
    title: "Findings & requests in one place",
    description: "Raise audit findings, request additional evidence, and track resolution status without a single email thread.",
  },
  {
    icon: Clock,
    title: "Time-boxed engagement links",
    description: "Access expires automatically when the engagement window closes. No lingering credentials, no follow-up cleanup.",
  },
];

const TOKEN_STEPS = [
  {
    icon: KeyRound,
    title: "Client issues a secure link",
    description: "The engagement administrator generates a tokenised link from the Auditor Scope module, scoped to the frameworks and systems in your audit.",
  },
  {
    icon: Lock,
    title: "You enter the passphrase",
    description: "Each link is protected by a passphrase shared out-of-band. The token is single-use, time-limited, and bound to your engagement scope.",
  },
  {
    icon: Shield,
    title: "You work inside the portal",
    description: "Review evidence, map controls to requirements, raise findings, and request additional documentation — all within a read-only, audited environment.",
  },
];

const FRAMEWORKS = [
  "SOC 2 Type I & II",
  "ISO 27001 / 27017 / 27018",
  "ISO 27701 (Privacy)",
  "NIST CSF 2.0",
  "NIST 800-53",
  "PCI DSS 4.0",
  "HIPAA",
  "GDPR",
  "POPIA (South Africa)",
  "SADC Data Protection frameworks",
  "King IV (South Africa)",
  "NIS2 (EU)",
];

export default function AuditorLanding() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", firm_name: "", engagement_context: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.firm_name) {
      toast({ title: "Please fill in your name, email, and firm name.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("createAuditorLead", form);
      if (res?.data?.error) {
        toast({ title: res.data.error, variant: "destructive" });
      } else {
        toast({ title: "Request received — we'll reach out within one business day." });
        setForm({ name: "", email: "", firm_name: "", engagement_context: "" });
      }
    } catch (err) {
      toast({ title: err?.message || "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Slim public nav */}
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
            <a href="#request-access" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg px-3.5 py-1.5 transition-colors">
              Request access <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              <Shield className="w-3.5 h-3.5" />
              For External Auditors
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold text-foreground tracking-tight leading-tight">
              The auditor portal that respects your time — and your client's data
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Stop chasing evidence over email. CertiGuard gives external auditors a scoped, secure, read-only portal to review controls, download evidence packs, and raise findings — all through a single time-boxed link.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a href="#request-access">
                <Button size="lg" className="gap-2">
                  Request access for your next engagement <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button size="lg" variant="outline">See how token access works</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What auditors see */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">What you get inside the portal</h2>
            <p className="mt-3 text-muted-foreground">Everything you need for fieldwork, nothing you don't.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {PORTAL_FEATURES.map((f) => (
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

      {/* How token access works */}
      <section id="how-it-works" className="py-16 lg:py-20 bg-muted/30 border-y border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">How token access works</h2>
            <p className="mt-3 text-muted-foreground">No account to create. No password to remember. Just a secure, scoped link.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TOKEN_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-heading font-bold text-sm">
                    {i + 1}
                  </div>
                  <step.icon className="w-5 h-5 text-secondary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                {i < TOKEN_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-5 -right-4 text-border">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-10 flex items-start gap-3 rounded-xl bg-card border border-border p-5 max-w-3xl mx-auto">
            <Lock className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Zero standing access.</span> Tokens are single-use, scoped to specific frameworks and systems, and expire automatically at the engagement end date. Every action inside the portal is written to an immutable, hash-chained audit trail.
            </p>
          </div>
        </div>
      </section>

      {/* Supported frameworks */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Frameworks supported in the portal</h2>
            <p className="mt-3 text-muted-foreground">Your client scopes the link to the frameworks in your engagement. We support the full list below.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {FRAMEWORKS.map((fw) => (
              <div key={fw} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
                <CheckCircle2 className="w-4 h-4 text-secondary shrink-0" />
                <span className="text-sm font-medium text-foreground">{fw}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Request access form */}
      <section id="request-access" className="py-16 lg:py-20 bg-muted/30 border-t border-border">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Request access for your next engagement</h2>
            <p className="mt-3 text-muted-foreground">Tell us about yourself and your upcoming engagement. We'll set you up with a walkthrough and connect you with the client onboarding team.</p>
          </div>
          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-muted-foreground" /> Full name
                </Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Jane Mokoena" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Work email
                </Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="jane@auditfirm.com" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="firm_name" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Firm name
              </Label>
              <Input id="firm_name" name="firm_name" value={form.firm_name} onChange={handleChange} placeholder="Mokoena & Associates Audit" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="engagement_context">Engagement context <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="engagement_context"
                name="engagement_context"
                value={form.engagement_context}
                onChange={handleChange}
                placeholder="e.g. SOC 2 Type II for a fintech client, fieldwork starting November 2026"
                rows={3}
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  Request access <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              We'll respond within one business day. Your details are used solely to set up your portal access.
            </p>
          </form>
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