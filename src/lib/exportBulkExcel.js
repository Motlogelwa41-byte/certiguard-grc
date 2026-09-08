import { base44 } from "@/api/base44Client";
import { exportToExcel } from "@/lib/exportCsv";

/**
 * Bulk export audit trail + compliance framework data as clean Excel (.xls) files.
 * Downloads separate .xls workbooks: Audit Trail, Frameworks, Controls, Risks.
 */
export async function exportBulkExcel() {
  const [auditLogs, frameworks, controls, risks] = await Promise.all([
    base44.entities.AuditTrail.list("-created_date", 1000).catch(() => []),
    base44.entities.Framework.list("-updated_date", 500).catch(() => []),
    base44.entities.Control.list("-updated_date", 500).catch(() => []),
    base44.entities.Risk.list("-updated_date", 500).catch(() => []),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);

  if (auditLogs.length) {
    exportToExcel(
      auditLogs.map((l, i) => ({
        "#": i + 1,
        Timestamp: l.created_date ? new Date(l.created_date).toLocaleString() : "",
        Action: l.action || "",
        "Entity Type": l.entity_type || "",
        "Entity Name": l.entity_name || "",
        "Performed By": l.performed_by_name || "System",
        "IP Address": l.ip_address || "",
        Severity: l.severity || "",
      })),
      `CertiGuard_AuditTrail_${stamp}`,
      ["#", "Timestamp", "Action", "Entity Type", "Entity Name", "Performed By", "IP Address", "Severity"],
      { title: "CertiGuard GRC — Audit Trail Report", subtitle: `Generated ${new Date().toLocaleString()} • ${auditLogs.length} entries` }
    );
  }

  if (frameworks.length) {
    exportToExcel(
      frameworks.map((f) => ({
        Name: f.name || "",
        Version: f.version || "",
        Status: f.status || "",
        "Readiness Score": f.readiness_score ?? 0,
        "Total Controls": f.total_controls ?? 0,
        "Passing Controls": f.passing_controls ?? 0,
        "Certification Date": f.certification_date || "",
        "Expiry Date": f.expiry_date || "",
      })),
      `CertiGuard_Frameworks_${stamp}`,
      ["Name", "Version", "Status", "Readiness Score", "Total Controls", "Passing Controls", "Certification Date", "Expiry Date"],
      { title: "CertiGuard GRC — Compliance Frameworks", subtitle: `Generated ${new Date().toLocaleString()} • ${frameworks.length} frameworks` }
    );
  }

  if (controls.length) {
    exportToExcel(
      controls.map((c) => ({
        "Control ID": c.control_id || "",
        Title: c.title || "",
        Category: c.category || "",
        Status: c.status || "",
        Severity: c.severity || "",
        Owner: c.owner_name || "",
        "Automation Status": c.automation_status || "",
        "Effectiveness Score": c.effectiveness_score ?? 0,
        "Last Tested": c.last_tested || "",
        "Next Review": c.next_review || "",
      })),
      `CertiGuard_Controls_${stamp}`,
      ["Control ID", "Title", "Category", "Status", "Severity", "Owner", "Automation Status", "Effectiveness Score", "Last Tested", "Next Review"],
      { title: "CertiGuard GRC — Controls Register", subtitle: `Generated ${new Date().toLocaleString()} • ${controls.length} controls` }
    );
  }

  if (risks.length) {
    exportToExcel(
      risks.map((r) => ({
        "Risk ID": r.risk_id || "",
        Title: r.title || "",
        Category: r.category || "",
        Likelihood: r.likelihood ?? "",
        Impact: r.impact ?? "",
        "Risk Score": r.risk_score ?? 0,
        Status: r.status || "",
        Treatment: r.treatment || "",
        Owner: r.owner_name || "",
        "Due Date": r.due_date || "",
      })),
      `CertiGuard_Risks_${stamp}`,
      ["Risk ID", "Title", "Category", "Likelihood", "Impact", "Risk Score", "Status", "Treatment", "Owner", "Due Date"],
      { title: "CertiGuard GRC — Risk Register", subtitle: `Generated ${new Date().toLocaleString()} • ${risks.length} risks` }
    );
  }

  return { auditLogs: auditLogs.length, frameworks: frameworks.length, controls: controls.length, risks: risks.length };
}