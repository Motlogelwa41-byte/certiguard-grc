import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Mail, Lock, Loader2, ArrowRight, FileCheck,
  BarChart3, Globe, CheckCircle2, Building2
} from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { logLogin } from "@/lib/authAudit";

const TRUST_BADGES = ["SOC 2 Type II", "ISO 27001", "GDPR", "POPIA"];
const FEATURES = [
  { icon: FileCheck, text: "Automated control monitoring & evidence collection" },
  { icon: BarChart3, text: "Real-time compliance posture across 12+ frameworks" },
  { icon: Globe, text: "SADC & international regulatory change tracking" },
  { icon: ShieldCheck, text: "Tamper-evident audit trail with hash-chain integrity" },
];

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:flex-col lg:w-[46%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
      {/* Decorative glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col h-full px-12 py-12">
        {/* Logo / wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/90 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-heading font-bold text-lg leading-none tracking-tight">CERTIGUARD</div>
            <div className="text-emerald-300/90 text-xs font-medium tracking-wide mt-0.5">GRC · RegTech PLATFORM</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mt-16 max-w-md">
          <h2 className="text-white font-heading font-bold text-3xl leading-tight tracking-tight">
            Compliance, automated<br />and audit-ready.
          </h2>
          <p className="text-slate-300 text-sm mt-4 leading-relaxed">
            The governance, risk and compliance platform that unifies controls, risks, vendors and audit evidence — built for multi-tenant teams across SADC and beyond.
          </p>
        </div>

        {/* Feature bullets */}
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

        {/* Trust badges */}
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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      await logLogin("email");
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <BrandPanel />

      {/* Form panel */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">
            {/* Mobile brand header */}
            <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
              <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-foreground font-heading font-bold text-lg leading-none tracking-tight">CERTIGUARD</div>
                <div className="text-emerald-600 dark:text-emerald-400 text-xs font-medium tracking-wide mt-0.5">GRC · RegTech PLATFORM</div>
              </div>
            </div>

            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-4">
                <Building2 className="w-3.5 h-3.5" />
                Multi-tenant workspace
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">Sign in to your workspace</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Access your CertiGuard tenant dashboard and compliance controls.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full h-12 text-sm font-medium mb-5"
              onClick={handleGoogle}
            >
              <GoogleIcon className="w-5 h-5 mr-2.5" />
              Continue with Google
            </Button>

            <div className="relative mb-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">or sign in with email</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                <span className="text-destructive">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-medium text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              New to CertiGuard?{" "}
              <Link to="/register" className="text-primary font-medium hover:underline">
                Request access
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground/70 mt-8">
              By signing in you agree to your tenant's acceptable use & data processing terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}