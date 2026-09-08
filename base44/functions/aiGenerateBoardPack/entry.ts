import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { compliance_score, passing, total, fw_ready, top_risks, sev_counts, at_risk_kpis, regulatory_changes, open_incidents } = body;

    const prompt = `You are a GRC executive advisor. Generate a board-ready presentation outline (8-10 slides) for a GRC board pack. Use the following current system data:

COMPLIANCE POSTURE: ${compliance_score}% (${passing}/${total} controls passing)
FRAMEWORK READINESS: ${JSON.stringify(fw_ready)}
TOP RISKS: ${JSON.stringify(top_risks)}
OPEN FINDINGS: ${sev_counts?.critical || 0} critical, ${sev_counts?.high || 0} high, ${sev_counts?.medium || 0} medium, ${sev_counts?.low || 0} low
AT-RISK KPIs/KRIs: ${JSON.stringify(at_risk_kpis)}
REGULATORY CHANGES: ${JSON.stringify(regulatory_changes)}
OPEN INCIDENTS: ${open_incidents}

Generate a JSON object with this exact schema:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "Slide title",
      "bullet_points": ["Key point 1", "Key point 2", "Key point 3"],
      "speaker_notes": "Narrative summary for the presenter",
      "recommendation": "Specific board-level recommendation (if applicable)"
    }
  ]
}

Start with an executive summary slide, then cover: compliance posture, top risks, audit findings, KPI/KRI performance, regulatory landscape, incidents, and end with recommendations. Make it concise, data-driven, and executive-ready.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          slides: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                slide_number: { type: 'number' },
                title: { type: 'string' },
                bullet_points: { type: 'array', items: { type: 'string' } },
                speaker_notes: { type: 'string' },
                recommendation: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiGenerateBoardPack error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}