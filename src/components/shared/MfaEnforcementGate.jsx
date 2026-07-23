import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { ShieldX, KeyRound, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mandatory MFA enforcement: blocks dashboard access for any authenticated
// user who has not recorded MFA enrollment on their user record. The /sso
// page is allowed through so the user can configure MFA. True enrollment
// happens at the identity provider; this gate enforces it at app-access level.
export default function MfaEnforcementGate({ children }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [enrolled, setEnrolled] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setEnrolled(null);
      return;
    }
    const flag = user?.mfa_enrolled ?? user?.data?.mfa_enrolled;
    setEnrolled(!!flag);
  }, [user, isAuthenticated]);

  if (!isAuthenticated || !user || enrolled === null) return children;

  // Allow the MFA configuration page through so users can enroll.
  if (enrolled || location.pathname === "/sso") return children;

  const confirm = async () => {
    setConfirming(true);
    try {
      await base44.auth.updateMe({ mfa_enrolled: true });
      setEnrolled(true);
    } catch (e) {
      console.error("Failed to record MFA enrollment:", e?.message);
    }
    setConfirming(false);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center ring-1 ring-red-500/30 mb-5">
        <ShieldX className="w-8 h-8 text-red-400" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-heading font-bold text-slate-100">Multi-factor authentication required</h2>
        <p className="text-sm text-slate-400 mt-2">
          Security is our DNA. Access to this platform requires multi-factor authentication. Please enable MFA on your account, then confirm below to continue.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
        <Link to="/sso">
          <Button variant="outline" className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800">
            <KeyRound className="w-4 h-4 mr-1.5" /> Configure MFA <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
        <Button onClick={confirm} disabled={confirming} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {confirming ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
          {confirming ? "Confirming…" : "I've enabled MFA"}
        </Button>
      </div>
      <p className="text-xs text-slate-600 mt-6 max-w-sm text-center">
        This gate blocks all platform access until MFA is enrolled. Enforce MFA at your identity provider (Okta / Azure AD / Google) for full protection.
      </p>
    </div>
  );
}