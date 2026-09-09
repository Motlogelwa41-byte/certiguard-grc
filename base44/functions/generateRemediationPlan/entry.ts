import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { control_id } = body;

    if (!control_id) {
      return Response.json({ error: "control_id is required" }, { status: 400 });
    }

    // Fetch the control and its linked evidence
    const control = await sr.entities.Control.get(control_id).catch(() => null);
    if (!control) {
      return Response.json({ error: "Control not found" }, { status: 404 });
    }

    // Get linked evidence for context
    const allEvidence = await sr.entities.Evidence.list("-created_date", 200).catch(() => []);
    const linkedEvidence = (allEvidence || []).filter((e) => e.control_id === control_id);

    // Build context for the LLM
    const context = {
      control_id: control.control_id,
      title: control.title,
      description: control.description,
      category: control.category,
      severity: control.severity,
      status: control.status,
      owner: control.owner_name,
      automation_status: control.automation_status,
      frameworks: control.framework_names || [],
      evidence_count: control.evidence_count || linkedEvidence.length,
      evidence_items: linkedEvidence.slice(0, 5).map((e) => ({
        title: e.title,
        type: e.type,
        status: e.status,
        collected_date: e.collected_date,
      })),
      evidence_gap: linkedEvidence.length === 0 ? "No evidence has been collected for this control"
        : ["missing", "expired"].includes(linkedEvidence[0]?.status) ? "Evidence is missing or expired"
        : "Evidence exists but control still failing — likely a configuration or process gap",
    };

    // Generate remediation plan using LLM
    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a senior GRC remediation advisor for a financial services organization operating under POPIA, SADC, King V, SOC 2, and ISO 27001 frameworks. A security control has failed its compliance test and needs a structured, actionable remediation plan.

Control details (JSON):
${JSON.stringify(context, null, 2)}

Generate a remediation plan with:

1. ROOT CAUSE — Analyze why this control likely failed. Reference the control's category, automation status, framework obligations, and evidence gap specifically. Do not give generic advice.

2. REMEDIATION TASKS (3-5) — Each task must be:
   - Concrete: name the specific system, policy, configuration, or process to change (e.g. "Enable MFA enforcement on the Okta tenant" not "Improve authentication")
   - Actionable: a single owner can complete it without ambiguity
   - Verifiable: include a verification_method describing exactly how completion is confirmed (e.g. "Okta admin console shows 100% MFA enrollment")
   - Sequenced: list dependencies on prior tasks explicitly
   - Realistically estimated: days based on the effort for a mid-sized bank

   Each task MUST include:
   - action_steps: an ordered array of 3-6 concrete step-by-step instructions the owner follows to complete the task. Each step must name the specific tool, menu, document, or system to touch (e.g. "Log into Okta Admin → Security → Multifactor → Set 'Enforce MFA for all users' to ON"). Do NOT write steps like "Review the policy" — every step must produce a tangible change or artifact.
   - acceptance_criteria: a checklist of 2-4 conditions that must all be true for the task to be considered complete (e.g. "All user accounts show MFA enrolled in Okta", "MFA enforcement policy is set to ON", "Exception list is documented and approved by CISO")
   - tools_or_systems: list the specific systems, tools, or documents the owner will need access to (e.g. "Okta Admin Console", "Change Management Register", "HR Directory Export")

3. SUCCESS CRITERIA — The exact evidence or test result that proves the control is back to passing, suitable for an auditor.

4. ESTIMATED TOTAL DAYS — Sum of task durations accounting for sequencing (run parallel where possible).

