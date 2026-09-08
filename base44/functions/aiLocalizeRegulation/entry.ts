import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { source_text, source_label, target_label, content_type_label } = body;

    if (!source_text) return Response.json({ error: 'source_text is required' }, { status: 400 });

    const prompt = `You are a certified legal translator specializing in GRC (Governance, Risk, Compliance) content. Translate the following ${content_type_label || 'regulatory requirement'} from ${source_label || 'English'} to ${target_label || 'Afrikaans'}.

CRITICAL REQUIREMENTS:
1. Maintain exact legal traceability — the translation must preserve the same legal meaning and obligations as the original
2. Use jurisdictionally appropriate legal terminology for ${target_label || 'Afrikaans'}
3. Preserve any regulatory references, clause numbers, or framework citations exactly as-is
4. If the content references a specific regulatory framework, ensure the translation uses the officially recognized name in the target language's jurisdiction

SOURCE TEXT (${source_label || 'English'}):
"""
${String(source_text).slice(0, 5000)}
"""

Generate a JSON object:
{
  "translated_text": "The full translated text",
  "source_language": "${source_label || 'English'}",
  "target_language": "${target_label || 'Afrikaans'}",
  "content_type": "${content_type_label || 'regulatory_requirement'}",
  "legal_disclaimer": "Note about legal traceability and that the original source text remains the authoritative version",
  "key_terms": [{"source_term", "translated_term", "note"}]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          translated_text: { type: 'string' },
          source_language: { type: 'string' },
          target_language: { type: 'string' },
          content_type: { type: 'string' },
          legal_disclaimer: { type: 'string' },
          key_terms: { type: 'array', items: { type: 'object', properties: { source_term: { type: 'string' }, translated_term: { type: 'string' }, note: { type: 'string' } } } },
        },
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiLocalizeRegulation error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}