import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── ACTION: request_access — visitor submits access request form ──
    if (action === 'request_access') {
      const { visitor_name, visitor_email, visitor_company, visitor_title, visitor_phone, source } = body;

      if (!visitor_name || !visitor_email) {
        return Response.json({ error: 'Name and email are required' }, { status: 400 });
      }

      // Extract domain for account-level grouping
      const account_domain = visitor_email.split('@')[1]?.toLowerCase() || '';

      // Check if an access request already exists for this email
      const existing = await base44.asServiceRole.entities.TrustCenterAccess.filter({
        visitor_email: visitor_email.toLowerCase()
      });

      if (existing && existing.length > 0) {
        const accessReq = existing[0];
        // Update visit count and last activity
        await base44.asServiceRole.entities.TrustCenterAccess.update(accessReq.id, {
          visit_count: (accessReq.visit_count || 0) + 1,
          last_activity: new Date().toISOString(),
          status: accessReq.nda_status === 'signed' ? 'approved' : accessReq.status
        });
        return Response.json({
          access_request_id: accessReq.id,
          access_token: accessReq.access_token,
          nda_status: accessReq.nda_status,
          access_granted: accessReq.access_granted,
          already_exists: true
        });
      }

      // Generate unique request ID and access token
      const request_id = `TCAR-${Date.now().toString(36).toUpperCase()}`;
      const access_token = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36);

      // Get Trust Center config to check NDA requirement
      const tcConfigs = await base44.asServiceRole.entities.TrustCenter.list();
      const tc = tcConfigs?.[0];
      const nda_required = tc?.nda_required || tc?.access_mode === 'nda_required';
      const auto_approve = tc?.auto_approve_access || false;

      let nda_status = 'not_required';
      let nda_document_text = null;
      let access_granted = false;
      let access_granted_at = null;
      let access_expires_at = null;
      let status = 'approved';

      if (nda_required) {
        nda_status = 'requested';
        status = 'pending';

        // Generate NDA document from template
        if (tc?.nda_template) {
          nda_document_text = tc.nda_template
            .replace(/{{visitor_name}}/g, visitor_name)
            .replace(/{{visitor_company}}/g, visitor_company || '____')
            .replace(/{{company_name}}/g, tc.company_name || '____')
            .replace(/{{date}}/g, new Date().toLocaleDateString());
        } else {
          // Default NDA template
          nda_document_text = `MUTUAL NON-DISCLOSURE AGREEMENT\n\nThis Mutual Non-Disclosure Agreement ("Agreement") is entered into on ${new Date().toLocaleDateString()} between ${tc?.company_name || '____'} ("Disclosing Party") and ${visitor_name} of ${visitor_company || '____'} ("Receiving Party").\n\n1. CONFIDENTIAL INFORMATION: Each party may disclose certain confidential and proprietary information to the other party, including but not limited to security documentation, compliance reports, technical specifications, and business processes.\n\n2. OBLIGATIONS: The Receiving Party agrees to (a) hold all Confidential Information in strict confidence, (b) not disclose it to any third party without prior written consent, (c) use it solely for the purpose of evaluating a potential business relationship, and (d) protect it with the same degree of care it uses for its own confidential information.\n\n3. TERM: This Agreement shall remain in effect for ${tc?.nda_validity_days || 90} days from the date of signing.\n\n4. RETURN OF INFORMATION: Upon request, the Receiving Party shall return or destroy all Confidential Information.\n\n5. NO LICENSE: No license or intellectual property rights are granted under this Agreement.\n\nBy signing below, the parties acknowledge their agreement to these terms.\n\nDisclosing Party: ${tc?.company_name || '____'}\n\nReceiving Party: ${visitor_name}\n${visitor_company || ''}\n${visitor_email}`;
        }
      } else if (auto_approve) {
        access_granted = true;
        access_granted_at = new Date().toISOString();
        access_expires_at = new Date(Date.now() + (tc?.nda_validity_days || 90) * 24 * 60 * 60 * 1000).toISOString();
      }

      // Create the access request
      const accessReq = await base44.asServiceRole.entities.TrustCenterAccess.create({
        request_id,
        visitor_name,
        visitor_email: visitor_email.toLowerCase(),
        visitor_company,
        visitor_title,
        visitor_phone,
        account_domain,
        access_token,
        nda_status,
        nda_document_text,
        access_granted,
        access_granted_at,
        access_expires_at,
        first_visit: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        visit_count: 1,
        source: source || 'trust_center',
        status
      });

      // Log activity
      await base44.asServiceRole.entities.TrustCenterActivity.create({
        activity_id: `TCA-${Date.now().toString(36).toUpperCase()}`,
        access_request_id: accessReq.id,
        visitor_name,
        visitor_email,
        visitor_company,
        account_domain,
        activity_type: 'access_requested',
        activity_detail: `Access requested by ${visitor_name} from ${visitor_company || account_domain}`,
        session_id: access_token
      });

      // CRM sync (if enabled)
      if (tc?.crm_sync_enabled && tc?.crm_webhook_url) {
        try {
          await fetch(tc.crm_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'trust_center_access_requested',
              visitor: { name: visitor_name, email: visitor_email, company: visitor_company, title: visitor_title },
              account_domain,
              nda_required,
              request_id,
              timestamp: new Date().toISOString()
            })
          });
          await base44.asServiceRole.entities.TrustCenterAccess.update(accessReq.id, { crm_synced: true, crm_synced_at: new Date().toISOString() });
        } catch (_) {}
      }

      return Response.json({
        access_request_id: accessReq.id,
        access_token,
        nda_status,
        nda_document_text,
        access_granted,
        status
      });
    }

    // ── ACTION: sign_nda — visitor signs the NDA ──
    if (action === 'sign_nda') {
      const { access_request_id, access_token, visitor_ip, visitor_user_agent } = body;

      const accessReqs = await base44.asServiceRole.entities.TrustCenterAccess.filter({
        id: access_request_id,
        access_token
      });

      if (!accessReqs || accessReqs.length === 0) {
        return Response.json({ error: 'Invalid access request or token' }, { status: 404 });
      }

      const accessReq = accessReqs[0];
      if (accessReq.nda_status === 'signed') {
        return Response.json({ already_signed: true, access_granted: accessReq.access_granted });
      }

      const now = new Date().toISOString();
      const tcConfigs = await base44.asServiceRole.entities.TrustCenter.list();
      const tc = tcConfigs?.[0];
      const expiryDays = tc?.nda_validity_days || 90;
      const access_expires_at = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      await base44.asServiceRole.entities.TrustCenterAccess.update(accessReq.id, {
        nda_status: 'signed',
        nda_signed_at: now,
        nda_signed_ip: visitor_ip || 'unknown',
        nda_signed_user_agent: visitor_user_agent || 'unknown',
        access_granted: true,
        access_granted_at: now,
        access_expires_at,
        status: 'approved',
        last_activity: now
      });

      // Log NDA signed activity
      await base44.asServiceRole.entities.TrustCenterActivity.create({
        activity_id: `TCA-${Date.now().toString(36).toUpperCase()}NDA`,
        access_request_id: accessReq.id,
        visitor_name: accessReq.visitor_name,
        visitor_email: accessReq.visitor_email,
        visitor_company: accessReq.visitor_company,
        account_domain: accessReq.account_domain,
        activity_type: 'nda_signed',
        activity_detail: `NDA signed by ${accessReq.visitor_name}`,
        ip_address: visitor_ip,
        user_agent: visitor_user_agent,
        session_id: accessReq.access_token
      });

      // CRM sync for NDA signed event
      if (tc?.crm_sync_enabled && tc?.crm_webhook_url) {
        try {
          await fetch(tc.crm_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'trust_center_nda_signed',
              visitor: { name: accessReq.visitor_name, email: accessReq.visitor_email, company: accessReq.visitor_company },
              account_domain: accessReq.account_domain,
              signed_at: now,
              access_expires_at,
              request_id: accessReq.request_id
            })
          });
        } catch (_) {}
      }

      return Response.json({
        access_granted: true,
        access_token: accessReq.access_token,
        access_expires_at,
        nda_signed_at: now
      });
    }

    // ── ACTION: log_activity — log a visitor activity event ──
    if (action === 'log_activity') {
      const { access_token, activity_type, activity_detail, page_section, ip_address, user_agent, referrer, duration_seconds } = body;

      if (!access_token) {
        return Response.json({ error: 'access_token required' }, { status: 400 });
      }

      const accessReqs = await base44.asServiceRole.entities.TrustCenterAccess.filter({ access_token });
      if (!accessReqs || accessReqs.length === 0) {
        return Response.json({ error: 'Invalid access token' }, { status: 404 });
      }

      const accessReq = accessReqs[0];
      const activity_id = `TCA-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      await base44.asServiceRole.entities.TrustCenterActivity.create({
        activity_id,
        access_request_id: accessReq.id,
        visitor_name: accessReq.visitor_name,
        visitor_email: accessReq.visitor_email,
        visitor_company: accessReq.visitor_company,
        account_domain: accessReq.account_domain,
        activity_type,
        activity_detail,
        page_section,
        ip_address,
        user_agent,
        referrer,
        session_id: access_token,
        duration_seconds: duration_seconds || 0
      });

      // Update access request with activity tracking
      const updates = { last_activity: new Date().toISOString() };
      if (activity_type === 'document_view' && activity_detail) {
        const viewed = accessReq.documents_viewed || [];
        if (!viewed.includes(activity_detail)) viewed.push(activity_detail);
        updates.documents_viewed = viewed;
      }
      if (activity_type === 'document_download' && activity_detail) {
        const downloaded = accessReq.documents_downloaded || [];
        if (!downloaded.includes(activity_detail)) downloaded.push(activity_detail);
        updates.documents_downloaded = downloaded;
      }
      if (activity_type === 'question_submitted') {
        updates.questions_asked = (accessReq.questions_asked || 0) + 1;
      }
      await base44.asServiceRole.entities.TrustCenterAccess.update(accessReq.id, updates);

      // CRM sync for document downloads
      if (activity_type === 'document_download') {
        const tcConfigs = await base44.asServiceRole.entities.TrustCenter.list();
        const tc = tcConfigs?.[0];
        if (tc?.crm_sync_enabled && tc?.crm_webhook_url) {
          try {
            await fetch(tc.crm_webhook_url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'trust_center_document_downloaded',
                visitor: { name: accessReq.visitor_name, email: accessReq.visitor_email, company: accessReq.visitor_company },
                document: activity_detail,
                request_id: accessReq.request_id
              })
            });
          } catch (_) {}
        }
      }

      return Response.json({ logged: true, activity_id });
    }

    // ── ACTION: get_analytics — get account-level analytics ──
    if (action === 'get_analytics') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const [accessReqs, activities] = await Promise.all([
        base44.asServiceRole.entities.TrustCenterAccess.list(),
        base44.asServiceRole.entities.TrustCenterActivity.list()
      ]);

      // Group by account domain
      const accountMap = {};
      (accessReqs || []).forEach(a => {
        const domain = a.account_domain || 'unknown';
        if (!accountMap[domain]) {
          accountMap[domain] = {
            domain,
            company: a.visitor_company || domain,
            visitors: [],
            total_visits: 0,
            nda_signed: false,
            documents_viewed: new Set(),
            documents_downloaded: new Set(),
            questions_asked: 0,
            last_activity: null,
            first_visit: null
          };
        }
        const acct = accountMap[domain];
        acct.visitors.push({ name: a.visitor_name, email: a.visitor_email, title: a.visitor_title, nda_status: a.nda_status, visit_count: a.visit_count });
        acct.total_visits += a.visit_count || 1;
        if (a.nda_status === 'signed') acct.nda_signed = true;
        (a.documents_viewed || []).forEach(d => acct.documents_viewed.add(d));
        (a.documents_downloaded || []).forEach(d => acct.documents_downloaded.add(d));
        acct.questions_asked += a.questions_asked || 0;
        if (!acct.last_activity || a.last_activity > acct.last_activity) acct.last_activity = a.last_activity;
        if (!acct.first_visit || a.first_visit < acct.first_visit) acct.first_visit = a.first_visit;
      });

      const accounts = Object.values(accountMap).map(a => ({
        ...a,
        documents_viewed: Array.from(a.documents_viewed),
        documents_downloaded: Array.from(a.documents_downloaded),
        documents_viewed_count: a.documents_viewed.size,
        documents_downloaded_count: a.documents_downloaded.size
      })).sort((a, b) => (b.last_activity || '').localeCompare(a.last_activity || ''));

      // Activity timeline (last 30 events)
      const recentActivities = (activities || [])
        .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
        .slice(0, 30)
        .map(a => ({
          activity_id: a.activity_id,
          visitor_name: a.visitor_name,
          visitor_company: a.visitor_company,
          account_domain: a.account_domain,
          activity_type: a.activity_type,
          activity_detail: a.activity_detail,
          created_date: a.created_date
        }));

      // Summary metrics
      const summary = {
        total_visitors: (accessReqs || []).length,
        total_accounts: accounts.length,
        nda_signed_count: (accessReqs || []).filter(a => a.nda_status === 'signed').length,
        nda_pending_count: (accessReqs || []).filter(a => a.nda_status === 'requested' || a.nda_status === 'sent').length,
        total_activities: (activities || []).length,
        document_downloads: (activities || []).filter(a => a.activity_type === 'document_download').length,
        questions_asked: (accessReqs || []).reduce((s, a) => s + (a.questions_asked || 0), 0),
        active_access: (accessReqs || []).filter(a => a.access_granted && (!a.access_expires_at || a.access_expires_at > new Date().toISOString())).length
      };

      return Response.json({ summary, accounts, recent_activities: recentActivities });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}