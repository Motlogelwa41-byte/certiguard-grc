import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { contract_text } = body;

    if (!contract_text || contract_text.length < 100) {
      return Response.json({ error: 'At least 100 characters of contract text required' }, { status: 400 });
    }

    const prompt = `You are a GRC legal compliance AI. Analyze the following contract/SLA text and identify compliance risks. Cross-reference against standard data protection policies (POPIA, GDPR), information security requirements (ISO 27001), and common vendor risk thresholds.

CONTRACT TEXT:
"""
${String(contract_text).slice(0, 8000)}
"""

Generate a JSON object with this exact schema:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "Brief overall assessment",
  "high_risk_clauses": [{"clause", "risk", "severity"}],
  "missing_clauses": ["List of important missing clauses e.g. indemnity, data breach notification, audit rights"],
  "compliance_anomalies": [{"issue", "framework", "severity"}],
  "recommendations": ["Actionable recommendations"]
}

Focus on: data protection gaps, liability caps, indemnity missing, audit rights, sub-processor disclosures, breach notification SLAs, and termination clauses.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          risk_level: { type: 'string' },
          summary: { type: 'string' },
          high_risk_clauses: { type: 'array', items: { type: 'object', properties: { clause: { type: 'string' }, risk: { type: 'string' }, severity: { type: 'string' } } } },
          missing_clauses: { type: 'array', items: { type: 'string' } },
          compliance_anomalies: { type: 'array', items: { type: 'object', properties: { issue: { type: 'string' }, framework: { type: 'string' }, severity: { type: 'string' } } } },
          recommendations: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiScanContract error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}