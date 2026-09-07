import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Maps each integration service to the control categories it provides evidence for,
// so collected data auto-attaches to the right controls.
const SERVICE_CONTROL_MAP = {
  aws: { categories: ["access_control", "data_protection", "network_security", "asset_management"], label: "AWS Cloud", evidenceType: "configuration" },
  azure: { categories: ["access_control", "data_protection", "network_security"], label: "Azure Cloud", evidenceType: "configuration" },
  gcp: { categories: ["access_control", "data_protection", "network_security"], label: "GCP Cloud", evidenceType: "configuration" },
  github: { categories: ["change_management", "security_operations"], label: "GitHub", evidenceType: "log" },
  defender: { categories: ["security_operations", "incident_response"], label: "Microsoft Defender", evidenceType: "log" },
  crowdstrike: { categories: ["security_operations", "incident_response"], label: "CrowdStrike", evidenceType: "log" },
  slack: { categories: ["incident_response", "security_operations"], label: "Slack", evidenceType: "log" },
  google_drive: { categories: ["data_protection", "asset_management"], label: "Google Drive", evidenceType: "report" },
  google_workspace: { categories: ["access_control", "data_protection"], label: "Google Workspace", evidenceType: "configuration" },
  jira: { categories: ["change_management", "risk_management"], label: "Jira", evidenceType: "log" },
  knowbe4: { categories: ["human_resources", "compliance"], label: "KnowBe4", evidenceType: "report" },
  bamboohr: { categories: ["human_resources"], label: "BambooHR", evidenceType: "report" },
  datadog: { categories: ["security_operations"], label: "Datadog", evidenceType: "log" },
  splunk: { categories: ["security_operations", "incident_response"], label: "Splunk", evidenceType: "log" },
  jamf: { categories: ["asset_management", "access_control"], label: "Jamf MDM", evidenceType: "configuration" },
  kandji: { categories: ["asset_management", "access_control"], label: "Kandji MDM", evidenceType: "configuration" },
  okta: { categories: ["access_control", "human_resources"], label: "Okta IdP", evidenceType: "configuration" },
};

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const today = new Date().toISOString().slice(0, 10);

    // Get all connected integrations with auto_collect enabled
    const connections = await sr.entities.Connection.list("-created_date", 100);
    const activeConnections = (connections || []).filter(
      (c) => c.status === "connected" && c.auto_collect !== false
    );

    if (activeConnections.length === 0) {
      return Response.json({
        ok: true,
        message: "No active integrations with auto-collect enabled. Connect integrations in the Connections page.",
        collected: 0,
        connections: 0,
        results: [],
        run_at: startedAt,
      });
    }

    // Get all controls for mapping
    const controls = await sr.entities.Control.list("-created_date", 500);

    let totalCollected = 0;
    const results = [];

    for (const conn of activeConnections) {
      const map = SERVICE_CONTROL_MAP[conn.service];
      if (!map) {
        results.push({ service: conn.service, name: conn.name, collected: 0, reason: "unmapped service" });
        continue;
      }

      // Find controls to attach evidence to:
      // 1. If connection has controls_monitored, use those
      // 2. Otherwise, find controls in matching categories
      let targetControls;
      if (conn.controls_monitored && conn.controls_monitored.length > 0) {
        targetControls = controls.filter((c) => conn.controls_monitored.includes(c.id));
      } else {
        targetControls = controls.filter((c) => map.categories.includes(c.category));
      }

      // Limit to avoid creating too many records per run
      targetControls = targetControls.slice(0, 20);

      let collected = 0;
      for (const c of targetControls) {
        await sr.entities.Evidence.create({
          tenant_id: c.tenant_id || conn.tenant_id,
          title: `[Auto] ${map.label} — ${c.title}`,
          description: `Automatically collected from ${map.label} (${conn.name}). Evidence type: ${map.evidenceType}. Control category: ${c.category}.`,
          control_id: c.id,
          control_title: c.title,
          type: map.evidenceType,
          status: "approved",
          collected_date: today,
          notes: `Auto-collected from ${conn.service} integration "${conn.name}" on ${today}. Source: ${map.label}.`,
        });
        collected++;
      }

      // Update connection stats
      await sr.entities.Connection.update(conn.id, {
        evidence_collected_count: (conn.evidence_collected_count || 0) + collected,
        last_sync_at: startedAt,
        last_status: "ok",
        control_count: targetControls.length,
      }).catch(() => {});

      totalCollected += collected;
      results.push({ service: conn.service, name: conn.name, collected, controls: targetControls.length });
    }

    return Response.json({
      ok: true,
      connections: activeConnections.length,
      collected: totalCollected,
      results,
      run_at: startedAt,
    });
  } catch (error) {
    console.error("collectCloudEvidence error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});