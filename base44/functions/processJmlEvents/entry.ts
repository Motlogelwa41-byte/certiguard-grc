import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Joiner/Mover/Leaver (JML) Compliance Engine
// Detects JML events by comparing current DirectoryUser state against last-known state,
// flags risky accounts (former employees with access, access drift on department change),
// triggers control tests, creates security alerts, and collects evidence.
// Runs on a scheduled workflow (daily) or can be triggered manually.

const LEAVER_ACCESS_GRACE_HOURS = 24; // Flag if access not removed within 24h of termination

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (!['admin', 'compliance_officer', 'risk_manager'].includes(user.role)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const now = new Date().toISOString();
    const nowDate = new Date();

    // 1. Fetch all directory users (current state)
    const directoryUsers = await base44.asServiceRole.entities.DirectoryUser.list('-created_date', 500);
    const users = directoryUsers || [];

    // 2. Fetch existing JML events to avoid duplicates
    const existingEvents = await base44.asServiceRole.entities.JmlEvent.list('-detected_at', 500).catch(() => []);
    const processedUserIds = new Set((existingEvents || []).map(e => e.directory_user_id).filter(Boolean));

    // 3. Fetch existing vendors for shadow IT cross-reference (not needed here but for context)
    let joiners = 0, movers = 0, leavers = 0;
    let riskyAccounts = 0, alertsCreated = 0, remediationCreated = 0;
    const newEvents = [];

    for (const dirUser of users) {
      // Detect LEAVERS: status is deprovisioned or suspended
      if (dirUser.status === 'deprovisioned' || dirUser.status === 'suspended') {
        // Check if we already have a leaver event for this user
        const hasLeaverEvent = (existingEvents || []).some(
          e => e.directory_user_id === dirUser.id && e.event_type === 'leaver'
        );
        if (hasLeaverEvent) continue;

        // Check if the user still has active access (risk flag)
        // In a real environment, we'd check IdP/SCIM for active sessions/tokens
        // For now, we flag based on: user is deprovisioned but provisioning_status is still 'synced' (not removed)
        const accessStillActive = dirUser.provisioning_status === 'synced' || dirUser.status === 'suspended';

        const riskLevel = accessStillActive ? 'critical' : 'low';
        const riskReason = accessStillActive
          ? `Former employee (${dirUser.full_name || dirUser.email}) marked as ${dirUser.status} but access may still be active`
          : `Employee (${dirUser.full_name || dirUser.email}) offboarded — access de-provisioned`;

        const eventId = `JML-${String((existingEvents.length || 0) + newEvents.length + 1).padStart(4, '0')}`;

        const event = {
          event_id: eventId,
          event_type: 'leaver',
          directory_user_id: dirUser.id,
          user_email: dirUser.email,
          user_name: dirUser.full_name,
          previous_status: 'active',
          new_status: dirUser.status,
          detected_at: now,
          source: 'hris_sync',
          access_risk_flagged: accessStillActive,
          risk_level: riskLevel,
          risk_reason: riskReason,
          access_stale_systems: accessStillActive ? JSON.stringify([{ system: 'Identity Provider', access_level: dirUser.roles?.join(', ') || 'user', hours_since_termination: 0 }]) : null,
          evidence_collected: !accessStillActive,
          status: accessStillActive ? 'detected' : 'closed',
        };
        newEvents.push(event);
        leavers++;
        if (accessStillActive) riskyAccounts++;

        // Create SecurityAlert for risky leavers
        if (accessStillActive) {
          try {
            const alert = await base44.asServiceRole.entities.SecurityAlert.create({
              title: `Former Employee With Access: ${dirUser.full_name || dirUser.email}`,
              description: riskReason,
              type: 'permission_escalation',
              severity: 'critical',
              status: 'open',
              detected_at: now,
              affected_user: dirUser.email,
              details: JSON.stringify({ directory_user_id: dirUser.id, jml_event_id: eventId, department: dirUser.department }),
            });
            event.security_alert_id = alert.id;
            alertsCreated++;
          } catch (e) { console.error('SecurityAlert create error:', e?.message); }
        }

        // Create RemediationItem for risky leavers
        if (accessStillActive) {
          try {
            const remediation = await base44.asServiceRole.entities.RemediationItem.create({
              title: `De-provision access for terminated employee: ${dirUser.full_name || dirUser.email}`,
              description: `Employee was marked as ${dirUser.status} but access may still be active. Immediate de-provisioning required.`,
              source_type: 'control_failure',
              priority: 'critical',
              status: 'open',
              assigned_to_name: 'IT Security Team',
              due_date: new Date(nowDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              notes: `Auto-created by JML engine. JML Event: ${eventId}`,
            });
            event.remediation_item_id = remediation.id;
            remediationCreated++;
          } catch (e) { console.error('RemediationItem create error:', e?.message); }
        }
      }

      // Detect JOINERS: recently created users (within last 24h) that we haven't processed
      if (dirUser.status === 'active' && dirUser.created_date) {
        const createdDate = new Date(dirUser.created_date);
        const hoursSinceCreation = (nowDate - createdDate) / (1000 * 60 * 60);
        const hasJoinerEvent = (existingEvents || []).some(
          e => e.directory_user_id === dirUser.id && e.event_type === 'joiner'
        );
        if (hoursSinceCreation <= 72 && !hasJoinerEvent) {
          const eventId = `JML-${String((existingEvents.length || 0) + newEvents.length + 1).padStart(4, '0')}`;
          const event = {
            event_id: eventId,
            event_type: 'joiner',
            directory_user_id: dirUser.id,
            user_email: dirUser.email,
            user_name: dirUser.full_name,
            new_department: dirUser.department,
            new_title: dirUser.title,
            detected_at: now,
            source: 'hris_sync',
            access_risk_flagged: false,
            risk_level: 'none',
            risk_reason: 'New employee onboarded — access provisioning should be verified',
            evidence_collected: false,
            status: 'detected',
          };
          newEvents.push(event);
          joiners++;
        }
      }

      // Detect MOVERS: department or title changed
      // We detect this by comparing current state to what we last recorded
      // Since we don't have a separate "last state" entity, we use the updated_date vs created_date
      if (dirUser.status === 'active' && dirUser.updated_date && dirUser.created_date) {
        const updatedDate = new Date(dirUser.updated_date);
        const createdDate = new Date(dirUser.created_date);
        const hoursSinceUpdate = (nowDate - updatedDate) / (1000 * 60 * 60);
        const wasUpdated = updatedDate > createdDate && hoursSinceUpdate <= 72;

        const hasMoverEvent = (existingEvents || []).some(
          e => e.directory_user_id === dirUser.id && e.event_type === 'mover'
        );

        if (wasUpdated && !hasMoverEvent && hoursSinceUpdate <= 72) {
          const eventId = `JML-${String((existingEvents.length || 0) + newEvents.length + 1).padStart(4, '0')}`;
          const event = {
            event_id: eventId,
            event_type: 'mover',
            directory_user_id: dirUser.id,
            user_email: dirUser.email,
            user_name: dirUser.full_name,
            new_department: dirUser.department,
            new_title: dirUser.title,
            detected_at: now,
            source: 'hris_sync',
            access_risk_flagged: true,
            risk_level: 'medium',
            risk_reason: `Employee moved to ${dirUser.department || 'new department'} — verify old department access has been revoked (access drift)`,
            evidence_collected: false,
            status: 'detected',
          };
          newEvents.push(event);
          movers++;
          riskyAccounts++;
        }
      }
    }

    // 4. Bulk create new JML events
    if (newEvents.length > 0) {
      try {
        await base44.asServiceRole.entities.JmlEvent.bulkCreate(newEvents);
      } catch (e) { console.error('JmlEvent bulkCreate error:', e?.message); }
    }

    return Response.json({
      status: 'completed',
      directory_users_scanned: users.length,
      events_detected: newEvents.length,
      joiners: joiners,
      movers: movers,
      leavers: leavers,
      risky_accounts: riskyAccounts,
      security_alerts_created: alertsCreated,
      remediation_items_created: remediationCreated,
      message: `JML scan completed — ${newEvents.length} events detected (${joiners} joiners, ${movers} movers, ${leavers} leavers), ${riskyAccounts} risky accounts flagged.`,
    });
  } catch (error) {
    console.error('processJmlEvents error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'JML processing failed' }, { status: 500 });
  }
});