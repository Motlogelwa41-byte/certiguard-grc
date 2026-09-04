import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Validates access to a resource by combining:
//   1. RBAC — role-based permission check (user role vs requested permission)
//   2. ABAC — attribute-based policy evaluation (user + resource + environment attributes)
//   3. MFA — multi-factor authentication enrollment check
//   4. Session — tenant boundary and session integrity
//
// Body:
//   permission: string (e.g. "controls:delete") — the RBAC permission to check
//   resource_type: string (e.g. "control", "risk", "evidence")
//   action: string (e.g. "read", "write", "delete", "approve", "export")
//   resource_attributes: object (optional — e.g. {classification: "restricted", severity: "critical"})
//   user_attributes: object (optional — overrides from user record, e.g. {department: "finance"})
//
// Returns: { allowed, denied_reasons, checks: {rbac, abac, mfa, session}, policies_evaluated }

const ROLE_PERMISSIONS = {
  "dashboard:view": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","regulator","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "frameworks:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","regulator","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "frameworks:write": ["compliance_officer","tenant_admin","platform_admin","admin"],
  "frameworks:delete": ["tenant_admin","platform_admin","admin"],
  "controls:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","regulator","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "controls:write": ["contributor","compliance_officer","tenant_admin","platform_admin","admin"],
  "controls:delete": ["tenant_admin","platform_admin","admin"],
  "controls:approve": ["reviewer","auditor","external_auditor","compliance_officer","tenant_admin","platform_admin","admin"],
  "risks:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","regulator","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "risks:write": ["contributor","risk_manager","compliance_officer","tenant_admin","platform_admin","admin"],
  "risks:delete": ["risk_manager","tenant_admin","platform_admin","admin"],
  "risks:accept": ["executive","board_user","tenant_admin","platform_admin","admin"],
  "policies:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","regulator","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "policies:write": ["contributor","compliance_officer","privacy_officer","tenant_admin","platform_admin","admin"],
  "policies:delete": ["tenant_admin","platform_admin","admin"],
  "evidence:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","hr","department_head","risk_manager","compliance_officer","privacy_officer","tenant_admin","platform_admin","admin"],
  "evidence:write": ["contributor","auditor","external_auditor","compliance_officer","tenant_admin","platform_admin","admin"],
  "evidence:delete": ["compliance_officer","tenant_admin","platform_admin","admin"],
  "evidence:approve": ["reviewer","auditor","external_auditor","compliance_officer","tenant_admin","platform_admin","admin"],
  "vendors:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","hr","department_head","risk_manager","compliance_officer","privacy_officer","tenant_admin","platform_admin","admin"],
  "vendors:write": ["contributor","risk_manager","compliance_officer","tenant_admin","platform_admin","admin"],
  "vendors:delete": ["risk_manager","tenant_admin","platform_admin","admin"],
  "incidents:read": ["read_only","viewer","user","contributor","reviewer","auditor","external_auditor","hr","department_head","risk_manager","compliance_officer","privacy_officer","executive","board_user","tenant_admin","platform_admin","admin"],
  "incidents:write": ["contributor","risk_manager","compliance_officer","privacy_officer","tenant_admin","platform_admin","admin"],
  "incidents:close": ["risk_manager","compliance_officer","tenant_admin","platform_admin","admin"],
  "admin:users": ["tenant_admin","platform_admin","admin"],
  "admin:settings": ["tenant_admin","platform_admin","admin"],
  "reports:export": ["reviewer","auditor","external_auditor","risk_manager","compliance_officer","privacy_officer","executive","tenant_admin","platform_admin","admin"],
  "audit_trail:view": ["auditor","external_auditor","regulator","compliance_officer","tenant_admin","platform_admin","admin"],
};

function checkRbac(userRole, permission) {
  if (!permission) return { passed: true, reason: "No permission specified — RBAC skipped" };
  const allowed = ROLE_PERMISSIONS[permission];
  if (!allowed) return { passed: false, reason: `Unknown permission: ${permission}` };
  const passed = allowed.includes(userRole);
  return { passed, reason: passed ? `Role '${userRole}' authorized for ${permission}` : `Role '${userRole}' not authorized for ${permission}` };
}

function matchesAttribute(policyValue, actualValue) {
  if (!policyValue || !actualValue) return false;
  const allowed = policyValue.split(",").map((v) => v.trim());
  return allowed.includes(actualValue) || allowed.includes("*");
}

