import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { document_text, framework_context } = body;

    if (!document_text) return Response.json({ error: 'document_text is required' }, { status: 400 });

    const prompt = `You are a GRC compliance expert. Analyze the following policy/procedure document and identify all security and compliance controls it describes or implies.

${framework_context || 'Map controls to relevant frameworks including SOC 2, ISO 27001, POPIA, NIST CSF, and any SADC regional regulations.'}

For each control found, extract:
1. A clear control title (concise, actionable)
2. The control category (one of: access_control, data_protection, incident_response, change_management, risk_management, security_operations, business_continuity, network_security, physical_security, compliance, human_resources, asset_management)
3. The severity (critical, high, medium, low)
4. The framework mappings (e.g. SOC 2 CC6.1, ISO 27001 A.9.2.1, POPIA Section 19)
5. A brief description (1-2 sentences)
6. A suggested control ID prefix (e.g. AC, DP, IR)
7. Evidence location — exact quote from the document that proves this control exists

Return a JSON with a "controls" array. Each item: { title, category, severity, description, framework_references (array of strings like "SOC 2 CC6.1"), evidence_quote, suggested_id_prefix }

DOCUMENT TO ANALYZE:
${String(document_text).substring(0, 10000)}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          controls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                framework_references: { type: 'array', items: { type: 'string' } },
                evidence_quote: { type: 'string' },
                suggested_id_prefix: { type: 'string' },
              },
            },
          },
        },
      },
    });

    return Response.json({ controls: result?.controls || [] });
  } catch (error) {
    console.error('aiMapControlsFromDoc error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed', controls: [] }, { status: 500 });
  }
}