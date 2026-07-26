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

      const stampedTenantId = me.tenant_id || me.data?.tenant_id;
      let userTenant = null;
      let tenantId = stampedTenantId || null;

      // 1. Read the tenant linked to the user profile (RLS allows id match)
      if (tenantId) {
        userTenant = await base44.entities.Tenant.get(tenantId).catch(() => null);
      }

      // 2. Otherwise resolve by admin_email (user is the workspace owner)
      if (!userTenant) {
        const byEmail = await base44.entities.Tenant.filter({ admin_email: me.email }).catch(() => []);
        if (byEmail.length > 0) {
          userTenant = byEmail[0];
          tenantId = byEmail[0].id;
        }
      }

      // 3. No tenant at all — provision a new 14-day trial workspace
      if (!userTenant) {
        try {
          const res = await base44.functions.invoke("provisionTenant", {});
          if (res?.data?.tenant_id) {
            userTenant = res.data.tenant;
            tenantId = res.data.tenant_id;
          }
        } catch (e) {
          // Provisioning failed — fall through to trial defaults below
        }
      }

      // Stamp the user profile + isolation context once we have a tenant
      if (userTenant && tenantId) {
        setTenantContext(tenantId);
        if (!stampedTenantId) {
          await base44.auth.updateMe({ tenant_id: tenantId }).catch(() => {});
        }
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