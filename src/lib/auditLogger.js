import { base44 } from "@/api/base44Client";

/**
 * Log a change to the AuditTrail entity.
 * @param {object} opts
 * @param {string} opts.action - create | update | delete
 * @param {string} opts.entity_type - e.g. "Control", "Risk"
 * @param {string} opts.entity_id
 * @param {string} opts.entity_name - human-readable name
 * @param {object} [opts.before] - state before change (for updates)
 * @param {object} [opts.after] - state after change
 * @param {object} [opts.user] - { id, full_name } of performing user
 * @param {string} [opts.severity] - info | warning | critical
 */
export async function logAuditTrail({ action, entity_type, entity_id, entity_name, before, after, user, severity = "info" }) {
  try {
    let changes = null;
    if (before && after) {
      const diff = {};
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
          diff[key] = { from: before[key], to: after[key] };
        }
      }
      if (Object.keys(diff).length > 0) changes = JSON.stringify(diff);
    }

    await base44.entities.AuditTrail.create({
      action,
      entity_type,
      entity_id: entity_id || "",
      entity_name: entity_name || "",
      changes,
      performed_by_name: user?.full_name || "Unknown",
      performed_by_id: user?.id || "",
      severity,
      metadata: JSON.stringify({ timestamp: new Date().toISOString() }),
    });
  } catch (err) {
    // Never block the main flow on audit failures
    console.warn("Audit log failed:", err);
  }
}