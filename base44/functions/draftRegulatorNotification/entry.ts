import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Drafts a POPIA / GDPR-compliant regulator (and DPO) breach notification for a notifiable
// incident. Uses InvokeLLM to structure the required fields (nature of breach, data categories,
      // affected data subjects, likely consequences, measures taken) and stores the draft + a
      // 72-hour deadline on the Incident record.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { incident_id } = body;

    if (!incident_id) {
      return Response.json({ error: "incident_id is required" }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const incident = await sr.entities.Incident.get(incident_id).catch(() => null);
    if (!incident) return Response.json({ error: "Incident not found" }, { status: 404 });

    // Determine if notification is required
    const notifiable = incident.notify_regulator === true ||
      incident.severity === "critical" ||
      incident.severity === "high" ||
      incident.type === "security_breach" ||
      incident.type === "data_leak";

    if (!notifiable) {
      await sr.entities.Incident.update(incident_id, {
        regulator_notification_status: "not_required",
      });
      return Response.json({
        success: true,
        incident_id,
        notifiable: false,
        message: "Incident does not meet the notifiable threshold. No regulator notification required.",
      });
    }

    // Compute 72-hour deadline from detected_date
    const detectedAt = incident.detected_date || incident.reported_date || new Date().toISOString().slice(0, 10);
    const deadline = new Date(new Date(detectedAt).getTime() + 72 * 60 * 60 * 1000).toISOString();

    // Use InvokeLLM to draft the notification
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a Data Protection Officer drafting a regulator breach notification that complies with POPIA (South Africa) and GDPR (Article 33) requirements.

Incident details:
- Title: ${incident.title}
- Type: ${incident.type}
- Severity: ${incident.severity}
- Detected: ${detectedAt}
- Affected systems: ${incident.affected_systems || "Unknown"}
- Affected data: ${incident.affected_data || "Unknown"}
- Root cause: ${incident.root_cause || "Under investigation"}
- Response summary: ${incident.response_summary || "Containment in progress"}
- Description: ${incident.description || ""}

Draft a formal regulator notification addressed to the Information Regulator (South Africa) / supervisory authority. Include ALL of these sections, clearly labelled:
1. Notifier details (organisation, DPO name, contact)
2. Nature of the breach
3. Categories of personal information involved
4. Approximate number of data subjects affected
5. Likely consequences
6. Measures taken or proposed to address the breach and mitigate adverse effects
7. Time of detection and confirmation that notification is within 72 hours

Keep the tone formal, factual, and neutral. Do not invent specific numbers — use placeholders like "[to be confirmed]" where the data is unknown.`,
      response_json_schema: {
        type: "object",
        properties: {
          notification_body: { type: "string" },
          recipient: { type: "string" },
          confidence: { type: "number" }
        }
      }
    });

    const draft = llmRes || {};
    const notificationBody = draft.notification_body || "";
    const recipient = draft.recipient || "Information Regulator (South Africa)";

    await sr.entities.Incident.update(incident_id, {
      regulator_notification_status: "draft",
      regulator_notification_draft: notificationBody,
      regulator_notification_deadline: deadline,
      regulator_notification_recipient: recipient,
    });

    // Create an anomaly alert so the compliance team knows a draft is ready for review
    await sr.entities.AnomalyAlert.create({
      tenant_id: incident.tenant_id,
      anomaly_id: `RN-${Date.now().toString(36)}`,
      title: `Regulator notification drafted for incident: ${incident.title}`,
      description: `A POPIA/GDPR regulator breach notification has been auto-drafted for incident "${incident.title}". It is pending compliance officer review. The 72-hour notification deadline is ${new Date(deadline).toLocaleString()}.`,
      anomaly_type: "compliance_regression",
      severity: "high",
      entity_type: "incident",
      entity_id: incident_id,
      entity_name: incident.title,
      confidence_score: 95,
      recommended_action: "Review the drafted notification, fill in placeholders, and submit to the regulator before the 72-hour deadline.",
      status: "open",
      detected_at: new Date().toISOString(),
    }).catch(() => null);

    return Response.json({
      success: true,
      incident_id,
      notifiable: true,
      status: "draft",
      recipient,
      deadline,
      draft_length: notificationBody.length,
      confidence: draft.confidence || 0,
    });
  } catch (error) {
    console.error("draftRegulatorNotification error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to draft regulator notification" }, { status: 500 });
  }
});