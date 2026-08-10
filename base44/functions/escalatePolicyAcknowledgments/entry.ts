import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Escalates unacknowledged policies. For each published policy with acknowledgment_required,
// finds users who haven't attested. Escalation tiers:
//   - 7+ days overdue: first reminder email to employee
//   - 14+ days overdue: escalation email to employee + create a high-priority ComplianceTask
//   - 21+ days overdue: flag for access block — create a SecurityAlert and Slack-notify so
//     the training gate / access review can suspend the user's access
// Runs daily via the "Policy Acknowledgment Escalation Scanner" workflow.

const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const policies = await sr.entities.Policy.list("-published_at", 500).catch(() => []);
    const published = (policies || []).filter((p) =>
      (p.status === "published" || p.status === "approved") && p.acknowledgment_required !== false && p.published_at
    );

    const users = await sr.entities.User.list().catch(() => []);
    const attestations = await sr.entities.PolicyAttestation.list("-signed_at", 1000).catch(() => []);

    // Index attestations by policy_id + employee_id
    const ackIndex = new Set();
    for (const a of attestations || []) {
      ackIndex.add(`${a.policy_id}|${a.employee_id}`);
    }

    let reminders = 0, escalations = 0, accessBlocks = 0;
    const byTenant = {};

    for (const policy of published) {
      const publishedAt = new Date(policy.published_at).getTime();
      const daysOverdue = Math.floor((now - publishedAt) / DAY_MS);

      for (const u of users || []) {
        const tid = u.tenant_id || u.data?.tenant_id;
        // Skip admins — they don't need to acknowledge operational policies
        if (u.role === "admin") continue;
        if (ackIndex.has(`${policy.id}|${u.id}`)) continue;

        const tier = daysOverdue >= 21 ? "block" : daysOverdue >= 14 ? "escalate" : daysOverdue >= 7 ? "remind" : null;
        if (!tier) continue;

        byTenant[tid] = byTenant[tid] || { reminders: 0, escalations: 0, accessBlocks: 0 };

        if (tier === "remind") {
          try {
            await base44.integrations.Core.SendEmail({
              to: u.email,
              subject: `Reminder: Acknowledge policy "${policy.title}"`,
              body: `Hi ${u.full_name || u.email},\n\nThis is a reminder that you have not yet acknowledged the policy "${policy.title}" (v${policy.version || "1.0"}), which was published on ${new Date(policy.published_at).toLocaleDateString()}.\n\nPlease log in to the GRC platform and acknowledge this policy at your earliest convenience.\n\n— GRC Platform`,
            });
            reminders++; byTenant[tid].reminders++;
          } catch (_) { /* email best-effort */ }
        }

        if (tier === "escalate") {
          try {
            await base44.integrations.Core.SendEmail({
              to: u.email,
              subject: `ESCALATION: Policy "${policy.title}" acknowledgment overdue (${daysOverdue} days)`,
              body: `Hi ${u.full_name || u.email},\n\nYour acknowledgment of policy "${policy.title}" (v${policy.version || "1.0"}) is now ${daysOverdue} days overdue. This has been escalated to your manager and the compliance team.\n\nPlease acknowledge immediately. Continued non-acknowledgment will result in system access restrictions.\n\n— GRC Platform`,
            });
          } catch (_) { /* email best-effort */ }

          try {
            await sr.entities.ComplianceTask.create({
              tenant_id: tid,
              title: `Acknowledge policy: ${policy.title}`,
              description: `Employee ${u.full_name || u.email} has not acknowledged policy "${policy.title}" (v${policy.version || "1.0"}) in ${daysOverdue} days. Acknowledgment is required immediately.`,
              type: "policy_acknowledgment",
              priority: "high",
              status: "todo",
              assignee_id: u.id,
              assignee_name: u.full_name || u.email,
              due_date: new Date(now + 3 * DAY_MS).toISOString().slice(0, 10),
            });
          } catch (_) { /* best-effort */ }
          escalations++; byTenant[tid].escalations++;
        }

        if (tier === "block") {
          try {
            await sr.entities.SecurityAlert.create({
              tenant_id: tid,
              title: `Access block recommended: ${u.full_name || u.email} — policy "${policy.title}" unacknowledged ${daysOverdue} days`,
              description: `User ${u.full_name || u.email} has not acknowledged policy "${policy.title}" (v${policy.version || "1.0"}) in ${daysOverdue} days. Access restriction via the training gate is recommended.`,
              type: "policy_violation",
              severity: "high",
              status: "open",
              detected_at: new Date().toISOString(),
              details: `User ID: ${u.id}. Policy ID: ${policy.id}. Days overdue: ${daysOverdue}.`,
            });
          } catch (_) { /* best-effort */ }
          accessBlocks++; byTenant[tid].accessBlocks++;
        }
      }
    }

    // Aggregate Slack alert if any escalations or access blocks
    if (escalations > 0 || accessBlocks > 0) {
      try {
        const msg = `⚠️ *Policy Acknowledgment Escalation* on ${today}: ${reminders} reminders, ${escalations} escalations, ${accessBlocks} access-block recommendations. Review the Incidents/Security Alerts page.`;
        await sr.functions.invoke("sendSlackAlert", { message: msg, channel: "C0BJB8240RF" });
      } catch (_) { /* best-effort */ }
    }

    return Response.json({
      ok: true,
      policies_checked: published.length,
      reminders, escalations, access_blocks: accessBlocks,
      by_tenant: byTenant,
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("escalatePolicyAcknowledgments error:", error?.message || error);
    return Response.json({ error: error?.message || "Policy acknowledgment escalation failed" }, { status: 500 });
  }
});