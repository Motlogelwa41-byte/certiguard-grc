import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const body = await req.json().catch(() => ({}));
    const { file_url, document_type, document_name } = body;

    if (!file_url) return Response.json({ error: 'file_url is required' }, { status: 400 });

    // Use InvokeLLM to analyze the document
    const prompt = `You are a GRC document analysis expert. Analyze the following document and extract structured GRC intelligence.

Document type: ${document_type || 'unknown'}
Document name: ${document_name || 'unknown'}

Extract:
1. Applicable controls — what security/compliance controls this document demonstrates or mandates
2. Applicable frameworks — which regulatory frameworks (ISO 27001, SOC 2, NIST CSF, POPIA, GDPR, etc.) this document relates to
3. Risks — any risks identified or addressed in the document
4. Obligations — regulatory or contractual obligations mentioned
5. Key dates — effective dates, review dates, expiry dates, renewal dates
6. Gaps — any compliance gaps or missing elements you notice
7. Suggested actions — recommended next steps for the GRC team

Return a JSON object with this structure:
{
  "document_summary": "brief summary of the document",
  "extracted_controls": [{"title": "", "description": "", "category": "", "confidence": "high/medium/low"}],
  "applicable_frameworks": [{"name": "", "code": "", "confidence": "high/medium/low"}],
  "identified_risks": [{"title": "", "description": "", "severity": "critical/high/medium/low"}],
  "obligations": [{"title": "", "description": "", "type": "regulatory/contractual/security/privacy"}],
  "key_dates": [{"date": "", "type": "effective/review/expiry/renewal", "description": ""}],
  "gaps": [{"title": "", "description": "", "priority": "critical/high/medium/low"}],
  "suggested_actions": [{"action": "", "priority": "critical/high/medium/low"}],
  "overall_assessment": "overall quality and completeness assessment"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          document_summary: { type: 'string' },
          extracted_controls: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, category: { type: 'string' }, confidence: { type: 'string' } } } },
          applicable_frameworks: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, confidence: { type: 'string' } } } },
          identified_risks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string' } } } },
          obligations: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, type: { type: 'string' } } } },
          key_dates: { type: 'array', items: { type: 'object', properties: { date: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' } } } },
          gaps: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } } } },
          suggested_actions: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string' } } } },
          overall_assessment: { type: 'string' },
        },
      },
    });

    // Log this AI activity for human approval tracking
    const activityId = `AI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    await base44.asServiceRole.entities.AIActivityLog.create({
      tenant_id,
      activity_id: activityId,
      feature: 'evidence_analysis',
      action: 'analyze_document',
      prompt_summary: `Analyzed document: ${document_name || file_url}`,
      response_summary: result.document_summary || 'Document analyzed',
      reasoning: `AI extracted ${result.extracted_controls?.length || 0} controls, ${result.applicable_frameworks?.length || 0} frameworks, ${result.identified_risks?.length || 0} risks from the document`,
      confidence_score: 80,
      confidence_level: 'medium',
      source_references: JSON.stringify([{ type: 'document', name: document_name, url: file_url }]),
      supporting_data: JSON.stringify(result),
      human_approval_required: true,
      approval_status: 'pending',
      model_used: 'automatic',
      requested_by_name: user.full_name || user.email || '',
      requested_by_id: user.id || '',
      requested_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      analysis: result,
      activity_id: activityId,
      message: 'Document analyzed — extracted intelligence requires human validation before becoming official GRC records',
      human_approval_required: true,
    });
  } catch (error) {
    console.error('analyzeDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});