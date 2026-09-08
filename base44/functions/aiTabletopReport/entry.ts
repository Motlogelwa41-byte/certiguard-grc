import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { scenario_name, scenario_type, description, participants, milestones } = body;

    if (!scenario_name) return Response.json({ error: 'scenario_name is required' }, { status: 400 });

    const prompt = `Generate a post-action compliance improvement report for a tabletop exercise. Scenario: ${scenario_name} (${scenario_type || 'unknown'}). Description: ${description || 'N/A'}. Participants: ${Array.isArray(participants) ? participants.map((p: any) => p.name).join(', ') : 'N/A'}. Milestones recorded: ${JSON.stringify(milestones || [])}. Generate a structured report with: 1) Executive Summary, 2) Response Effectiveness Assessment, 3) Gaps Identified, 4) Recommended Improvement Actions (with owners and priority). Keep it concise and actionable.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ result });
  } catch (error) {
    console.error('aiTabletopReport error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}