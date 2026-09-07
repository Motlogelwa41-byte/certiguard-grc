import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Auto-creates a remediation task with a 48-hour deadline and an in-app notification
// when a universal control goes non-compliant or a risk hits the critical (red) threshold.
// Called by entity-trigger workflows (internal token) or authenticated users.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authorization: authenticated user or internal workflow token
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (!user) {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { entity_type, control, risk, control_id, risk_id } = body;
    const now = new Date();
    const due = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
    const dueDate = due.toISOString().slice(0, 10);

    if (entity_type === 'control' || control) {
      const c = control || {};
      const tenantId = c.tenant_id || '';
      const cId = control_id || c.id || c.control_id || '';
      const title = c.title || 'Untitled control';
      const ownerName = c.owner_name || '';
      const ownerId = c.owner_id || '';

      // De-duplicate: skip if an urgent remediation task already exists for this control
      const tag = `urgent_control_ref:${cId}`;
      const existing = await base44.asServiceRole.entities.ComplianceTask
        .filter({ type: 'remediation', tenant_id: tenantId }, '-created_date', 500)
        .catch(() => []);
      const duplicate = (existing || []).some((t) => (t.notes || '').includes(tag));
      if (duplicate) {
        return Response.json({ created: 0, reason: 'remediation task already exists', tag });
      }

      // Use AI to generate specific, actionable remediation steps
      let aiSteps = '';
      try {
        const llmRes = await base44.integrations.Core.InvokeLLM({
          prompt: `A compliance control has been marked Non-Compliant and requires urgent remediation within 48 hours. Generate 3-5 specific, actionable step-by-step instructions for fixing this control. Each step must name the specific system, tool, or document to touch.

Control: ${title}
Category: ${c.category || 'unknown'}
Severity: ${c.severity || 'unknown'}
Automation Status: ${c.automation_status || 'manual'}
Description: ${c.description || 'No description provided'}
Frameworks: ${(c.framework_names || []).join(', ') || 'Not specified'}

Return ONLY a JSON object with:
- "action_steps": array of 3-5 concrete step-by-step instructions
- "acceptance_criteria": array of 2-3 conditions that confirm the fix is complete
- "tools_needed": array of specific systems/tools needed`,
          response_json_schema: {
            type: "object",
            properties: {
              action_steps: { type: "array", items: { type: "string" } },
              acceptance_criteria: { type: "array", items: { type: "string" } },
              tools_needed: { type: "array", items: { type: "string" } },
            },
            required: ["action_steps", "acceptance_criteria"],
          },
        });
        if (llmRes) {
          const stepsText = (llmRes.action_steps || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n');
          const criteriaText = (llmRes.acceptance_criteria || []).map((c) => `  ☐ ${c}`).join('\n');
          const toolsText = (llmRes.tools_needed || []).join(', ');
          aiSteps = `\n\nAction Steps:\n${stepsText}\n\nAcceptance Criteria:\n${criteriaText}${toolsText ? `\n\nTools/Systems: ${toolsText}` : ''}`;
        }
      } catch (e) { /* fall back to generic description */ }

      const task = await base44.asServiceRole.entities.ComplianceTask.create({
        title: `URGENT (48h): Remediate control — ${title}`,
        description: `Control "${title}" was marked Non-Compliant. Immediate remediation is required within 48 hours.${aiSteps || '\n\nReview the control implementation and evidence, then restore compliance.'}`,
        type: 'remediation',
        status: 'todo',
        priority: 'critical',
        assignee_name: ownerName,
        assignee_id: ownerId,
        due_date: dueDate,
        related_control_id: cId,
        notes: `Auto-created from control non-compliance. ${tag}`,
        tenant_id: tenantId,
      });

      // In-app notification to the control owner
      await base44.asServiceRole.entities.SecurityAlert.create({
        title: `Remediation required: ${title}`,
        description: `Control "${title}" is Non-Compliant. A remediation task (due ${dueDate}) has been assigned to ${ownerName || 'the control owner'}.`,
        type: 'remediation_alert',
        severity: 'critical',
        status: 'open',
        tenant_id: tenantId,
        affected_user: ownerName,
        detected_at: now.toISOString(),
        details: `Control ID: ${cId}. Task ID: ${task.id}. Deadline: ${dueDate}.`,
      });

      return Response.json({ created: 1, task_id: task.id, due_date: dueDate, entity_type: 'control' });
    }

    if (entity_type === 'risk' || risk) {
      const r = risk || {};
      const tenantId = r.tenant_id || '';
      const rId = risk_id || r.id || r.risk_id || '';
      const title = r.title || 'Untitled risk';
      const score = Number(r.risk_score || (Number(r.likelihood || 0) * Number(r.impact || 0)));
      const ownerName = r.owner_name || '';
      const ownerId = r.owner_id || '';

      // De-duplicate
      const tag = `urgent_risk_ref:${rId}`;
      const existing = await base44.asServiceRole.entities.ComplianceTask
        .filter({ type: 'remediation', tenant_id: tenantId }, '-created_date', 500)
        .catch(() => []);
      const duplicate = (existing || []).some((t) => (t.notes || '').includes(tag));
      if (duplicate) {
        return Response.json({ created: 0, reason: 'remediation task already exists', tag });
      }

      // Use AI to generate specific, actionable remediation steps
      let aiSteps = '';
      try {
        const llmRes = await base44.integrations.Core.InvokeLLM({
          prompt: `A risk has hit the critical (red) threshold and requires urgent remediation within 48 hours. Generate 3-5 specific, actionable step-by-step instructions for mitigating this risk. Each step must name the specific system, process, or document to touch.

Risk: ${title}
Category: ${r.category || 'unknown'}
Score: ${score} (Likelihood ${r.likelihood || '?'} x Impact ${r.impact || '?'})
Description: ${r.description || 'No description provided'}
Mitigation Plan: ${r.mitigation_plan || 'Not specified'}
Treatment: ${r.treatment || 'mitigate'}

Return ONLY a JSON object with:
- "action_steps": array of 3-5 concrete step-by-step instructions
- "acceptance_criteria": array of 2-3 conditions that confirm the risk is mitigated
- "tools_needed": array of specific systems/tools needed`,
          response_json_schema: {
            type: "object",
            properties: {
              action_steps: { type: "array", items: { type: "string" } },
              acceptance_criteria: { type: "array", items: { type: "string" } },
              tools_needed: { type: "array", items: { type: "string" } },
            },
            required: ["action_steps", "acceptance_criteria"],
          },
        });
        if (llmRes) {
          const stepsText = (llmRes.action_steps || []).map((s, i) => `  ${i + 1}. ${s}`).join('\n');
          const criteriaText = (llmRes.acceptance_criteria || []).map((c) => `  ☐ ${c}`).join('\n');
          const toolsText = (llmRes.tools_needed || []).join(', ');
          aiSteps = `\n\nAction Steps:\n${stepsText}\n\nAcceptance Criteria:\n${criteriaText}${toolsText ? `\n\nTools/Systems: ${toolsText}` : ''}`;
        }
      } catch (e) { /* fall back to generic description */ }

      const task = await base44.asServiceRole.entities.ComplianceTask.create({
        title: `URGENT (48h): Remediate risk — ${title}`,
        description: `Risk "${title}" has hit the critical (red) threshold with a score of ${score}. Immediate remediation is required within 48 hours.${aiSteps || '\n\nReview the risk and implement its mitigation plan.'}`,
        type: 'remediation',
        status: 'todo',
        priority: 'critical',
        assignee_name: ownerName,
        assignee_id: ownerId,
        due_date: dueDate,
        notes: `Auto-created from critical risk threshold. ${tag}`,
        tenant_id: tenantId,
      });

      // In-app notification to the risk owner
      await base44.asServiceRole.entities.SecurityAlert.create({
        title: `Critical risk remediation: ${title}`,
        description: `Risk "${title}" has a critical score of ${score}. A remediation task (due ${dueDate}) has been assigned to ${ownerName || 'the risk owner'}.`,
        type: 'remediation_alert',
        severity: 'critical',
        status: 'open',
        tenant_id: tenantId,
        affected_user: ownerName,
        detected_at: now.toISOString(),
        details: `Risk ID: ${rId}. Score: ${score}. Task ID: ${task.id}. Deadline: ${dueDate}.`,
      });

      return Response.json({ created: 1, task_id: task.id, due_date: dueDate, entity_type: 'risk' });
    }

    return Response.json({ error: 'entity_type must be "control" or "risk"' }, { status: 400 });
  } catch (error) {
    console.error('autoCreateRemediationTask error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to create remediation task' }, { status: 500 });
  }
}