import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { framework_id, framework_name, audit_type, analysis_period_days, title, profile_id } = body;

    if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

    const periodDays = analysis_period_days || 90;

    // Create or update the adaptive scope profile
    let profile;
    const profileId = profile_id || `ASP-${Date.now().toString(36).toUpperCase()}`;

    if (profile_id) {
      const existing = await base44.entities.AdaptiveScopeProfile.filter({ id: profile_id });
      if (!existing || existing.length === 0) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }
      profile = existing[0];
      await base44.entities.AdaptiveScopeProfile.update(profile_id, {
        analysis_status: 'analyzing',
        analysis_period_days: periodDays
      });
    } else {
      profile = await base44.entities.AdaptiveScopeProfile.create({
        profile_id: profileId,
        title,
        framework_id: framework_id || '',
        framework_name: framework_name || '',
        audit_type: audit_type || 'soc2_type2',
        analysis_status: 'analyzing',
        analysis_period_days: periodDays,
        total_systems_analyzed: 0,
        systems_in_scope: 0,
        systems_out_of_scope: 0,
        systems_borderline: 0
      });
    }

    // Fetch IT assets, controls, evidence, and security findings
    const [assets, controls, evidence, findings] = await Promise.all([
      base44.entities.ITAsset.list(),
      base44.entities.Control.list(),
      base44.entities.Evidence.list('-created_date', 500),
      base44.entities.SecurityFinding.list('-created_date', 200)
    ]);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // Analyze each IT asset for usage signals
    const inScope = [];
    const outOfScope = [];
    const borderline = [];

    (assets || []).forEach(asset => {
      // Gather usage signals
      const assetControls = (controls || []).filter(c =>
        c.title?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___') ||
        c.description?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___')
      );

      const assetEvidence = (evidence || []).filter(e =>
        e.title?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___') ||
        e.description?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___')
      );

      const assetFindings = (findings || []).filter(f =>
        f.asset?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___') ||
        f.title?.toLowerCase().includes(asset.name?.toLowerCase() || '___NONE___')
      );

      // Compute usage score based on multiple signals
      let usageScore = 0;
      const signals = [];

      // Signal 1: Asset status (active = high usage)
      if (asset.status === 'active' || asset.status === 'in_use' || asset.status === 'production') {
        usageScore += 30;
        signals.push('active/production status');
      } else if (asset.status === 'decommissioned' || asset.status === 'retired') {
        usageScore += 0;
        signals.push('decommissioned');
      } else if (asset.status) {
        usageScore += 15;
        signals.push(`${asset.status} status`);
      }

      // Signal 2: Last updated / activity recency
      if (asset.updated_date) {
        const updatedDate = new Date(asset.updated_date);
        const daysSinceUpdate = Math.floor((now.getTime() - updatedDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysSinceUpdate < 7) { usageScore += 25; signals.push(`updated ${daysSinceUpdate}d ago`); }
        else if (daysSinceUpdate < 30) { usageScore += 20; signals.push(`updated ${daysSinceUpdate}d ago`); }
        else if (daysSinceUpdate < 90) { usageScore += 10; signals.push(`updated ${daysSinceUpdate}d ago`); }
        else { usageScore += 2; signals.push(`updated ${daysSinceUpdate}d ago (stale)`); }
      }

      // Signal 3: Linked controls count
      if (assetControls.length > 0) {
        usageScore += Math.min(assetControls.length * 5, 20);
        signals.push(`${assetControls.length} linked controls`);
      }

      // Signal 4: Evidence recency
      const recentEvidence = assetEvidence.filter(e => e.created_date && new Date(e.created_date) > cutoffDate);
      if (recentEvidence.length > 0) {
        usageScore += Math.min(recentEvidence.length * 3, 15);
        signals.push(`${recentEvidence.length} recent evidence items`);
      }

      // Signal 5: Security findings (active findings = in use and needs attention)
      const openFindings = assetFindings.filter(f => f.status === 'open' || f.status === 'in_progress');
      if (openFindings.length > 0) {
        usageScore += Math.min(openFindings.length * 3, 10);
        signals.push(`${openFindings.length} open findings`);
      }

      // Signal 6: Criticality classification
      if (asset.criticality === 'critical' || asset.criticality === 'high') {
        usageScore += 15;
        signals.push(`${asset.criticality} criticality`);
      }

      // Signal 7: Environment
      if (asset.environment === 'production' || asset.environment === 'prod') {
        usageScore += 10;
        signals.push('production environment');
      }

      // Determine scope recommendation
      const assetInfo = {
        system_id: asset.id,
        name: asset.name || 'Unnamed Asset',
        asset_type: asset.asset_type || asset.type || 'unknown',
        environment: asset.environment || 'unknown',
        criticality: asset.criticality || 'unknown',
        usage_score: Math.min(usageScore, 100),
        signals: signals.join('; '),
        last_active: asset.updated_date || asset.created_date,
        linked_controls: assetControls.length,
        recent_evidence: recentEvidence.length,
        open_findings: openFindings.length
      };

      if (usageScore >= 50) {
        assetInfo.reason = `High usage score (${usageScore}) — actively used with ${assetControls.length} controls and ${recentEvidence.length} recent evidence items`;
        inScope.push(assetInfo);
      } else if (usageScore >= 25) {
        assetInfo.reason = `Moderate usage (${usageScore}) — may be relevant depending on audit boundary`;
        assetInfo.recommendation = 'review';
        borderline.push(assetInfo);
      } else {
        assetInfo.reason = `Low usage score (${usageScore}) — minimal activity in last ${periodDays} days`;
        assetInfo.days_inactive = asset.updated_date ?
          Math.floor((now.getTime() - new Date(asset.updated_date).getTime()) / (24 * 60 * 60 * 1000)) : null;
        outOfScope.push(assetInfo);
      }
    });

    // Calculate scope reduction
    const totalSystems = (assets || []).length;
    const scopeReductionPct = totalSystems > 0
      ? Math.round((outOfScope.length / totalSystems) * 100)
      : 0;

    // Estimate evidence savings
    const avgEvidencePerSystem = totalSystems > 0 ? (evidence || []).length / totalSystems : 0;
    const evidenceSavings = Math.round(outOfScope.length * avgEvidencePerSystem);

    // Generate AI recommendations using InvokeLLM
    let scopeRecommendations = [];
    let riskAssessment = '';
    let confidenceScore = 70;

    try {
      const llmResponse = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a GRC audit scoping expert. Analyze the following system usage data and provide adaptive scoping recommendations for a ${audit_type || 'SOC 2 Type II'} audit.

Total systems analyzed: ${totalSystems}
Systems recommended IN scope: ${inScope.length}
Systems recommended OUT of scope: ${outOfScope.length}
Borderline systems needing review: ${borderline.length}
Scope reduction: ${scopeReductionPct}%
Evidence items potentially saved: ${evidenceSavings}

In-scope systems (top 5): ${inScope.slice(0, 5).map(s => `${s.name} (score: ${s.usage_score})`).join(', ')}
Out-of-scope systems (top 5): ${outOfScope.slice(0, 5).map(s => `${s.name} (score: ${s.usage_score}, inactive: ${s.days_inactive}d)`).join(', ')}

Provide:
1. Three prioritized recommendations for optimizing the audit scope (JSON array of {priority, recommendation, impact, systems_affected})
2. A risk assessment paragraph evaluating whether excluding the out-of-scope systems introduces audit risk
3. A confidence score (0-100) for this scope recommendation

Return as JSON: {"recommendations": [...], "risk_assessment": "...", "confidence_score": 85}`,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  recommendation: { type: "string" },
                  impact: { type: "string" },
                  systems_affected: { type: "string" }
                }
              }
            },
            risk_assessment: { type: "string" },
            confidence_score: { type: "number" }
          }
        }
      });

      scopeRecommendations = llmResponse.recommendations || [];
      riskAssessment = llmResponse.risk_assessment || '';
      confidenceScore = llmResponse.confidence_score || 70;
    } catch (_) {
      // Fallback recommendations if LLM fails
      scopeRecommendations = [
        { priority: 'high', recommendation: `Exclude ${outOfScope.length} inactive systems from audit scope to reduce evidence collection burden`, impact: `${evidenceSavings} evidence items saved`, systems_affected: `${outOfScope.length} systems` },
        { priority: 'medium', recommendation: `Review ${borderline.length} borderline systems manually before finalizing scope`, impact: 'Prevents under-scoping risk', systems_affected: `${borderline.length} systems` },
        { priority: 'low', recommendation: 'Re-run adaptive scoping monthly to catch usage changes', impact: 'Keeps scope current', systems_affected: 'All systems' }
      ];
      riskAssessment = `Excluding ${outOfScope.length} low-usage systems carries minimal audit risk. These systems show no significant activity in the last ${periodDays} days. Borderline systems should be reviewed manually to ensure no critical dependencies are missed.`;
      confidenceScore = 75;
    }

    // Count controls in scope
    const inScopeAssetNames = inScope.map(s => s.name.toLowerCase());
    const controlsInScope = (controls || []).filter(c => {
      return inScopeAssetNames.some(name =>
        c.title?.toLowerCase().includes(name) || c.description?.toLowerCase().includes(name)
      );
    }).length;

    // Update the profile with results
    const completedProfile = await base44.entities.AdaptiveScopeProfile.update(profile.id, {
      analysis_status: 'completed',
      total_systems_analyzed: totalSystems,
      systems_in_scope: inScope.length,
      systems_out_of_scope: outOfScope.length,
      systems_borderline: borderline.length,
      scope_reduction_pct: scopeReductionPct,
      usage_data_points: totalSystems + (evidence || []).length + (findings || []).length,
      in_scope_systems: JSON.stringify(inScope),
      out_of_scope_systems: JSON.stringify(outOfScope),
      borderline_systems: JSON.stringify(borderline),
      scope_recommendations: JSON.stringify(scopeRecommendations),
      controls_in_scope: controlsInScope,
      controls_excluded: (controls || []).length - controlsInScope,
      evidence_required: Math.round(inScope.length * avgEvidencePerSystem),
      evidence_savings: evidenceSavings,
      risk_assessment: riskAssessment,
      confidence_score: confidenceScore,
      analysis_completed_at: new Date().toISOString()
    });

    return Response.json({
      profile_id: profile.id,
      analysis_status: 'completed',
      summary: {
        total_systems: totalSystems,
        in_scope: inScope.length,
        out_of_scope: outOfScope.length,
        borderline: borderline.length,
        scope_reduction_pct: scopeReductionPct,
        evidence_savings: evidenceSavings,
        confidence_score: confidenceScore
      },
      in_scope: inScope,
      out_of_scope: outOfScope,
      borderline: borderline,
      recommendations: scopeRecommendations,
      risk_assessment: riskAssessment
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}