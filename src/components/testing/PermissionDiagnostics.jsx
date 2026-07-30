import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, KeyRound, Database, ShieldAlert } from "lucide-react";

// Entity RLS reference — mirrors the rls blocks in base44/entities/*.jsonc
// so testers can diagnose access-denied errors without reading backend schemas.
const ENTITY_RLS = [
  { name: "Framework", create: "admin only + tenant_id", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Control", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Risk", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Vendor", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Policy", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Evidence", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match OR admin OR compliance_officer", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "ComplianceTask", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Incident", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match + creator OR admin", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Certification", create: "tenant_id match", read: "tenant_id match OR admin", update: "tenant_id match OR admin OR compliance_officer", delete: "tenant_id match + creator OR admin", tenantScoped: true },
  { name: "Tenant", create: "admin only", read: "creator OR admin_email match OR id==tenant_id OR admin", update: "creator OR admin_email match OR admin", delete: "admin only", tenantScoped: false },
  { name: "AuditorLink", create: "admin only", read: "admin only", update: "admin only", delete: "admin only", tenantScoped: false },
  { name: "ControlTestResult", create: "tenant_id match", read: "tenant_id match OR admin", update: "append-only (denied)", delete: "append-only (denied)", tenantScoped: true },
];

// Permission matrix from useRBAC — which roles can do what
const ROLE_PERMISSIONS = {
  admin: { frameworks: "full", controls: "full", risks: "full", vendors: "full", policies: "full", evidence: "full", audits: "full", users: "manage", tenants: "manage", reports: "export" },
  compliance_officer: { frameworks: "read+write", controls: "read+write", risks: "read+write", vendors: "read+write", policies: "read+write+approve", evidence: "read+write+approve", audits: "read+write+approve", users: "—", tenants: "—", reports: "export" },
  risk_manager: { frameworks: "read", controls: "read", risks: "read+write+approve", vendors: "read+write", policies: "read", evidence: "read", audits: "read", users: "—", tenants: "—", reports: "export" },
  auditor: { frameworks: "read", controls: "read+approve", risks: "read+approve", vendors: "read", policies: "read", evidence: "read+write+approve", audits: "read+write+approve", users: "—", tenants: "—", reports: "export" },
  user: { frameworks: "read", controls: "read", risks: "read", vendors: "read", policies: "read", evidence: "read", audits: "read", users: "—", tenants: "—", reports: "view" },
};

const COMMON_FAILURES = [
  {
    error: "Access denied / 403 on entity list",
    cause: "User's tenant_id does not match the record's tenant_id",
    fix: "Verify the user's profile has the correct tenant_id set. In Test mode, use TenantContext sync to align the production user's tenant_id with the test DB tenant record. Admin role bypasses this check.",
  },
  {
    error: "Cannot create record — permission denied",
    cause: "Entity RLS requires data.tenant_id to equal the user's tenant_id, but the create payload didn't include it or used the wrong value",
    fix: "The base44Client proxy auto-stamps tenant_id on create. If bypassing the proxy, ensure tenant_id is explicitly set to the authenticated user's tenant_id from their auth token.",
  },
  {
    error: "Cannot update/delete a record created by another user",
    cause: "Update/delete RLS requires both tenant_id match AND created_by_id match (unless admin)",
    fix: "Only the record creator or an admin can update/delete. Reassign ownership or use an admin account for the test.",
  },
  {
    error: "Tenant entity not found / empty list",
    cause: "Tenant RLS allows read only if created_by_id, admin_email, or id matches the user's tenant_id",
    fix: "Ensure a Tenant record exists where id == user's tenant_id, or admin_email == user's email, or the user created the tenant record themselves.",
  },
  {
    error: "ControlTestResult update fails",
    cause: "ControlTestResult is append-only — update and delete are denied for all roles",
    fix: "This is by design (immutable audit evidence). Create a new record instead of updating an existing one.",
  },
  {
    error: "Framework create fails for compliance_officer",
    cause: "Framework creation requires admin role (the RLS create rule enforces user_condition role=admin)",
    fix: "Switch to an admin account to create frameworks. Compliance officers can read and update existing frameworks.",
  },
];

export default function PermissionDiagnostics() {
  const [selectedRole, setSelectedRole] = useState("compliance_officer");
  const perms = ROLE_PERMISSIONS[selectedRole];

  return (
    <div className="space-y-5">
      {/* Common access-denied failures */}
      <Card className="border-amber-200 dark:border-amber-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <div>
              <CardTitle className="text-base">Access-Denied Troubleshooter</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                When a test fails with a permission or access error, look up the exact cause and fix below.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {COMMON_FAILURES.map((f, i) => (
            <div key={i} className="border border-border rounded-lg p-3 bg-muted/30">
              <div className="flex items-start gap-2 mb-1.5">
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-foreground">{f.error}</p>
              </div>
              <div className="ml-6 space-y-1">
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Root cause:</span> {f.cause}</p>
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Fix:</span> {f.fix}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Role-based permission lookup */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Role Permission Matrix</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Select a role to see what that tenant user can access. Compare against the failing test to identify the missing permission.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {Object.keys(ROLE_PERMISSIONS).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  selectedRole === role
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {role.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-2 font-medium">Module</th>
                  <th className="text-left p-2 font-medium">Access Level</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(perms).map(([module, access]) => (
                  <tr key={module} className="border-b border-border/50">
                    <td className="p-2 font-medium capitalize">{module}</td>
                    <td className="p-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        access === "full" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : access === "—" ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      }`}>
                        {access}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Entity RLS reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-base">Entity RLS Rules</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Row-Level Security conditions enforced by the backend for each entity. Match the error to the rule.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left p-2 font-medium">Entity</th>
                  <th className="text-left p-2 font-medium">Create</th>
                  <th className="text-left p-2 font-medium">Read</th>
                  <th className="text-left p-2 font-medium">Update</th>
                  <th className="text-left p-2 font-medium">Delete</th>
                </tr>
              </thead>
              <tbody>
                {ENTITY_RLS.map((e) => (
                  <tr key={e.name} className="border-b border-border/40 hover:bg-muted/30">
                    <td className="p-2 font-semibold whitespace-nowrap">{e.name}</td>
                    <td className="p-2 text-muted-foreground">{e.create}</td>
                    <td className="p-2 text-muted-foreground">{e.read}</td>
                    <td className="p-2 text-muted-foreground">{e.update}</td>
                    <td className="p-2 text-muted-foreground">{e.delete}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <span className="font-semibold text-foreground">Key insight:</span> The most common access-denied cause is a
              <span className="font-mono mx-1">tenant_id</span> mismatch between the user's auth token and the record.
              In Test mode, production users have a production tenant_id that won't match test-DB records. The TenantContext
              component syncs this automatically — if it fails, manually verify the user's
              <span className="font-mono mx-1">data.tenant_id</span> matches the test Tenant record's ID.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}