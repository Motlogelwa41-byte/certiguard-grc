/**
 * Audit logging is now handled automatically by the client interceptor in
 * @/api/base44Client, which routes every create/update/delete through the
 * `logAudit` backend function (tamper-evident, hash-chained, server-stamped).
 *
 * This helper is retained for backwards-compatibility with existing call sites
 * but is a no-op — do not rely on it for new code. The interceptor covers all
 * entity mutations performed through the base44 SDK.
 */
export async function logAuditTrail() {
  return;
}