import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShieldCheck, Mail, Lock, Loader2, ArrowRight, Building2, UserPlus
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import GoogleIcon from "@/components/GoogleIcon";
import MicrosoftIcon from "@/components/MicrosoftIcon";
import { toast } from "@/components/ui/use-toast";
import { logLogin } from "@/lib/authAudit";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { meetsPasswordPolicy } from "@/lib/passwordPolicy";
import { safeReturnTo } from "@/lib/authReturnTo";

function MobileBrandHeader() {
  return (
    <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
      <div className="w-11 h-11 rounded-xl bg-primary flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-primary-foreground" />
      </div>
      <div>
        <div className="text-foreground font-heading font-bold text-lg leading-none tracking-tight">CERTIGUARD</div>
        <div className="text-emerald-600 dark:text-emerald-400 text-xs font-medium tracking-wide mt-0.5">GRC · RegTech PLATFORM</div>
      </div>
    </div>
  );
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!meetsPasswordPolicy(password)) {
      setError("Password must be 12+ characters with uppercase, lowercase, a number, and a symbol.");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      await logLogin("otp");
      // Fire the marketing funnel event — once per new registration.
      try {
        base44.analytics.track({ eventName: "trial_signup_completed" });
      } catch (e) { /* analytics is best-effort */ }
      // New registrants land in the guided onboarding flow so they're not
      // staring at an empty dashboard. If they came from a protected page
      // (returnTo is set), respect that destination instead.
      const rawReturnTo = new URLSearchParams(window.location.search).get("returnTo");
      window.location.href = rawReturnTo ? safeReturnTo() : "/guided-onboarding";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const handleMicrosoft = () => {
    base44.auth.loginWithProvider("microsoft", safeReturnTo());
  };

  if (showOtp) {
    return (
      <div className="min-h-screen flex bg-background">
        <AuthBrandPanel />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
            <div className="w-full max-w-md">
              <MobileBrandHeader />
              <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-4">
                  <Mail className="w-3.5 h-3.5" />
                  Step 2 of 2 · Verify
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">Verify your email</h1>
                <p className="text-muted-foreground text-sm mt-2">
                  We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpCode}
                  onChange={setOtpCode}
                  autoFocus
                  autoComplete="one-time-code"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full h-12 font-medium text-base"
                onClick={handleVerify}
                disabled={loading || otpCode.length < 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & continue
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-5">
                Didn't receive the code?{" "}
                <button onClick={handleResend} className="text-primary font-medium hover:underline">
                  Resend
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AuthBrandPanel />
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">
            <MobileBrandHeader />

            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground mb-4">
                <Building2 className="w-3.5 h-3.5" />
                New tenant workspace
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-foreground">Create your account</h1>
              <p className="text-muted-foreground text-sm mt-2">
                Start your CertiGuard GRC workspace — provision your tenant in minutes.
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
                <span className="bg-background px-3 text-muted-foreground">or register with email</span>
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
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
                <PasswordStrengthMeter password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-12 font-medium text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create account
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground/70 mt-8">
              By registering you agree to CertiGuard's terms & data processing policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}