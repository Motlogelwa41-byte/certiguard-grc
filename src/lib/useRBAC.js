import { useCallback, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";

// Enterprise role hierarchy (higher index = more privileges)
const ROLE_HIERARCHY = [
  "read_only", "viewer", "user", "contributor", "reviewer",
  "auditor", "external_auditor", "regulator", "hr", "department_head",
  "risk_manager", "compliance_officer", "privacy_officer",
  "executive", "board_user", "tenant_admin", "platform_admin", "admin"
];

// Granular permissions by module and action
const PERMISSIONS = {
  "dashboard:view": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],

  "frameworks:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "frameworks:write": ["compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "frameworks:delete": ["tenant_admin", "platform_admin", "admin"],

  "controls:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "controls:write": ["contributor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "controls:delete": ["tenant_admin", "platform_admin", "admin"],
  "controls:approve": ["reviewer", "auditor", "external_auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "controls:test": ["contributor", "auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "risks:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "risks:write": ["contributor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "risks:delete": ["risk_manager", "tenant_admin", "platform_admin", "admin"],
  "risks:approve": ["reviewer", "risk_manager", "auditor", "executive", "tenant_admin", "platform_admin", "admin"],
  "risks:accept": ["executive", "board_user", "tenant_admin", "platform_admin", "admin"],

  "policies:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "policies:write": ["contributor", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "policies:delete": ["tenant_admin", "platform_admin", "admin"],
  "policies:approve": ["reviewer", "compliance_officer", "executive", "tenant_admin", "platform_admin", "admin"],

  "evidence:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "evidence:write": ["contributor", "auditor", "external_auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "evidence:delete": ["compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "evidence:approve": ["reviewer", "auditor", "external_auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "audits:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "audits:write": ["contributor", "auditor", "external_auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "audits:delete": ["tenant_admin", "platform_admin", "admin"],
  "audits:approve": ["reviewer", "auditor", "external_auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "vendors:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "vendors:write": ["contributor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "vendors:delete": ["risk_manager", "tenant_admin", "platform_admin", "admin"],

  "tasks:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "tasks:write": ["contributor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "tasks:assign": ["department_head", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "incidents:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "incidents:write": ["contributor", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "incidents:close": ["risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "privacy:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "privacy:write": ["contributor", "privacy_officer", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "privacy:approve": ["reviewer", "privacy_officer", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "remediation:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "remediation:write": ["contributor", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "remediation:approve": ["reviewer", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "assets:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "assets:write": ["contributor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "assets:delete": ["tenant_admin", "platform_admin", "admin"],

  "bcdr:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "bcdr:write": ["contributor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "workflows:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "workflows:write": ["compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "workflows:delete": ["tenant_admin", "platform_admin", "admin"],

  "alerts:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "tenant_admin", "platform_admin", "admin"],
  "alerts:write": ["compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "alerts:acknowledge": ["contributor", "reviewer", "risk_manager", "compliance_officer", "privacy_officer", "department_head", "tenant_admin", "platform_admin", "admin"],

  "admin:users": ["tenant_admin", "platform_admin", "admin"],
  "admin:tenants": ["platform_admin", "admin"],
  "admin:settings": ["tenant_admin", "platform_admin", "admin"],
  "admin:platform": ["platform_admin", "admin"],

  "reports:view": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "regulator", "hr", "department_head", "risk_manager", "compliance_officer", "privacy_officer", "executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "reports:export": ["reviewer", "auditor", "external_auditor", "risk_manager", "compliance_officer", "privacy_officer", "executive", "tenant_admin", "platform_admin", "admin"],

  "audit_trail:view": ["auditor", "external_auditor", "regulator", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "training:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "training:write": ["contributor", "hr", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "notifications:send": ["risk_manager", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],

  "ai:audit": ["auditor", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "ai:gap_analysis": ["auditor", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "ai:document_analysis": ["contributor", "auditor", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],
  "ai:approve": ["reviewer", "compliance_officer", "privacy_officer", "tenant_admin", "platform_admin", "admin"],

  "cybersecurity:read": ["read_only", "viewer", "user", "contributor", "reviewer", "auditor", "external_auditor", "hr", "department_head", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "cybersecurity:write": ["contributor", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],
  "cybersecurity:approve": ["reviewer", "risk_manager", "compliance_officer", "tenant_admin", "platform_admin", "admin"],

  "executive:view": ["executive", "board_user", "tenant_admin", "platform_admin", "admin"],
  "board:view": ["board_user", "tenant_admin", "platform_admin", "admin"],
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
    if (userIdx === -1) return false;
    if (targetIdx === -1) return false;
    return userIdx >= targetIdx;
  }, [userRole]);

  const isReadOnly = userRole === "read_only" || userRole === "viewer" || userRole === "auditor" || userRole === "external_auditor";
  const isExecutive = userRole === "executive" || userRole === "board_user";
  const isPrivacyOfficer = userRole === "privacy_officer";
  const isAdmin = userRole === "admin" || userRole === "platform_admin" || userRole === "tenant_admin";

  return { role: userRole, can, cannot, isAtLeast, isReadOnly, isExecutive, isPrivacyOfficer, isAdmin, roles: ROLE_HIERARCHY };
}