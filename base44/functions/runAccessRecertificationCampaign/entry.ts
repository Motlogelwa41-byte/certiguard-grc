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
    const campaignId = body.campaign_id;
    if (!campaignId) return Response.json({ error: 'campaign_id required' }, { status: 400 });

    const campaign = await sr.entities.AccessReviewCampaign.get(campaignId).catch(() => null);
    if (!campaign) return Response.json({ error: 'Campaign not found' }, { status: 404 });

    if (action === 'generate') {
      const users = await sr.entities.User.list('-created_date', 500);
      const existing = await sr.entities.AccessReviewItem.filter({ campaign_id: campaignId }, '-updated_date', 1000);
      const existingIds = new Set((existing || []).map((i) => i.user_id).filter(Boolean));
      const scoped = (users || []).filter((u) => campaign.scope === 'admins_only' ? u.role === 'admin' : true);
      const toCreate = scoped
        .filter((u) => !existingIds.has(u.id))
        .map((u) => ({
          campaign_id: campaignId,
          campaign_name: campaign.name,
          user_id: u.id,
          user_name: u.full_name || u.email,
          user_email: u.email,
          role: u.role || 'user',
          access_summary: `Platform role: ${u.role || 'user'}. Review assigned permissions, integrations, and tenant access for least-privilege.`,
          reviewer_name: campaign.reviewer_name || user.full_name || '',
          decision: 'pending',
          status: 'open',
        }));
      if (toCreate.length) await sr.entities.AccessReviewItem.bulkCreate(toCreate);
      const total = (existing?.length || 0) + toCreate.length;
      await sr.entities.AccessReviewCampaign.update(campaignId, { total_items: total, status: 'in_review' });
      return Response.json({ ok: true, generated: toCreate.length, total });
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