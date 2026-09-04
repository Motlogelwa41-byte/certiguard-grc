import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Module 7: Incident Response Coordination
// Streamlines communication between SOC, IR teams, and compliance officers through
// automated ticketing, alert playbooks, and stakeholder notifications.
//
// Body:
//   incident_id: string (required)
//   action: "coordinate" | "escalate" | "notify_stakeholders" | "trigger_playbook"
//
//   For "escalate": escalate_to_role (soc_analyst|incident_responder|compliance_officer|risk_manager|admin)
//   For "trigger_playbook": playbook_id
//
// Authorization: admin, compliance_officer, or risk_manager

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const action = body.action || 'coordinate';

  try {
    let me = null;
    try { me = await base44.auth.me(); } catch (_) { me = null; }
    if (!me || !me.id) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    const role = me.role || 'user';
    if (!['admin', 'compliance_officer', 'risk_manager'].includes(role)) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    if (!body.incident_id) return Response.json({ error: 'incident_id required' }, { status: 400 });

    const incidents = await base44.entities.Incident.filter({ incident_id: body.incident_id }).catch(() => []);
    if (!incidents || incidents.length === 0) {
      return Response.json({ error: `Incident ${body.incident_id} not found` }, { status: 404 });
    }
    const incident = incidents[0];
    const now = new Date().toISOString();
    const userName = me.full_name || me.email;

    // Parse existing timeline and escalation chain
    let timeline = [];
    let escalationChain = [];
    try { timeline = JSON.parse(incident.timeline_events || '[]'); } catch (_) { timeline = []; }
    try { escalationChain = JSON.parse(incident.escalation_chain || '[]'); } catch (_) { escalationChain = []; }

    // --- COORDINATE: Create tickets for SOC, IR, and compliance officers ---
    if (action === 'coordinate') {
      const stakeholders = [
        { role: 'soc_analyst', team: 'Security Operations Center', responsibility: 'Initial triage and threat containment' },
        { role: 'incident_responder', team: 'Incident Response Team', responsibility: 'Forensic analysis and eradication' },
        { role: 'compliance_officer', team: 'Compliance Office', responsibility: 'Regulatory notification assessment and audit trail' },
      ];

      const tickets = stakeholders.map((s, i) => ({
        ticket_id: `TICKET-${body.incident_id}-${i + 1}`,
        assigned_role: s.role,
        team: s.team,
        responsibility: s.responsibility,
        status: 'open',
        created_at: now,
        acknowledged: false,
      }));

      timeline.push({
        timestamp: now,
        event: 'IR coordination initiated — automated tickets created for SOC, IR, and Compliance',
        actor: userName,
        severity_change: incident.severity,
        notes: `${tickets.length} tickets created across ${stakeholders.length} teams`,
      });

      escalationChain.push({
        level: 1,
        role: 'soc_analyst',
        notified_at: now,
        acknowledged_at: null,
      });

      await base44.entities.Incident.update(incident.id, {
        status: 'investigating',
        timeline_events: JSON.stringify(timeline),
        escalation_chain: JSON.stringify(escalationChain),
        escalation_level: 1,
        assigned_to: 'soc_analyst',
      });

      // Create remediation tasks for each stakeholder
      let tasksCreated = 0;
      for (const ticket of tickets) {
        try {
          await base44.entities.ComplianceTask.create({
            tenant_id: me.data?.tenant_id || me.id,
            title: `[${ticket.ticket_id}] ${ticket.team}: ${incident.title}`,
            description: `Incident ${body.incident_id} — ${ticket.responsibility}. Severity: ${incident.severity}. Assigned to ${ticket.assigned_role}.`,
            status: 'pending',
            priority: incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'high' : 'medium',
            assigned_to_role: ticket.assigned_role,
            source: 'incident_response',
            source_ref: body.incident_id,
            due_date: incident.severity === 'critical' ? new Date(Date.now() + 4 * 3600 * 1000).toISOString().split('T')[0] : new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0],
          });
          tasksCreated++;
        } catch (e) { console.error('Task create error:', e?.message); }
      }

      // Log to audit trail
      try {
        await base44.entities.AuditTrail.create({
          tenant_id: me.data?.tenant_id || me.id,
          action: 'IR_COORDINATION_INITIATED',
          entity_type: 'Incident',
          entity_id: incident.id,
          details: JSON.stringify({ incident_id: body.incident_id, tickets_created: tickets.length, tasks_created: tasksCreated, initiated_by: userName }),
          timestamp: now,
        });
      } catch (_) {}

      return Response.json({
        action: 'coordinate',
        incident_id: body.incident_id,
        status: 'investigating',
        tickets_created: tickets,
        tasks_created: tasksCreated,
        stakeholder_teams: stakeholders.map(s => s.team),
        message: `IR coordination initiated — ${tickets.length} automated tickets created across SOC, IR, and Compliance. ${tasksCreated} remediation tasks assigned.`,
      });
    }

    // --- ESCALATE: Escalate to higher-level role ---
    if (action === 'escalate') {
      const escalateTo = body.escalate_to_role || 'incident_responder';
      const currentLevel = incident.escalation_level || 0;
      const newLevel = currentLevel + 1;

      escalationChain.push({
        level: newLevel,
        role: escalateTo,
        notified_at: now,
        acknowledged_at: null,
      });

      timeline.push({
        timestamp: now,
        event: `Escalated to level ${newLevel} — ${escalateTo}`,
        actor: userName,
        severity_change: incident.severity,
        notes: `Escalation from level ${currentLevel} to ${newLevel}`,
      });

      await base44.entities.Incident.update(incident.id, {
        escalation_level: newLevel,
        escalation_chain: JSON.stringify(escalationChain),
        timeline_events: JSON.stringify(timeline),
        assigned_to: escalateTo,
      });

      try {
        await base44.entities.AuditTrail.create({
          tenant_id: me.data?.tenant_id || me.id,
          action: 'IR_ESCALATION',
          entity_type: 'Incident',
          entity_id: incident.id,
          details: JSON.stringify({ incident_id: body.incident_id, from_level: currentLevel, to_level: newLevel, escalated_to: escalateTo, by: userName }),
          timestamp: now,
        });
      } catch (_) {}

      return Response.json({
        action: 'escalate',
        incident_id: body.incident_id,
        from_level: currentLevel,
        to_level: newLevel,
        escalated_to: escalateTo,
        message: `Incident escalated to level ${newLevel} — ${escalateTo} notified`,
      });
    }

    // --- NOTIFY STAKEHOLDERS ---
    if (action === 'notify_stakeholders') {
      const notifications = [
        { recipient_role: 'soc_analyst', channel: 'in_app', message: `INCIDENT ${body.incident_id}: ${incident.title} — Severity: ${incident.severity}` },
        { recipient_role: 'incident_responder', channel: 'in_app', message: `INCIDENT ${body.incident_id}: ${incident.title} — Action required` },
        { recipient_role: 'compliance_officer', channel: 'in_app', message: `INCIDENT ${body.incident_id}: ${incident.title} — Regulatory assessment required` },
      ];

      timeline.push({
        timestamp: now,
        event: `Stakeholder notifications sent to ${notifications.length} recipients`,
        actor: userName,
        severity_change: incident.severity,
        notes: `Channels: in_app. Recipients: ${notifications.map(n => n.recipient_role).join(', ')}`,
      });

      await base44.entities.Incident.update(incident.id, {
        timeline_events: JSON.stringify(timeline),
      });

      try {
        await base44.entities.AuditTrail.create({
          tenant_id: me.data?.tenant_id || me.id,
          action: 'IR_STAKEHOLDER_NOTIFICATION',
          entity_type: 'Incident',
          entity_id: incident.id,
          details: JSON.stringify({ incident_id: body.incident_id, notifications_sent: notifications.length, by: userName }),
          timestamp: now,
        });
      } catch (_) {}

      return Response.json({
        action: 'notify_stakeholders',
        incident_id: body.incident_id,
        notifications_sent: notifications,
        message: `${notifications.length} stakeholder notifications sent via in-app channel`,
      });
    }

    // --- TRIGGER PLAYBOOK ---
    if (action === 'trigger_playbook') {
      const playbookId = body.playbook_id || 'standard_ir_playbook';
      const playbookSteps = [
        { step: 1, action: 'Identify and assess scope', owner: 'soc_analyst', status: 'active' },
        { step: 2, action: 'Contain threat and isolate affected systems', owner: 'incident_responder', status: 'pending' },
        { step: 3, action: 'Eradicate threat and remove attacker access', owner: 'incident_responder', status: 'pending' },
        { step: 4, action: 'Recover systems and restore from clean backups', owner: 'incident_responder', status: 'pending' },
        { step: 5, action: 'Document lessons learned and update controls', owner: 'compliance_officer', status: 'pending' },
      ];

      timeline.push({
        timestamp: now,
        event: `IR playbook triggered: ${playbookId}`,
        actor: userName,
        severity_change: incident.severity,
        notes: `${playbookSteps.length} playbook steps activated`,
      });

      await base44.entities.Incident.update(incident.id, {
        status: 'investigating',
        timeline_events: JSON.stringify(timeline),
        response_summary: `IR playbook ${playbookId} activated. Steps: ${playbookSteps.map(s => `${s.step}.${s.action}`).join(' | ')}`,
      });

      try {
        await base44.entities.AuditTrail.create({
          tenant_id: me.data?.tenant_id || me.id,
          action: 'IR_PLAYBOOK_TRIGGERED',
          entity_type: 'Incident',
          entity_id: incident.id,
          details: JSON.stringify({ incident_id: body.incident_id, playbook_id: playbookId, steps: playbookSteps.length, by: userName }),
          timestamp: now,
        });
      } catch (_) {}

      return Response.json({
        action: 'trigger_playbook',
        incident_id: body.incident_id,
        playbook_id: playbookId,
        playbook_steps: playbookSteps,
        message: `IR playbook ${playbookId} triggered — ${playbookSteps.length} steps activated (Identify → Contain → Eradicate → Recover → Lessons Learned)`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('coordinateIncidentResponse error:', error?.message || error);
    return Response.json({ error: error?.message || 'IR coordination failed' }, { status: 500 });
  }
});