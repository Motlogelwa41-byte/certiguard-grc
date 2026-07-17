import { base44 } from "@/api/base44Client";

/**
 * Record a login or logout event in the tamper-evident audit trail.
 * The logAudit backend function captures IP (x-forwarded-for), user agent,
 * timestamp, and the acting user from the authenticated session.
 * Best-effort: never blocks the login/logout flow on failure.
 */
export async function logAuthEvent(action, detail = "") {
  try {
    await base44.functions.invoke("logAudit", {
      action, // 'login' | 'logout'
      entity_type: "Auth",
      entity_name: detail || action,
      changes: null,
      severity: "info"
    });
  } catch (e) {
    // swallow — auth flow must not be blocked
  }
}

export const logLogin = (method = "email") => logAuthEvent("login", `Login via ${method}`);
export const logLogout = () => logAuthEvent("logout", "User logged out");