import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { secrets } from 'base44:runtime';

// Tolerance threshold from the Risk Appetite Heatmap (default = 12).
// A risk whose inherent score (likelihood x impact) exceeds this is "unacceptable"
// and triggers automatic remediation follow-up tasks.
const THRESHOLD = 12;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authorization: authenticated user (manual) or internal workflow token (scheduled).
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (!['admin', 'compliance_officer', 'risk_manager'].includes(user.role)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const risk = body.risk || {};
    const riskId = body.risk_id || risk.id || risk.risk_id || '';
    const title = risk.title || 'Untitled risk';
    const likelihood = Number(risk.likelihood || 0);
    const impact = Number(risk.impact || 0);
    const score = likelihood * impact;
    const tenantId = risk.tenant_id || '';

    // Tenant boundary for manual calls.
    if (user && tenantId && user.data?.tenant_id && user.data.tenant_id !== tenantId) {
      return Response.json({ error: 'Cross-tenant access denied' }, { status: 403 });
    }

    if (score <= THRESHOLD) {
      return Response.json({ created: 0, score, threshold: THRESHOLD, reason: 'below threshold' });
    }

    // Avoid duplicate remediation tasks for the same risk
    const existing = await base44.asServiceRole.entities.ComplianceTask
      .filter({ type: 'remediation', tenant_id: tenantId }, '-created_date', 500)
      .catch(() => []);
    const tag = `risk_ref:${riskId}`;
    const duplicate = (existing || []).some((t) => (t.notes || '').includes(tag) || (t.title || '') === `Remediate: ${title}`);
    if (duplicate) {
      return Response.json({ created: 0, score, threshold: THRESHOLD, reason: 'remediation task already exists' });
    }

    const due = new Date();
    due.setDate(due.getDate() + 14);

    const task = await base44.asServiceRole.entities.ComplianceTask.create({
      title: `Remediate: ${title}`,
      description: `Auto-generated because risk score ${score} (Likelihood ${likelihood} x Impact ${impact}) exceeds the tolerance threshold of ${THRESHOLD}. Review the risk and implement its mitigation plan.`,
      type: 'remediation',
      status: 'todo',
      priority: score >= 20 ? 'critical' : score >= 15 ? 'high' : 'medium',
      assignee_name: risk.owner_name || '',
      assignee_id: risk.owner_id || '',
      due_date: due.toISOString().slice(0, 10),
      notes: `Auto-created from the Risk Register. ${tag}`,
      tenant_id: tenantId,
    });

    return Response.json({ created: 1, score, threshold: THRESHOLD, task_id: task.id, due_date: task.due_date });
  } catch (error) {
    console.error('generateRiskRemediationTasks error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to generate remediation task' }, { status: 500 });
  }
});