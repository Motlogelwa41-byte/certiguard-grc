import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      feature,
      action,
      prompt_summary,
      response_summary,
      reasoning,
      confidence_score,
      confidence_level,
      source_references,
      supporting_data,
      affected_entity_type,
      affected_entity_id,
      proposed_changes,
      model_used,
    } = body;

    if (!feature || !action) {
      return Response.json({ error: 'feature and action are required' }, { status: 400 });
    }

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const now = new Date().toISOString();
    const activity_id = `AI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const log = await base44.asServiceRole.entities.AIActivityLog.create({
      activity_id,
      feature,
      action,
      prompt_summary: prompt_summary || '',
      response_summary: response_summary || '',
      reasoning: reasoning || '',
      confidence_score: confidence_score || 0,
      confidence_level: confidence_level || 'medium',
      source_references: source_references ? JSON.stringify(source_references) : '',
      supporting_data: supporting_data ? JSON.stringify(supporting_data) : '',
      affected_entity_type: affected_entity_type || '',
      affected_entity_id: affected_entity_id || '',
      proposed_changes: proposed_changes ? JSON.stringify(proposed_changes) : '',
      human_approval_required: true,
      approval_status: 'pending',
      model_used: model_used || 'automatic',
      requested_by_name: user.full_name || user.email || '',
      requested_by_id: user.id || '',
      requested_at: now,
      tenant_id,
    });

    return Response.json({
      ok: true,
      activity_id: log.id,
      activity_ref: activity_id,
      approval_status: 'pending',
      message: 'AI activity logged — human approval required before any changes are applied',
    });
  } catch (error) {
    console.error('logAIActivity error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});