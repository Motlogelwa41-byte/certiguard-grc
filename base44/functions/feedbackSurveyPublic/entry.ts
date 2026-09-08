import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, survey_id, ...formData } = body;

    if (!survey_id) return Response.json({ error: 'survey_id is required' }, { status: 400 });

    if (action === 'get') {
      // Public read — use service role so unauthenticated email recipients can load their survey
      const survey = await base44.asServiceRole.entities.UserFeedbackSurvey.get(survey_id);
      if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });
      // Don't expose tenant_id or user_id to the public
      return Response.json({
        id: survey.id,
        user_name: survey.user_name || '',
        user_email: survey.user_email || '',
        status: survey.status,
        survey_sent_at: survey.survey_sent_at,
      });
    }

    if (action === 'submit') {
      const survey = await base44.asServiceRole.entities.UserFeedbackSurvey.get(survey_id);
      if (!survey) return Response.json({ error: 'Survey not found' }, { status: 404 });
      if (survey.status === 'responded') return Response.json({ error: 'Survey already submitted' }, { status: 400 });

      const updated = await base44.asServiceRole.entities.UserFeedbackSurvey.update(survey_id, {
        overall_rating: formData.overall_rating || null,
        ease_of_use: formData.ease_of_use || null,
        nps_score: formData.nps_score != null ? formData.nps_score : null,
        would_recommend: formData.would_recommend != null ? formData.would_recommend : null,
        most_useful_feature: formData.most_useful_feature || '',
        least_useful_feature: formData.least_useful_feature || '',
        what_could_be_improved: formData.what_could_be_improved || '',
        additional_comments: formData.additional_comments || '',
        status: 'responded',
        responded_at: new Date().toISOString(),
      });

      return Response.json({ success: true, survey_id: updated.id });
    }

    return Response.json({ error: 'Invalid action. Use "get" or "submit".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}