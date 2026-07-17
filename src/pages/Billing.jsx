import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Crown, Check, AlertCircle, ExternalLink, Loader2, Calendar, Users, Layers } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { openBillingPortal } from "@/lib/billing";

const TIER_LABELS = {
  trial: "Free Trial",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise"
};

export default function Billing() {
  const { tenant, loading, refreshTenant } = useTenant();
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [usage, setUsage] = useState({ users: 0, frameworks: 0 });

  useEffect(() => {
    (async () => {
      const [users, frameworks] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Framework.list().catch(() => [])
      ]);
      setUsage({ users: users.length || 0, frameworks: frameworks.length || 0 });
    })();
  }, []);

  const handlePortal = async () => {
    setPortalLoading(true);
    try { await openBillingPortal(); }
    finally { setPortalLoading(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const tier = tenant?.subscription_tier || "trial";
  const status = tenant?.subscription_status || "trial";
  const isAdmin = user?.role === "admin";

  // Trial days remaining
  let trialDaysLeft = null;
  if (status === "trial" && tenant?.trial_ends_at) {
    const diff = new Date(tenant.trial_ends_at) - new Date();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const maxUsers = tenant?.max_users ?? (tier === "trial" ? 3 : 5);
  const maxFrameworks = tenant?.max_frameworks ?? (tier === "trial" ? 2 : 5);
  const hasStripeAccount = !!tenant?.stripe_customer_id;
  const statusColor = {
    active: "bg-emerald-100 text-emerald-700",
    trial: "bg-blue-100 text-blue-700",
    past_due: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-700",
    expired: "bg-red-100 text-red-700"
  }[status] || "bg-muted text-muted-foreground";

  return (
    <div>
      <PageHeader
        title="Billing & Plan"
        subtitle="Manage your subscription, billing cycle, and payment method"
        actions={
          isAdmin && hasStripeAccount ? (
            <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
              {portalLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ExternalLink className="w-4 h-4 mr-1" />}
              Manage billing in Stripe
            </Button>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current plan */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-heading font-bold text-foreground">{TIER_LABELS[tier]}</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${statusColor}`}>{status}</span>
              </div>
              {tenant?.billing_cycle && status === "active" && (
                <p className="text-sm text-muted-foreground capitalize">{tenant.billing_cycle} billing</p>
              )}
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Crown className="w-6 h-6 text-primary" />
            </div>
          </div>

          {status === "trial" && trialDaysLeft !== null && (
            <div className={`rounded-xl p-4 mb-6 ${trialDaysLeft <= 3 ? "bg-amber-50 border border-amber-200" : "bg-blue-50 border border-blue-200"}`}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-foreground">
                  {trialDaysLeft > 0 ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your trial` : "Your trial has ended"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upgrade to keep full access for your team.</p>
            </div>
          )}

          {status === "past_due" && (
            <div className="rounded-xl p-4 mb-6 bg-red-50 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <p className="text-sm font-medium text-red-700">Payment failed — update your payment method to avoid losing access.</p>
              </div>
            </div>
          )}

          {isAdmin ? (
            <div className="flex flex-wrap gap-3">
              <Link to="/pricing"><Button><Crown className="w-4 h-4 mr-1" /> {status === "trial" ? "Upgrade plan" : "Change plan"}</Button></Link>
              {hasStripeAccount && (
                <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                  <CreditCard className="w-4 h-4 mr-1" /> Update payment method
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Only your workspace admin can manage billing.</p>
          )}
        </div>

        {/* Usage */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Plan usage</h3>
          <UsageBar icon={Users} label="Users" value={usage.users} max={maxUsers} />
          <UsageBar icon={Layers} label="Frameworks" value={usage.frameworks} max={maxFrameworks} />
          <div className="mt-5 pt-5 border-t border-border">
            <p className="text-xs text-muted-foreground">Billing email</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{tenant?.billing_email || tenant?.admin_email || user?.email || "—"}</p>
          </div>
        </div>
      </div>

      {/* Plan comparison nudge */}
      <div className="mt-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Compare plans & features</h3>
          <p className="text-sm text-muted-foreground mt-0.5">See what's included in each tier and upgrade anytime.</p>
        </div>
        <Link to="/pricing"><Button variant="outline">View pricing <ExternalLink className="w-4 h-4 ml-1" /></Button></Link>
      </div>

      {/* Accepted payment methods */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="w-4 h-4" />
        <span className="font-medium text-foreground">Accepted payment methods:</span>
        {["Visa", "Mastercard", "American Express", "Debit cards", "Credit cards"].map((m) => (
          <span key={m} className="px-2 py-1 rounded-md bg-card border border-border font-medium">{m}</span>
        ))}
        <span>— processed securely by Stripe.</span>
      </div>
    </div>
  );
}

function UsageBar({ icon: Icon, label, value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const near = pct >= 90;
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="w-3.5 h-3.5" /> {label}</span>
        <span className="text-sm font-medium text-foreground">{value} / {max >= 999999 ? "∞" : max}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${near ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}