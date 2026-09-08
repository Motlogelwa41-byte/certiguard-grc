import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const body = await req.json().catch(() => ({}));
    const { control_id, control_title, test_name, test_result, error_details, framework, category } = body;

    if (!control_title && !control_id) {
      return Response.json({ error: 'control_id or control_title is required' }, { status: 400 });
    }

    // Gather context: recent test results for this control
    let recentResults = [];
    try {
      if (control_id) {
        recentResults = await base44.asServiceRole.entities.ControlTestResult
          .filter({ control_id }, '-created_date', 5);
      }
    } catch (_e) { /* ControlTestResult may not exist or no results */ }

    const recentPattern = recentResults.length > 0
      ? recentResults.map(r => `${r.test_date || r.created_date}: ${r.result} — ${r.error_message || 'passed'}`).join('\n')
      : 'No recent test results available';

    const prompt = `You are a compliance and security engineering expert. A control test has FAILED and the team needs a clear, actionable diagnosis to fix it quickly.

Control: ${control_title || control_id}
Control ID: ${control_id || 'N/A'}
Framework: ${framework || 'N/A'}
Control Category: ${category || 'N/A'}
Test that failed: ${test_name || 'N/A'}
Test result: ${test_result || 'FAIL'}
Error details: ${error_details || 'No error details provided'}

Recent test history for this control:
${recentPattern}

Provide a diagnosis in plain language that a compliance officer or IT administrator can act on immediately:

1. **Root cause analysis** — what is most likely causing this control to fail? Consider common misconfigurations, policy gaps, integration issues, or missing evidence.
2. **Plain-language explanation** — explain the failure in non-technical terms so a compliance officer understands why it matters.
3. **Step-by-step fix** — numbered, actionable steps to remediate the failure. Be specific about what to check, configure, or document.
4. **Prevention measures** — how to prevent this from recurring.
5. **Evidence needed** — what evidence should be collected once the fix is applied to pass the next test.
6. **Related controls at risk** — if this control failed, what other controls might also be failing for the same root cause?

Return a JSON object:
{
  "root_cause": "clear explanation of the likely root cause",
  "plain_language_explanation": "non-technical explanation of why this failure matters for compliance",
  "fix_steps": [{"step": 1, "action": "specific action to take", "responsible_role": "admin/security_engineer/compliance_officer/it_admin"}],
  "prevention": "how to prevent recurrence",
  "evidence_needed": [{"type": "screenshot/config/policy/log", "description": "what to collect"}],
  "related_controls_at_risk": [{"control_id": "", "reason": ""}],
  "estimated_fix_time": "minutes/hours/days",
  "severity_if_unfixed": "critical/high/medium/low — what happens if this stays broken"
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          root_cause: { type: 'string' },
          plain_language_explanation: { type: 'string' },
          fix_steps: { type: 'array', items: { type: 'object', properties: {
            step: { type: 'number' }, action: { type: 'string' }, responsible_role: { type: 'string' }
          } } },
          prevention: { type: 'string' },
          evidence_needed: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string' }, description: { type: 'string' }
          } } },
          related_controls_at_risk: { type: 'array', items: { type: 'object', properties: {
            control_id: { type: 'string' }, reason: { type: 'string' }
          } } },
          estimated_fix_time: { type: 'string' },
          severity_if_unfixed: { type: 'string' },
        },
      },
    });

    // Log AI activity
    const activityId = `AI-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    await base44.asServiceRole.entities.AIActivityLog.create({
      tenant_id,
      activity_id: activityId,
      feature: 'control_failure_diagnosis',
      action: 'diagnose_control_failure',
      prompt_summary: `Diagnosed failure of control: ${control_title || control_id} (test: ${test_name})`,
      response_summary: result.root_cause || 'Control failure diagnosed',
      reasoning: `AI identified root cause and ${result.fix_steps?.length || 0} fix steps. Estimated fix time: ${result.estimated_fix_time}. Severity if unfixed: ${result.severity_if_unfixed}.`,
      confidence_score: 80,
      confidence_level: 'medium',
      source_references: JSON.stringify([{ type: 'control_test', control_id, test_name, test_result }]),
      supporting_data: JSON.stringify(result),
      human_approval_required: false,
      approval_status: 'auto_approved',
      model_used: 'automatic',
      requested_by_name: user.full_name || user.email || '',
      requested_by_id: user.id || '',
      requested_at: new Date().toISOString(),
    });

    return Response.json({
      ok: true,
      diagnosis: result,
      activity_id: activityId,
      message: 'Control failure diagnosed — review the fix steps and apply remediation',
    });
  } catch (error) {
    console.error('diagnoseControlFailure error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});