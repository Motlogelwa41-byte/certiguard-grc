import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const certs = await sr.entities.Certification.list("-created_date", 500);
    const evidence = await sr.entities.Evidence.list("-created_date", 1000);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const expiryHorizon = today.getTime() + 60 * 86400000;

    let updated = 0;
    let tasksCreated = 0;

    for (const cert of certs) {
      if (!cert.expiry_date) continue;
      const exp = new Date(cert.expiry_date);
      const daysToExp = Math.round((exp - today) / 86400000);

      let renewal = cert.renewal_status || "not_due";
      if (daysToExp < 0) renewal = "expired";
      else if (daysToExp <= 90 && cert.status === "certified") renewal = "due_soon";

      // Auto-compute evidence linkage via the cert's linked controls.
      const controlIds = cert.linked_control_ids || [];
      let linkedEvidenceCount = 0;
      let expiringEvidenceCount = 0;
      let coveragePct = 0;

      if (controlIds.length) {
        const coveredControls = new Set();
        for (const ev of evidence) {
          if (!controlIds.includes(ev.control_id)) continue;
          if (ev.status === "approved") {
            linkedEvidenceCount++;
            coveredControls.add(ev.control_id);
            if (ev.expiry_date) {
              const evExp = new Date(ev.expiry_date).getTime();
              if (evExp <= expiryHorizon) expiringEvidenceCount++;
            }
          }
        }
        coveragePct = Math.round((coveredControls.size / controlIds.length) * 100);
      }

      const needsEvidenceUpdate =
        cert.linked_evidence_count !== linkedEvidenceCount ||
        cert.evidence_coverage_pct !== coveragePct ||
        cert.expiring_evidence_count !== expiringEvidenceCount;

      if (renewal !== cert.renewal_status || needsEvidenceUpdate) {
        try {
          await sr.entities.Certification.update(cert.id, {
            renewal_status: renewal,
            linked_evidence_count: linkedEvidenceCount,
            evidence_coverage_pct: coveragePct,
            expiring_evidence_count: expiringEvidenceCount,
          });
          updated++;
        } catch (_) { /* ignore single failure */ }
      }

      // Auto-create a renewal task when due soon (de-dup by exact title)
      if (renewal === "due_soon") {
        const renewalTitle = `${cert.name} — Certification Renewal`;
        try {
          const existing = await sr.entities.ComplianceTask.filter({ title: renewalTitle }, "-created_date", 1);
          if (!existing || !existing.length) {
            await sr.entities.ComplianceTask.create({
              title: renewalTitle,
              type: "audit_preparation",
              priority: "high",
              status: "todo",
              due_date: cert.expiry_date,
              related_framework_id: cert.framework_id,
              notes: `Auto-created by certification expiry scanner: ${cert.name} (${cert.standard}) expires ${cert.expiry_date}. Evidence coverage ${coveragePct}% (${linkedEvidenceCount} approved, ${expiringEvidenceCount} expiring within 60 days).`,
            });
            tasksCreated++;
          }
        } catch (_) { /* ignore */ }
      }
    }

    return Response.json({ scanned: certs.length, updated, tasksCreated, scannedAt: todayStr });
  } catch (error) {
    console.error("scanCertificationExpiry error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});