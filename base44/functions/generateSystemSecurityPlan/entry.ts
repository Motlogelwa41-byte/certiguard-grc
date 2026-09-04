import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Automated System Security Plan (SSP) Generation
// Auto-assembles a living SSP document from the control library, evidence inventory,
// framework mappings, ROPA, and IT assets. Always current, audit-ready.
// Uses InvokeLLM to generate narrative sections from structured data.

const SSP_SECTIONS = [
  { id: "system_characterization", title: "System Characterization", description: "System name, purpose, system owner, and architecture overview" },
  { id: "system_boundary", title: "System Boundary and Components", description: "All IT assets, components, and their roles in the system" },
  { id: "control_implementation", title: "Control Implementation Summary", description: "All controls, their status, and implementation details" },
  { id: "framework_coverage", title: "Framework Coverage", description: "Regulatory frameworks covered and requirement mapping" },
  { id: "evidence_inventory", title: "Evidence Inventory", description: "All evidence supporting the control implementation" },
  { id: "data_processing", title: "Data Processing Activities (ROPA)", description: "Record of Processing Activities and data flow" },
  { id: "access_control", title: "Access Control Summary", description: "Access controls, identity management, and authentication" },
  { id: "incident_response", title: "Incident Response Capabilities", description: "Incident response plan, playbooks, and recent incidents" },
  { id: "vendor_management", title: "Third-Party Vendor Management", description: "Vendor inventory, risk assessments, and monitoring" },
  { id: "security_awareness", title: "Security Awareness and Training", description: "Training programs and completion status" },
  { id: "continuous_monitoring", title: "Continuous Monitoring", description: "Ongoing control monitoring and compliance scoring" },
  { id: "plan_maintenance", title: "SSP Maintenance and Review", description: "Document version, review cycle, and update procedures" },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sspId = body.ssp_id || `SSP-${Date.now().toString().slice(-6)}`;
    const regenerate = body.regenerate || false;

    // Fetch all data sources for the SSP
    const [controls, evidence, frameworks, ropa, assets, policies, incidents, vendors] = await Promise.all([
      sr.entities.Control.list("-created_date", 200).catch(() => []),
      sr.entities.Evidence.list("-created_date", 100).catch(() => []),
      sr.entities.RegulatoryFramework.list("-created_date", 30).catch(() => []),
      sr.entities.ROPA.list("-created_date", 50).catch(() => []),
      sr.entities.ITAsset.list("-created_date", 100).catch(() => []),
      sr.entities.Policy.list("-created_date", 50).catch(() => []),
      sr.entities.Incident.list("-created_date", 20).catch(() => []),
      sr.entities.Vendor.list("-created_date", 50).catch(() => []),
    ]);

    const now = new Date().toISOString();

    // Build structured data context for the LLM
    const dataContext = {
      controls: (controls || []).map(c => ({
        id: c.control_id, title: c.title, description: (c.description || "").slice(0, 300),
        status: c.status, category: c.category, severity: c.severity,
        automation: c.automation_status, owner: c.owner_name, frameworks: c.framework_names,
      })),
      evidence: (evidence || []).slice(0, 50).map(e => ({
        title: e.title || e.name, type: e.type || e.evidence_type, status: e.status,
      })),
      frameworks: (frameworks || []).map(f => ({
        name: f.name, code: f.code, version: f.version, requirements: f.total_requirements,
        jurisdiction: f.jurisdiction,
      })),
      ropa: (ropa || []).slice(0, 20).map(r => ({
        activity: r.activity_name || r.title, purpose: r.purpose, data_types: r.data_categories,
      })),
      assets: (assets || []).slice(0, 30).map(a => ({
        name: a.name || a.asset_name, type: a.type || a.asset_type, criticality: a.criticality,
      })),
      policies: (policies || []).slice(0, 20).map(p => ({
        title: p.title, category: p.category, status: p.status,
      })),
      incidents: (incidents || []).slice(0, 10).map(i => ({
        title: i.title, type: i.type, severity: i.severity, status: i.status,
      })),
      vendors: (vendors || []).slice(0, 20).map(v => ({
        name: v.name, category: v.category, criticality: v.criticality, risk_level: v.risk_level,
      })),
    };

    // Generate each section via LLM
    const sections = [];
    let totalWordCount = 0;
    const controlIds = new Set();
    const evidenceIds = new Set();

    for (const section of SSP_SECTIONS) {
      const sectionData = getSectionData(section.id, dataContext);
      const prompt = `You are generating a section of a System Security Plan (SSP) document for an organization. Write the "${section.title}" section.

Section description: ${section.description}

Use the structured data below to write a concise, audit-ready narrative section (300-500 words). Write in formal, professional language suitable for a regulatory audit. Reference specific controls, evidence, and frameworks by name/ID where relevant. Do not fabricate — only use the provided data. If data is sparse for this section, note what would need to be completed.

DATA:
${JSON.stringify(sectionData, null, 2)}`;

      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              content: { type: "string" },
              controls_referenced: { type: "array", items: { type: "string" } },
              evidence_referenced: { type: "array", items: { type: "string" } },
            },
          },
        });

        const fullContent = res.content || (res.data && res.data.content) || "";
        const wordCount = fullContent.split(/\s+/).length;
        totalWordCount += wordCount;

        // Track referenced controls and evidence
        (res.controls_referenced || (res.data && res.data.controls_referenced) || []).forEach(id => controlIds.add(id));
        (res.evidence_referenced || (res.data && res.data.evidence_referenced) || []).forEach(id => evidenceIds.add(id));

        // Truncate content to stay within entity field size limits (max 800 chars per section)
        const content = fullContent.slice(0, 800);

        sections.push({
          section_id: section.id,
          title: section.title,
          content,
          last_updated: now,
          source: "ai_generated",
          word_count: wordCount,
        });
      } catch (e) {
        console.error(`Section ${section.id} generation error:`, e?.message);
        sections.push({
          section_id: section.id,
          title: section.title,
          content: `[Generation failed: ${e?.message || "unknown error"}]`,
          last_updated: now,
          source: "error",
          word_count: 0,
        });
      }
    }

    // Build framework coverage
    const frameworkCoverage = (frameworks || []).map(f => ({
      framework_id: f.id,
      name: f.name,
      requirement_count: f.total_requirements || 0,
      covered_count: 0, // Would need RequirementControlMapping to compute
    }));

    // Compute compliance score (coverage completeness)
    const populatedSections = sections.filter(s => s.word_count > 100).length;
    const complianceScore = Math.round((populatedSections / SSP_SECTIONS.length) * 100);
    const auditReady = complianceScore >= 80 && (controls || []).length > 0;

    // Check for existing SSP
    const existingSSPs = await sr.entities.SystemSecurityPlan.list("-created_date", 10).catch(() => []);
    const existing = (existingSSPs || [])[0];

    const sspData = {
      ssp_id: existing?.ssp_id || sspId,
      title: "System Security Plan",
      version: existing ? String(parseFloat(existing.version || "1.0") + 0.1) : "1.0",
      status: "draft",
      generated_at: now,
      last_updated: now,
      sections: JSON.stringify(sections),
      section_count: sections.length,
      total_word_count: totalWordCount,
      control_coverage_count: controlIds.size,
      evidence_count: evidenceIds.size,
      framework_coverage: JSON.stringify(frameworkCoverage),
      framework_count: (frameworks || []).length,
      ropa_integrated: (ropa || []).length > 0,
      asset_count: (assets || []).length,
      audit_ready: auditReady,
      compliance_score: complianceScore,
      generation_source: "auto",
    };

    let savedSSP;
    if (existing && !regenerate) {
      // Update existing
      savedSSP = await sr.entities.SystemSecurityPlan.update(existing.id, sspData);
    } else if (existing && regenerate) {
      // Full regenerate — update existing with new content
      savedSSP = await sr.entities.SystemSecurityPlan.update(existing.id, sspData);
    } else {
      // Create new
      savedSSP = await sr.entities.SystemSecurityPlan.create(sspData);
    }

    return Response.json({
      status: "completed",
      ssp_id: sspData.ssp_id,
      version: sspData.version,
      sections_generated: sections.length,
      total_word_count: totalWordCount,
      controls_referenced: controlIds.size,
      evidence_referenced: evidenceIds.size,
      frameworks_covered: (frameworks || []).length,
      ropa_integrated: sspData.ropa_integrated,
      assets_included: (assets || []).length,
      compliance_score: complianceScore,
      audit_ready: auditReady,
      message: `SSP generated — ${sections.length} sections, ${totalWordCount} words, ${controlIds.size} controls referenced. Compliance score: ${complianceScore}%.`,
    });
  } catch (error) {
    console.error("generateSystemSecurityPlan error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getSectionData(sectionId, data) {
  switch (sectionId) {
    case "system_characterization":
      return { assets: data.assets.slice(0, 10), frameworks: data.frameworks, policies: data.policies.slice(0, 5) };
    case "system_boundary":
      return { assets: data.assets, vendors: data.vendors.slice(0, 10) };
    case "control_implementation":
      return { controls: data.controls };
    case "framework_coverage":
      return { frameworks: data.frameworks, controls: data.controls.slice(0, 20) };
    case "evidence_inventory":
      return { evidence: data.evidence };
    case "data_processing":
      return { ropa: data.ropa };
    case "access_control":
      return { controls: data.controls.filter(c => c.category === "access_control"), policies: data.policies.filter(p => p.category === "access_control" || p.title?.toLowerCase().includes("access")) };
    case "incident_response":
      return { incidents: data.incidents, controls: data.controls.filter(c => c.category === "incident_response") };
    case "vendor_management":
      return { vendors: data.vendors };
    case "security_awareness":
      return { policies: data.policies.filter(p => p.title?.toLowerCase().includes("training") || p.title?.toLowerCase().includes("awareness")), controls: data.controls.filter(c => c.category === "human_resources") };
    case "continuous_monitoring":
      return { controls: data.controls.filter(c => c.automation === "automated"), evidence: data.evidence.slice(0, 10) };
    case "plan_maintenance":
      return { total_controls: data.controls.length, total_evidence: data.evidence.length, total_frameworks: data.frameworks.length };
    default:
      return data;
  }
}