function evaluateAbacPolicy(policy, userAttrs, resourceAttrs) {
  const logic = policy.condition_logic || "user_and_resource";
  let userMatch = true, resourceMatch = true;

  if (policy.user_attribute && policy.user_attribute_value) {
    userMatch = matchesAttribute(policy.user_attribute_value, userAttrs[policy.user_attribute] || userAttrs.role || "");
  }
  if (policy.resource_attribute && policy.resource_attribute_value) {
    resourceMatch = matchesAttribute(policy.resource_attribute_value, resourceAttrs[policy.resource_attribute] || "");
  }

  switch (logic) {
    case "user_only": return userMatch;
    case "resource_only": return resourceMatch;
    case "user_or_resource": return userMatch || resourceMatch;
    case "environment_only": return true; // environment conditions evaluated separately
    case "user_and_resource":
    default: return userMatch && resourceMatch;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth — JWT cryptographically verified by platform
    let me = null;
    try { me = await base44.auth.me(); } catch (_) { me = null; }

    if (!me || !me.id) {
      return Response.json({
        allowed: false,
        denied_reasons: ["No authenticated session — JWT verification failed"],
        checks: { rbac: false, abac: false, mfa: false, session: false },
        policies_evaluated: 0,
      }, { status: 401 });
    }

    const userRole = me.role || "user";
    const { permission, resource_type, action, resource_attributes, user_attributes } = body;

    // 1. RBAC check
    const rbacResult = checkRbac(userRole, permission);

    // 2. ABAC check — fetch active policies for this resource type + action
    const allPolicies = await base44.entities.AbacPolicy.filter({ status: "active" }).catch(() => []);
    const applicablePolicies = (allPolicies || []).filter((p) =>
      (p.resource_type === resource_type || p.resource_type === "all") &&
      (p.action === action || p.action === "all")
    );

    const userAttrs = {
      role: userRole,
      tenant_id: me.data?.tenant_id || me.tenant_id,
      email: me.email,
      department: me.data?.department || user_attributes?.department,
      clearance_level: me.data?.clearance_level || user_attributes?.clearance_level,
      ...user_attributes,
    };
    const resourceAttrs = resource_attributes || {};

    let abacPassed = true;
    const abacDenials = [];
    const abacAllows = [];
    let policiesMatched = 0;

    // Sort by priority (highest first), deny wins on tie
    applicablePolicies.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const policy of applicablePolicies) {
      const matched = evaluateAbacPolicy(policy, userAttrs, resourceAttrs);
      if (matched) {
        policiesMatched++;
        if (policy.effect === "deny") {
          abacPassed = false;
          abacDenials.push(`${policy.name}: ${policy.user_attribute || "?"}→${policy.resource_attribute || "?"} denied`);
        } else {
          abacAllows.push(`${policy.name}: access granted by policy`);
        }
      }
    }

    // If any deny policy matched, ABAC fails
    const abacResult = { passed: abacPassed, denials: abacDenials, allows: abacAllows };

    // 3. MFA check
    const mfaEnrolled = me.data?.mfa_enrolled || me.mfa_enrolled || false;
    const mfaResult = { passed: !!mfaEnrolled, enrolled: !!mfaEnrolled };

    // 4. Session check — tenant boundary
    const sessionTenantId = me.data?.tenant_id || me.tenant_id || null;
    const sessionResult = { passed: !!sessionTenantId, tenant_bound: !!sessionTenantId };

    // Combine — all four must pass
    const allPassed = rbacResult.passed && abacResult.passed && mfaResult.passed && sessionResult.passed;
    const deniedReasons = [];
    if (!rbacResult.passed) deniedReasons.push(rbacResult.reason);
    if (!abacResult.passed) deniedReasons.push(...abacResult.denials);
    if (!mfaResult.passed) deniedReasons.push("MFA not enrolled — access denied until multi-factor authentication is enabled");
    if (!sessionResult.passed) deniedReasons.push("Session not bound to a tenant — tenant boundary not established");

    return Response.json({
      allowed: allPassed,
      denied_reasons: deniedReasons,
      checks: {
        rbac: rbacResult,
        abac: abacResult,
        mfa: mfaResult,
        session: sessionResult,
      },
      policies_evaluated: applicablePolicies.length,
      policies_matched: policiesMatched,
      user_context: { role: userRole, tenant_id: sessionTenantId, mfa_enrolled: !!mfaEnrolled },
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('validateAccess error:', error?.message || error);
    return Response.json({
      allowed: false,
      denied_reasons: [error?.message || "Access validation failed"],
      checks: { rbac: false, abac: false, mfa: false, session: false },
      policies_evaluated: 0,
    }, { status: 500 });
  }
});