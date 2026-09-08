import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { industry, benchmarks } = body;

    if (!Array.isArray(benchmarks) || benchmarks.length === 0) {
      return Response.json({ error: 'benchmarks are required' }, { status: 400 });
    }

    const prompt = `You are a GRC benchmarking analyst. Compare this organisation's compliance metrics against industry peers and provide actionable insights.

Industry: ${industry || 'Unknown'}
Metrics (JSON): ${JSON.stringify(benchmarks)}

Provide:
1. Top 3 areas where the organisation LAGS peers (with specific gap and recommended action)
2. Top 2 areas where the organisation LEADS peers
3. Overall percentile assessment and one strategic recommendation

Be concise and specific. Use bullet points.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ result: result || 'No insight generated.' });
  } catch (error) {
    console.error('aiBenchmarkInsight error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}