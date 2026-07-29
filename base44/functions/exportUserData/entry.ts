import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// GDPR Article 20 / POPIA — right to data portability.
// Returns all tenant-scoped compliance data as a single JSON payload
// so the user can download it from the Data Privacy page.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  const tenantId = user?.data?.tenant_id;

  if (!tenantId) {
    return Response.json({ error: 'No tenant associated with this account' }, { status: 400 });
  }

  const filter = { tenant_id: tenantId };

  const [
    frameworks, controls, risks, policies, evidence, tasks,
    vendors, assessments, incidents, certifications, connections, penTests,
  ] = await Promise.all([
    base44.asServiceRole.entities.Framework.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Control.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Risk.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Policy.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Evidence.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.ComplianceTask.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Vendor.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.VendorAssessment.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Incident.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Certification.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.Connection.filter(filter, undefined, 10000),
    base44.asServiceRole.entities.PenTest.filter(filter, undefined, 10000),
  ]);

  const counts = {
    frameworks: frameworks.length, controls: controls.length, risks: risks.length,
    policies: policies.length, evidence: evidence.length, compliance_tasks: tasks.length,
    vendors: vendors.length, vendor_assessments: assessments.length, incidents: incidents.length,
    certifications: certifications.length, connections: connections.length, pen_tests: penTests.length,
  };

  return Response.json({
    exported_at: new Date().toISOString(),
    platform: 'CertiGuard GRC',
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, tenant_id: tenantId },
    counts,
    tenant_data: {
      frameworks, controls, risks, policies, evidence,
      compliance_tasks: tasks, vendors, vendor_assessments: assessments,
      incidents, certifications, connections, pen_tests: penTests,
    },
  });
}