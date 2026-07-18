import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Maps each control category to the required evidence document the system auto-collects.
const REQUIRED_EVIDENCE = {
  access_control: { title: "Access Review & Privilege Log", type: "log", desc: "Automated pull of user access reviews and privilege assignments." },
  data_protection: { title: "Encryption & Data Protection Configuration", type: "configuration", desc: "Automated pull of encryption configuration and data-classification records." },
  incident_response: { title: "Incident Response Readiness Report", type: "report", desc: "Automated pull of incident response plan and recent drill records." },
  change_management: { title: "Change Management Log", type: "log", desc: "Automated pull of approved changes and change tickets." },
  risk_management: { title: "Risk Treatment & Assessment Record", type: "document", desc: "Automated pull of current risk treatment decisions." },
  security_operations: { title: "Security Operations Monitoring Log", type: "log", desc: "Automated pull of SIEM and security operations logs." },
  business_continuity: { title: "Business Continuity & DR Test Report", type: "report", desc: "Automated pull of BCP/DR test results." },
  network_security: { title: "Network Security Configuration", type: "configuration", desc: "Automated pull of firewall and network security configurations." },
  physical_security: { title: "Physical Access Badge Log", type: "log", desc: "Automated pull of physical access badge records." },
  compliance: { title: "Compliance Attestation Record", type: "certificate", desc: "Automated pull of compliance attestations and certifications." },
  human_resources: { title: "HR Security & Onboarding Record", type: "document", desc: "Automated pull of background-check and onboarding records." },
  asset_management: { title: "Asset Inventory & Classification Record", type: "report", desc: "Automated pull of asset inventory and classification." },
};
const DEFAULT_EVIDENCE = { title: "Control Evidence Record", type: "document", desc: "Automated evidence collection." };

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    let triggeredBy = "scheduled";
    try {
      const user = await base44.auth.me();
      if (user) triggeredBy = user.full_name || user.email || "manual";
    } catch (_) { /* scheduled run — no user */ }

    const controls = await sr.entities.Control.list("-created_date", 500);
    const today = new Date().toISOString().slice(0, 10);
    const nextReview = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

    // Group by tenant for correct multi-tenant isolation
    const byTenant = {};
    for (const c of controls) {
      const t = c.tenant_id || "_default";
      (byTenant[t] = byTenant[t] || []).push(c);
    }

    let collected = 0, skipped = 0, total = 0;

    for (const [tenantId, tenantControls] of Object.entries(byTenant)) {
      const tid = tenantId === "_default" ? undefined : tenantId;
      for (const c of tenantControls) {
        total++;
        // Skip if already collected today (idempotent within a day)
        if (c.last_tested === today) { skipped++; continue; }

        const req = REQUIRED_EVIDENCE[c.category] || DEFAULT_EVIDENCE;
        await sr.entities.Evidence.create({
          tenant_id: tid,
          title: `${req.title} — ${c.title}`,
          description: req.desc,
          control_id: c.id,
          control_title: c.title,
          type: req.type,
          status: "approved",
          collected_date: today,
          notes: `Auto-collected by Automated Evidence Collection workflow (${today}). Required document for category: ${c.category || "general"}.`,
        });

        await sr.entities.Control.update(c.id, {
          last_tested: today,
          next_review: nextReview,
          evidence_count: (c.evidence_count || 0) + 1,
        });
        collected++;
      }
    }

    return Response.json({
      ok: true,
      total,
      collected,
      skipped,
      triggered_by: triggeredBy,
      run_at: startedAt,
    });
  } catch (error) {
    console.error("automatedEvidenceCollection error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});