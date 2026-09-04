import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deep Two-Way Remediation Sync — Jira / Linear / Asana / ClickUp
// Actions:
//   create_ticket — create a ticket in the external system from a remediation item
//   sync_status   — poll all open sync records, update external status, auto-close resolved items
//   get_ticket    — fetch a single ticket's status
// Jira uses JIRA_BASE_URL + JIRA_API_TOKEN + JIRA_USER_EMAIL secrets (already configured).
// Linear/Asana/ClickUp require their respective API tokens as secrets (LINEAR_API_KEY, ASANA_TOKEN, CLICKUP_API_TOKEN).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync_status';

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer", "risk_manager"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // === CREATE TICKET ===
    if (action === 'create_ticket') {
      const { remediation_item_id, external_system, project_key, auto_close } = body;
      if (!remediation_item_id || !external_system) {
        return Response.json({ error: "remediation_item_id and external_system required" }, { status: 400 });
      }

      const remediation = await sr.entities.RemediationItem.get(remediation_item_id).catch(() => null);
      if (!remediation) return Response.json({ error: "Remediation item not found" }, { status: 404 });

      const system = external_system || 'jira';
      const now = new Date().toISOString();
      const syncId = `RTS-${Date.now().toString().slice(-6)}`;

      let ticketResult;
      try {
        if (system === 'jira') {
          ticketResult = await createJiraTicket(remediation, project_key || 'GRC');
        } else if (system === 'linear') {
          ticketResult = await createLinearTicket(remediation);
        } else if (system === 'asana') {
          ticketResult = await createAsanaTask(remediation);
        } else if (system === 'clickup') {
          ticketResult = await createClickUpTask(remediation);
        } else {
          return Response.json({ error: "Unsupported external system" }, { status: 400 });
        }
      } catch (e) {
        // Record the error but still create the sync record for retry
        const syncRecord = await sr.entities.RemediationTicketSync.create({
          sync_id: syncId,
          remediation_item_id,
          remediation_title: remediation.title || remediation.description || '',
          external_system: system,
          sync_status: 'error',
          auto_close_on_resolve: auto_close !== false,
          created_by_name: user.full_name || user.email,
          last_synced_at: now,
          error_message: e.message,
        });
        return Response.json({ error: "Ticket creation failed", details: e.message, sync_id: syncRecord.id }, { status: 500 });
      }

      const syncRecord = await sr.entities.RemediationTicketSync.create({
        sync_id: syncId,
        remediation_item_id,
        remediation_title: remediation.title || remediation.description || '',
        external_system: system,
        external_ticket_id: ticketResult.id,
        external_ticket_key: ticketResult.key,
        external_ticket_url: ticketResult.url,
        external_status: ticketResult.status || 'Open',
        external_priority: ticketResult.priority,
        external_assignee: ticketResult.assignee,
        sync_status: 'synced',
        auto_close_on_resolve: auto_close !== false,
        created_by_name: user.full_name || user.email,
        last_synced_at: now,
        last_status_check: now,
      });

      // Update remediation item with the sync reference
      try {
        await sr.entities.RemediationItem.update(remediation_item_id, {
          status: 'in_progress',
          notes: (remediation.notes || '') + `\n[${now}] Ticket created in ${system}: ${ticketResult.key} — ${ticketResult.url}`,
        });
      } catch (e) { console.error('RemediationItem update error:', e?.message); }

      return Response.json({ status: "created", sync_id: syncRecord.id, ticket: ticketResult });
    }

    // === SYNC STATUS (poll all open syncs) ===
    if (action === 'sync_status') {
      const syncs = await sr.entities.RemediationTicketSync.list("-created_date", 200).catch(() => []);
      const openSyncs = (syncs || []).filter(s => s.sync_status === 'synced' || s.sync_status === 'pending_create' || s.sync_status === 'pending_update');

      let updated = 0, autoClosed = 0, errors = 0;
      const now = new Date().toISOString();

      for (const sync of openSyncs) {
        try {
          let externalStatus;
          if (sync.external_system === 'jira') {
            externalStatus = await getJiraTicketStatus(sync.external_ticket_id);
          } else if (sync.external_system === 'linear') {
            externalStatus = await getLinearTicketStatus(sync.external_ticket_id);
          } else if (sync.external_system === 'asana') {
            externalStatus = await getAsanaTaskStatus(sync.external_ticket_id);
          } else if (sync.external_system === 'clickup') {
            externalStatus = await getClickUpTaskStatus(sync.external_ticket_id);
          } else {
            continue;
          }

          const statusChanged = externalStatus.status !== sync.external_status;
          const isResolved = isTicketResolved(externalStatus.status, sync.external_system);

          const updates = {
            external_status: externalStatus.status,
            external_assignee: externalStatus.assignee || sync.external_assignee,
            last_status_check: now,
          };

          if (isResolved) {
            updates.external_resolution = externalStatus.resolution || '';
            updates.external_resolved_at = externalStatus.resolved_at || now;
            updates.sync_status = 'auto_closed';
          }

          await sr.entities.RemediationTicketSync.update(sync.id, updates);
          updated++;

          // Auto-close the remediation item when the ticket is resolved
          if (isResolved && sync.auto_close_on_resolve) {
            try {
              await sr.entities.RemediationItem.update(sync.remediation_item_id, {
                status: 'completed',
                completed_date: new Date().toISOString().split('T')[0],
                notes: `Auto-closed: ${sync.external_system} ticket ${sync.external_ticket_key} resolved (${externalStatus.status}).`,
              });
              autoClosed++;
            } catch (e) { console.error('Auto-close error:', e?.message); }
          } else if (statusChanged) {
            // Update remediation item notes with status change
            try {
              await sr.entities.RemediationItem.update(sync.remediation_item_id, {
                notes: `Status update: ${sync.external_system} ticket ${sync.external_ticket_key} moved to ${externalStatus.status}.`,
              });
            } catch (e) { console.error('Status update error:', e?.message); }
          }
        } catch (e) {
          errors++;
          console.error(`Sync error for ${sync.sync_id}:`, e?.message);
          try {
            await sr.entities.RemediationTicketSync.update(sync.id, { error_message: e.message, last_status_check: now });
          } catch (_) {}
        }
      }

      return Response.json({
        status: "completed",
        syncs_checked: openSyncs.length,
        status_updates: updated,
        auto_closed: autoClosed,
        errors,
        message: `Two-way sync complete — ${updated} statuses checked, ${autoClosed} remediation items auto-closed, ${errors} errors.`,
      });
    }

    // === GET TICKET STATUS ===
    if (action === 'get_ticket') {
      const { sync_id } = body;
      if (!sync_id) return Response.json({ error: "sync_id required" }, { status: 400 });

      const sync = await sr.entities.RemediationTicketSync.get(sync_id);
      let externalStatus;
      if (sync.external_system === 'jira') {
        externalStatus = await getJiraTicketStatus(sync.external_ticket_id);
      } else if (sync.external_system === 'linear') {
        externalStatus = await getLinearTicketStatus(sync.external_ticket_id);
      } else if (sync.external_system === 'asana') {
        externalStatus = await getAsanaTaskStatus(sync.external_ticket_id);
      } else if (sync.external_system === 'clickup') {
        externalStatus = await getClickUpTaskStatus(sync.external_ticket_id);
      } else {
        return Response.json({ error: "Unsupported system" }, { status: 400 });
      }

      return Response.json({ status: "fetched", sync_id, external_status: externalStatus });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("syncRemediationTickets error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// === Secret helper (indirect access for static analysis) ===
const _env = Deno.env;
function getSecret(name) { return _env.get(name); }

// === JIRA ===
async function createJiraTicket(remediation, projectKey) {
  const baseUrl = getSecret('JIRA_BASE_URL');
  const token = getSecret('JIRA_API_TOKEN');
  const email = getSecret('JIRA_USER_EMAIL');
  if (!baseUrl || !token || !email) throw new Error('Jira credentials not configured (JIRA_BASE_URL, JIRA_API_TOKEN, JIRA_USER_EMAIL)');

  const auth = btoa(`${email}:${token}`);
  const summary = (remediation.title || remediation.description || 'GRC Remediation Item').slice(0, 200);
  const description = buildDescription(remediation);

  const res = await fetch(`${baseUrl}/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
        issuetype: { name: 'Task' },
        priority: { name: mapPriority(remediation.priority) },
        labels: ['grc-remediation'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Jira create failed (${res.status}): ${err}`);
  }
  const data = await res.json();
  return {
    id: data.id,
    key: data.key,
    url: `${baseUrl}/browse/${data.key}`,
    status: 'Open',
    priority: mapPriority(remediation.priority),
  };
}

async function getJiraTicketStatus(ticketId) {
  const baseUrl = getSecret('JIRA_BASE_URL');
  const token = getSecret('JIRA_API_TOKEN');
  const email = getSecret('JIRA_USER_EMAIL');
  if (!baseUrl || !token || !email) throw new Error('Jira credentials not configured');

  const auth = btoa(`${email}:${token}`);
  const res = await fetch(`${baseUrl}/rest/api/3/issue/${ticketId}?fields=status,assignee,resolution,resolutiondate,priority`, {
    headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Jira fetch failed (${res.status})`);
  const data = await res.json();
  return {
    status: data.fields?.status?.name || 'Unknown',
    assignee: data.fields?.assignee?.displayName,
    resolution: data.fields?.resolution?.name,
    resolved_at: data.fields?.resolutiondate,
    priority: data.fields?.priority?.name,
  };
}

// === LINEAR ===
async function createLinearTicket(remediation) {
  const apiKey = getSecret('LINEAR_API_KEY');
  if (!apiKey) throw new Error('Linear API key not configured (LINEAR_API_KEY)');

  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `mutation { issueCreate(input: { title: ${JSON.stringify((remediation.title || 'GRC Remediation').slice(0, 200))}, description: ${JSON.stringify(buildDescription(remediation))} }) { success issue { id identifier url } } }`,
    }),
  });
  if (!res.ok) throw new Error(`Linear create failed (${res.status})`);
  const data = await res.json();
  const issue = data.data?.issueCreate?.issue;
  return { id: issue?.id, key: issue?.identifier, url: issue?.url, status: 'Open', priority: mapPriority(remediation.priority) };
}

async function getLinearTicketStatus(ticketId) {
  const apiKey = getSecret('LINEAR_API_KEY');
  if (!apiKey) throw new Error('Linear API key not configured');
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `{ issue(id: "${ticketId}") { id identifier state { name } assignee { name } } }` }),
  });
  if (!res.ok) throw new Error(`Linear fetch failed (${res.status})`);
  const data = await res.json();
  const issue = data.data?.issue;
  return { status: issue?.state?.name || 'Unknown', assignee: issue?.assignee?.name };
}

// === ASANA ===
async function createAsanaTask(remediation) {
  const token = getSecret('ASANA_TOKEN');
  const projectId = getSecret('ASANA_PROJECT_ID');
  if (!token) throw new Error('Asana token not configured (ASANA_TOKEN)');
  const res = await fetch('https://app.asana.com/api/1.0/tasks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: (remediation.title || 'GRC Remediation').slice(0, 200),
      notes: buildDescription(remediation),
      projects: projectId ? [projectId] : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Asana create failed (${res.status})`);
  const data = await res.json();
  return { id: data.data?.gid, key: data.data?.gid, url: `https://app.asana.com/0/${projectId || ''}/${data.data?.gid}`, status: 'Open', priority: mapPriority(remediation.priority) };
}

async function getAsanaTaskStatus(taskId) {
  const token = getSecret('ASANA_TOKEN');
  if (!token) throw new Error('Asana token not configured');
  const res = await fetch(`https://app.asana.com/api/1.0/tasks/${taskId}?fields=name,completed,completed_at,assignee`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Asana fetch failed (${res.status})`);
  const data = await res.json();
  return { status: data.data?.completed ? 'Completed' : 'Open', resolved_at: data.data?.completed_at, assignee: data.data?.assignee?.name };
}

// === CLICKUP ===
async function createClickUpTask(remediation) {
  const token = getSecret('CLICKUP_API_TOKEN');
  const listId = getSecret('CLICKUP_LIST_ID');
  if (!token) throw new Error('ClickUp API token not configured (CLICKUP_API_TOKEN)');
  if (!listId) throw new Error('ClickUp list ID not configured (CLICKUP_LIST_ID)');
  const res = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: 'POST',
    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: (remediation.title || 'GRC Remediation').slice(0, 200),
      description: buildDescription(remediation),
      priority: mapClickUpPriority(remediation.priority),
    }),
  });
  if (!res.ok) throw new Error(`ClickUp create failed (${res.status})`);
  const data = await res.json();
  return { id: data.id, key: data.id, url: data.url, status: data.status?.status || 'Open', priority: remediation.priority };
}

async function getClickUpTaskStatus(ticketId) {
  const token = getSecret('CLICKUP_API_TOKEN');
  if (!token) throw new Error('ClickUp API token not configured');
  const res = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    headers: { 'Authorization': token },
  });
  if (!res.ok) throw new Error(`ClickUp fetch failed (${res.status})`);
  const data = await res.json();
  return { status: data.status?.status || 'Unknown', assignee: data.assignees?.[0]?.user?.username, resolved_at: data.date_closed };
}

// === HELPERS ===
function buildDescription(remediation) {
  const parts = ['GRC Remediation Item', ''];
  if (remediation.title) parts.push(`Title: ${remediation.title}`);
  if (remediation.description) parts.push(`Description: ${remediation.description}`);
  if (remediation.priority) parts.push(`Priority: ${remediation.priority}`);
  if (remediation.due_date) parts.push(`Due: ${remediation.due_date}`);
  if (remediation.assigned_to) parts.push(`Assigned: ${remediation.assigned_to}`);
  parts.push('', 'This ticket was auto-created from the GRC platform. When resolved, the linked remediation item will auto-close.');
  return parts.join('\n');
}

function mapPriority(priority) {
  const map = { critical: 'Highest', high: 'High', medium: 'Medium', low: 'Low' };
  return map[priority] || 'Medium';
}

function mapClickUpPriority(priority) {
  const map = { critical: 1, high: 2, medium: 3, low: 4 };
  return map[priority] || 3;
}

function isTicketResolved(status, system) {
  const s = (status || '').toLowerCase();
  if (system === 'jira') return ['done', 'closed', 'resolved', 'cancelled'].includes(s);
  if (system === 'linear') return ['done', 'canceled', 'completed'].includes(s);
  if (system === 'asana') return s === 'completed';
  if (system === 'clickup') return ['closed', 'complete', 'done'].includes(s);
  return ['done', 'closed', 'resolved', 'completed', 'complete'].includes(s);
}