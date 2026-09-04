import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // List all controls (up to 500)
    const controls = await base44.entities.Control.list("-updated_date", 500);

    // List recent evidence (up to 500, sorted by collected_date desc)
    const evidence = await base44.entities.Evidence.list("-collected_date", 500);

    // Build map: control_id → most recent evidence date
    const latestEvidenceByControl: Record<string, string> = {};
    for (const ev of evidence) {
      if (ev.control_id && !latestEvidenceByControl[ev.control_id]) {
        latestEvidenceByControl[ev.control_id] = ev.collected_date || ev.created_date?.split("T")[0] || "";
      }
    }

    // Also check evidence matched by control_title (for auto-collected evidence without control_id)
    const latestEvidenceByTitle: Record<string, string> = {};
    for (const ev of evidence) {
      if (ev.control_title && !latestEvidenceByTitle[ev.control_title]) {
        latestEvidenceByTitle[ev.control_title] = ev.collected_date || ev.created_date?.split("T")[0] || "";
      }
    }

    const now = new Date();
    const staleThreshold = 30; // days
    const details: any[] = [];
    let flowing = 0, stale = 0, manual = 0, none = 0;

    for (const c of controls) {
      const lastDate = latestEvidenceByControl[c.id] || latestEvidenceByTitle[c.title] || "";
      let status: string;

      if (!lastDate) {
        status = "none";
        none++;
      } else {
        const daysSince = Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000);
        if (c.automation_status === "manual") {
          status = daysSince > staleThreshold ? "stale" : "manual";
          if (status === "stale") stale++; else manual++;
        } else {
          status = daysSince > staleThreshold ? "stale" : "flowing";
          if (status === "stale") stale++; else flowing++;
        }
      }

      if (status === "none" && c.automation_status === "manual") {
        // manual controls with no evidence are "manual" not "none"
        manual++;
        none--;
        status = "manual";
      }

      details.push({
        id: c.id,
        control_id: c.control_id,
        title: c.title,
        category: c.category,
        automation_status: c.automation_status,
        evidence_status: status,
        last_evidence_date: lastDate,
        days_since_evidence: lastDate ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86400000) : null,
        framework_ids: c.framework_ids || [],
      });
    }

    // Connection health
    const connections = await base44.entities.Connection.filter({});
    const connectionHealth = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      service: conn.service,
      status: conn.status,
      health: conn.health,
      control_count: conn.control_count || 0,
      evidence_collected_count: conn.evidence_collected_count || 0,
      last_sync_at: conn.last_sync_at,
      auto_collect: conn.auto_collect,
    }));

    return Response.json({
      summary: {
        total_controls: controls.length,
        flowing,
        stale,
        manual,
        none,
        automation_pct: controls.length > 0 ? Math.round((controls.filter(c => c.automation_status === "automated").length / controls.length) * 100) : 0,
        evidence_coverage_pct: controls.length > 0 ? Math.round(((flowing + stale + manual) / controls.length) * 100) : 0,
      },
      connections: connectionHealth,
      controls: details,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}