/**
 * Tenant Guard — shared middleware module for backend functions.
 *
 * Enforces the core database rule: no API route can query, update, or delete
 * data without validating that the user's session tenant_id matches the
 * record's tenant_id. Import this in every backend function that touches
 * tenant-scoped entities.
 *
 * Usage:
 *   import { resolveTenantContext, assertTenantMatch, stampTenantId } from "../../shared/tenantGuard.ts";
 *
 *   const ctx = await resolveTenantContext(base44);          // 401 if no session
 *   const record = await base44.asServiceRole.entities.Risk.get(id);
 *   assertTenantMatch(ctx, record);                          // 403 if mismatch
 *   const payload = stampTenantId(ctx, body);                // injects tenant_id on creates
 */

export interface TenantContext {
  user: any;
  tenant_id: string | null;
  role: string;
  is_admin: boolean;
}

/**
 * Resolves the authenticated user's tenant context from their session.
 * Throws a 401-style error if no authenticated user.
 */
export async function resolveTenantContext(base44: any): Promise<TenantContext> {
  const user = await base44.auth.me();
  if (!user) {
    throw new TenantGuardError("Unauthorized — no authenticated session", 401);
  }
  const tenant_id = user?.data?.tenant_id ?? null;
  const role = user?.role ?? "user";
  return {
    user,
    tenant_id,
    role,
    is_admin: role === "admin",
  };
}

/**
 * Asserts that a record's tenant_id matches the session user's tenant_id.
 * Admins bypass the check (cross-tenant visibility for platform administration).
 * Throws a 403-style error on mismatch.
 */
export function assertTenantMatch(ctx: TenantContext, record: any): void {
  if (!record) {
    throw new TenantGuardError("Record not found", 404);
  }
  if (ctx.is_admin) return;
  const recordTenant = record?.tenant_id ?? record?.data?.tenant_id ?? null;
  if (!ctx.tenant_id) {
    throw new TenantGuardError("Session has no tenant_id — access denied", 403);
  }
  if (recordTenant !== ctx.tenant_id) {
    throw new TenantGuardError(
      "Tenant mismatch — you cannot access records outside your tenant",
      403
    );
  }
}

/**
 * Stamps the session tenant_id onto a create payload.
 * Prevents a user from planting a record in another tenant's scope.
 */
export function stampTenantId(ctx: TenantContext, payload: Record<string, any>): Record<string, any> {
  if (!ctx.tenant_id) {
    throw new TenantGuardError("Session has no tenant_id — cannot create record", 403);
  }
  return { ...payload, tenant_id: ctx.tenant_id };
}

/**
 * Builds a tenant-scoped query filter for list/filter operations.
 * Admins get an open filter; everyone else is scoped to their tenant.
 */
export function tenantScopedFilter(ctx: TenantContext, extra: Record<string, any> = {}): Record<string, any> {
  if (ctx.is_admin) return { ...extra };
  if (!ctx.tenant_id) {
    throw new TenantGuardError("Session has no tenant_id — access denied", 403);
  }
  return { tenant_id: ctx.tenant_id, ...extra };
}

/**
 * Validates that a batch of records all belong to the session tenant.
 * Throws on the first mismatch.
 */
export function assertTenantMatchBatch(ctx: TenantContext, records: any[]): void {
  for (const record of records) {
    assertTenantMatch(ctx, record);
  }
}

export class TenantGuardError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TenantGuardError";
    this.status = status;
  }
}