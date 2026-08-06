import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// IR Playbook Executor — executes NIST 800-61 playbook steps for an incident.
// Accepts { incident_id, playbook_type }
// Creates ComplianceTask records for each step, updates incident status, and sends alerts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { incident_id, playbook_type } = body;
    if (!incident_id || !playbook_type) {
      return Response.json({ error: 'incident_id and playbook_type are required' }, { status: 400 });
    }

    // Load the incident
    const incident = await base44.entities.Incident.get(incident_id).catch(() => null);
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 });

    // NIST 800-61 playbook definitions (mirrored from frontend irPlaybooks.js)
    const playbooks = {
      ransomware: [
        { phase: "Detection & Analysis", action: "Isolate affected endpoints via EDR", sla: 0.5 },
        { phase: "Detection & Analysis", action: "Quarantine encrypted systems from network", sla: 1 },
        { phase: "Detection & Analysis", action: "Preserve forensic evidence (memory + disk images)", sla: 2 },
        { phase: "Containment", action: "Identify and block C2 domains/IPs at firewall", sla: 2 },
        { phase: "Containment", action: "Disable compromised user accounts", sla: 1 },
        { phase: "Containment", action: "Revoke active sessions for affected users", sla: 1 },
        { phase: "Eradication", action: "Scan all endpoints for ransomware payload", sla: 4 },
        { phase: "Eradication", action: "Patch exploited vulnerability (entry vector)", sla: 24 },
        { phase: "Recovery", action: "Restore systems from clean backup", sla: 8 },
        { phase: "Recovery", action: "Verify system integrity post-restore", sla: 4 },
        { phase: "Post-Incident", action: "Generate after-action report", sla: 72 },
        { phase: "Post-Incident", action: "Update IR plan with lessons learned", sla: 168 },
      ],
      data_breach: [
        { phase: "Detection & Analysis", action: "Identify scope of exposed data (records, types)", sla: 2 },
        { phase: "Detection & Analysis", action: "Identify attack vector and entry point", sla: 4 },
        { phase: "Containment", action: "Revoke compromised credentials and API keys", sla: 1 },
        { phase: "Containment", action: "Block exfiltration channels (firewall/DLP)", sla: 2 },
        { phase: "Containment", action: "Preserve evidence (logs, access records)", sla: 4 },
        { phase: "Notification", action: "Assess regulatory notification requirements (72h GDPR)", sla: 24 },
        { phase: "Notification", action: "Notify DPO and legal counsel", sla: 4 },
        { phase: "Notification", action: "Prepare regulator notification (if required)", sla: 48 },
        { phase: "Notification", action: "Prepare affected individual notification", sla: 72 },
        { phase: "Eradication", action: "Close attack vector and patch systems", sla: 24 },
        { phase: "Recovery", action: "Restore affected systems from backup", sla: 8 },
        { phase: "Post-Incident", action: "Generate breach impact report", sla: 168 },
        { phase: "Post-Incident", action: "Update data protection controls", sla: 168 },
      ],
      phishing: [
        { phase: "Detection & Analysis", action: "Identify all recipients of phishing email", sla: 1 },
        { phase: "Detection & Analysis", action: "Analyze phishing payload (URLs, attachments)", sla: 2 },
        { phase: "Containment", action: "Remove phishing emails from all mailboxes", sla: 1 },
        { phase: "Containment", action: "Block sender domain and phishing URLs", sla: 1 },
        { phase: "Containment", action: "Identify users who clicked (from logs)", sla: 2 },
        { phase: "Containment", action: "Force password reset for affected users", sla: 2 },
        { phase: "Containment", action: "Revoke active sessions for affected users", sla: 1 },
        { phase: "Containment", action: "Enable MFA for affected users (if not enrolled)", sla: 4 },
        { phase: "Eradication", action: "Scan affected endpoints for malware", sla: 4 },
        { phase: "Recovery", action: "Send targeted phishing awareness to affected users", sla: 24 },
        { phase: "Post-Incident", action: "Add IOCs to threat intelligence blocklist", sla: 24 },
        { phase: "Post-Incident", action: "Generate phishing incident summary", sla: 72 },
      ],
      ddos: [
        { phase: "Detection & Analysis", action: "Confirm DDoS attack (traffic analysis)", sla: 0.5 },
        { phase: "Detection & Analysis", action: "Identify attack vector (volumetric, protocol, app)", sla: 1 },
        { phase: "Containment", action: "Activate DDoS protection (Shield/Cloudflare)", sla: 0.5 },
        { phase: "Containment", action: "Enable rate limiting on affected services", sla: 1 },
        { phase: "Containment", action: "Block attacker IP ranges at edge", sla: 1 },
        { phase: "Containment", action: "Scale resources to absorb attack", sla: 1 },
        { phase: "Eradication", action: "Work with ISP for upstream filtering", sla: 4 },
        { phase: "Recovery", action: "Monitor traffic and verify service restoration", sla: 2 },
        { phase: "Recovery", action: "Gradually remove mitigation rules", sla: 4 },
        { phase: "Post-Incident", action: "Generate DDoS impact and mitigation report", sla: 72 },
      ],
      insider_threat: [
        { phase: "Detection & Analysis", action: "Confirm insider threat indicator (UEBA/alert)", sla: 1 },
        { phase: "Detection & Analysis", action: "Assess data access and exfiltration scope", sla: 4 },
        { phase: "Containment", action: "Suspend user account and access", sla: 1 },
        { phase: "Containment", action: "Revoke all sessions and API tokens", sla: 0.5 },
        { phase: "Containment", action: "Quarantine user's endpoint(s)", sla: 1 },
        { phase: "Containment", action: "Preserve forensic evidence (logs, files, emails)", sla: 4 },
        { phase: "Containment", action: "Notify HR and legal counsel", sla: 2 },
        { phase: "Eradication", action: "Review all recent changes by the user", sla: 8 },
        { phase: "Eradication", action: "Identify and close any backdoor access", sla: 4 },
        { phase: "Recovery", action: "Restore any tampered data from backup", sla: 8 },
        { phase: "Post-Incident", action: "Generate insider threat investigation report", sla: 168 },
        { phase: "Post-Incident", action: "Update access controls and monitoring rules", sla: 168 },
      ],
      malware: [
        { phase: "Detection & Analysis", action: "Confirm malware detection (EDR/AV alert)", sla: 0.5 },
        { phase: "Detection & Analysis", action: "Identify malware type and IOCs", sla: 2 },
        { phase: "Containment", action: "Isolate infected endpoint via EDR", sla: 0.5 },
        { phase: "Containment", action: "Block malware C2 and IOCs at network", sla: 1 },
        { phase: "Containment", action: "Identify other potentially infected hosts", sla: 2 },
        { phase: "Eradication", action: "Run full EDR scan on all endpoints", sla: 4 },
        { phase: "Eradication", action: "Remove malware and persistence mechanisms", sla: 2 },
        { phase: "Eradication", action: "Patch exploited vulnerability", sla: 24 },
        { phase: "Recovery", action: "Rebuild endpoint from clean image (if needed)", sla: 4 },
        { phase: "Recovery", action: "Verify endpoint integrity before reconnecting", sla: 2 },
        { phase: "Post-Incident", action: "Add IOCs to threat intelligence blocklist", sla: 24 },
        { phase: "Post-Incident", action: "Generate malware incident summary", sla: 72 },
      ],
      unauthorized_access: [
        { phase: "Detection & Analysis", action: "Confirm unauthorized access attempt", sla: 1 },
        { phase: "Detection & Analysis", action: "Identify source IP and attack vector", sla: 2 },
        { phase: "Containment", action: "Block source IP at firewall/WAF", sla: 1 },
        { phase: "Containment", action: "Revoke compromised credentials", sla: 1 },
        { phase: "Containment", action: "Force password reset for affected accounts", sla: 1 },
        { phase: "Containment", action: "Enable MFA if not already enabled", sla: 2 },
        { phase: "Eradication", action: "Review access logs for lateral movement", sla: 4 },
        { phase: "Eradication", action: "Close exploited vulnerability", sla: 24 },
        { phase: "Recovery", action: "Verify no persistent backdoor access", sla: 4 },
        { phase: "Post-Incident", action: "Generate unauthorized access report", sla: 72 },
      ],
    };

    const playbook = playbooks[playbook_type];
    if (!playbook) return Response.json({ error: `Unknown playbook type: ${playbook_type}` }, { status: 400 });

    // Create a ComplianceTask for each playbook step
    const now = new Date();
    const tasksCreated = [];
    for (let i = 0; i < playbook.length; i++) {
      const step = playbook[i];
      const dueDate = new Date(now.getTime() + step.sla * 3600000).toISOString().slice(0, 10);
      const priority = step.phase === "Containment" || step.phase === "Detection & Analysis" ? "critical" : step.phase === "Eradication" ? "high" : "medium";

      const task = await base44.entities.ComplianceTask.create({
        title: `[${step.phase}] ${step.action}`,
        description: `IR Playbook (${playbook_type}) step ${i + 1}/${playbook.length} for incident: ${incident.title}. SLA: ${step.sla}h.`,
        type: "remediation",
        status: "todo",
        priority,
        assignee_name: incident.assigned_to || "",
        due_date: dueDate,
        notes: `Playbook: ${playbook_type} | Phase: ${step.phase} | SLA: ${step.sla}h | Incident: ${incident.incident_id || incident.id}`,
      }).catch((e) => { console.error(`Task create failed: ${e.message}`); return null; });

      if (task) tasksCreated.push(task);
    }

    // Update incident status to investigating and add playbook to timeline
    const timelineEvent = {
      timestamp: now.toISOString(),
      event: `IR Playbook '${playbook_type}' activated — ${playbook.length} steps queued as remediation tasks`,
      actor: user.full_name || user.email,
      severity_change: null,
      notes: `Tasks created: ${tasksCreated.length}`,
    };

    const existingTimeline = incident.timeline_events ? (() => { try { return JSON.parse(incident.timeline_events); } catch { return []; } })() : [];
    existingTimeline.push(timelineEvent);

    await base44.entities.Incident.update(incident_id, {
      status: incident.status === "detected" ? "investigating" : incident.status,
      timeline_events: JSON.stringify(existingTimeline),
      escalation_level: Math.max(incident.escalation_level || 0, 2),
    }).catch(() => {});

    // Send Slack alert if configured
    try {
      await base44.functions.invoke("sendSlackAlert", {
        message: `🚨 IR Playbook Activated: ${playbook_type} for incident "${incident.title}". ${tasksCreated.length} remediation tasks created.`,
        severity: "critical",
      }).catch(() => {});
    } catch {}

    return Response.json({
      status: "completed",
      incident_id,
      playbook_type,
      stepsQueued: tasksCreated.length,
      totalSteps: playbook.length,
      tasks: tasksCreated.map(t => ({ id: t.id, title: t.title, priority: t.priority, due_date: t.due_date })),
      timelineUpdated: true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}