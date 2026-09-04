import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

// Maps integration service → control categories that the integration can automate.
const SERVICE_CONTROL_MAP: Record<string, string[]> = {
  aws: ["access_control", "data_protection", "network_security", "security_operations", "asset_management"],
  gcp: ["access_control", "data_protection", "network_security", "security_operations"],
  azure: ["access_control", "data_protection", "network_security", "security_operations"],
  github: ["change_management", "access_control"],
  gitlab: ["change_management", "access_control"],
  okta: ["access_control", "human_resources"],
  google_workspace: ["access_control"],
  microsoft_365: ["access_control", "human_resources"],
  slack: ["access_control"],
  jamf: ["asset_management", "access_control"],
  crowdstrike: ["security_operations", "incident_response"],
  defender: ["security_operations", "incident_response"],
  datadog: ["security_operations"],
  cloudflare: ["network_security", "security_operations"],
  pagerduty: ["incident_response", "security_operations"],
  "1password": ["access_control", "data_protection"],
  knowbe4: ["human_resources", "compliance"],
  bamboohr: ["human_resources"],
  jira: ["change_management", "incident_response"],
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { service, connection_id, dry_run } = body;

    if (!service) return Response.json({ error: "service is required" }, { status: 400 });

    const categories = SERVICE_CONTROL_MAP[service];
    if (!categories) return Response.json({ error: `No autopilot mapping for service: ${service}` }, { status: 400 });

    // Find all controls in the matching categories
    const controls = await base44.entities.Control.filter({});
    const matchingControls = controls.filter(c => categories.includes(c.category));

    if (dry_run) {
      return Response.json({
        service,
        categories,
        controls_eligible: matchingControls.length,
        controls: matchingControls.map(c => ({
          id: c.id, control_id: c.control_id, title: c.title,
          category: c.category, current_automation: c.automation_status,
        })),
      });
    }

    // Auto-enable: mark controls as automated
    const controlIds = matchingControls.map(c => c.id);
    let updated = 0;
    for (const c of matchingControls) {
      if (c.automation_status !== "automated") {
        await base44.entities.Control.update(c.id, {
          automation_status: "automated",
          status: c.status === "not_tested" ? "passing" : c.status,
        });
        updated++;
      }
    }

    // Update the Connection's controls_monitored
    if (connection_id) {
      const conn = await base44.entities.Connection.get(connection_id);
      const existing = conn.controls_monitored || [];
      const merged = [...new Set([...existing, ...controlIds])];
      await base44.entities.Connection.update(connection_id, {
        controls_monitored: merged,
        control_count: merged.length,
      });
    }

    return Response.json({
      service,
      categories,
      controls_eligible: matchingControls.length,
      controls_automated: updated,
      controls_already_automated: matchingControls.length - updated,
      control_ids: controlIds,
      connection_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}