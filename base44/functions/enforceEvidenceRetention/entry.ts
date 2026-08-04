import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Enforces evidence retention schedules on the append-only AuditEvidenceLedger.
// Flags records whose retention_date has passed as purge_eligible, and deletes
// records that are both purge_eligible and past a grace window (default 30 days).
// Runs as the service role to bypass the append-only RLS lock.
// Payload: { dry_run?, grace_days? }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const dryRun = !!body.dry_run;
    const graceDays = body.grace_days || 30;
    const today = new Date().toISOString().slice(0, 10);

    const eligible = await base44.asServiceRole.entities.AuditEvidenceLedger.filter(
      { retention_date: { $lte: today }, purge_eligible: { $ne: true } },
      '-timestamp',
      500
    );

    let flagged = eligible.length;
    if (!dryRun && eligible.length) {
      await base44.asServiceRole.entities.AuditEvidenceLedger.updateMany(
        { retention_date: { $lte: today }, purge_eligible: { $ne: true } },
        { $set: { purge_eligible: true } }
      );
    }

    const purgeCutoff = new Date(Date.now() - graceDays * 86400000).toISOString().slice(0, 10);
    const toPurge = await base44.asServiceRole.entities.AuditEvidenceLedger.filter(
      { purge_eligible: true, retention_date: { $lte: purgeCutoff } },
      '-timestamp',
      500
    );

    let purged = toPurge.length;
    if (!dryRun && toPurge.length) {
      await base44.asServiceRole.entities.AuditEvidenceLedger.deleteMany({ purge_eligible: true, retention_date: { $lte: purgeCutoff } });
    }

    return Response.json({ ok: true, dry_run: dryRun, flagged_eligible: flagged, purged, purge_cutoff: purgeCutoff });
  } catch (error) {
    console.error('enforceEvidenceRetention error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Retention enforcement failed' }, { status: 500 });
  }
});