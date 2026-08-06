import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// DevSecOps pipeline scanner. Scans GitHub repos for security misconfigurations
// (branch protection, PR reviews, secret scanning, dependency alerts) and creates
// SecurityFinding records for violations.
const GH_API = 'https://api.github.com';

async function getToken(sr) {
  const conn = await sr.connectors.getConnection('github');
  if (!conn) throw new Error('GitHub connector not authorized');
  return typeof conn === 'string' ? conn : conn?.accessToken;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const sr = base44.asServiceRole;
    let token;
    try {
      token = await getToken(sr);
    } catch (e) {
      return Response.json({ status: "error", error: "GitHub connector not authorized. Connect GitHub in Connections first." });
    }

    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CertiGuard-GRC' };
    const reposResponse = await fetch(`${GH_API}/user/repos?per_page=100&sort=updated&direction=desc`, { headers });
    if (!reposResponse.ok) {
      return Response.json({ status: "error", error: `GitHub API error: ${reposResponse.status}` });
    }

    const repos = await reposResponse.json();
    const results = [];
    let checksRun = 0;
    let findingsCreated = 0;
    const today = new Date().toISOString().split("T")[0];
    const nowIso = new Date().toISOString();
    const tenantId = user.data?.tenant_id || user.tenant_id || "";

    for (const repo of repos.slice(0, 30)) {
      const owner = repo.owner.login;
      const name = repo.name;
      const fullName = `${owner}/${name}`;
      const defaultBranch = repo.default_branch;
      const repoResult = { repo: fullName, checks: {} };

      // 1. Branch protection
      let bp = null;
      try {
        const bpRes = await fetch(`${GH_API}/repos/${owner}/${name}/branches/${defaultBranch}/protection`, { headers });
        if (bpRes.ok) bp = await bpRes.json();
      } catch (e) {}
      checksRun++;
      repoResult.checks.branch_protection = !!bp;

      if (!bp) {
        const f = await sr.entities.SecurityFinding.create({
          tenant_id: tenantId, title: `Repo ${name}: Branch '${defaultBranch}' not protected`,
          description: `Repository ${fullName} has no branch protection on the default branch. Direct pushes are allowed without review.`,
          source: "other", severity: "high", status: "open", asset: fullName,
          detected_date: today, first_seen: nowIso, notes: "DevSecOps: branch_protection",
        }).catch(() => null);
        if (f) findingsCreated++;
      }

      // 2. Required reviews
      const requiredReviews = bp?.required_pull_request_reviews?.required_review_count || 0;
      checksRun++;
      repoResult.checks.required_reviews = requiredReviews;

      if (bp && requiredReviews < 2) {
        const f = await sr.entities.SecurityFinding.create({
          tenant_id: tenantId, title: `Repo ${name}: Only ${requiredReviews} PR reviewer(s) required`,
          description: `Repository ${fullName} requires only ${requiredReviews} reviewer(s). SOC 2 CC8.1 recommends at least 2 for production branches.`,
          source: "other", severity: "medium", status: "open", asset: fullName,
          detected_date: today, first_seen: nowIso, notes: "DevSecOps: required_reviews",
        }).catch(() => null);
        if (f) findingsCreated++;
      }

      // 3. Vulnerability alerts
      let vulnAlerts = false;
      try {
        const vaRes = await fetch(`${GH_API}/repos/${owner}/${name}/vulnerability-alerts`, { headers });
        vulnAlerts = vaRes.status === 204 || vaRes.ok;
      } catch (e) {}
      checksRun++;
      repoResult.checks.vulnerability_alerts = vulnAlerts;

      if (!vulnAlerts) {
        const f = await sr.entities.SecurityFinding.create({
          tenant_id: tenantId, title: `Repo ${name}: Dependabot alerts disabled`,
          description: `Repository ${fullName} does not have dependency vulnerability alerts enabled.`,
          source: "other", severity: "medium", status: "open", asset: fullName,
          detected_date: today, first_seen: nowIso, notes: "DevSecOps: dependency_alerts",
        }).catch(() => null);
        if (f) findingsCreated++;
      }

      // 4. Secret scanning (private repos only)
      if (repo.private) {
        let secretScanning = false;
        try {
          const ssRes = await fetch(`${GH_API}/repos/${owner}/${name}/secret-scanning`, { headers });
          if (ssRes.ok) { const d = await ssRes.json(); secretScanning = d.enabled; }
        } catch (e) {}
        checksRun++;
        repoResult.checks.secret_scanning = secretScanning;

        if (!secretScanning) {
          const f = await sr.entities.SecurityFinding.create({
            tenant_id: tenantId, title: `Repo ${name}: Secret scanning disabled`,
            description: `Private repository ${fullName} does not have GitHub secret scanning enabled.`,
            source: "other", severity: "high", status: "open", asset: fullName,
            detected_date: today, first_seen: nowIso, notes: "DevSecOps: secret_scanning",
          }).catch(() => null);
          if (f) findingsCreated++;
        }
      }

      results.push(repoResult);
    }

    return Response.json({
      status: "completed", repos_scanned: results.length,
      checks_run: checksRun, findings_created: findingsCreated, results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}