Avoid vague tasks like "Review the control" or "Assess the situation". Every task must produce a tangible artifact or configuration change.`,
      response_json_schema: {
        type: "object",
        properties: {
          root_cause: { type: "string", description: "Specific root cause referencing the control's category, automation status, and evidence gap" },
          severity_assessment: { type: "string", description: "Assessment of remediation urgency based on control severity and regulatory impact" },
          tasks: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short actionable task title naming the specific system or artifact" },
                description: { type: "string", description: "Detailed task description with concrete steps — name the system, config, or document to change" },
                action_steps: {
                  type: "array",
                  items: { type: "string" },
                  description: "Ordered step-by-step instructions (3-6 steps). Each step names the specific tool/menu/document to touch.",
                },
                acceptance_criteria: {
                  type: "array",
                  items: { type: "string" },
                  description: "Checklist of 2-4 conditions that must all be true for task completion",
                },
                tools_or_systems: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific systems, tools, or documents the owner needs access to",
                },
                suggested_owner_role: { type: "string", description: "Suggested role for the task owner (e.g. Security Engineer, IT Admin, Compliance Officer)" },
                priority: { type: "string", enum: ["critical", "high", "medium", "low"], description: "Task priority" },
                estimated_days: { type: "number", description: "Estimated days to complete this task" },
                dependencies: { type: "string", description: "Any dependencies on other tasks (by title)" },
                verification_method: { type: "string", description: "Exactly how to confirm this task is complete (e.g. 'Screenshot of enforced MFA policy in Okta admin console')" },
              },
              required: ["title", "description", "action_steps", "acceptance_criteria", "suggested_owner_role", "priority", "estimated_days", "verification_method"],
            },
          },
          estimated_total_days: { type: "number", description: "Total estimated days for the full remediation accounting for parallelization" },
          success_criteria: { type: "string", description: "The exact evidence or test result that proves the control is passing, suitable for an auditor" },
        },
        required: ["root_cause", "tasks", "estimated_total_days", "success_criteria"],
      },
    });

    const plan = llmRes || { root_cause: "Unable to generate analysis", tasks: [], estimated_total_days: 0, success_criteria: "" };

    // Create ComplianceTask records for each remediation task
    const createdTasks = [];
    const today = new Date();
    let cumulativeDays = 0;

    for (const task of (plan.tasks || [])) {
      cumulativeDays += task.estimated_days || 3;
      const dueDate = new Date(today.getTime() + cumulativeDays * 86400000).toISOString().slice(0, 10);

      // Build a rich, actionable description with numbered steps and acceptance criteria
      const stepsText = (task.action_steps || [])
        .map((s, i) => `  ${i + 1}. ${s}`)
        .join("\n");
      const criteriaText = (task.acceptance_criteria || [])
        .map((c) => `  ☐ ${c}`)
        .join("\n");
      const toolsText = (task.tools_or_systems || []).join(", ");

      const fullDescription = [
        task.description || "",
        stepsText ? `\n\nAction Steps:\n${stepsText}` : "",
        criteriaText ? `\n\nAcceptance Criteria:\n${criteriaText}` : "",
        toolsText ? `\n\nTools/Systems: ${toolsText}` : "",
        task.verification_method ? `\n\nVerification: ${task.verification_method}` : "",
      ].join("");

      const created = await sr.entities.ComplianceTask.create({
        tenant_id: control.tenant_id,
        title: task.title,
        description: fullDescription,
        type: "remediation",
        status: "todo",
        priority: task.priority || "high",
        assignee_name: control.owner_name || "",
        assignee_id: control.owner_id || "",
        due_date: dueDate,
        related_control_id: control.id,
        notes: `Auto-generated by AI Remediation Plan. Owner role: ${task.suggested_owner_role}. Dependencies: ${task.dependencies || "none"}. Verification: ${task.verification_method || "n/a"}. Success criteria: ${plan.success_criteria || "n/a"}`,
      }).catch((e) => null);

      if (created) {
        createdTasks.push({
          id: created.id,
          title: task.title,
          priority: task.priority,
          due_date: dueDate,
          suggested_owner_role: task.suggested_owner_role,
          estimated_days: task.estimated_days,
          action_steps: task.action_steps || [],
          acceptance_criteria: task.acceptance_criteria || [],
          tools_or_systems: task.tools_or_systems || [],
          verification_method: task.verification_method || "",
        });
      }
    }

    return Response.json({
      ok: true,
      control_id: control.id,
      control_title: control.title,
      root_cause: plan.root_cause,
      severity_assessment: plan.severity_assessment || "",
      tasks: createdTasks,
      estimated_total_days: plan.estimated_total_days,
      success_criteria: plan.success_criteria,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("generateRemediationPlan error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});