import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

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

      // Find tenant where this user is admin or member
      const tenants = await base44.entities.Tenant.filter({ is_active: true });
      // For now, match by the user email as admin
      const userTenant = tenants.find(t => t.admin_email === me.email) || tenants[0];
      
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

  return (
    <TenantContext.Provider value={{ tenant, loading, hasFeature, isWithinLimit, refreshTenant: loadTenant }}>
      {children}
    </TenantContext.Provider>
  );
}