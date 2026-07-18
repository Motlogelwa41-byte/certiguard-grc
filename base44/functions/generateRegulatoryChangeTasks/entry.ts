import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const AREA_TASK_TYPE = {
  policies: "policy_review",
  controls: "control_implementation",
  vendors: "vendor_review",
  data_processing: "risk_assessment",
  contracts: "other",
  training: "training",
  systems: "control_implementation",
  reporting: "audit_preparation",
};

const AREA_LABEL = {
  policies: "Review and update affected policies",
  controls: "Implement or update affected controls",
  vendors: "Re-assess impacted vendors and processors",
  data_processing: "Update data processing records (ROPA)",
  contracts: "Update contracts and data processing agreements",
  training: "Deliver updated training to affected teams",
  systems: "Reconfigure impacted systems to meet new requirements",
  reporting: "Update compliance reporting and disclosures",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const changeId = body.regulatory_change_id || body.id;
    if (!changeId) return Response.json({ error: "regulatory_change_id required" }, { status: 400 });

    const change = await base44.entities.RegulatoryChange.get(changeId);
    if (!change) return Response.json({ error: "Regulatory change not found" }, { status: 404 });

    const today = new Date().toISOString().slice(0, 10);
    const frameworkId = (change.affected_framework_ids && change.affected_framework_ids[0]) || "";

    // Build task definitions: prefer explicit action-plan steps, else one task per affected area
    let taskDefs = [];
    const planLines = (change.action_plan || "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (planLines.length > 0) {
      taskDefs = planLines.map((line) => ({
        title: line,
        type: "control_implementation",
        desc: `Action from regulatory change: ${change.title}`,
      }));
    } else {
      const areas = change.affected_areas && change.affected_areas.length > 0
        ? change.affected_areas
        : ["controls"];
      taskDefs = areas.map((a) => ({
        title: AREA_LABEL[a] || `Address ${a.replace(/_/g, " ")}`,
        type: AREA_TASK_TYPE[a] || "other",
        desc: `Triggered by regulatory change: ${change.title}`,
      }));
    }

    const created = [];
    for (const td of taskDefs) {
      const t = await base44.entities.ComplianceTask.create({
        title: td.title,
        description: td.desc,
        type: td.type,
        status: "todo",
        priority: change.priority || "medium",
        assignee_name: change.assigned_to || change.owner_name || "",
        due_date: change.compliance_deadline || "",
        related_framework_id: frameworkId,
        notes: `Auto-generated from regulatory change: ${change.title} (${change.change_id || changeId}).`,
      });
      created.push({ id: t.id, title: t.title });
    }

    // Advance triage: link to frameworks and move to in_progress
    const patch = {
      status: "in_progress",
      last_reviewed: today,
    };
    if (frameworkId && !(change.affected_framework_ids || []).includes(frameworkId)) {
      patch.affected_framework_ids = [...(change.affected_framework_ids || []), frameworkId];
    }
    try {
      await base44.entities.RegulatoryChange.update(changeId, patch);
    } catch (_) { /* update may be restricted; tasks already created */ }

    return Response.json({
      ok: true,
      created: created.length,
      tasks: created,
      framework_id: frameworkId,
      status: "in_progress",
    });
  } catch (error) {
    console.error("generateRegulatoryChangeTasks error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});