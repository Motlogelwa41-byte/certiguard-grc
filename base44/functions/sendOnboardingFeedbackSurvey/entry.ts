import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { onboarding_check_id, user_id, user_email, user_name, tenant_id } = body;

    if (!user_email) return Response.json({ error: 'user_email is required' }, { status: 400 });

    // Create a survey record with status "sent"
    const survey = await base44.asServiceRole.entities.UserFeedbackSurvey.create({
      tenant_id: tenant_id || user.data?.tenant_id || '',
      user_id: user_id || user.id,
      user_name: user_name || user.full_name || '',
      user_email,
      onboarding_check_id: onboarding_check_id || '',
      status: 'sent',
      survey_sent_at: new Date().toISOString()
    });

    // Send the survey email
    const surveyUrl = `${req.headers.get('origin') || 'https://app.ethicaledgegrcconsulting.com'}/feedback-survey?survey_id=${survey.id}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user_email,
      subject: 'How was your CertiGuard onboarding? (2-min survey)',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CertiGuard GRC</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">We'd love your feedback</p>
          </div>
          <p style="font-size: 16px; color: #1e293b;">Hi ${user_name || 'there'},</p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            You recently completed your onboarding on CertiGuard GRC. Your first impressions matter to us —
            they help us improve the platform for you and future users.
          </p>
          <p style="font-size: 15px; color: #475569; line-height: 1.6;">
            It takes less than 2 minutes, and your feedback goes directly to our product team.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${surveyUrl}" style="display: inline-block; background: #1e293b; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
              Share Your Feedback
            </a>
          </div>
          <p style="font-size: 13px; color: #94a3b8; margin-top: 24px;">
            If the button doesn't work, copy this link: ${surveyUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Sent by CertiGuard GRC · Ethical Edge GRC Consulting (Pty) Ltd
          </p>
        </div>
      `
    });

    return Response.json({ success: true, survey_id: survey.id, message: 'Survey sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}