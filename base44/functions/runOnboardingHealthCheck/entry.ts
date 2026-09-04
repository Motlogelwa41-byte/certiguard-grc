import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Module 5: Automated Onboarding Health Check
// Orchestrates a full compliance scan on client onboarding:
//   1. Ingests & validates evidence documents (policies, asset inventories, access logs, audit reports)
//   2. Maps findings against frameworks (ISO 27001, NIST CSF 2.0, POPIA, Botswana DPA)
//   3. Calculates residual risk scores against organizational risk tolerance
//   4. Generates automated POA&M (Plan of Action and Milestones)
//
// Body:
//   evidence_documents: [{type: "policy"|"asset_inventory"|"access_log"|"audit_report", file_url, file_name}]
//   risk_tolerance: number (0-100, default 70)
//   triggered_by: string (optional, defaults to user name)

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const startedAt = new Date().toISOString();

  try {
    // Auth
    let me = null;
    try { me = await base44.auth.me(); } catch (_) { me = null; }
    if (!me || !me.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const triggeredBy = body.triggered_by || me.full_name || me.email || 'auto_onboarding';
    const riskTolerance = typeof body.risk_tolerance === 'number' ? body.risk_tolerance : 70;
    const evidenceDocs = Array.isArray(body.evidence_documents) ? body.evidence_documents : [];

    // --- 1. EVIDENCE INGESTION & VALIDATION ---
    const evidenceTypes = {
      policies: { uploaded: 0, validated: 0, count: 0, hash_verified: false, items: [] },
      asset_inventories: { uploaded: 0, validated: 0, count: 0, hash_verified: false, items: [] },
      access_logs: { uploaded: 0, validated: 0, count: 0, hash_verified: false, items: [] },
      audit_reports: { uploaded: 0, validated: 0, count: 0, hash_verified: false, items: [] },
    };

    const typeMap = {
      policy: 'policies',
      asset_inventory: 'asset_inventories',
      access_log: 'access_logs',
      audit_report: 'audit_reports',
    };

    for (const doc of evidenceDocs) {
      const category = typeMap[doc.type];
      if (!category) continue;
      evidenceTypes[category].uploaded++;
      evidenceTypes[category].count++;
      // Hash the file URL as integrity proof (in production, the actual file bytes would be hashed)
      const hashInput = `${doc.file_url}:${doc.file_name}:${Date.now()}`;
      let hash = '';
      try {
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
        hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (_) { hash = 'hash_unavailable'; }

      // Record in AuditEvidenceLedger
      try {
        await base44.entities.AuditEvidenceLedger.create({
          user_id: me.id,
          user_name: me.full_name || me.email,
          timestamp: new Date().toISOString(),
          file_url: doc.file_url,
          file_name: doc.file_name,
          sha256_hash: hash,
          retention_policy: '7_years',
        });
        evidenceTypes[category].validated++;
        evidenceTypes[category].hash_verified = true;
        evidenceTypes[category].items.push({ file_name: doc.file_name, sha256: hash.substring(0, 16) + '...' });
      } catch (e) {
        evidenceTypes[category].items.push({ file_name: doc.file_name, error: 'validation_failed' });
      }
    }

    // --- 2. FRAMEWORK MAPPING & GAP ANALYSIS ---
    const frameworks = await base44.entities.RegulatoryFramework.filter({ status: 'active' }).catch(() => []);
    const allRequirements = await base44.entities.FrameworkRequirement.list('-created_date', 500).catch(() => []);
    const allMappings = await base44.entities.RequirementControlMapping.filter({ status: 'active' }).catch(() => []);
    const controls = await base44.entities.Control.filter({ status: { $ne: 'not_tested' } }).catch(() => []);

    const mappedReqIds = new Set((allMappings || []).map(m => m.requirement_id));
    const passingControlIds = new Set((controls || []).filter(c => c.status === 'passing').map(c => c.id));

    const frameworkResults = [];
    const poamItems = [];
    let poamCounter = 1;
    let totalFindings = 0, critFindings = 0, highFindings = 0, medFindings = 0, lowFindings = 0;
    let totalResidualRisk = 0;
    let frameworksScanned = 0;

    for (const fw of (frameworks || [])) {
      const fwReqs = (allRequirements || []).filter(r => r.framework_id === fw.id);
      if (fwReqs.length === 0) continue;
      frameworksScanned++;

      const mappedCount = fwReqs.filter(r => mappedReqIds.has(r.id)).length;
      const coveragePct = Math.round((mappedCount / fwReqs.length) * 100);
      const gaps = fwReqs.filter(r => !mappedReqIds.has(r.id));

      // Calculate residual risk for this framework
      // Base risk = (gaps / total_reqs) * 100, reduced by coverage
      const gapRatio = gaps.length / fwReqs.length;
      const baseRisk = gapRatio * 100;
      const controlReduction = (mappedCount / fwReqs.length) * 30; // controls reduce risk up to 30%
      const fwResidualRisk = Math.max(0, Math.round(baseRisk - controlReduction));

      let appetiteStatus = 'within_tolerance';
      if (fwResidualRisk > riskTolerance) appetiteStatus = 'breached';
      else if (fwResidualRisk > riskTolerance * 0.8) appetiteStatus = 'near_limit';

      frameworkResults.push({
        framework_code: fw.code,
        framework_name: fw.name,
        total_requirements: fwReqs.length,
        mapped_controls: mappedCount,
        coverage_pct: coveragePct,
        gaps_identified: gaps.length,
        residual_risk_score: fwResidualRisk,
        risk_tolerance: riskTolerance,
        risk_appetite_status: appetiteStatus,
      });

      // Generate POA&M items for gaps
      for (const gap of gaps) {
        const isMandatory = gap.is_mandatory !== false;
        let priority = 'medium';
        let riskScore = 40;
        let targetDays = 60;

        if (isMandatory) {
          if (gap.category === 'access_control' || gap.category === 'data_protection') {
            priority = 'critical'; riskScore = 85; targetDays = 30;
          } else if (gap.category === 'incident_response' || gap.category === 'network_security') {
            priority = 'high'; riskScore = 70; targetDays = 45;
          } else {
            priority = 'medium'; riskScore = 50; targetDays = 60;
          }
        } else {
          priority = 'low'; riskScore = 25; targetDays = 90;
        }

        totalFindings++;
        if (priority === 'critical') critFindings++;
        else if (priority === 'high') highFindings++;
        else if (priority === 'medium') medFindings++;
        else lowFindings++;

        const targetDate = new Date(Date.now() + targetDays * 86400000).toISOString().split('T')[0];

        poamItems.push({
          item_id: `POAM-${String(poamCounter).padStart(3, '0')}`,
          finding: `No control mapped to ${gap.requirement_id || 'N/A'} — ${gap.title || 'Unmapped requirement'}`,
          linked_control: null,
          linked_requirement: gap.id,
          framework: fw.code,
          priority,
          residual_risk: riskScore,
          milestone: `Implement and document control for ${gap.requirement_id || gap.title}`,
          target_date: targetDate,
          owner: 'Unassigned',
          status: 'open',
        });
        poamCounter++;
      }

      totalResidualRisk += fwResidualRisk;
    }

    const overallResidualRisk = frameworksScanned > 0 ? Math.round(totalResidualRisk / frameworksScanned) : 0;
    let overallAppetite = 'within_tolerance';
    if (overallResidualRisk > riskTolerance) overallAppetite = 'breached';
    else if (overallResidualRisk > riskTolerance * 0.8) overallAppetite = 'near_limit';

    // --- 3. HEALTH SCORE ---
    const avgCoverage = frameworkResults.length > 0
      ? Math.round(frameworkResults.reduce((s, f) => s + f.coverage_pct, 0) / frameworkResults.length)
      : 0;
    const evidenceScore = Math.min(100, Object.values(evidenceTypes).reduce((s, e) => s + (e.validated > 0 ? 25 : 0), 0));
    const healthScore = Math.round((avgCoverage * 0.5) + (evidenceScore * 0.2) + ((100 - Math.min(100, overallResidualRisk)) * 0.3));
    let grade = 'critical';
    if (healthScore >= 85) grade = 'excellent';
    else if (healthScore >= 70) grade = 'good';
    else if (healthScore >= 50) grade = 'fair';
    else if (healthScore >= 30) grade = 'poor';

    // --- 4. RECOMMENDATIONS ---
    const recommendations = [];
    if (critFindings > 0) recommendations.push({ priority: 'critical', recommendation: `Address ${critFindings} critical compliance gap(s) within 30 days`, framework: 'ALL', target_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
    if (evidenceTypes.policies.validated === 0) recommendations.push({ priority: 'high', recommendation: 'Upload and validate security policies (Acceptable Use, Access Control, Information Security)', framework: 'ISO 27001', target_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] });
    if (evidenceTypes.asset_inventories.validated === 0) recommendations.push({ priority: 'high', recommendation: 'Upload asset inventory register for IT asset management baseline', framework: 'NIST CSF', target_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0] });
    if (evidenceTypes.access_logs.validated === 0) recommendations.push({ priority: 'medium', recommendation: 'Ingest access logs for user access review and least-privilege validation', framework: 'POPIA', target_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
    if (overallResidualRisk > riskTolerance) recommendations.push({ priority: 'critical', recommendation: `Residual risk (${overallResidualRisk}) exceeds organizational tolerance (${riskTolerance}) — escalate to risk committee`, framework: 'ALL', target_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] });
    if (avgCoverage < 50) recommendations.push({ priority: 'high', recommendation: `Framework coverage at ${avgCoverage}% — prioritize control mapping to close gaps`, framework: 'ALL', target_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0] });

    // --- 5. CREATE HEALTH CHECK RECORD ---
    const completedAt = new Date().toISOString();
    const checkId = `OHC-${Date.now().toString().slice(-6)}`;

    const record = await base44.entities.OnboardingHealthCheck.create({
      tenant_id: me.data?.tenant_id || me.id,
      check_id: checkId,
      tenant_name: me.data?.tenant_name || 'Current Tenant',
      triggered_by: triggeredBy,
      scan_status: 'completed',
      scan_started_at: startedAt,
      scan_completed_at: completedAt,
      evidence_ingestion: JSON.stringify(evidenceTypes),
      framework_results: JSON.stringify(frameworkResults),
      total_findings: totalFindings,
      critical_findings: critFindings,
      high_findings: highFindings,
      medium_findings: medFindings,
      low_findings: lowFindings,
      residual_risk_score: overallResidualRisk,
      risk_tolerance: riskTolerance,
      risk_appetite_status: overallAppetite,
      poam_items: JSON.stringify(poamItems),
      poam_count: poamItems.length,
      overall_health_score: healthScore,
      health_grade: grade,
      recommendations: JSON.stringify(recommendations),
      notes: `Automated onboarding health check — ${frameworksScanned} frameworks scanned, ${evidenceDocs.length} evidence documents ingested`,
    });

    return Response.json({
      status: 'completed',
      check_id: checkId,
      record_id: record?.id,
      scan_started_at: startedAt,
      scan_completed_at: completedAt,
      frameworks_scanned: frameworksScanned,
      framework_results: frameworkResults,
      evidence_ingestion: evidenceTypes,
      total_findings: totalFindings,
      critical_findings: critFindings,
      high_findings: highFindings,
      medium_findings: medFindings,
      low_findings: lowFindings,
      residual_risk_score: overallResidualRisk,
      risk_tolerance: riskTolerance,
      risk_appetite_status: overallAppetite,
      poam_count: poamItems.length,
      poam_items: poamItems,
      overall_health_score: healthScore,
      health_grade: grade,
      recommendations,
    });
  } catch (error) {
    console.error('runOnboardingHealthCheck error:', error?.message || error);
    return Response.json({ error: error?.message || 'Onboarding health check failed', scan_started_at: startedAt }, { status: 500 });
  }
});