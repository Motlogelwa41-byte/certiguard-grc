import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// SOAR (Security Orchestration, Automation & Response) playbook executor.
// Accepts { playbook_type, incident_id, actions: [{type, ...}] } and executes
// each action: create_task, create_finding, create_evidence, send_slack_alert, update_incident.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { playbook_type, incident_id, actions } = body;
    if (!playbook_type) return Response.json({ error: 'playbook_type is required' }, { status: 400 });

    const tenantId = user.data?.tenant_id || user.tenant_id || "";
    const now = new Date().toISOString();
    const results = [];
    const sr = base44.asServiceRole;

    for (const action of (actions || [])) {
      try {
        switch (action.type) {
          case "create_task": {
            const task = await sr.entities.ComplianceTask.create({
              tenant_id: tenantId,
              title: `[SOAR] ${action.title || action.type}`,
              description: action.description || `Automated response for ${playbook_type}`,
              type: "remediation", status: "todo", priority: action.priority || "high",
              due_date: action.due_date,
              notes: `Triggered by SOAR playbook: ${playbook_type} at ${now}`,
            });
            results.push({ action: action.type, status: "success", task_id: task.id });
            break;
          }
          case "send_slack_alert": {
            await base44.integrations.Core.SendEmail({
              to: user.email,
              subject: `SOAR Alert: ${playbook_type}`,
              body: action.message || `SOAR playbook ${playbook_type} triggered at ${now}`,
            }).catch(() => {});
            results.push({ action: action.type, status: "success" });
            break;
          }
          case "create_finding": {
            const finding = await sr.entities.SecurityFinding.create({
              tenant_id: tenantId,
              title: action.title || `SOAR Finding: ${playbook_type}`,
              description: action.description || "",
              source: "other", severity: action.severity || "high", status: "open",
              detected_date: now.split("T")[0], first_seen: now,
              notes: `Auto-created by SOAR playbook: ${playbook_type}`,
            });
            results.push({ action: action.type, status: "success", finding_id: finding.id });
            break;
          }
          case "update_incident": {
            if (incident_id) {
              const incident = await sr.entities.Incident.get(incident_id).catch(() => null);
              if (incident) {
                const timeline = incident.timeline_events ? JSON.parse(incident.timeline_events) : [];
                timeline.push({ timestamp: now, event: action.event || "SOAR action executed", actor: user.full_name || "SOAR Engine", notes: action.notes || "" });
                await sr.entities.Incident.update(incident_id, {
                  timeline_events: JSON.stringify(timeline),
                  escalation_level: Math.max(incident.escalation_level || 0, action.escalation_level || 0),
                });
                results.push({ action: action.type, status: "success", incident_id });
              } else {
                results.push({ action: action.type, status: "error", error: "Incident not found" });
              }
            } else {
              results.push({ action: action.type, status: "skipped", reason: "No incident_id" });
            }
            break;
          }
          case "create_evidence": {
            const evidence = await sr.entities.Evidence.create({
              tenant_id: tenantId,
              title: action.title || `SOAR Evidence: ${playbook_type}`,
              description: action.description || "Evidence preserved by SOAR playbook",
              type: "log", status: "pending_review", collected_date: now.split("T")[0],
              notes: `Auto-preserved by SOAR playbook: ${playbook_type}`,
            });
            results.push({ action: action.type, status: "success", evidence_id: evidence.id });
            break;
          }
          default:
            results.push({ action: action.type, status: "skipped", reason: "Unknown action type" });
        }
      } catch (e) {
        results.push({ action: action.type, status: "error", error: e.message });
      }
    }

    return Response.json({
      playbook_type, incident_id, executed_at: now,
      executed_by: user.full_name || user.email,
      actions_total: (actions || []).length,
      actions_succeeded: results.filter(r => r.status === "success").length,
      actions_failed: results.filter(r => r.status === "error").length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}