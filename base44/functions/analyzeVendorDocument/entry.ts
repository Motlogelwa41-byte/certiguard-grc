import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const body = await req.json().catch(() => ({}));
    const { file_url, vendor_id, vendor_name, document_type } = body;

    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const docType = document_type || 'vendor_security_report';

    const prompt = `You are a third-party risk management expert analyzing a vendor security document (SOC 2 report, ISO 27001 certificate, security questionnaire, penetration test report, or similar).

Vendor: ${vendor_name || 'Unknown vendor'}
Document type: ${docType}

Analyze this document and extract the vendor's security posture in structured form. Focus on:

1. **Security posture summary** — overall assessment of the vendor's security maturity
2. **Certifications and attestations** — what certifications/attestations the vendor holds (SOC 2 Type I/II, ISO 27001, HIPAA, PCI DSS, etc.) with validity dates
3. **Security controls evidenced** — specific controls the vendor has implemented (MFA, encryption, access reviews, incident response, etc.)
4. **Control gaps identified** — security areas where the vendor's documentation is weak or missing
5. **Risk indicators** — red flags that elevate vendor risk (expired certifications, missing controls, breach history, weak encryption, etc.)
6. **Risk score recommendation** — a 0-100 risk score where 0 = very high risk, 100 = very low risk
7. **Recommended due diligence actions** — what the assessor should verify or follow up on

Return a JSON object:
{
  "posture_summary": "2-3 sentence overall assessment",
  "security_maturity": "low/medium/high/very_high",
  "certifications": [{"name": "", "type": "", "valid_from": "", "valid_until": "", "status": "valid/expired/unknown"}],
  "controls_evidenced": [{"control": "", "category": "access_control/encryption/incident_response/...", "status": "implemented/partially_implemented/not_implemented/unknown", "evidence": "brief quote or reference"}],
  "control_gaps": [{"gap": "", "severity": "critical/high/medium/low", "recommendation": ""}],
  "risk_indicators": [{"indicator": "", "severity": "critical/high/medium/low"}],
  "risk_score": 0-100,
  "risk_level": "low/medium/high/critical",
  "recommended_actions": [{"action": "", "priority": "critical/high/medium/low"}],
  "overall_recommendation": "approve/conditionally_approve/reject/require_followup"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          posture_summary: { type: 'string' },
          security_maturity: { type: 'string' },
          certifications: { type: 'array', items: { type: 'object', properties: {
            name: { type: 'string' }, type: { type: 'string' }, valid_from: { type: 'string' },
            valid_until: { type: 'string' }, status: { type: 'string' }
          } } },
          controls_evidenced: { type: 'array', items: { type: 'object', properties: {
            control: { type: 'string' }, category: { type: 'string' }, status: { type: 'string' }, evidence: { type: 'string' }
          } } },
          control_gaps: { type: 'array', items: { type: 'object', properties: {
            gap: { type: 'string' }, severity: { type: 'string' }, recommendation: { type: 'string' }
          } } },
          risk_indicators: { type: 'array', items: { type: 'object', properties: {
            indicator: { type: 'string' }, severity: { type: 'string' }
          } } },
          risk_score: { type: 'number' },
          risk_level: { type: 'string' },
          recommended_actions: { type: 'array', items: { type: 'object', properties: {
            action: { type: 'string' }, priority: { type: 'string' }
          } } },
          overall_recommendation: { type: 'string' },
        },
      },
    });

    // Log AI activity
    const activityId = `AI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    await base44.asServiceRole.entities.AIActivityLog.create({
      tenant_id,
      activity_id: activityId,
      feature: 'vendor_risk_analysis',
      action: 'analyze_vendor_document',
      prompt_summary: `Analyzed vendor document for ${vendor_name || 'unknown vendor'}`,
      response_summary: result.posture_summary || 'Vendor document analyzed',
      reasoning: `AI assessed vendor security maturity as ${result.security_maturity}, risk score ${result.risk_score}/100 (${result.risk_level}). Found ${result.certifications?.length || 0} certifications, ${result.control_gaps?.length || 0} gaps.`,
      confidence_score: 75,
      confidence_level: 'medium',
      source_references: JSON.stringify([{ type: 'vendor_document', vendor_name, url: file_url }]),
      supporting_data: JSON.stringify(result),
      human_approval_required: true,
      approval_status: 'pending',
      model_used: 'automatic',
      requested_by_name: user.full_name || user.email || '',
      requested_by_id: user.id || '',
      requested_at: new Date().toISOString(),
    });

    // If vendor_id provided, update the vendor record with the AI risk score
    if (vendor_id) {
      try {
        await base44.asServiceRole.entities.Vendor.update(vendor_id, {
          risk_score: result.risk_score,
          risk_level: result.risk_level,
        });
      } catch (e) {
        console.error('Failed to update vendor with AI risk score:', e.message);
      }
    }

    return Response.json({
      ok: true,
      analysis: result,
      activity_id: activityId,
      message: 'Vendor document analyzed — AI assessment requires human validation before becoming official',
      human_approval_required: true,
    });
  } catch (error) {
    console.error('analyzeVendorDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});