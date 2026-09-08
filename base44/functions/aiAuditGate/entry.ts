import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { gates, document_text } = body;

    if (!document_text || !Array.isArray(gates) || gates.length === 0) {
      return Response.json({ error: 'gates and document_text are required' }, { status: 400 });
    }

    const results = [];
    for (const gate of gates) {
      const prompt = `ROLE: You are the AI Automated Auditor for the Ethical Edge Open GRC platform.

TARGET GATE: ${gate.id}
DOMAIN: ${gate.domain}
REQUIREMENT: ${gate.requirement}

EVALUATION DOCUMENT: ${String(document_text).substring(0, 8000)}

Evaluate the document against the requirement. Be deterministic and strict — only mark PASSED if you find explicit auditable evidence.

Return JSON:
{
  "gate_id": "${gate.id}",
  "is_passed": boolean,
  "confidence_score": number (0-1),
  "evidence_citation": "exact quote or explanation of gap",
  "risk_rating": "LOW" | "MEDIUM" | "HIGH"
}`;

      try {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              gate_id: { type: 'string' },
              is_passed: { type: 'boolean' },
              confidence_score: { type: 'number' },
              evidence_citation: { type: 'string' },
              risk_rating: { type: 'string' },
            },
            required: ['gate_id', 'is_passed'],
          },
        });
        results.push(result);
      } catch (e) {
        results.push({ gate_id: gate.id, is_passed: false, confidence_score: 0, evidence_citation: 'Error: ' + (e?.message || e), risk_rating: 'HIGH' });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error('aiAuditGate error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}