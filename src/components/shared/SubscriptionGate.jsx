import React from "react";
import { Link } from "react-router-dom";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/TenantContext";
import { useAuth } from "@/lib/AuthContext";

export default function SubscriptionGate({ children }) {
  const { tenant, loading } = useTenant();
  const { user } = useAuth();

  if (loading || !tenant) return children;

  const status = tenant.subscription_status;
  const expired =
    status === "expired" ||
    status === "cancelled" ||
    (status === "trial" && tenant.trial_ends_at && new Date(tenant.trial_ends_at) < new Date());

  if (!expired) return children;

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-heading font-bold text-foreground mb-2">
          {status === "trial" ? "Your trial has ended" : "Subscription inactive"}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          {isAdmin
            ? "Reactivate or upgrade your plan to restore access for your team."
            : "Your organization's plan is no longer active. Please contact your administrator to restore access."}
        </p>
        {isAdmin ? (
          <div className="space-y-3">
            <Link to="/pricing">
              <Button className="w-full">
                <Crown className="w-4 h-4 mr-1" /> Upgrade plan
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/tenant-admin">
              <Button variant="outline" className="w-full">Manage billing</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
            Need access? Reach out to your workspace administrator.
          </div>
        )}
      </div>
    </div>
  );
}