import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Live Embeddable Compliance Badges — Public Endpoint
// Returns live compliance status as JSON (for API consumers) or HTML (for embeddable widgets).
// Query params: format=json|widget|badge, framework=soc2|iso27001|all, tenant=tenant_id

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const url = new URL(req.url);
    const params = url.searchParams;
    const format = params.get('format') || 'json';
    const frameworkFilter = params.get('framework') || 'all';

    // Fetch compliance data — use service role for public access
    const [frameworks, controls, certifications, complianceRuns] = await Promise.all([
      sr.entities.RegulatoryFramework.list("-created_date", 100).catch(() => []),
      sr.entities.Control.list("-created_date", 200).catch(() => []),
      sr.entities.Certification.list("-created_date", 50).catch(() => []),
      sr.entities.ComplianceRun.list("-created_date", 10).catch(() => []),
    ]);

    // Compute per-framework compliance status
    const frameworkStatuses = [];
    for (const fw of (frameworks || [])) {
      const fwControls = (controls || []).filter(c => c.framework_ids?.includes(fw.id));
      const passing = fwControls.filter(c => c.status === 'passing').length;
      const failing = fwControls.filter(c => c.status === 'failing').length;
      const total = fwControls.length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;
      const cert = (certifications || []).find(c => c.framework_id === fw.id || c.framework_name === fw.name);
      const status = score >= 90 ? 'active' : score >= 70 ? 'in_progress' : score > 0 ? 'gap' : 'not_started';

      frameworkStatuses.push({
        code: fw.code,
        name: fw.name,
        version: fw.version,
        jurisdiction: fw.jurisdiction,
        compliance_score: score,
        status,
        controls_total: total,
        controls_passing: passing,
        controls_failing: failing,
        certified: cert ? cert.status === 'active' : false,
        certification_type: cert?.certification_type || null,
        last_audit: cert?.audit_date || null,
      });
    }

    // Filter by framework if specified
    let displayFrameworks = frameworkFilter === 'all'
      ? frameworkStatuses
      : frameworkStatuses.filter(f => f.code.toLowerCase() === frameworkFilter.toLowerCase());

    const overallScore = frameworkStatuses.length > 0
      ? Math.round(frameworkStatuses.reduce((sum, f) => sum + f.compliance_score, 0) / frameworkStatuses.length)
      : 0;

    const badgeData = {
      platform: "CertiGuard GRC",
      overall_compliance_score: overallScore,
      frameworks: displayFrameworks,
      last_updated: new Date().toISOString(),
      total_frameworks: frameworkStatuses.length,
      certified_count: frameworkStatuses.filter(f => f.certified).length,
    };

    // === JSON format ===
    if (format === 'json') {
      return Response.json(badgeData);
    }

    // === SVG Badge format ===
    if (format === 'badge') {
      const fw = displayFrameworks[0];
      if (!fw) return new Response('Framework not found', { status: 404 });
      const color = fw.status === 'active' ? '#16a34a' : fw.status === 'in_progress' ? '#f59e0b' : fw.status === 'gap' ? '#ef4444' : '#64748b';
      const label = fw.code.toUpperCase();
      const value = fw.certified ? 'CERTIFIED' : `${fw.compliance_score}%`;
      const svg = generateSvgBadge(label, value, color);
      return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=300' } });
    }

    // === HTML Widget format ===
    if (format === 'widget') {
      const html = generateWidgetHtml(badgeData);
      return new Response(html, { headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
    }

    return Response.json(badgeData);
  } catch (error) {
    console.error("getComplianceBadgeData error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateSvgBadge(label, value, color) {
  const labelWidth = label.length * 6.5 + 12;
  const valueWidth = value.length * 6.5 + 12;
  const totalWidth = labelWidth + valueWidth;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a"><rect width="${totalWidth}" height="20" rx="3" fill="#fff"/></mask>
  <g mask="url(#a)">
    <path fill="#333" d="M0 0h${labelWidth}v20H0z"/>
    <path fill="${color}" d="M${labelWidth} 0h${valueWidth}v20H${labelWidth}z"/>
    <path fill="url(#b)" d="M0 0h${totalWidth}v20H0z"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#fff">${escapeXml(label)}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#fff">${escapeXml(value)}</text>
  </g>
</svg>`;
}

function generateWidgetHtml(data) {
  const frameworks = data.frameworks.map(f => {
    const color = f.status === 'active' ? '#16a34a' : f.status === 'in_progress' ? '#f59e0b' : f.status === 'gap' ? '#ef4444' : '#64748b';
    const statusLabel = f.certified ? '✓ Certified' : f.status === 'active' ? 'Active' : f.status === 'in_progress' ? 'In Progress' : f.status === 'gap' ? 'Gaps Found' : 'Not Started';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #e2e8f0;">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
      <span style="font-size:13px;font-weight:600;color:#1e293b;flex:1;">${escapeHtml(f.name)}</span>
      <span style="font-size:12px;color:${color};font-weight:600;">${statusLabel}</span>
      <span style="font-size:12px;color:#64748b;font-weight:500;">${f.compliance_score}%</span>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Inter,system-ui,sans-serif;background:transparent;}</style>
</head><body>
<div style="width:320px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="background:#0A2463;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="width:24px;height:24px;background:#3E92CC;border-radius:6px;display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </div>
      <span style="color:#fff;font-size:14px;font-weight:700;">CertiGuard GRC</span>
    </div>
    <span style="color:#94a3b8;font-size:11px;">Live Status</span>
  </div>
  <div style="padding:12px 16px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <span style="font-size:12px;color:#64748b;font-weight:500;">Overall Compliance</span>
      <span style="font-size:22px;font-weight:800;color:#0A2463;">${data.overall_compliance_score}%</span>
    </div>
    ${frameworks}
  </div>
  <div style="padding:8px 16px;background:#f8fafc;border-top:1px solid #e2e8f0;">
    <span style="font-size:10px;color:#94a3b8;">Powered by CertiGuard GRC · Updated ${new Date(data.last_updated).toLocaleDateString()}</span>
  </div>
</div>
</body></html>`;
}

function escapeXml(s) { return (s || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])); }
function escapeHtml(s) { return (s || '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c])); }