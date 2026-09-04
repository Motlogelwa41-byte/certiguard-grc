import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "get_rating";
    // api_key can come from header, query param, or JSON body (for SDK invoke calls)
    let apiKey = req.headers.get("x-api-key") || url.searchParams.get("api_key") || "";
    if (!apiKey) {
      try {
        const body = await req.json();
        if (body.api_key) apiKey = body.api_key;
      } catch (_) { /* body may be empty for GET-style calls */ }
    }

    // This is a PUBLIC endpoint — no auth.me() call
    const configs = await base44.asServiceRole.entities.SecurityRatingConfig.filter({
      is_public: true
    });

    if (configs.length === 0) {
      return Response.json({
        error: "Security rating API is not available for this organization",
        status: "unavailable"
      }, { status: 404 });
    }

    const config = configs[0];

    if (config.api_key && config.api_key !== apiKey) {
      return Response.json({
        error: "Invalid or missing API key. Include it as the x-api-key header."
      }, { status: 401 });
    }

    if (action === "get_rating") {
      return await getRating(base44, config);
    } else if (action === "get_badge") {
      return await getBadge(base44, config);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("getPublicSecurityRating error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getRating(base44, config) {
  const tenantId = config.tenant_id;

  const [controls, frameworks, certifications, incidents, audits] = await Promise.all([
    base44.asServiceRole.entities.Control.filter({ tenant_id: tenantId }),
    base44.asServiceRole.entities.RegulatoryFramework.filter({ tenant_id: tenantId, status: "active" }),
    base44.asServiceRole.entities.Certification.filter({ tenant_id: tenantId, status: "active" }).catch(() => []),
    base44.asServiceRole.entities.Incident.filter({ tenant_id: tenantId }).catch(() => []),
    base44.asServiceRole.entities.Audit.filter({ tenant_id: tenantId }).catch(() => [])
  ]);

  const totalControls = controls.length;
  const passingControls = controls.filter(c => c.status === "passing").length;
  const controlPassRate = totalControls > 0 ? (passingControls / totalControls) * 100 : 0;

  const frameworkCount = frameworks.length;
  const activeCerts = certifications.length;

  const recentIncidents = incidents.filter(i => {
    const daysAgo = (Date.now() - new Date(i.detected_date || i.created_date).getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo < 90 && i.status !== "false_positive" && i.status !== "closed";
  }).length;
  const incidentPenalty = Math.min(recentIncidents * 3, 20);

  let score = 0;
  score += controlPassRate * 0.5;
  score += Math.min(frameworkCount * 5, 25);
  score += Math.min(activeCerts * 5, 15);
  score += 10;
  score -= incidentPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  const response = {
    organization: "Security Posture Rating",
    rating_scale: config.rating_scale,
    last_updated: config.last_rating_computed_at || new Date().toISOString(),
    computed_at: new Date().toISOString()
  };

  if (config.expose_score) {
    if (config.rating_scale === "0_1000") response.score = score * 10;
    else if (config.rating_scale === "star_5") response.score = Math.round((score / 20) * 10) / 10;
    else response.score = score;
  }

  if (config.expose_grade) {
    response.grade = grade;
  }

  if (config.expose_control_summary) {
    response.controls = {
      total: totalControls,
      passing: passingControls,
      failing: controls.filter(c => c.status === "failing").length,
      pass_rate: Math.round(controlPassRate) + "%"
    };
  }

  if (config.expose_frameworks) {
    response.frameworks = frameworks.map(f => ({
      name: f.name,
      code: f.code,
      status: f.status
    }));
  }

  if (config.expose_certifications) {
    response.certifications = certifications.map(c => ({
      name: c.name || c.certification_type,
      status: c.status,
      expiry_date: c.expiry_date
    }));
  }

  if (config.expose_incident_count) {
    response.incidents = {
      recent_open: recentIncidents,
      last_90_days: incidents.filter(i => {
        const daysAgo = (Date.now() - new Date(i.detected_date || i.created_date).getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo < 90;
      }).length
    };
  }

  if (config.expose_last_audit_date && audits.length > 0) {
    const lastAudit = audits.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0];
    response.last_audit_date = lastAudit.start_date || lastAudit.created_date;
  }

  if (config.expose_uptime) {
    response.uptime_sla = "99.9%";
  }

  if (config.custom_message) {
    response.message = config.custom_message;
  }

  await base44.asServiceRole.entities.SecurityRatingConfig.update(config.id, {
    total_api_calls: (config.total_api_calls || 0) + 1,
    last_api_call_at: new Date().toISOString(),
    current_score: score,
    current_grade: grade,
    last_rating_computed_at: new Date().toISOString()
  });

  return Response.json(response);
}

async function getBadge(base44, config) {
  const rating = await getRating(base44, config);
  const data = await rating.json();

  const score = data.score || 0;
  const grade = data.grade || "F";
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#eab308" : "#ef4444";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="40" viewBox="0 0 180 40">
    <rect width="180" height="40" rx="6" fill="#1e293b"/>
    <rect width="70" height="40" rx="6" fill="#0f172a"/>
    <text x="35" y="25" font-family="Inter,sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">SECURITY</text>
    <text x="125" y="25" font-family="Inter,sans-serif" font-size="14" font-weight="bold" fill="${color}" text-anchor="middle">${grade} (${score}/100)</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}