import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { provider, controls } = body;

    if (!provider || !Array.isArray(controls) || controls.length === 0) {
      return Response.json({ error: 'provider and controls are required' }, { status: 400 });
    }

    const prompt = `You are a GRC automation expert. Given a list of compliance controls and a ${provider} cloud connection, determine which controls ${provider} can AUTOMATICALLY monitor or collect evidence for (e.g. IAM, logging, encryption, configuration, inventory, access reviews). For each control return: id (match exactly), monitorable (boolean), evidence_source (short, the ${provider} service that provides it), confidence (high/medium/low). Controls: ${JSON.stringify(controls)}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          mappings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                monitorable: { type: 'boolean' },
                evidence_source: { type: 'string' },
                confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
        },
      },
    });

    return Response.json({ mappings: result?.mappings || [] });
  } catch (error) {
    console.error('aiOnboardingMapping error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed', mappings: [] }, { status: 500 });
  }
}