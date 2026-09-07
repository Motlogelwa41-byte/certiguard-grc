import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/api\/v1\/public\/?/, '').replace(/\/$/, '');
    const apiKey = req.headers.get('X-API-Key') || url.searchParams.get('api_key');

    if (!apiKey) {
      return Response.json({ error: "Missing X-API-Key header. Generate an API key in Settings → API Keys." }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    // Verify API key — list and filter manually for reliability
    const allKeys = await sr.entities.TenantApiKey.list("-created_date", 100).catch(() => []);
    const key = (allKeys || []).find((k) => k.api_key === apiKey && k.is_active !== false);

    if (!key) {
      return Response.json({ error: "Invalid or inactive API key" }, { status: 401 });
    }

    const tenantId = key.tenant_id;
    if (!tenantId) {
      return Response.json({ error: "API key not linked to a tenant" }, { status: 403 });
    }

    // Rate limiting: check if called too recently (minimum 36 seconds between calls = 100/hour)
    const now = new Date();
    const lastCall = key.last_api_call_at ? new Date(key.last_api_call_at) : null;
    if (lastCall && (now.getTime() - lastCall.getTime()) < 36000) {
      const waitSec = Math.ceil((36000 - (now.getTime() - lastCall.getTime())) / 1000);
      return Response.json({ error: `Rate limit exceeded. Try again in ${waitSec} seconds.`, retry_after_seconds: waitSec }, { status: 429 });
    }

    // Update API key stats
    await sr.entities.TenantApiKey.update(key.id, {
      last_api_call_at: now.toISOString(),
      total_api_calls: (key.total_api_calls || 0) + 1,
    }).catch(() => {});

    // Route based on path
    if (path === 'score' || path === '') {
      const controls = await sr.entities.Control.list("-created_date", 500).catch(() => []);
      const tc = (controls || []).filter((c) => c.tenant_id === tenantId);
      const passing = tc.filter((c) => c.status === "passing").length;
      const total = tc.length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;
      const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

      return Response.json({
        score,
        grade,
        total_controls: total,
        passing_controls: passing,
        failing_controls: tc.filter((c) => c.status === "failing").length,
        computed_at: now.toISOString(),
      });
    }

    if (path === 'controls') {
      const controls = await sr.entities.Control.list("-created_date", 500).catch(() => []);
      const tc = (controls || []).filter((c) => c.tenant_id === tenantId);
      return Response.json({
        controls: tc.map((c) => ({
          control_id: c.control_id,
          title: c.title,
          category: c.category,
          status: c.status,
          severity: c.severity,
          effectiveness_score: c.effectiveness_score,
          last_tested: c.last_tested,
        })),
        total: tc.length,
      });
    }

    if (path === 'evidence') {
      const evidence = await sr.entities.Evidence.list("-created_date", 200).catch(() => []);
      const te = (evidence || []).filter((e) => e.tenant_id === tenantId);
      return Response.json({
        evidence: te.map((e) => ({
          title: e.title,
          type: e.type,
          status: e.status,
          control_title: e.control_title,
          collected_date: e.collected_date,
        })),
        total: te.length,
      });
    }

    if (path === 'frameworks') {
      const frameworks = await sr.entities.Framework.list("-created_date", 100).catch(() => []);
      const tf = (frameworks || []).filter((f) => f.tenant_id === tenantId);
      return Response.json({
        frameworks: tf.map((f) => ({
          name: f.name,
          status: f.status,
          readiness_score: f.readiness_score,
        })),
        total: tf.length,
      });
    }

    return Response.json({
      error: "Unknown endpoint",
      available_endpoints: ["/api/v1/public/score", "/api/v1/public/controls", "/api/v1/public/evidence", "/api/v1/public/frameworks"],
    }, { status: 404 });
  } catch (error) {
    console.error("publicComplianceApi error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});