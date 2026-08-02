import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authenticated endpoint — serves read-only compliance data to external auditors.
// Verifies caller identity and role before returning tenant-scoped data via service role.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the caller is authenticated
    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: "Authentication required." }, { status: 401 });
    }

    // Only auditor roles and admins may use this endpoint
    const allowedRoles = ["external_auditor", "auditor", "admin"];
    if (!allowedRoles.includes(user.role)) {
      return Response.json({ error: "Access denied." }, { status: 403 });
    }

    const tenant_id = user.data?.tenant_id;
    if (!tenant_id) {
      return Response.json({ error: "No tenant associated with your account." }, { status: 403 });
    }

    // Fetch read-only data with service role, filtered by tenant
    const [controls, policies, ledger] = await Promise.all([
      base44.asServiceRole.entities.UniversalControl.filter({ tenant_id, status: "active" }, '-created_date', 500),
      base44.asServiceRole.entities.Policy.filter({ tenant_id, status: "approved" }, '-created_date', 200),
      base44.asServiceRole.entities.AuditEvidenceLedger.filter({ tenant_id }, '-timestamp', 1000),
    ]);

    return Response.json({
      controls: (controls || []).map(c => ({
        id: c.id,
        control_id: c.control_id,
        title: c.title,
        description: c.description,
        category: c.category,
        status: c.status,
        automation_status: c.automation_status,
        owner_name: c.owner_name,
        evidence_requirements: c.evidence_requirements,
      })),
      policies: (policies || []).map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        status: p.status,
        version: p.version,
        owner_name: p.owner_name,
        approved_by: p.approved_by,
        approved_date: p.approved_date,
        next_review_date: p.next_review_date,
        content: p.content,
      })),
      ledger: (ledger || []).map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        user_name: l.user_name,
        file_name: l.file_name,
        sha256_hash: l.sha256_hash,
        control_id: l.control_id,
        notes: l.notes,
      })),
    });
  } catch (error) {
    console.error("fetchAuditorDashboardData error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to fetch data" }, { status: 500 });
  }
}