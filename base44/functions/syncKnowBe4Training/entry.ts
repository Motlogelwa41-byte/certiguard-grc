import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = secrets.get("KNOWBE4_API_KEY");
    const baseUrl = secrets.get("KNOWBE4_BASE_URL") || "https://us.api.knowbe4.com";

    if (!apiKey) {
      return Response.json({ error: "KnowBe4 API key not configured. Set KNOWBE4_API_KEY secret." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";

    // --- Test connection: GET /v1/account ---
    if (action === "test") {
      const resp = await fetch(`${baseUrl}/v1/account`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        return Response.json({ connected: false, error: `KnowBe4 API error: ${resp.status}` }, { status: 400 });
      }
      const data = await resp.json();
      return Response.json({ connected: true, account: data });
    }

    // --- Sync: GET /v1/training/campaigns ---
    const campaignsResp = await fetch(`${baseUrl}/v1/training/campaigns?per_page=100`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!campaignsResp.ok) {
      return Response.json({ error: `KnowBe4 API error: ${campaignsResp.status}` }, { status: 400 });
    }
    const campaigns = await campaignsResp.json();

    // --- GET /v1/users for total user count ---
    let totalUsers = 0;
    try {
      const usersResp = await fetch(`${baseUrl}/v1/users?per_page=1`, {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (usersResp.ok) {
        const usersData = await usersResp.json();
        totalUsers = Array.isArray(usersData) ? usersData.length : (usersData.total || 0);
      }
    } catch { /* best effort */ }

    // --- Create / update Connection record ---
    const existing = await base44.entities.Connection.filter({ service: "aws" });
    let connection;
    const existingConn = await base44.entities.Connection.filter({ name: "KnowBe4 Training" });
    const connData: any = {
      name: "KnowBe4 Training",
      service: "knowbe4",
      category: "hr",
      status: "connected",
      health: "healthy",
      auth_method: "api_key",
      config: JSON.stringify({ provider: "knowbe4", baseUrl, totalUsers }),
      last_sync_at: new Date().toISOString(),
      last_status: "ok",
    };
    if (existingConn.length > 0) {
      connection = await base44.entities.Connection.update(existingConn[0].id, connData);
    } else {
      connection = await base44.entities.Connection.create(connData);
    }

    // --- Create / update Training records for each campaign ---
    let trainingCreated = 0;
    let trainingUpdated = 0;
    for (const campaign of (Array.isArray(campaigns) ? campaigns : [])) {
      const existingTraining = await base44.entities.Training.filter({
        source_training_id: String(campaign.campaign_id || campaign.id || ""),
      });

      const trainingData: any = {
        title: campaign.name || campaign.campaign_name || "KnowBe4 Training Campaign",
        description: campaign.description || `KnowBe4 training campaign (ID: ${campaign.campaign_id || campaign.id})`,
        category: "security_awareness",
        type: "online_course",
        mandatory: true,
        status: campaign.status === "completed" ? "active" : "draft",
        assignee_count: campaign.assigned_user_count || campaign.assigned_users || totalUsers,
        completed_count: campaign.completed_user_count || campaign.completed_users || 0,
        source_system: "knowbe4",
        source_training_id: String(campaign.campaign_id || campaign.id || ""),
        content_url: campaign.content_url || "",
      };

      if (existingTraining.length > 0) {
        await base44.entities.Training.update(existingTraining[0].id, trainingData);
        trainingUpdated++;
      } else {
        await base44.entities.Training.create(trainingData);
        trainingCreated++;
      }
    }

    return Response.json({
      connected: true,
      total_campaigns: Array.isArray(campaigns) ? campaigns.length : 0,
      training_created: trainingCreated,
      training_updated: trainingUpdated,
      total_users: totalUsers,
      connection_id: connection.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}