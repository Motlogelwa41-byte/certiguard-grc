import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// AI-powered regulatory intelligence feed.
// Searches the web for recent regulatory changes affecting the requested region/frameworks,
// then uses an LLM to produce a structured impact analysis for each change.
// Payload: { region?, frameworks?, months? }
// Returns: { changes: [{ title, regulator, regulation_name, change_type, change_summary,
//   priority, impact_summary, affected_areas, effective_date, compliance_deadline, source_url }] }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const region = body.region || 'SADC and South Africa';
    const frameworks = (body.frameworks && body.frameworks.length)
      ? body.frameworks.join(', ')
      : 'data privacy (POPIA, GDPR), cybersecurity, and financial services regulation';
    const months = body.months || 3;

    const prompt = `You are a regulatory intelligence analyst. Search the web for the most recent regulatory developments (within the last ${months} months) in ${region} affecting ${frameworks}.
For each significant regulatory change, new law, amendment, guidance, or enforcement action, provide:
- title: a concise headline
- regulator: the issuing authority
- regulation_name: the name of the regulation affected
- change_type: one of new_regulation, amendment, repeal, guidance, consultation, enforcement
- change_summary: plain-language summary of what is changing (2-3 sentences)
- priority: critical, high, medium, or low (based on compliance burden)
- impact_summary: how this affects a typical regulated organisation (1-2 sentences)
- affected_areas: array from [policies, controls, vendors, data_processing, contracts, training, systems, reporting]
- effective_date: ISO date or empty string
- compliance_deadline: ISO date or empty string
- source_url: the official source URL
Return up to 10 of the most impactful changes, ordered by priority. Only include real, verifiable developments found via web search — do not fabricate.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                regulator: { type: 'string' },
                regulation_name: { type: 'string' },
                change_type: { type: 'string' },
                change_summary: { type: 'string' },
                priority: { type: 'string' },
                impact_summary: { type: 'string' },
                affected_areas: { type: 'array', items: { type: 'string' } },
                effective_date: { type: 'string' },
                compliance_deadline: { type: 'string' },
                source_url: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const changes = (result && result.changes) ? result.changes : [];
    return Response.json({ ok: true, count: changes.length, changes });
  } catch (error) {
    console.error('fetchRegulatoryIntelligence error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Regulatory intelligence fetch failed', changes: [] }, { status: 500 });
  }
});