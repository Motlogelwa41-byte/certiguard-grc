import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Syncs GitHub repository security posture into SecurityFinding records.
// Checks: branch protection on default branch, required PR reviews, force-push
// protection, and org-level 2FA enforcement. Creates findings for gaps so they
// surface in the EDR Dashboard and link to relevant GRC controls.
const SLA = { critical: 168, high: 336, medium: 720, low: 2160 };
const GH_API = 'https://api.github.com';

async function getToken(sr) {
  const conn = await sr.connectors.getConnection('github');
  if (!conn) throw new Error('GitHub connector not authorized');
  return typeof conn === 'string' ? conn : conn?.accessToken;
}

async function ghFetch(path, token) {
  const res = await fetch(`${GH_API}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'CertiGuard-GRC' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export default async function(req) {
  let conn = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'compliance_officer') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const token = await getToken(sr);

    // Find the GitHub connection record
    const ghConns = await sr.entities.Connection.filter({ service: 'github' });
    conn = (ghConns && ghConns[0]) || null;
    if (!conn) {
      return Response.json({ error: 'No GitHub connection found. Add a GitHub connection in Connections first.' }, { status: 404 });
    }
    if (conn.auto_collect === false) {
      return Response.json({ ok: true, skipped: true, reason: 'GitHub connection auto-collect disabled' });
    }

    // Fetch repos (user has access to)
    const repos = await ghFetch('/user/repos?per_page=100&sort=updated&direction=desc', token);
    if (!repos || !Array.isArray(repos)) {
      throw new Error('Failed to list repositories');
    }

    // Load existing findings to avoid duplicates
    const existing = await sr.entities.SecurityFinding.filter({ source: 'other' }, '-created_date', 500);
    const existingKeys = new Set((existing || []).map((f) => f.finding_id).filter(Boolean));

    // Load controls for linking
    const controls = await sr.entities.Control.list('-updated_date', 500);
    const accessControls = (controls || []).filter((c) => c.category === 'access_control' || c.category === 'change_management').slice(0, 5);
    const linkedIds = accessControls.map((c) => c.id);
    const linkedNames = accessControls.map((c) => c.title).filter(Boolean);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const records = [];
    let checkedCount = 0;
    let protectedCount = 0;

    for (const repo of repos.slice(0, 80)) {
      const defaultBranch = repo.default_branch;
      if (!defaultBranch) continue;
      checkedCount++;

      // Check branch protection on the default branch
      const protection = await ghFetch(
        `/repos/${repo.full_name}/branches/${encodeURIComponent(defaultBranch)}/protection`,
        token
      ).catch(() => null);

      const repoName = repo.full_name;
      const haystack = `${repoName} ${defaultBranch} branch protection code review`;

      if (!protection) {
        // No branch protection at all
        const fid = `GH-BP-${repoName}-${defaultBranch}`;
        if (!existingKeys.has(fid)) {
          const sla = SLA.high;
          records.push({
            tenant_id: user.data?.tenant_id || '',
            finding_id: fid,
            source: 'other',
            cloud_provider: 'other',
            posture_check: 'Configuration',
            title: `No branch protection on ${repoName} (${defaultBranch})`,
            description: `Repository ${repoName} has no branch protection rules on its default branch "${defaultBranch}". Anyone with write access can push directly, bypassing code review and change management controls.`,
            severity: 'high',
            status: 'open',
            asset: 'repository',
            resource_id: repoName,
            service: 'github',
            detected_date: today,
            first_seen: now.toISOString(),
            last_seen: now.toISOString(),
            due_date: new Date(now.getTime() + sla * 3600 * 1000).toISOString().slice(0, 10),
            sla_hours: sla,
            sla_breached: false,
            linked_control_ids: linkedIds,
            linked_control_names: linkedNames,
            notes: `Default branch: ${defaultBranch}`,
            connection_id: conn.id,
          });
        }
      } else {
        protectedCount++;
        // Check for missing PR review requirement
        const reviews = protection.required_pull_request_reviews;
        if (!reviews || !reviews.required_approving_review_count || reviews.required_approving_review_count < 1) {
          const fid = `GH-PR-${repoName}-${defaultBranch}`;
          if (!existingKeys.has(fid)) {
            const sla = SLA.medium;
            records.push({
              tenant_id: user.data?.tenant_id || '',
              finding_id: fid,
              source: 'other',
              cloud_provider: 'other',
              posture_check: 'Configuration',
              title: `No required PR reviews on ${repoName} (${defaultBranch})`,
              description: `Repository ${repoName} does not require pull request reviews before merging to "${defaultBranch}". Code changes can be merged without peer review, violating change management controls.`,
              severity: 'medium',
              status: 'open',
              asset: 'repository',
              resource_id: repoName,
              service: 'github',
              detected_date: today,
              first_seen: now.toISOString(),
              last_seen: now.toISOString(),
              due_date: new Date(now.getTime() + sla * 3600 * 1000).toISOString().slice(0, 10),
              sla_hours: sla,
              sla_breached: false,
              linked_control_ids: linkedIds,
              linked_control_names: linkedNames,
              notes: `Default branch: ${defaultBranch}`,
              connection_id: conn.id,
            });
          }
        }

        // Check for force-push allowance
        if (protection.allow_force_pushes && protection.allow_force_pushes.enabled) {
          const fid = `GH-FP-${repoName}-${defaultBranch}`;
          if (!existingKeys.has(fid)) {
            const sla = SLA.medium;
            records.push({
              tenant_id: user.data?.tenant_id || '',
              finding_id: fid,
              source: 'other',
              cloud_provider: 'other',
              posture_check: 'Configuration',
              title: `Force pushes allowed on ${repoName} (${defaultBranch})`,
              description: `Repository ${repoName} allows force pushes to the protected branch "${defaultBranch}", which can rewrite commit history and bypass audit trail integrity.`,
              severity: 'medium',
              status: 'open',
              asset: 'repository',
              resource_id: repoName,
              service: 'github',
              detected_date: today,
              first_seen: now.toISOString(),
              last_seen: now.toISOString(),
              due_date: new Date(now.getTime() + sla * 3600 * 1000).toISOString().slice(0, 10),
              sla_hours: sla,
              sla_breached: false,
              linked_control_ids: linkedIds,
              linked_control_names: linkedNames,
              notes: `Default branch: ${defaultBranch}`,
              connection_id: conn.id,
            });
          }
        }
      }
    }

    // Check org 2FA enforcement (if user has org access)
    let org2faEnforced = null;
    try {
      const orgs = await ghFetch('/user/orgs?per_page=100', token);
      if (orgs && Array.isArray(orgs) && orgs.length > 0) {
        for (const org of orgs.slice(0, 5)) {
          const orgInfo = await ghFetch(`/orgs/${org.login}`, token);
          if (orgInfo) {
            if (!orgInfo.two_factor_requirement_enabled) {
              const fid = `GH-2FA-${org.login}`;
              if (!existingKeys.has(fid)) {
                const sla = SLA.high;
                records.push({
                  tenant_id: user.data?.tenant_id || '',
                  finding_id: fid,
                  source: 'other',
                  cloud_provider: 'other',
                  posture_check: 'IAM',
                  title: `2FA not enforced for GitHub org ${org.login}`,
                  description: `GitHub organization "${org.login}" does not require two-factor authentication for its members. This is a critical access control gap for SOC 2 and ISO 27001 compliance.`,
                  severity: 'high',
                  status: 'open',
                  asset: 'organization',
                  resource_id: org.login,
                  service: 'github',
                  detected_date: today,
                  first_seen: now.toISOString(),
                  last_seen: now.toISOString(),
                  due_date: new Date(now.getTime() + sla * 3600 * 1000).toISOString().slice(0, 10),
                  sla_hours: sla,
                  sla_breached: false,
                  linked_control_ids: linkedIds,
                  linked_control_names: linkedNames,
                  notes: `Org: ${org.login}`,
                  connection_id: conn.id,
                });
              }
            }
            org2faEnforced = orgInfo.two_factor_requirement_enabled;
          }
        }
      }
    } catch (e) {
      console.log('Org 2FA check skipped:', e?.message || e);
    }

    // Bulk create new findings
    let created = [];
    if (records.length) {
      created = await sr.entities.SecurityFinding.bulkCreate(records);
    }

    // Update connection record
    await sr.entities.Connection.update(conn.id, {
      last_sync_at: now.toISOString(),
      last_status: 'ok',
      last_error: '',
      health: 'healthy',
      status: 'connected',
      evidence_collected_count: (conn.evidence_collected_count || 0) + created.length,
    });

    return Response.json({
      ok: true,
      repos_checked: checkedCount,
      repos_protected: protectedCount,
      findings_created: created.length,
      org_2fa_checked: org2faEnforced !== null,
    });
  } catch (error) {
    console.error('syncGithubSecurity error:', error?.message || error);
    if (conn?.id) {
      try {
        const base44 = createClientFromRequest(req);
        await base44.asServiceRole.entities.Connection.update(conn.id, {
          last_sync_at: new Date().toISOString(),
          last_status: 'error',
          last_error: error?.message || 'Unknown error',
          health: 'error',
        });
      } catch (_) {}
    }
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}