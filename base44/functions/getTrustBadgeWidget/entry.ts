import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug") || "trust";
    const format = url.searchParams.get("format") || "html";

    // Public endpoint — use service role to query TrustCenter
    const trustCenters = await base44.asServiceRole.entities.TrustCenter.filter({ slug });
    if (trustCenters.length === 0) {
      return Response.json({ error: "Trust Center not found" }, { status: 404 });
    }
    const tc = trustCenters[0];

    if (!tc.is_published) {
      return Response.json({ error: "Trust Center is not published" }, { status: 404 });
    }

    // Gather compliance data
    const controls = await base44.asServiceRole.entities.Control.list("-updated_date", 500);
    const passingControls = controls.filter(c => c.status === "passing").length;
    const totalControls = controls.length;
    const score = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;
    const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

    // Get active frameworks
    const frameworks = await base44.asServiceRole.entities.RegulatoryFramework.filter({ status: "active" });
    const frameworkNames = frameworks.map(f => f.code || f.name).slice(0, 6);

    // Get active certifications
    const certifications = await base44.asServiceRole.entities.Certification.filter({ status: "active" });
    const certNames = certifications.map(c => c.name || c.certification_type).slice(0, 4);

    // Get SecurityRatingConfig for score if available
    let displayScore = score;
    let displayGrade = grade;
    try {
      const ratingConfigs = await base44.asServiceRole.entities.SecurityRatingConfig.filter({ is_public: true });
      if (ratingConfigs.length > 0) {
        const rc = ratingConfigs[0];
        if (rc.current_score) displayScore = rc.current_score;
        if (rc.current_grade && rc.current_grade !== "untested") displayGrade = rc.current_grade;
      }
    } catch { /* best effort */ }

    const style = tc.accent_color || "#2563eb";
    const companyName = tc.company_name || "Our Company";

    // --- Return JSON for API consumers ---
    if (format === "json") {
      return Response.json({
        company_name: companyName,
        score: displayScore,
        grade: displayGrade,
        frameworks: frameworkNames,
        certifications: certNames,
        controls: { passing: passingControls, total: totalControls },
        verified: true,
        verified_by: "CertiGuard",
        last_updated: new Date().toISOString(),
      });
    }

    // --- Return HTML widget ---
    const frameworkBadges = frameworkNames
      .map(f => `<span class="cg-fw">${f}</span>`)
      .join("");
    const certBadges = certNames
      .map(c => `<span class="cg-cert">✓ ${c}</span>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${companyName} Security Badge</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; background: transparent; }
  .cg-badge { width: 340px; padding: 24px; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
  .cg-badge.dark { background: #0a2463; color: #fff; border-color: #1e3a6c; }
  .cg-badge.minimal { box-shadow: none; border: 1px solid #e2e8f0; }
  .cg-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .cg-shield { width: 36px; height: 36px; border-radius: 8px; background: ${style}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .cg-shield svg { width: 20px; height: 20px; fill: #fff; }
  .cg-company { font-size: 15px; font-weight: 700; color: inherit; line-height: 1.3; }
  .cg-tagline { font-size: 11px; color: #64748b; margin-top: 2px; }
  .cg-badge.dark .cg-tagline { color: rgba(255,255,255,0.6); }
  .cg-score-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; }
  .cg-score { font-size: 36px; font-weight: 800; color: ${style}; line-height: 1; }
  .cg-grade { font-size: 14px; font-weight: 600; color: #64748b; }
  .cg-badge.dark .cg-grade { color: rgba(255,255,255,0.7); }
  .cg-label { font-size: 11px; color: #94a3b8; font-weight: 500; }
  .cg-badge.dark .cg-label { color: rgba(255,255,255,0.5); }
  .cg-frameworks { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .cg-fw { font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 6px; background: #f1f5f9; color: #334155; }
  .cg-badge.dark .cg-fw { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); }
  .cg-certs { display: flex; flex-direction: column; gap: 4px; }
  .cg-cert { font-size: 11px; font-weight: 500; color: #16a34a; }
  .cg-badge.dark .cg-cert { color: #4ade80; }
  .cg-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
  .cg-badge.dark .cg-footer { border-color: rgba(255,255,255,0.1); }
  .cg-verified { font-size: 10px; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 4px; }
  .cg-badge.dark .cg-verified { color: rgba(255,255,255,0.5); }
  .cg-verified::before { content: '✓'; color: #16a34a; font-weight: 700; }
  .cg-badge.dark .cg-verified::before { color: #4ade80; }
  .cg-date { font-size: 10px; color: #cbd5e1; }
  .cg-badge.dark .cg-date { color: rgba(255,255,255,0.4); }
</style>
</head>
<body>
<div class="cg-badge">
  <div class="cg-header">
    <div class="cg-shield">
      <svg viewBox="0 0 24 24"><path d="M12 2L4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"/></svg>
    </div>
    <div>
      <div class="cg-company">${companyName}</div>
      <div class="cg-tagline">Security & Compliance</div>
    </div>
  </div>
  <div class="cg-score-row">
    <div class="cg-score">${displayScore}</div>
    <div>
      <div class="cg-grade">Grade ${displayGrade}</div>
      <div class="cg-label">Security Score</div>
    </div>
  </div>
  ${frameworkNames.length ? `<div class="cg-label" style="margin-bottom:6px">Compliance Frameworks</div><div class="cg-frameworks">${frameworkBadges}</div>` : ""}
  ${certNames.length ? `<div class="cg-label" style="margin-bottom:4px">Active Certifications</div><div class="cg-certs">${certBadges}</div>` : ""}
  <div class="cg-footer">
    <div class="cg-verified">Verified by CertiGuard</div>
    <div class="cg-date">${new Date().toISOString().split("T")[0]}</div>
  </div>
</div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}