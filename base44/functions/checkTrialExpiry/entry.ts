import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Daily trial expiration scanner
// Checks all tenants with subscription_status="trial" and trial_ends_at < today
// Downgrades expired trials to "expired" status and deactivates the tenant
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const today = new Date().toISOString().slice(0, 10);

    // Find all active trials that have passed their end date
    const expiredTrials = await sr.entities.Tenant.filter({
      subscription_status: "trial",
      trial_ends_at: { $lt: today }
    });

    let expiredCount = 0;
    const expiredTenantNames = [];

    for (const tenant of expiredTrials) {
      try {
        await sr.entities.Tenant.update(tenant.id, {
          subscription_status: "expired",
          is_active: false
        });
        expiredCount++;
        expiredTenantNames.push(tenant.name || tenant.id);
      } catch (e) {
        console.error(`Failed to expire tenant ${tenant.id}:`, e.message);
      }
    }

    // Also find trials expiring within 3 days (warning window)
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + 3);
    const warningDateStr = warningDate.toISOString().slice(0, 10);

    const expiringSoon = await sr.entities.Tenant.filter({
      subscription_status: "trial",
      trial_ends_at: { $gte: today, $lte: warningDateStr }
    });

    console.log(`Trial expiry scan: ${expiredCount} expired, ${expiringSoon.length} expiring within 3 days`);

    return Response.json({
      expired: expiredCount,
      expiring_soon: expiringSoon.length,
      expired_tenants: expiredTenantNames,
      scan_date: today
    });
  } catch (error) {
    console.error('checkTrialExpiry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});