import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth: block authenticated non-privileged users. Allow no-auth (workflow) calls.
    let authUser = null;
    try { authUser = await base44.auth.me(); } catch (_) { authUser = null; }
    if (authUser && !['admin', 'compliance_officer'].includes(authUser.role)) {
      return Response.json({ error: 'Insufficient permissions — only admins or compliance officers may create Jira tickets.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const f = body.finding || {};
    const title = f.title || "Untitled security finding";
    const severity = f.severity || "medium";

    const email = Deno.env.get("JIRA_USER_EMAIL");
    const token = Deno.env.get("JIRA_API_TOKEN");
    const rawBaseUrl = Deno.env.get("JIRA_BASE_URL") || "";
    // Strip any trailing path — users often paste the full board URL (e.g. https://site.atlassian.net/jira/your-work).
    // Keep only the scheme + host (+ optional port).
    const baseUrlMatch = rawBaseUrl.match(/^https?:\/\/[^/]+/i);
    const baseUrl = baseUrlMatch ? baseUrlMatch[0] : rawBaseUrl.replace(/\/$/, "");
    if (!email || !token || !baseUrl) {
      return Response.json(
        { error: "Jira not configured — set JIRA_USER_EMAIL, JIRA_API_TOKEN, and JIRA_BASE_URL secrets" },
        { status: 400 }
      );
    }
    // Validate the base URL looks like a Jira site (https://<site>.atlassian.net or self-hosted https URL).
    if (!/^https:\/\/[a-z0-9-]+(\.atlassian\.net|\.jira\.io)(:\d+)?(\/|$)/i.test(baseUrl) && !/^https:\/\/[a-z0-9.-]+(:\d+)?(\/|$)/i.test(baseUrl)) {
      return Response.json(
        { error: `JIRA_BASE_URL looks invalid — expected your Atlassian site URL (e.g. https://yourcompany.atlassian.net) but got: ${baseUrl}` },
        { status: 400 }
      );
    }

    // Project key: Connection (service=jira) config.project_key, default "SEC"
    let projectKey = "SEC";
    try {
      const conns = await base44.asServiceRole.entities.Connection.filter({ service: "jira" });
      if (conns && conns.length > 0 && conns[0].config) {
        const cfg = JSON.parse(conns[0].config);
        if (cfg.project_key) projectKey = cfg.project_key;
      }
    } catch (_e) { /* ignore */ }

    const lines = [
      "A new high-priority security finding was detected by CertiGuard GRC.",
      "",
      `Severity: ${severity}`,
      f.asset ? `Asset: ${f.asset}` : null,
      f.resource_id ? `Resource: ${f.resource_id}` : null,
      f.cve ? `CVE: ${f.cve}` : null,
      f.source ? `Source: ${f.source}` : null,
      f.detected_date ? `Detected: ${f.detected_date}` : null,
      f.due_date ? `Remediation due: ${f.due_date}` : null,
      f.linked_control_names && f.linked_control_names.length
        ? `Linked controls: ${f.linked_control_names.join(", ")}`
        : null,
      "",
      f.description || "(no description provided)",
    ].filter((l) => l !== null);
    const descText = lines.join("\n");

    const baseFields = {
      project: { key: projectKey },
      summary: `[${severity.toUpperCase()}] ${title}`,
      description: {
        type: "doc",
        version: 1,
        content: [{ type: "paragraph", content: [{ type: "text", text: descText }] }],
      },
      issuetype: { name: "Bug" },
    };

    const authHeader = "Basic " + btoa(`${email}:${token}`);
    const endpoint = `${baseUrl}/rest/api/3/issue`;
    const create = async (fields) => {
      return await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fields }),
      });
    };

    const parseJsonSafe = async (resp) => {
      const text = await resp.text();
      try { return JSON.parse(text); } catch (_e) {
        console.error("Non-JSON response from", endpoint, "status", resp.status, "body:", text.slice(0, 300));
        return null;
      }
    };

    console.log("Jira endpoint:", endpoint, "| email:", email, "| project:", projectKey);

    // First attempt with labels; some projects disallow custom labels — retry without them.
    let resp = await create({ ...baseFields, labels: ["security-finding", `sev-${severity}`] });
    let data = await parseJsonSafe(resp);
    if (!resp.ok || !data) {
      resp = await create(baseFields);
      data = await parseJsonSafe(resp);
    }
    if (!data) {
      return Response.json(
        { error: "Jira returned a non-JSON (likely HTML login) response", status: resp.status, endpoint, body_snippet: "see logs" },
        { status: 502 }
      );
    }
    if (!resp.ok) {
      console.error("Jira issue creation failed:", JSON.stringify(data));
      return Response.json(
        { error: (data.errorMessages && data.errorMessages.join("; ")) || "Jira issue creation failed", details: data },
        { status: 502 }
      );
    }

    const key = data.key;
    const link = `${baseUrl}/browse/${key}`;

    // Stamp the ticket reference back onto the finding
    if (f.id) {
      try {
        const note = `Jira ticket: ${key} — ${link}`;
        const curNotes = f.notes ? `${f.notes}\n` : "";
        await base44.asServiceRole.entities.SecurityFinding.update(f.id, { notes: `${curNotes}${note}` });
      } catch (e) {
        console.error("Failed to update finding with Jira key:", e.message);
      }
    }

    return Response.json({ ok: true, jira_key: key, jira_url: link });
  } catch (error) {
    console.error("createJiraTicketForFinding error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});