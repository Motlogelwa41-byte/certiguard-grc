import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { secrets } from 'base44:runtime';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authorization: authenticated user (manual) or internal workflow token (scheduled).
    let authUser = null;
    try { authUser = await base44.auth.me(); } catch (_) { authUser = null; }
    if (authUser) {
      if (!['admin', 'compliance_officer'].includes(authUser.role)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const email = Deno.env.get("JIRA_USER_EMAIL");
    const token = Deno.env.get("JIRA_API_TOKEN");
    const rawBaseUrl = Deno.env.get("JIRA_BASE_URL") || "";
    const baseUrlMatch = rawBaseUrl.match(/^https?:\/\/[^/]+/i);
    const baseUrl = baseUrlMatch ? baseUrlMatch[0] : rawBaseUrl.replace(/\/$/, "");
    if (!email || !token || !baseUrl) {
      return Response.json({ error: "Jira not configured" }, { status: 400 });
    }

    const authHeader = "Basic " + btoa(`${email}:${token}`);

    // Find all SecurityFindings that have a Jira ticket reference in their notes
    // Format: "Jira ticket: <KEY> — <url>"
    const findings = await base44.asServiceRole.entities.SecurityFinding.list('-updated_date', 500);
    const findingsWithJira = findings.filter((f) => f.notes && f.notes.includes('Jira ticket:'));

    if (findingsWithJira.length === 0) {
      return Response.json({ ok: true, message: 'No findings with Jira tickets found', synced: 0 });
    }

    // Extract Jira keys from notes
    const keyRegex = /Jira ticket:\s*([A-Z]+-\d+)/g;
    const ticketMap = []; // [{ finding_id, jira_key }]
    for (const f of findingsWithJira) {
      const match = [...f.notes.matchAll(keyRegex)];
      for (const m of match) {
        ticketMap.push({ finding_id: f.id, jira_key: m[1], finding: f });
      }
    }

    // Batch query Jira for ticket statuses (Jira JQL search — up to 100 at a time)
    const allKeys = [...new Set(ticketMap.map((t) => t.jira_key))];
    const statusMap = {}; // { "PROJ-123": { status, resolution, assignee, updated } }

    for (let i = 0; i < allKeys.length; i += 100) {
      const batch = allKeys.slice(i, i + 100);
      const jql = `key in (${batch.map((k) => `"${k}"`).join(",")})`;
      try {
        const searchRes = await fetch(
          `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=status,resolution,assignee,updated,summary`,
          { headers: { Authorization: authHeader, Accept: "application/json" } }
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          for (const issue of searchData.issues || []) {
            statusMap[issue.key] = {
              status: issue.fields.status?.name || 'Unknown',
              resolution: issue.fields.resolution?.name || 'Unresolved',
              assignee: issue.fields.assignee?.displayName || 'Unassigned',
              updated: issue.fields.updated || '',
              summary: issue.fields.summary || '',
            };
          }
        }
      } catch (e) {
        console.error('Jira search batch failed:', e.message);
      }
    }

    // Map Jira statuses to finding statuses
    const mapJiraStatusToFinding = (jiraStatus) => {
      const s = jiraStatus.toLowerCase();
      if (s.includes('done') || s.includes('closed') || s.includes('resolved')) return 'resolved';
      if (s.includes('in progress') || s.includes('development')) return 'in_progress';
      if (s.includes('to do') || s.includes('open') || s.includes('backlog')) return 'open';
      return 'open';
    };

    // Update findings with Jira status
    let synced = 0;
    let updated = 0;
    for (const { finding_id, jira_key, finding } of ticketMap) {
      const jiraInfo = statusMap[jira_key];
      if (!jiraInfo) continue;
      synced++;

      const newStatus = mapJiraStatusToFinding(jiraInfo.status);
      const wasResolved = jiraInfo.resolution && jiraInfo.resolution !== 'Unresolved';

      // Only update if status changed or finding is still open but Jira says resolved
      if (finding.status !== newStatus || (wasResolved && finding.status !== 'resolved')) {
        const updateData = {
          status: newStatus,
          jira_sync_status: jiraInfo.status,
          jira_sync_resolution: jiraInfo.resolution,
          jira_sync_assignee: jiraInfo.assignee,
          jira_sync_updated: jiraInfo.updated,
          jira_synced_at: new Date().toISOString(),
        };

        // If Jira ticket is resolved, mark the finding as resolved too
        if (wasResolved) {
          updateData.status = 'resolved';
          updateData.resolved_date = jiraInfo.updated ? jiraInfo.updated.slice(0, 10) : new Date().toISOString().slice(0, 10);
        }

        try {
          await base44.asServiceRole.entities.SecurityFinding.update(finding_id, updateData);
          updated++;
        } catch (e) {
          console.error(`Failed to update finding ${finding_id}:`, e.message);
        }
      }
    }

    // Also sync RemediationTickets that have Jira references
    let remediationSynced = 0;
    try {
      const tickets = await base44.asServiceRole.entities.RemediationTicketSync.list('-updated_date', 200);
      for (const t of tickets) {
        if (!t.jira_key) continue;
        const jiraInfo = statusMap[t.jira_key];
        if (!jiraInfo) continue;
        remediationSynced++;
        const newStatus = mapJiraStatusToFinding(jiraInfo.status);
        if (t.sync_status !== jiraInfo.status) {
          try {
            await base44.asServiceRole.entities.RemediationTicketSync.update(t.id, {
              sync_status: jiraInfo.status,
              last_sync_at: new Date().toISOString(),
              last_error: jiraInfo.resolution !== 'Unresolved' ? null : (t.last_error || null),
            });
          } catch (e) {
            console.error(`Failed to update remediation ticket ${t.id}:`, e.message);
          }
        }
      }
    } catch (_e) { /* RemediationTicketSync may not exist */ }

    return Response.json({
      ok: true,
      message: `Synced ${synced} findings (${updated} status changes) and ${remediationSynced} remediation tickets from Jira`,
      total_jira_tickets: allKeys.length,
      findings_synced: synced,
      findings_updated: updated,
      remediation_synced: remediationSynced,
      status_map: statusMap,
    });
  } catch (error) {
    console.error('syncJiraTicketStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});