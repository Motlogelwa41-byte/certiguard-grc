import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { industry, jurisdiction, company_context, control_brief, framework_names } = body;

    if (!industry || !jurisdiction) {
      return Response.json({ error: 'industry and jurisdiction are required' }, { status: 400 });
    }

    const prompt = `You are a senior GRC consultant specializing in ${industry} compliance in ${jurisdiction}.
Analyze this organization's current compliance posture and provide a tailored gap analysis.

INDUSTRY: ${industry}
JURISDICTION: ${jurisdiction}
ACTIVE FRAMEWORKS: ${(Array.isArray(framework_names) ? framework_names : []).join(', ') || 'None yet'}
COMPANY CONTEXT: ${company_context || 'No additional context provided'}

EXISTING CONTROLS (${Array.isArray(control_brief) ? control_brief.length : 0}):
${JSON.stringify(control_brief || [])}

Provide a comprehensive JSON response with:
1. industry_risk_profile: Top 5 inherent risks for this industry/jurisdiction with likelihood (1-5), impact (1-5), and description
2. missing_controls: 8-10 recommended controls that are NOT in the existing list, with title, category, priority (critical/high/medium), framework_reference, and rationale
3. compliance_priority_roadmap: 6-8 phased recommendations ordered by priority (phase 1 = immediate, phase 2 = 30-60 days, phase 3 = 60-90 days), each with action, rationale, and estimated_effort
4. recommended_frameworks: 3-4 frameworks this organization should adopt based on industry and jurisdiction, with name and reason`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          industry_risk_profile: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                risk_name: { type: 'string' },
                likelihood: { type: 'number' },
                impact: { type: 'number' },
                description: { type: 'string' },
              },
            },
          },
          missing_controls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                priority: { type: 'string' },
                framework_reference: { type: 'string' },
                rationale: { type: 'string' },
              },
            },
          },
          compliance_priority_roadmap: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                phase: { type: 'string' },
                action: { type: 'string' },
                rationale: { type: 'string' },
                estimated_effort: { type: 'string' },
              },
            },
          },
          recommended_frameworks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiGapAnalysisFull error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}