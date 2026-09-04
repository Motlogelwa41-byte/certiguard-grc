import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// AWS Marketplace Trust Center Feed — Public Endpoint
// Returns a compliance data feed compatible with AWS Marketplace partner compliance requirements.
// Buyers access this during purchase evaluation to verify security posture.
// Query params: slug=<feed_slug> (required), format=json|html (default json)

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const url = new URL(req.url);
    const params = url.searchParams;
    let slug = params.get('slug');
    let format = params.get('format') || 'json';

    // Also check request body (for POST / test invocations)
    if (!slug && req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.slug) slug = body.slug;
        if (body.format) format = body.format;
      } catch (_) {}
    }

    if (!slug) {
      return Response.json({ error: "Missing 'slug' parameter — provide your AWS Marketplace feed slug" }, { status: 400 });
    }

    // Find the AWS Marketplace config by feed slug
    const configs = await sr.entities.AwsMarketplaceConfig.filter({ feed_slug: slug }).catch(() => []);
    const config = configs?.[0];

    if (!config || config.integration_status === 'disabled') {
      return Response.json({ error: "AWS Marketplace feed not found or disabled" }, { status: 404 });
    }

    if (config.integration_status !== 'active') {
      return Response.json({ error: "AWS Marketplace feed is not yet active — pending review", status: config.integration_status }, { status: 403 });
    }

    // Increment feed request count (fire and forget)
    sr.entities.AwsMarketplaceConfig.update(config.id, {
      feed_request_count: (config.feed_request_count || 0) + 1,
      last_sync_at: new Date().toISOString(),
    }).catch(() => {});

    // Fetch all compliance data in parallel
    const [frameworks, controls, certifications, trustCenter, subprocessors, penTests, incidents] = await Promise.all([
      sr.entities.RegulatoryFramework.list("-created_date", 100).catch(() => []),
      sr.entities.Control.list("-created_date", 500).catch(() => []),
      sr.entities.Certification.list("-created_date", 50).catch(() => []),
      sr.entities.TrustCenter.list("-created_date", 5).catch(() => []),
      sr.entities.Subprocessor.filter({ monitoring_status: "active" }).catch(() => []),
      sr.entities.PenTest.list("-test_date", 10).catch(() => []),
      sr.entities.Incident.filter({ status: "closed" }).catch(() => []),
    ]);

    // Filter frameworks by config
    const exposeFrameworks = config.expose_frameworks?.length > 0
      ? (frameworks || []).filter(f => config.expose_frameworks.includes(f.code?.toLowerCase()) || config.expose_frameworks.includes(f.code))
      : frameworks || [];

    // Build framework compliance summaries
    const frameworkSummaries = exposeFrameworks.map(fw => {
      const fwControls = (controls || []).filter(c => c.framework_ids?.includes(fw.id));
      const passing = fwControls.filter(c => c.status === 'passing').length;
      const failing = fwControls.filter(c => c.status === 'failing').length;
      const total = fwControls.length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;
      const cert = (certifications || []).find(c => c.framework_id === fw.id || c.framework_name === fw.name);
      return {
        code: fw.code,
        name: fw.name,
        version: fw.version,
        jurisdiction: fw.jurisdiction,
        compliance_score: score,
        controls_total: total,
        controls_passing: passing,
        controls_failing: failing,
        certified: cert ? cert.status === 'active' : false,
        certification_type: cert?.certification_type || null,
        certification_expiry: cert?.expiry_date || null,
        last_audit: cert?.audit_date || null,
      };
    });

    // Build certification list
    const certificationList = config.expose_certifications
      ? (certifications || []).map(c => ({
          type: c.certification_type,
          name: c.name || c.title,
          status: c.status,
          issue_date: c.issue_date || c.audit_date,
          expiry_date: c.expiry_date,
          certifying_body: c.certifying_body || c.auditor_name,
          scope: c.scope_summary || c.scope || null,
        }))
      : [];

    // Build subprocessor list
    const subprocessorList = config.expose_subprocessors
      ? (subprocessors || []).map(s => ({
          name: s.name,
          category: s.category,
          location: s.location,
          country: s.country,
          purpose: s.purpose,
          data_access_level: s.data_access_level,
        }))
      : [];

    // Build pen test summaries
    const penTestList = config.expose_pen_tests
      ? (penTests || []).filter(p => p.status === 'completed').map(p => ({
          title: p.title,
          test_date: p.test_date,
          firm: p.testing_firm || p.firm,
          scope: p.scope,
          result: p.overall_result || p.result,
          critical_findings: p.critical_findings_count || 0,
          high_findings: p.high_findings_count || 0,
          remediation_status: p.remediation_status,
        }))
      : [];

    // Build incident history (resolved only)
    const incidentHistory = config.expose_incident_history
      ? (incidents || []).slice(0, 10).map(inc => ({
          incident_id: inc.incident_id,
          title: inc.title,
          severity: inc.severity,
          detected_date: inc.detected_date,
          resolved_date: inc.resolved_date || inc.remediated_date,
          mttr_hours: inc.mttr_hours,
          root_cause: inc.root_cause,
          lessons_learned: inc.lessons_learned,
        }))
      : [];

    // Build the AWS Marketplace-compatible feed
    const feed = {
      // AWS Marketplace metadata
      aws_marketplace: {
        seller_name: config.seller_name,
        seller_id: config.seller_id || null,
        product_name: config.product_name,
        product_id: config.product_id || null,
        listing_url: config.listing_url || null,
        feed_version: "1.0",
        feed_generated_at: new Date().toISOString(),
        document_access_mode: config.document_access_mode,
        nda_request_email: config.nda_request_email,
      },

      // Company profile (from Trust Center if available)
      company: {
        name: trustCenter?.[0]?.company_name || config.seller_name,
        tagline: trustCenter?.[0]?.company_tagline || null,
        description: trustCenter?.[0]?.company_description || null,
        website: trustCenter?.[0]?.website_url || null,
        logo_url: trustCenter?.[0]?.logo_url || null,
        contact_email: trustCenter?.[0]?.contact_email || config.nda_request_email,
      },

      // Security posture summary
      security_posture: {
        overall_compliance_score: frameworkSummaries.length > 0
          ? Math.round(frameworkSummaries.reduce((sum, f) => sum + f.compliance_score, 0) / frameworkSummaries.length)
          : 0,
        total_frameworks: frameworkSummaries.length,
        certified_frameworks: frameworkSummaries.filter(f => f.certified).length,
        total_controls: config.expose_controls_summary ? frameworkSummaries.reduce((s, f) => s + f.controls_total, 0) : null,
        passing_controls: config.expose_controls_summary ? frameworkSummaries.reduce((s, f) => s + f.controls_passing, 0) : null,
        failing_controls: config.expose_controls_summary ? frameworkSummaries.reduce((s, f) => s + f.controls_failing, 0) : null,
        uptime_sla_percentage: config.uptime_sla_percentage,
      },

      // Compliance frameworks
      frameworks: frameworkSummaries,

      // Certifications
      certifications: certificationList,

      // Security controls
      encryption: {
        at_rest: config.encryption_at_rest,
        in_transit: config.encryption_in_transit,
        kms_provider: config.kms_provider,
      },

      // Data residency
      data_residency: config.expose_data_residency ? {
        hosting_regions: config.data_hosting_regions || [],
        residency_statement: config.data_residency_statement,
      } : null,

      // Subprocessors
      subprocessors: subprocessorList,

      // Penetration tests
      penetration_tests: penTestList,

      // Incident history
      incident_history: incidentHistory,

      // SLAs
      service_level_agreements: {
        incident_response_sla_hours: config.incident_response_sla_hours,
        breach_notification_sla_hours: config.breach_notification_sla_hours,
        uptime_sla_percentage: config.uptime_sla_percentage,
        support_plan: config.support_plan,
      },

      // Trust center link
      trust_center_url: trustCenter?.[0]?.slug ? `/trust-center` : null,

      // Document access
      document_access: {
        mode: config.document_access_mode,
        request_email: config.nda_request_email,
        auto_approve_aws_buyers: config.auto_approve_aws_buyers,
        available_documents: buildDocumentList(certifications, penTests, trustCenter?.[0]),
      },
    };

    // === JSON format ===
    if (format === 'json') {
      return Response.json(feed, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
          'X-AWS-Marketplace-Feed': 'v1.0',
        }
      });
    }

    // === HTML format (buyer-facing preview) ===
    if (format === 'html') {
      const html = generateBuyerHtml(feed);
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        }
      });
    }

    return Response.json(feed);
  } catch (error) {
    console.error("getAwsMarketplaceFeed error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildDocumentList(certifications, penTests, trustCenter) {
  const docs = [];
  for (const cert of (certifications || [])) {
    if (cert.document_url) {
      docs.push({
        name: `${cert.name || cert.title || cert.certification_type} Report`,
        type: 'certification',
        access: 'request_access',
      });
    }
  }
  for (const pen of (penTests || [])) {
    if (pen.report_url) {
      docs.push({
        name: `${pen.title} Report`,
        type: 'penetration_test',
        test_date: pen.test_date,
        access: 'request_access',
      });
    }
  }
  return docs;
}

function generateBuyerHtml(feed) {
  const frameworkRows = (feed.frameworks || []).map(f => {
    const color = f.certified ? '#16a34a' : f.compliance_score >= 70 ? '#f59e0b' : '#ef4444';
    const statusLabel = f.certified ? '✓ Certified' : f.compliance_score >= 90 ? 'Active' : f.compliance_score >= 70 ? 'In Progress' : 'Gaps';
    return `<tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 12px;font-weight:600;color:#1e293b;">${f.name}</td>
      <td style="padding:10px 12px;color:${color};font-weight:600;">${statusLabel}</td>
      <td style="padding:10px 12px;text-align:right;font-weight:600;color:#0A2463;">${f.compliance_score}%</td>
      <td style="padding:10px 12px;text-align:right;color:#64748b;">${f.controls_passing}/${f.controls_total}</td>
    </tr>`;
  }).join('');

  const certRows = (feed.certifications || []).map(c => {
    const statusColor = c.status === 'active' ? '#16a34a' : c.status === 'expiring' ? '#f59e0b' : '#64748b';
    return `<tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 12px;font-weight:600;color:#1e293b;">${c.name || c.type}</td>
      <td style="padding:10px 12px;color:${statusColor};font-weight:600;text-transform:capitalize;">${c.status}</td>
      <td style="padding:10px 12px;color:#64748b;">${c.certifying_body || '—'}</td>
      <td style="padding:10px 12px;color:#64748b;">${c.expiry_date || 'Non-expiring'}</td>
    </tr>`;
  }).join('');

  const subprocessorRows = (feed.subprocessors || []).map(s => {
    return `<tr style="border-bottom:1px solid #e2e8f0;">
      <td style="padding:10px 12px;font-weight:600;color:#1e293b;">${s.name}</td>
      <td style="padding:10px 12px;color:#64748b;">${s.category}</td>
      <td style="padding:10px 12px;color:#64748b;">${s.location || s.country || '—'}</td>
      <td style="padding:10px 12px;color:#64748b;">${s.data_access_level}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${feed.company.name} — AWS Marketplace Compliance</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:Inter,system-ui,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6;}
  .container{max-width:900px;margin:0 auto;padding:24px;}
  .header{background:#0A2463;color:#fff;border-radius:16px;padding:32px;margin-bottom:24px;}
  .header h1{font-size:24px;font-weight:800;margin-bottom:8px;}
  .header p{color:#94a3b8;font-size:14px;}
  .badge{display:inline-flex;align-items:center;gap:6px;background:#3E92CC;color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;margin-top:12px;}
  .section{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;border:1px solid #e2e8f0;}
  .section h2{font-size:18px;font-weight:700;color:#0A2463;margin-bottom:16px;display:flex;align-items:center;gap:8px;}
  .score-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;}
  .score-card{background:#f8fafc;border-radius:10px;padding:16px;text-align:center;}
  .score-card .value{font-size:28px;font-weight:800;color:#0A2463;}
  .score-card .label{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;margin-top:4px;}
  table{width:100%;border-collapse:collapse;font-size:13px;}
  th{text-align:left;padding:8px 12px;color:#64748b;font-weight:600;font-size:11px;text-transform:uppercase;border-bottom:2px solid #e2e8f0;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .info-item{padding:12px;background:#f8fafc;border-radius:8px;}
  .info-item .label{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;}
  .info-item .value{font-size:14px;font-weight:600;color:#1e293b;margin-top:2px;}
  .footer{text-align:center;padding:16px;color:#94a3b8;font-size:12px;}
  .cta{display:inline-block;background:#3E92CC;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;}
</style>
</head><body>
<div class="container">
  <div class="header">
    <h1>${feed.company.name || feed.aws_marketplace.seller_name}</h1>
    <p>${feed.company.tagline || feed.company.description || 'Security & Compliance Profile'}</p>
    <div class="badge">🔒 AWS Marketplace Verified Compliance Feed</div>
  </div>

  <div class="section">
    <h2>📊 Security Posture</h2>
    <div class="score-grid">
      <div class="score-card"><div class="value">${feed.security_posture.overall_compliance_score}%</div><div class="label">Overall Score</div></div>
      <div class="score-card"><div class="value">${feed.security_posture.certified_frameworks}</div><div class="label">Certified</div></div>
      <div class="score-card"><div class="value">${feed.security_posture.total_frameworks}</div><div class="label">Frameworks</div></div>
      <div class="score-card"><div class="value">${feed.security_posture.uptime_sla_percentage}%</div><div class="label">Uptime SLA</div></div>
    </div>
  </div>

  ${frameworkRows ? `<div class="section">
    <h2>🛡️ Compliance Frameworks</h2>
    <table><thead><tr><th>Framework</th><th>Status</th><th style="text-align:right;">Score</th><th style="text-align:right;">Controls</th></tr></thead><tbody>${frameworkRows}</tbody></table>
  </div>` : ''}

  ${certRows ? `<div class="section">
    <h2>📜 Certifications</h2>
    <table><thead><tr><th>Certification</th><th>Status</th><th>Auditor</th><th>Expiry</th></tr></thead><tbody>${certRows}</tbody></table>
  </div>` : ''}

  <div class="section">
    <h2>🔐 Encryption & Data Protection</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">At Rest</div><div class="value">${feed.encryption.at_rest}</div></div>
      <div class="info-item"><div class="label">In Transit</div><div class="value">${feed.encryption.in_transit}</div></div>
      <div class="info-item"><div class="label">Key Management</div><div class="value">${feed.encryption.kms_provider}</div></div>
      <div class="info-item"><div class="label">Support Plan</div><div class="value">${feed.service_level_agreements.support_plan}</div></div>
    </div>
  </div>

  ${feed.data_residency ? `<div class="section">
    <h2>🌍 Data Residency</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Hosting Regions</div><div class="value">${(feed.data_residency.hosting_regions || []).join(', ') || '—'}</div></div>
      <div class="info-item"><div class="label">Residency Statement</div><div class="value" style="font-size:12px;font-weight:400;">${feed.data_residency.residency_statement || 'Available on request'}</div></div>
    </div>
  </div>` : ''}

  ${subprocessorRows ? `<div class="section">
    <h2>🔗 Subprocessors</h2>
    <table><thead><tr><th>Name</th><th>Category</th><th>Location</th><th>Data Access</th></tr></thead><tbody>${subprocessorRows}</tbody></table>
  </div>` : ''}

  <div class="section">
    <h2>📋 Service Level Agreements</h2>
    <div class="info-grid">
      <div class="info-item"><div class="label">Incident Response</div><div class="value">${feed.service_level_agreements.incident_response_sla_hours}h</div></div>
      <div class="info-item"><div class="label">Breach Notification</div><div class="value">${feed.service_level_agreements.breach_notification_sla_hours}h</div></div>
      <div class="info-item"><div class="label">Uptime SLA</div><div class="value">${feed.service_level_agreements.uptime_sla_percentage}%</div></div>
      <div class="info-item"><div class="label">Support Plan</div><div class="value">${feed.service_level_agreements.support_plan}</div></div>
    </div>
  </div>

  <div class="section" style="text-align:center;">
    <h2>📄 Request Compliance Documents</h2>
    <p style="color:#64748b;font-size:14px;margin-bottom:12px;">Access full audit reports, certifications, and penetration test results.</p>
    <a href="mailto:${feed.aws_marketplace.nda_request_email || feed.company.contact_email || ''}" class="cta">Request Access</a>
  </div>

  <div class="footer">Powered by CertiGuard GRC · Feed generated ${new Date(feed.aws_marketplace.feed_generated_at).toLocaleString()}</div>
</div>
</body></html>`;
}