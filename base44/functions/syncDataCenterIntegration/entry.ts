import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveTenantContext, tenantScopedFilter } from "../../shared/tenantGuard.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action || "test_connection";
    const ctx = await resolveTenantContext(base44);

    if (action === "test_connection") {
      return await testConnection(base44, body, ctx);
    } else if (action === "sync") {
      return await syncIntegration(base44, body, ctx);
    } else if (action === "list_integrations") {
      return await listIntegrations(base44, ctx);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("syncDataCenterIntegration error:", err);
    return Response.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

async function testConnection(base44, body, ctx) {
  const { integration_id, platform } = body;

  // Fetch the integration record to use its base_url (allows multiple instances)
  let integration = null;
  if (integration_id) {
    integration = await base44.asServiceRole.entities.DataCenterIntegration.get(integration_id);
  }

  let baseUrl, token;
  if (platform === "confluence_dc") {
    baseUrl = integration?.base_url || process.env.CONFLUENCE_DC_BASE_URL;
    token = process.env.CONFLUENCE_DC_TOKEN;
  } else if (platform === "jira_dc") {
    baseUrl = integration?.base_url || process.env.JIRA_DC_BASE_URL;
    token = process.env.JIRA_DC_TOKEN;
  }

  if (!baseUrl || !token) {
    return Response.json({
      connected: false,
      error: "Missing configuration. Set the instance Base URL and configure the PAT secret in Settings."
    });
  }

  try {
    const endpoint = platform === "confluence_dc"
      ? `${baseUrl}/rest/api/space?limit=1`
      : `${baseUrl}/rest/api/2/serverInfo`;

    const headers = buildHeaders(platform, token);
    const resp = await fetch(endpoint, { headers, signal: AbortSignal.timeout(15000) });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown error");
      if (integration_id) {
        await base44.asServiceRole.entities.DataCenterIntegration.update(integration_id, {
          sync_status: "error",
          last_error: `HTTP ${resp.status}`
        });
      }
      return Response.json({ connected: false, error: `HTTP ${resp.status}: ${errText}` });
    }

    const data = await resp.json();

    if (integration_id) {
      await base44.asServiceRole.entities.DataCenterIntegration.update(integration_id, {
        sync_status: "connected",
        last_sync_at: new Date().toISOString(),
        last_error: ""
      });
    }

    return Response.json({
      connected: true,
      server_info: platform === "confluence_dc"
        ? { spaces_found: data.results ? data.results.length : 0 }
        : { version: data.version, server_title: data.serverTitle }
    });
  } catch (err) {
    if (integration_id) {
      await base44.asServiceRole.entities.DataCenterIntegration.update(integration_id, {
        sync_status: "error",
        last_error: err.message
      });
    }
    return Response.json({ connected: false, error: err.message });
  }
}

function buildHeaders(platform, token) {
  const headers = { "Accept": "application/json", "Authorization": `Bearer ${token}` };
  return headers;
}

