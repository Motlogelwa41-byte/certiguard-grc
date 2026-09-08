import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { framework, companyName, industry } = body;

    if (!framework || !companyName) {
      return Response.json({ error: 'framework and companyName are required' }, { status: 400 });
    }

    const prompt = `Generate a professional, detailed ${framework} compliance policy for a company called "${companyName}" in the ${industry || 'technology'} industry.

Include:
1. Purpose & Scope
2. Policy Statement
3. Roles & Responsibilities
4. Key Requirements (specific to ${framework})
5. Compliance & Review

Use [PLACEHOLDER] format for company-specific values that need to be filled in.
Make it production-ready for a GRC compliance platform.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          category: { type: 'string' },
        },
      },
    });

    return Response.json({ result });
  } catch (error) {
    console.error('aiGeneratePolicy error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}