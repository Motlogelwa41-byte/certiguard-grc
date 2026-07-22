import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const certs = await sr.entities.Certification.list("-created_date", 500);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let updated = 0;
    let tasksCreated = 0;

    for (const cert of certs) {
      if (!cert.expiry_date) continue;
      const exp = new Date(cert.expiry_date);
      const daysToExp = Math.round((exp - today) / 86400000);

      let renewal = cert.renewal_status || "not_due";
      if (daysToExp < 0) renewal = "expired";
      else if (daysToExp <= 90 && cert.status === "certified") renewal = "due_soon";

      if (renewal !== cert.renewal_status) {
        try {
          await sr.entities.Certification.update(cert.id, { renewal_status: renewal });
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
              notes: `Auto-created by certification expiry scanner: ${cert.name} (${cert.standard}) expires ${cert.expiry_date}.`,
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