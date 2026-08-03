import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Crown, Check, AlertCircle, ExternalLink, Loader2, Calendar, Users, Layers, Wallet } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const TIER_LABELS = {
  trial: "Free Trial",
  ngo: "NGO / Non-Profit",
  starter: "Starter",
  professional: "Professional",
  enterprise: "Enterprise"
};

export default function Billing() {
  const { tenant, loading, refreshTenant } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const [usage, setUsage] = useState({ users: 0, frameworks: 0 });
  const [manual, setManual] = useState({ tier: "professional", status: "active", billing_cycle: "monthly", payment_ref: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [users, frameworks] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.Framework.list().catch(() => [])
      ]);
      setUsage({ users: users.length || 0, frameworks: frameworks.length || 0 });
    })();
  }, []);

  // Sync manual form defaults from the loaded tenant
  useEffect(() => {
    if (!tenant) return;
    setManual((m) => ({
      ...m,
      tier: tenant.subscription_tier || m.tier,
      status: tenant.subscription_status || m.status,
      billing_cycle: tenant.billing_cycle || m.billing_cycle,
    }));
  }, [tenant]);

  const handleManualProvision = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const limitFor = (t) =>
        t === "enterprise" ? { max_users: 999999, max_frameworks: 999999 } :
        t === "professional" ? { max_users: 100, max_frameworks: 20 } :
        t === "ngo" ? { max_users: 25, max_frameworks: 10 } :
        t === "starter" ? { max_users: 10, max_frameworks: 5 } :
        { max_users: 3, max_frameworks: 2 };
      await base44.entities.Tenant.update(tenant.id, {
        subscription_tier: manual.tier,
        subscription_status: manual.status,
        billing_cycle: manual.billing_cycle,
        ...limitFor(manual.tier),
        notes: `Manually provisioned${manual.payment_ref ? ` — payment ref: ${manual.payment_ref}` : ""} (${user?.email || "admin"}, ${new Date().toISOString()})`
      });
      await refreshTenant();
      toast({ title: "Subscription updated", description: `Plan set to ${TIER_LABELS[manual.tier]} (${manual.status}).`, duration: 2500 });
    } catch (e) {
      toast({ title: "Update failed", description: e?.message || "Could not update subscription.", variant: "destructive", duration: 2500 });
    } finally {
      setSaving(false);
    }
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

      {/* Manual subscription provisioning (admin) — for off-platform payments */}
      {isAdmin && (
        <div className="mt-6 bg-card rounded-2xl border border-amber-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Manual subscription provisioning</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                Use this to set the plan after collecting payment off-platform (EFT, PayFast, Yoco, etc.). DPO Pay checkout is not required.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Plan tier</label>
              <select
                value={manual.tier}
                onChange={(e) => setManual({ ...manual, tier: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {Object.entries(TIER_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={manual.status}
                onChange={(e) => setManual({ ...manual, status: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="past_due">Past due</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Billing cycle</label>
              <select
                value={manual.billing_cycle}
                onChange={(e) => setManual({ ...manual, billing_cycle: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Payment reference (optional)</label>
              <input
                value={manual.payment_ref}
                onChange={(e) => setManual({ ...manual, payment_ref: e.target.value })}
                placeholder="e.g. EFT-20260728-001"
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">This updates plan limits and feature flags instantly. Record the payment reference for audit purposes.</p>
            <Button onClick={handleManualProvision} disabled={saving || !tenant?.id}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Apply subscription
            </Button>
          </div>
        </div>
      )}

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
        {["Visa", "Mastercard", "American Express", "Debit cards", "Mobile Money"].map((m) => (
          <span key={m} className="px-2 py-1 rounded-md bg-card border border-border font-medium">{m}</span>
        ))}
        <span>— processed securely by DPO Pay.</span>
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