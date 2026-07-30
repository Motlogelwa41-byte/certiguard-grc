import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Mail, Lock, Loader2, ArrowRight, Building2
} from "lucide-react";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import GoogleIcon from "@/components/GoogleIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";
import { logLogin } from "@/lib/authAudit";

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

  const handleMicrosoft = () => {
    base44.auth.loginWithProvider("microsoft", "/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <AuthBrandPanel />

      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">
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

            <div className="grid grid-cols-2 gap-3 mb-5">
              <Button
                variant="outline"
                className="h-12 text-sm font-medium"
                onClick={handleGoogle}
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Google
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm font-medium"
                onClick={handleMicrosoft}
              >
                <MicrosoftIcon className="w-5 h-5 mr-2" />
                Microsoft
              </Button>
            </div>

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
                <span>⚠</span>
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
                Start free trial
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