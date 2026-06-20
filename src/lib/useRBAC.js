import { useCallback, useMemo } from "react";
import { useTenant } from "@/lib/TenantContext";

// Role hierarchy (higher index = more privileges)
const ROLE_HIERARCHY = ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"];

// Permissions required for each operation
const PERMISSIONS = {
  // Dashboard
  "dashboard:view": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  
  // Framework operations
  "frameworks:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "frameworks:write": ["compliance_officer", "admin"],
  "frameworks:delete": ["admin"],

  // Control operations
  "controls:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "controls:write": ["compliance_officer", "admin"],
  "controls:delete": ["admin"],
  "controls:approve": ["auditor", "admin"],

  // Risk operations
  "risks:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "risks:write": ["risk_manager", "compliance_officer", "admin"],
  "risks:delete": ["risk_manager", "admin"],
  "risks:approve": ["risk_manager", "auditor", "admin"],

  // Policy operations
  "policies:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "policies:write": ["compliance_officer", "admin"],
  "policies:delete": ["admin"],
  "policies:approve": ["compliance_officer", "admin"],

  // Evidence operations
  "evidence:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "evidence:write": ["auditor", "compliance_officer", "admin"],
  "evidence:delete": ["compliance_officer", "admin"],
  "evidence:approve": ["auditor", "compliance_officer", "admin"],

  // Audit operations
  "audits:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "audits:write": ["auditor", "compliance_officer", "admin"],
  "audits:delete": ["admin"],
  "audits:approve": ["auditor", "admin"],

  // Vendor operations
  "vendors:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "vendors:write": ["risk_manager", "compliance_officer", "admin"],
  "vendors:delete": ["risk_manager", "admin"],

  // Task operations
  "tasks:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "tasks:write": ["compliance_officer", "admin"],
  "tasks:assign": ["risk_manager", "compliance_officer", "admin"],

  // Admin operations
  "admin:users": ["admin"],
  "admin:tenants": ["admin"],
  "admin:settings": ["admin"],

  // Reports & Analytics
  "reports:view": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "reports:export": ["auditor", "risk_manager", "compliance_officer", "admin"],

  // Audit trail
  "audit_trail:view": ["auditor", "compliance_officer", "admin"],

  // Incidents
  "incidents:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "incidents:write": ["risk_manager", "compliance_officer", "admin"],
  "incidents:close": ["risk_manager", "admin"],

  // Training
  "training:read": ["user", "viewer", "auditor", "risk_manager", "compliance_officer", "admin"],
  "training:write": ["compliance_officer", "admin"],

  // Notifications
  "notifications:send": ["risk_manager", "compliance_officer", "admin"],

  // AI features (Professional+)
  "ai:audit": ["auditor", "compliance_officer", "admin"],
  "ai:gap_analysis": ["auditor", "compliance_officer", "admin"],
};

/**
 * Check if a user with the given role can perform an action
 */
export function canPerform(userRole, permission) {
  if (!userRole) return false;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

/**
 * React hook for RBAC checks
 */
export function useRBAC() {
  const { tenant } = useTenant();

  const userRole = useMemo(() => {
    // For now, derive from tenant context or default to "admin"
    // In production, this would come from the authenticated user's role
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("user_role");
        if (stored) return stored;
      } catch {}
    }
    return "admin"; // Default for development
  }, [tenant]);

  const can = useCallback((permission) => canPerform(userRole, permission), [userRole]);
  const cannot = useCallback((permission) => !canPerform(userRole, permission), [userRole]);

  const isAtLeast = useCallback((role) => {
    const userIdx = ROLE_HIERARCHY.indexOf(userRole);
    const targetIdx = ROLE_HIERARCHY.indexOf(role);
    return userIdx >= targetIdx;
  }, [userRole]);

  return { role: userRole, can, cannot, isAtLeast, roles: ROLE_HIERARCHY };
}