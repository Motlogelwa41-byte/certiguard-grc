import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { framework_name, description, controls } = body;

    if (!framework_name) return Response.json({ error: 'framework_name is required' }, { status: 400 });

    const controlList = Array.isArray(controls) ? controls : [];
    const prompt = `You are a GRC compliance auditor. Perform a gap analysis on the following:
Framework: ${framework_name}
Description: ${description || 'No description provided'}
Controls associated with this framework (${controlList.length} total):
${controlList.map((c: any) => `- ${c.control_id}: ${c.title} (Status: ${c.status}, Severity: ${c.severity})`).join('\n')}

Return a JSON with:
{
  "total_gaps": number,
  "critical_gaps": number,
  "high_gaps": number,
  "medium_gaps": number,
  "low_gaps": number,
  "findings": "Detailed findings summary with each gap explained",
  "remediation_plan": "Prioritized remediation plan"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          total_gaps: { type: 'number' },
          critical_gaps: { type: 'number' },
          high_gaps: { type: 'number' },
          medium_gaps: { type: 'number' },
          low_gaps: { type: 'number' },
          findings: { type: 'string' },
          remediation_plan: { type: 'string' },
        },
        required: ['total_gaps'],
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiGapAnalysis error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}