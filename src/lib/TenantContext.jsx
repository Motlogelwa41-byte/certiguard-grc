import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44, setTenantContext } from "@/api/base44Client";

const TenantContext = createContext(null);

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

// Feature definitions per tier
const TIER_FEATURES = {
  trial: ["dashboard", "frameworks_basic", "controls_basic", "risks_basic", "tasks_basic", "policies_basic"],
  starter: ["dashboard", "frameworks_basic", "controls_basic", "risks_basic", "tasks", "policies", "evidence", "vendors", "audits_basic", "calendar", "reports_basic", "audit_trail"],
  professional: ["dashboard", "frameworks", "controls", "risks", "tasks", "policies", "evidence", "vendors", "audits", "calendar", "reports", "audit_trail", "ai_auditor", "gap_analysis", "compliance_runs", "ropa", "incidents", "training", "notifications"],
  enterprise: ["dashboard", "frameworks", "controls", "risks", "tasks", "policies", "evidence", "vendors", "audits", "calendar", "reports", "audit_trail", "ai_auditor", "gap_analysis", "compliance_runs", "ropa", "incidents", "training", "notifications", "custom_integrations", "sso", "api_access", "dedicated_support", "white_label"]
};

const TIER_LIMITS = {
  trial: { maxUsers: 3, maxFrameworks: 2, trialDays: 14 },
  starter: { maxUsers: 10, maxFrameworks: 5 },
  professional: { maxUsers: 100, maxFrameworks: 20 },
  enterprise: { maxUsers: 999999, maxFrameworks: 999999 }
};

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    try {
      const me = await base44.auth.me().catch(() => null);
      if (!me) { setLoading(false); return; }

      // Stamp tenant context from the user profile so creates are isolated
      setTenantContext(me.tenant_id);

      // Resolve the tenant record (admin can read it; non-admins rely on user.tenant_id only)
      const tenants = await base44.entities.Tenant.filter({ is_active: true }).catch(() => []);
      const userTenant = tenants.find((t) => t.admin_email === me.email) || tenants[0];

      // Self-heal: assign this user to the tenant if their profile is missing tenant_id
      if (userTenant && !me.tenant_id) {
        try {
          await base44.auth.updateMe({ tenant_id: userTenant.id });
          setTenantContext(userTenant.id);
        } catch (e) {
          // non-admins may not be able to updateMe; ignore — tenant_id may already be set
        }
      }

      if (userTenant) {
        const tier = userTenant.subscription_tier || "trial";
        setTenant({
          ...userTenant,
          features: TIER_FEATURES[tier] || TIER_FEATURES.trial,
          limits: TIER_LIMITS[tier] || TIER_LIMITS.trial,
        });
      }
    } catch (e) {
      // No tenant yet — use trial defaults
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadTenant(); }, [loadTenant]);

  const hasFeature = (feature) => {
    if (!tenant) return true; // Loading state
    return tenant.features?.includes(feature) || false;
  };

  const isWithinLimit = (limit) => {
    if (!tenant) return true;
    if (limit === "users") {
      return (tenant.max_users || 3) > 0;
    }
    if (limit === "frameworks") {
      return (tenant.max_frameworks || 2) > 0;
    }
    return true;
  };

  // Plan-limit checks for enforcement on create/invite actions
  const canAddUser = (currentCount) => {
    if (!tenant) return true;
    const cap = tenant.limits?.maxUsers ?? tenant.max_users ?? 3;
    return currentCount < cap;
  };

  const canAddFramework = (currentCount) => {
    if (!tenant) return true;
    const cap = tenant.limits?.maxFrameworks ?? tenant.max_frameworks ?? 2;
    return currentCount < cap;
  };

  const isTrialExpired = () => {
    if (!tenant) return false;
    const status = tenant.subscription_status;
    if (status === "expired" || status === "cancelled") return true;
    if (status === "trial" && tenant.trial_ends_at) {
      return new Date(tenant.trial_ends_at) < new Date();
    }
    return false;
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature, isWithinLimit, canAddUser, canAddFramework, isTrialExpired, refreshTenant: loadTenant }}>
      {children}
    </TenantContext.Provider>
  );
}