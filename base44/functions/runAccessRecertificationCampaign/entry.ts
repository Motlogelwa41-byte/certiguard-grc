import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Access recertification campaign engine.
//   action: "generate" — create AccessReviewItem per scoped user for a campaign, move it to in_review.
//   action: "finalize" — close the campaign; any un-reviewed items are auto-marked revoked (least-privilege).
// Admin-only: enforces least-privilege by requiring an admin to run recertification.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Auto-create + populate a quarterly recertification campaign (called by scheduled workflow).
    if (action === 'auto_create') {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const q = Math.floor(month / 3) + 1;
      const period = `Q${q} ${year}`;
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const deadline = new Date(year, month + 1, 28).toISOString().slice(0, 10);
      const tenantId = user.data?.tenant_id || '';
      const created = await sr.entities.AccessReviewCampaign.create({
        tenant_id: tenantId,
        name: `${period} Access Recertification`,
        description: 'Auto-launched quarterly access review enforcing least-privilege compliance.',
        period, scope: 'all_users', status: 'draft',
        start_date: start, end_date: deadline, deadline,
        reviewer_name: user.full_name || '',
        notes: 'Auto-created by scheduled workflow.',
      });
      const users = await sr.entities.User.list('-created_date', 500);
      const toCreate = (users || []).map((u) => ({
        tenant_id: tenantId,
        campaign_id: created.id, campaign_name: created.name,
        user_id: u.id, user_name: u.full_name || u.email, user_email: u.email,
        role: u.role || 'user',
        access_summary: `Platform role: ${u.role || 'user'}. Review assigned permissions, integrations, and tenant access for least-privilege.`,
        reviewer_name: user.full_name || '', decision: 'pending', status: 'open',
      }));
      if (toCreate.length) await sr.entities.AccessReviewItem.bulkCreate(toCreate);
      await sr.entities.AccessReviewCampaign.update(created.id, { total_items: toCreate.length, status: 'in_review' });
      return Response.json({ ok: true, campaign_id: created.id, items: toCreate.length });
    }

    const campaignId = body.campaign_id;
    if (!campaignId) return Response.json({ error: 'campaign_id required' }, { status: 400 });

    const campaign = await sr.entities.AccessReviewCampaign.get(campaignId).catch(() => null);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    if (action === 'generate') {
      const [users, dirUsers] = await Promise.all([
        sr.entities.User.list('-created_date', 500),
        sr.entities.DirectoryUser.list('-last_synced_at', 1000),
      ]);
      const existing = await sr.entities.AccessReviewItem.filter({ campaign_id: campaignId }, '-updated_date', 1000);
      const existingKeys = new Set((existing || []).map((i) => `${i.user_id || ''}|${(i.access_summary || '').slice(0, 20)}`));
      const toCreate = [];
      // Platform app users
      (users || [])
        .filter((u) => campaign.scope === 'admins_only' ? u.role === 'admin' : true)
        .forEach((u) => {
          const key = `${u.id}|platform`;
          if (existingKeys.has(key)) return;
          toCreate.push({
            tenant_id: campaign.tenant_id || user.data?.tenant_id || '',
            campaign_id: campaignId, campaign_name: campaign.name,
            user_id: u.id, user_name: u.full_name || u.email, user_email: u.email,
            role: u.role || 'user',
            access_summary: `Platform role: ${u.role || 'user'}. Review assigned app permissions and tenant access for least-privilege.`,
            reviewer_name: campaign.reviewer_name || user.full_name || '', decision: 'pending', status: 'open',
          });
          existingKeys.add(key);
        });
      // IdP-grounded directory users (real access state from synced providers)
      (dirUsers || [])
        .filter((d) => campaign.scope === 'admins_only' ? (d.roles || []).some((r) => /admin|owner/i.test(r)) : true)
        .forEach((d) => {
          const key = `${d.id}|idp`;
          if (existingKeys.has(key)) return;
          const groups = (d.groups || []).join(', ') || 'none';
          const roles = (d.roles || []).join(', ') || 'none';
          toCreate.push({
            tenant_id: campaign.tenant_id || user.data?.tenant_id || '',
            campaign_id: campaignId, campaign_name: campaign.name,
            user_id: d.user_id || d.external_id, user_name: d.full_name || d.email, user_email: d.email,
            role: roles,
            access_summary: `IdP: ${d.idp_name || 'directory'} · Status: ${d.status} · Groups: ${groups} · Roles: ${roles}. Verify least-privilege and revoke stale access.`,
            reviewer_name: campaign.reviewer_name || user.full_name || '', decision: 'pending', status: 'open',
          });
          existingKeys.add(key);
        });
      if (toCreate.length) await sr.entities.AccessReviewItem.bulkCreate(toCreate);
      const total = (existing?.length || 0) + toCreate.length;
      await sr.entities.AccessReviewCampaign.update(campaignId, { total_items: total, status: 'in_review' });
      return Response.json({ ok: true, generated: toCreate.length, total, idp_users: (dirUsers || []).length });
    }

    if (action === 'finalize') {
      const items = await sr.entities.AccessReviewItem.filter({ campaign_id: campaignId }, '-updated_date', 1000);
      let certified = 0, revoked = 0, modified = 0;
      const nowIso = new Date().toISOString();
      const updates = [];
      for (const it of (items || [])) {
        if (it.status === 'open' || it.decision === 'pending') {
          updates.push(sr.entities.AccessReviewItem.update(it.id, {
            decision: 'revoke', status: 'completed',
            decision_notes: 'Auto-revoked: access not re-certified during campaign window.', decided_at: nowIso,
          }));
          revoked++;
        } else if (it.decision === 'certify') certified++;
        else if (it.decision === 'revoke') revoked++;
        else if (it.decision === 'modify') modified++;
      }
      await Promise.all(updates);
      await sr.entities.AccessReviewCampaign.update(campaignId, {
        status: 'completed',
        completed_items: (items?.length || 0),
        certified_count: certified,
        revoked_count: revoked,
        modified_count: modified,
      });
      return Response.json({ ok: true, certified, revoked, modified, total: items?.length || 0 });
    }

    return Response.json({ error: 'Unknown action. Use generate or finalize.' }, { status: 400 });
  } catch (error) {
    console.error('runAccessRecertificationCampaign error:', error?.message || error);
    return Response.json({ error: error?.message || 'Campaign engine failed' }, { status: 500 });
  }
});