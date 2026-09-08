import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// HTML-escape user-supplied text before embedding in email bodies
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Called by the Onboarding Feedback Survey workflow 24h after onboarding completion.
// The recipient email is always resolved from the database (never from user input)
// to prevent open mail relay abuse. User-supplied name is HTML-escaped.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { onboarding_check_id, user_id, user_name, tenant_id } = body;

    if (!onboarding_check_id && !user_id) {
      return Response.json({ error: 'onboarding_check_id or user_id is required' }, { status: 400 });
    }

    // Resolve the recipient email from the database — never from user input
    let resolvedUserId = user_id || '';
    let resolvedName = user_name || '';

    if (onboarding_check_id) {
      const check = await base44.asServiceRole.entities.OnboardingHealthCheck.get(onboarding_check_id);
      if (check) {
        resolvedUserId = check.created_by_id || resolvedUserId;
        resolvedName = check.triggered_by || resolvedName;
      }
    }

    if (!resolvedUserId) {
      return Response.json({ error: 'Could not resolve user from onboarding record' }, { status: 400 });
    }

    // Look up the user's verified email from the User entity
    let recipientEmail = '';
    try {
      const userRec = await base44.asServiceRole.entities.User.get(resolvedUserId);
      if (userRec && userRec.email) {
        recipientEmail = userRec.email;
      }
    } catch (e) { /* user lookup failed */ }

    if (!recipientEmail) {
      return Response.json({ error: 'Could not resolve recipient email from user record' }, { status: 400 });
    }

    // Escape user-supplied name to prevent HTML injection
    const safeName = escapeHtml(resolvedName || 'there');

    // Create a survey record with status "sent"
    const survey = await base44.asServiceRole.entities.UserFeedbackSurvey.create({
      tenant_id: tenant_id || '',
      user_id: resolvedUserId,
      user_name: resolvedName,
      user_email: recipientEmail,
      onboarding_check_id: onboarding_check_id || '',
      status: 'sent',
      survey_sent_at: new Date().toISOString()
    });

    // Send the survey email
    const surveyUrl = `${req.headers.get('origin') || 'https://app.ethicaledgegrcconsulting.com'}/feedback-survey?survey_id=${survey.id}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipientEmail,
      subject: 'How was your CertiGuard onboarding? (2-min survey)',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="background: linear-gradient(135deg, #1e293b, #0f172a); padding: 32px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">CertiGuard GRC</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">We'd love your feedback</p>
          </div>
          <p style="font-size: 16px; color: #1e293b;">Hi ${safeName},</p>
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