async function syncIntegration(base44, body, ctx) {
  const { integration_id } = body;
  if (!integration_id) {
    return Response.json({ error: "integration_id is required" }, { status: 400 });
  }

  const integration = await base44.asServiceRole.entities.DataCenterIntegration.get(integration_id);
  if (!integration) {
    return Response.json({ error: "Integration not found" }, { status: 404 });
  }

  await base44.asServiceRole.entities.DataCenterIntegration.update(integration_id, {
    sync_status: "syncing"
  });

  try {
    const platform = integration.platform;
    const baseUrl = integration.base_url ||
      (platform === "confluence_dc" ? process.env.CONFLUENCE_DC_BASE_URL : process.env.JIRA_DC_BASE_URL);
    const token = platform === "confluence_dc"
      ? process.env.CONFLUENCE_DC_TOKEN
      : process.env.JIRA_DC_TOKEN;

    if (!baseUrl || !token) {
      throw new Error("Missing secrets for this platform. Configure them in Settings.");
    }

    const headers = buildHeaders(platform, token);

    if (platform === "confluence_dc") {
      return await syncConfluence(base44, baseUrl, headers, integration_id, integration);
    } else {
      return await syncJira(base44, baseUrl, headers, integration_id, integration);
    }
  } catch (err) {
    await base44.asServiceRole.entities.DataCenterIntegration.update(integration_id, {
      sync_status: "error",
      last_error: err.message
    });
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function syncConfluence(base44, baseUrl, headers, integrationId, integration) {
  const spacesResp = await fetch(`${baseUrl}/rest/api/space?limit=100`, { headers, signal: AbortSignal.timeout(30000) });
  if (!spacesResp.ok) throw new Error(`Failed to fetch spaces: HTTP ${spacesResp.status}`);
  const spacesData = await spacesResp.json();

  const spaces = spacesData.results || [];
  const spaceDetails = [];
  let totalPages = 0;

  for (const space of spaces.slice(0, 25)) {
    try {
      const pagesResp = await fetch(
        `${baseUrl}/rest/api/content?spaceKey=${space.key}&limit=1&type=page`,
        { headers, signal: AbortSignal.timeout(10000) }
      );
      let pageCount = 0;
      let lastUpdated = null;
      if (pagesResp.ok) {
        const pagesData = await pagesResp.json();
        pageCount = pagesData.size || 0;
        totalPages += pageCount;
        if (pagesData.results && pagesData.results.length > 0) {
          lastUpdated = pagesData.results[0].version?.when;
        }
      }
      spaceDetails.push({
        space_key: space.key,
        space_name: space.name,
        page_count: pageCount,
        last_page_updated: lastUpdated
      });
    } catch (e) {
      spaceDetails.push({
        space_key: space.key,
        space_name: space.name,
        page_count: 0,
        last_page_updated: null
      });
    }
  }

  let accessEvents = 0;
  if (integration.track_access_events) {
    try {
      const auditResp = await fetch(
        `${baseUrl}/rest/api/audit?limit=50`,
        { headers, signal: AbortSignal.timeout(10000) }
      );
      if (auditResp.ok) {
        const auditData = await auditResp.json();
        accessEvents = (auditData.results || []).filter(e =>
          e.action === "viewed" || e.action === "downloaded"
        ).length;
      }
    } catch (e) {
      // Access tracking may require admin permissions
    }
  }

  await base44.asServiceRole.entities.DataCenterIntegration.update(integrationId, {
    sync_status: "connected",
    last_sync_at: new Date().toISOString(),
    spaces_synced: JSON.stringify(spaceDetails),
    total_spaces: spaces.length,
    total_pages_synced: totalPages,
    access_events_tracked: (integration.access_events_tracked || 0) + accessEvents,
    last_error: ""
  });

  return Response.json({
    synced: true,
    total_spaces: spaces.length,
    total_pages: totalPages,
    spaces: spaceDetails,
    access_events_found: accessEvents
  });
}

async function syncJira(base44, baseUrl, headers, integrationId, integration) {
  const projectsResp = await fetch(`${baseUrl}/rest/api/2/project`, { headers, signal: AbortSignal.timeout(30000) });
  if (!projectsResp.ok) throw new Error(`Failed to fetch projects: HTTP ${projectsResp.status}`);
  const projects = await projectsResp.json();

  const projectDetails = [];
  let totalIssues = 0;

  for (const project of projects.slice(0, 25)) {
    try {
      const searchResp = await fetch(
        `${baseUrl}/rest/api/2/search?jql=project=${project.key}&maxResults=0`,
        { headers, signal: AbortSignal.timeout(10000) }
      );
      let issueCount = 0;
      if (searchResp.ok) {
        const searchData = await searchResp.json();
        issueCount = searchData.total || 0;
        totalIssues += issueCount;
      }
      projectDetails.push({
        space_key: project.key,
        space_name: project.name,
        page_count: issueCount,
        last_page_updated: null
      });
    } catch (e) {
      projectDetails.push({
        space_key: project.key,
        space_name: project.name,
        page_count: 0,
        last_page_updated: null
      });
    }
  }

  await base44.asServiceRole.entities.DataCenterIntegration.update(integrationId, {
    sync_status: "connected",
    last_sync_at: new Date().toISOString(),
    spaces_synced: JSON.stringify(projectDetails),
    total_spaces: projects.length,
    total_issues_synced: totalIssues,
    last_error: ""
  });

  return Response.json({
    synced: true,
    total_projects: projects.length,
    total_issues: totalIssues,
    projects: projectDetails
  });
}

async function listIntegrations(base44, ctx) {
  const integrations = await base44.asServiceRole.entities.DataCenterIntegration.filter(
    tenantScopedFilter(ctx)
  );
  return Response.json({ integrations });
}