import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const body = await req.json().catch(() => ({}));
    const { framework_ids } = body;

    // Fetch all frameworks for this tenant (or filtered set)
    const frameworks = framework_ids && framework_ids.length > 0
      ? await base44.asServiceRole.entities.RegulatoryFramework.filter({ tenant_id, id: { $in: framework_ids } })
      : await base44.asServiceRole.entities.RegulatoryFramework.filter({ tenant_id, status: 'active' });

    // Fetch all requirements and mappings in parallel
    const [allRequirements, allMappings] = await Promise.all([
      base44.asServiceRole.entities.FrameworkRequirement.filter({ tenant_id }),
      base44.asServiceRole.entities.RequirementControlMapping.filter({ tenant_id, status: 'active' }),
    ]);

    // Build coverage per framework
    const coverage = frameworks.map((fw) => {
      const fwRequirements = allRequirements.filter((r) => r.framework_id === fw.id);
      const fwMappings = allMappings.filter((m) => m.framework_id === fw.id);

      const mappedReqIds = new Set(fwMappings.map((m) => m.requirement_id));
      const gaps = fwRequirements
        .filter((r) => !mappedReqIds.has(r.id))
        .map((r) => ({
          requirement_id: r.id,
          requirement_ref: r.requirement_id,
          title: r.title,
          section: r.section || '',
          is_mandatory: r.is_mandatory,
        }));

      const fullMappings = fwMappings.filter((m) => m.mapping_confidence === 'full').length;
      const partialMappings = fwMappings.filter((m) => m.mapping_confidence === 'partial').length;
      const indirectMappings = fwMappings.filter((m) => m.mapping_confidence === 'indirect').length;

      const coveragePct = fwRequirements.length > 0
        ? Math.round((mappedReqIds.size / fwRequirements.length) * 100)
        : 0;

      return {
        framework_id: fw.id,
        framework_name: fw.name,
        framework_code: fw.code,
        jurisdiction: fw.jurisdiction,
        version: fw.version,
        total_requirements: fwRequirements.length,
        mapped_requirements: mappedReqIds.size,
        coverage_pct: coveragePct,
        full_mappings: fullMappings,
        partial_mappings: partialMappings,
        indirect_mappings: indirectMappings,
        gap_count: gaps.length,
        gaps: gaps.slice(0, 20),
        posture_state: coveragePct === 100 ? 'compliant' : coveragePct >= 50 ? 'partially_compliant' : coveragePct > 0 ? 'non_compliant' : 'unknown',
      };
    });

    // Cross-framework: find controls that map to multiple frameworks (shared controls)
    const controlFrameworkMap = {};
    allMappings.forEach((m) => {
      if (!controlFrameworkMap[m.control_id]) controlFrameworkMap[m.control_id] = new Set();
      controlFrameworkMap[m.control_id].add(m.framework_id);
    });
    const sharedControls = Object.entries(controlFrameworkMap)
      .filter(([_, fws]) => fws.size > 1)
      .map(([control_id, fws]) => ({
        control_id,
        framework_count: fws.size,
        framework_ids: Array.from(fws),
      }));

    // Overall coverage
    const totalReqs = coverage.reduce((sum, c) => sum + c.total_requirements, 0);
    const totalMapped = coverage.reduce((sum, c) => sum + c.mapped_requirements, 0);
    const overallCoverage = totalReqs > 0 ? Math.round((totalMapped / totalReqs) * 100) : 0;

    return Response.json({
      overall_coverage_pct: overallCoverage,
      total_frameworks: frameworks.length,
      total_requirements: totalReqs,
      total_mapped: totalMapped,
      total_gaps: totalReqs - totalMapped,
      shared_controls_count: sharedControls.length,
      shared_controls: sharedControls.slice(0, 50),
      framework_coverage: coverage,
    });
  } catch (error) {
    console.error('calculateCrosswalkCoverage error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});