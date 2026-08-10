import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const body = await req.json().catch(() => ({}));
    const { framework_ids } = body;

    // Fetch frameworks (all or filtered)
    const frameworks = framework_ids && framework_ids.length > 0
      ? await base44.asServiceRole.entities.RegulatoryFramework.filter({ tenant_id, id: { $in: framework_ids } })
      : await base44.asServiceRole.entities.RegulatoryFramework.filter({ tenant_id, status: 'active' });

    // Fetch all relevant data in parallel
    const [requirements, mappings, controls, evidence, policies, assessments, controlTests] = await Promise.all([
      base44.asServiceRole.entities.FrameworkRequirement.filter({ tenant_id }),
      base44.asServiceRole.entities.RequirementControlMapping.filter({ tenant_id, status: 'active' }),
      base44.asServiceRole.entities.Control.filter({ tenant_id }),
      base44.asServiceRole.entities.Evidence.filter({ tenant_id }),
      base44.asServiceRole.entities.Policy.filter({ tenant_id }),
      base44.asServiceRole.entities.Assessment.filter({ tenant_id }),
      base44.asServiceRole.entities.ControlTestResult.filter({ tenant_id }),
    ]);

    const frameworkResults = frameworks.map((fw) => {
      const fwReqs = requirements.filter((r) => r.framework_id === fw.id);
      const fwMappings = mappings.filter((m) => m.framework_id === fw.id);

      const gaps = [];
      const partialGaps = [];
      const satisfiedReqs = [];
      const duplicateControls = [];

      // Track which controls are mapped to multiple requirements (potential duplicates)
      const controlReqCount = {};
      fwMappings.forEach((m) => {
        controlReqCount[m.control_id] = (controlReqCount[m.control_id] || 0) + 1;
      });
      Object.entries(controlReqCount).forEach(([cid, count]) => {
        if (count > 3) {
          const control = controls.find((c) => c.id === cid);
          duplicateControls.push({
            control_id: cid,
            control_name: control?.title || '',
            mapped_requirement_count: count,
            recommendation: 'Consider consolidating — this control maps to many requirements',
          });
        }
      });

      fwReqs.forEach((req) => {
        const reqMappings = fwMappings.filter((m) => m.requirement_id === req.id);
        if (reqMappings.length === 0) {
          gaps.push({
            requirement_id: req.id,
            requirement_ref: req.requirement_id,
            title: req.title,
            is_mandatory: req.is_mandatory,
            gap_type: 'no_mapping',
            priority: req.is_mandatory ? 'critical' : 'high',
            recommendation: 'No control mapped to this requirement — create a control or map an existing one',
          });
        } else {
          // Check if mapped controls are passing and have evidence
          const mappedControlIds = reqMappings.map((m) => m.control_id);
          const mappedControls = controls.filter((c) => mappedControlIds.includes(c.id));
          const passingControls = mappedControls.filter((c) => c.status === 'passing');
          const failingControls = mappedControls.filter((c) => c.status === 'failing');
          const notTestedControls = mappedControls.filter((c) => c.status === 'not_tested');
          const controlEvidence = evidence.filter((e) => mappedControlIds.includes(e.control_id) && e.status === 'approved');

          const hasFullMapping = reqMappings.some((m) => m.mapping_confidence === 'full');
          const hasPartialMapping = reqMappings.some((m) => m.mapping_confidence === 'partial');

          if (failingControls.length > 0 || notTestedControls.length === mappedControls.length) {
            partialGaps.push({
              requirement_id: req.id,
              requirement_ref: req.requirement_id,
              title: req.title,
              is_mandatory: req.is_mandatory,
              gap_type: failingControls.length > 0 ? 'control_failing' : 'control_not_tested',
              priority: failingControls.length > 0 && req.is_mandatory ? 'critical' : 'medium',
              failing_controls: failingControls.map((c) => ({ id: c.id, title: c.title })),
              recommendation: failingControls.length > 0 ? 'Remediate failing controls' : 'Test the mapped controls',
            });
          } else if (controlEvidence.length === 0) {
            partialGaps.push({
              requirement_id: req.id,
              requirement_ref: req.requirement_id,
              title: req.title,
              is_mandatory: req.is_mandatory,
              gap_type: 'missing_evidence',
              priority: req.is_mandatory ? 'high' : 'medium',
              recommendation: 'Collect and approve evidence for the mapped controls',
            });
          } else if (hasPartialMapping && !hasFullMapping) {
            partialGaps.push({
              requirement_id: req.id,
              requirement_ref: req.requirement_id,
              title: req.title,
              is_mandatory: req.is_mandatory,
              gap_type: 'partial_mapping',
              priority: 'medium',
              recommendation: 'Partial control mapping — consider additional controls for full coverage',
            });
          } else {
            satisfiedReqs.push({
              requirement_id: req.id,
              requirement_ref: req.requirement_id,
              title: req.title,
            });
          }
        }
      });

      const totalReqs = fwReqs.length;
      const satisfiedCount = satisfiedReqs.length;
      const gapCount = gaps.length;
      const partialGapCount = partialGaps.length;
      const coveragePct = totalReqs > 0 ? Math.round((satisfiedCount / totalReqs) * 100) : 0;

      // Build prioritized remediation roadmap
      const roadmap = [
        ...gaps.filter((g) => g.priority === 'critical').map((g) => ({ ...g, action: 'Create or map a control', priority_score: 100 })),
        ...partialGaps.filter((g) => g.priority === 'critical').map((g) => ({ ...g, action: 'Remediate failing controls', priority_score: 90 })),
        ...gaps.filter((g) => g.priority === 'high').map((g) => ({ ...g, action: 'Create or map a control', priority_score: 70 })),
        ...partialGaps.filter((g) => g.priority === 'high').map((g) => ({ ...g, action: g.recommendation, priority_score: 60 })),
        ...partialGaps.filter((g) => g.priority === 'medium').map((g) => ({ ...g, action: g.recommendation, priority_score: 40 })),
      ].sort((a, b) => b.priority_score - a.priority_score);

      return {
        framework_id: fw.id,
        framework_name: fw.name,
        framework_code: fw.code,
        jurisdiction: fw.jurisdiction,
        total_requirements: totalReqs,
        satisfied: satisfiedCount,
        gaps: gapCount,
        partial_gaps: partialGapCount,
        coverage_pct: coveragePct,
        posture_state: coveragePct === 100 ? 'compliant' : coveragePct >= 75 ? 'partially_compliant' : coveragePct > 0 ? 'non_compliant' : 'unknown',
        gap_details: gaps.slice(0, 30),
        partial_gap_details: partialGaps.slice(0, 30),
        duplicate_controls: duplicateControls.slice(0, 10),
        remediation_roadmap: roadmap.slice(0, 20),
        roadmap_total_items: roadmap.length,
      };
    });

    // Overall summary
    const totalReqs = frameworkResults.reduce((s, f) => s + f.total_requirements, 0);
    const totalGaps = frameworkResults.reduce((s, f) => s + f.gaps + f.partial_gaps, 0);
    const totalSatisfied = frameworkResults.reduce((s, f) => s + f.satisfied, 0);
    const overallCoverage = totalReqs > 0 ? Math.round((totalSatisfied / totalReqs) * 100) : 0;
    const totalRoadmapItems = frameworkResults.reduce((s, f) => s + f.roadmap_total_items, 0);

    return Response.json({
      overall_coverage_pct: overallCoverage,
      total_frameworks: frameworks.length,
      total_requirements: totalReqs,
      total_satisfied: totalSatisfied,
      total_gaps: totalGaps,
      total_roadmap_items: totalRoadmapItems,
      framework_results: frameworkResults,
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('runGapAnalysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});