import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// GDPR Article 17 / POPIA — right to erasure ("right to be forgotten").
// Admin-only. Permanently deletes ALL tenant-scoped compliance data.
// User and Tenant records are preserved so the admin can still log in afterwards.
export default async function (req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user.role !== 'admin') {
    return Response.json({ error: 'Only administrators may erase tenant data' }, { status: 403 });
  }

  const tenantId = user?.data?.tenant_id;
  if (!tenantId) {
    return Response.json({ error: 'No tenant associated with this account' }, { status: 400 });
  }

  const filter = { tenant_id: tenantId };

  await Promise.all([
    base44.asServiceRole.entities.Framework.deleteMany(filter),
    base44.asServiceRole.entities.Control.deleteMany(filter),
    base44.asServiceRole.entities.Risk.deleteMany(filter),
    base44.asServiceRole.entities.Policy.deleteMany(filter),
    base44.asServiceRole.entities.Evidence.deleteMany(filter),
    base44.asServiceRole.entities.ComplianceTask.deleteMany(filter),
    base44.asServiceRole.entities.Vendor.deleteMany(filter),
    base44.asServiceRole.entities.VendorAssessment.deleteMany(filter),
    base44.asServiceRole.entities.Incident.deleteMany(filter),
    base44.asServiceRole.entities.Certification.deleteMany(filter),
    base44.asServiceRole.entities.Connection.deleteMany(filter),
    base44.asServiceRole.entities.PenTest.deleteMany(filter),
  ]);

  console.log(`[eraseUserData] Tenant ${tenantId} compliance data erased by ${user.email}`);

  return Response.json({
    deleted: true,
    deleted_at: new Date().toISOString(),
    erased_by: user.email,
    message: 'All tenant compliance data has been permanently erased. User and tenant records remain intact.',
  });
}