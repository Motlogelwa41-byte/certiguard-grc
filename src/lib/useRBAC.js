import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

// Role hierarchy (higher index = more privileges)
const ROLE_HIERARCHY = ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"];

// Permissions required for each operation
const PERMISSIONS = {
  "dashboard:view": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],

  "frameworks:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "frameworks:write": ["compliance_officer", "admin"],
  "frameworks:delete": ["admin"],

  "controls:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "controls:write": ["compliance_officer", "admin"],
  "controls:delete": ["admin"],
  "controls:approve": ["auditor", "admin"],

  "risks:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "risks:write": ["risk_manager", "compliance_officer", "admin"],
  "risks:delete": ["risk_manager", "admin"],
  "risks:approve": ["risk_manager", "auditor", "admin"],

  "policies:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "policies:write": ["compliance_officer", "admin"],
  "policies:delete": ["admin"],
  "policies:approve": ["compliance_officer", "admin"],

  "evidence:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "evidence:write": ["auditor", "compliance_officer", "admin"],
  "evidence:delete": ["compliance_officer", "admin"],
  "evidence:approve": ["auditor", "compliance_officer", "admin"],

  "audits:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "audits:write": ["auditor", "compliance_officer", "admin"],
  "audits:delete": ["admin"],
  "audits:approve": ["auditor", "admin"],

  "vendors:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "vendors:write": ["risk_manager", "compliance_officer", "admin"],
  "vendors:delete": ["risk_manager", "admin"],

  "tasks:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "tasks:write": ["compliance_officer", "admin"],
  "tasks:assign": ["department_head", "risk_manager", "compliance_officer", "admin"],

  "admin:users": ["admin"],
  "admin:tenants": ["admin"],
  "admin:settings": ["admin"],

  "reports:view": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "reports:export": ["auditor", "risk_manager", "compliance_officer", "admin"],

  "audit_trail:view": ["auditor", "compliance_officer", "admin"],

  "incidents:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "incidents:write": ["risk_manager", "compliance_officer", "admin"],
  "incidents:close": ["risk_manager", "admin"],

  "training:read": ["user", "viewer", "auditor", "hr", "department_head", "risk_manager", "compliance_officer", "admin"],
  "training:write": ["hr", "compliance_officer", "admin"],

  "notifications:send": ["risk_manager", "compliance_officer", "admin"],

  "ai:audit": ["auditor", "compliance_officer", "admin"],
  "ai:gap_analysis": ["auditor", "compliance_officer", "admin"],
};

export function canPerform(userRole, permission) {
  if (!userRole) return false;
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(userRole);
}

export function useRBAC() {
  const { user } = useAuth();
  const userRole = useMemo(() => user?.role || "user", [user]);

  const can = useCallback((permission) => canPerform(userRole, permission), [userRole]);
  const cannot = useCallback((permission) => !canPerform(userRole, permission), [userRole]);

  const isAtLeast = useCallback((role) => {
    const userIdx = ROLE_HIERARCHY.indexOf(userRole);
    const targetIdx = ROLE_HIERARCHY.indexOf(role);
    return userIdx >= targetIdx;
  }, [userRole]);

  return { role: userRole, can, cannot, isAtLeast, isReadOnly: userRole === "auditor" || userRole === "viewer", roles: ROLE_HIERARCHY };
}