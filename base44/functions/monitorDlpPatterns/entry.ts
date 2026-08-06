import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// DLP (Data Loss Prevention) pattern monitor. Analyzes access attestations for
// anomalous behavior patterns and creates SecurityFinding records for high/critical incidents.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenantId = user.data?.tenant_id || user.tenant_id || "";
    const sr = base44.asServiceRole;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const nowIso = now.toISOString();

    const attestations = await base44.entities.AccessAttestation.list().catch(() => []);
    const dlpIncidents = [];

    for (const att of attestations) {
      if (!att.login_timestamp) continue;
      const loginTime = new Date(att.login_timestamp);
      const hour = loginTime.getHours();
      const day = loginTime.getDay();

      // Rule 1: Off-hours / weekend access
      if ((day === 0 || day === 6 || hour < 6 || hour >= 20) && !att.flagged) {
        dlpIncidents.push({
          type: "off_hours_access", severity: "medium",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} accessed ${att.module_accessed} outside business hours (${hour}:00, ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day]})`,
        });
      }

      // Rule 2: No MFA
      if (!att.mfa_verified && att.module_accessed) {
        dlpIncidents.push({
          type: "no_mfa_access", severity: "high",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} accessed ${att.module_accessed} without MFA verification`,
        });
      }

      // Rule 3: New device
      if (att.anomaly_flags?.includes("new_device")) {
        dlpIncidents.push({
          type: "new_device_access", severity: "medium",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} accessed from a new/unrecognized device`,
        });
      }

      // Rule 4: Geo mismatch
      if (att.anomaly_flags?.includes("geo_mismatch")) {
        dlpIncidents.push({
          type: "geo_anomaly", severity: "high",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} accessed from unusual location: ${att.geo_location || "unknown"}`,
        });
      }

      // Rule 5: High risk score
      if (att.risk_score >= 70) {
        dlpIncidents.push({
          type: "high_risk_score", severity: "critical",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} has risk score ${att.risk_score}/100 — potential data exfiltration indicator`,
        });
      }

      // Rule 6: Unusual IP
      if (att.anomaly_flags?.includes("unusual_ip")) {
        dlpIncidents.push({
          type: "unusual_ip", severity: "high",
          user_email: att.user_email, module_accessed: att.module_accessed,
          timestamp: att.login_timestamp,
          description: `User ${att.user_email} accessed from unusual IP: ${att.ip_address || "unknown"}`,
        });
      }
    }

    // Create SecurityFindings for critical/high DLP incidents
    const findingsCreated = [];
    for (const incident of dlpIncidents.filter(i => i.severity === "critical" || i.severity === "high")) {
      const finding = await sr.entities.SecurityFinding.create({
        tenant_id: tenantId,
        title: `DLP: ${incident.type} — ${incident.user_email}`,
        description: incident.description,
        source: "other", severity: incident.severity, status: "open",
        asset: incident.user_email, detected_date: today, first_seen: nowIso,
        notes: `DLP monitoring: ${incident.type}`,
      }).catch(() => null);
      if (finding) findingsCreated.push(finding.id);
    }

    const byType = {};
    for (const inc of dlpIncidents) { byType[inc.type] = (byType[inc.type] || 0) + 1; }
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const inc of dlpIncidents) { bySeverity[inc.severity]++; }

    return Response.json({
      status: "completed",
      attestations_analyzed: attestations.length,
      incidents_detected: dlpIncidents.length,
      findings_created: findingsCreated.length,
      by_type: byType, by_severity: bySeverity,
      incidents: dlpIncidents,
      timestamp: nowIso,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}