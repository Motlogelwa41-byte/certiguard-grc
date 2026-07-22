import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, X, ArrowRight, KeyRound } from "lucide-react";

// Admin security-policy banner: nudges MFA enforcement at the IdP level and
// records acknowledgement on the user record for audit purposes.
export default function SecurityPolicyBanner() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";
  const [dismissed, setDismissed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    const ack = user?.security_policy_accepted_at || user?.data?.security_policy_accepted_at;
    setAcknowledged(!!ack);
  }, [user]);

  if (!isAuthenticated || !isAdmin || dismissed || acknowledged) return null;

  const accept = async () => {
    try {
      await base44.auth.updateMe({ security_policy_accepted_at: new Date().toISOString() });
      setAcknowledged(true);
    } catch (e) {
      console.error("Failed to record policy acceptance:", e?.message);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900">
      <div className="px-6 lg:px-8 py-2.5 flex items-center gap-3 text-sm">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-amber-900 dark:text-amber-200 flex-1">
          <strong>Security policy:</strong> Enforce multi-factor authentication (MFA) for all admin accounts via your Identity Provider (Okta / Azure AD) to meet compliance requirements.
        </span>
        <Link
          to="/sso"
          className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-amber-900 dark:text-amber-200 hover:underline shrink-0"
        >
          <KeyRound className="w-3.5 h-3.5" /> Configure SSO/MFA <ArrowRight className="w-3 h-3" />
        </Link>
        <button
          onClick={accept}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 shrink-0"
        >
          Acknowledge
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}