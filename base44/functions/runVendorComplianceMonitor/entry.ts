import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Continuous Vendor Compliance Monitor
// Re-scores all active vendors, checks certification expiries, flags critical
// suppliers based on BIA scores, and creates alerts for non-compliant vendors.
// Runs on a scheduled workflow (daily) or can be triggered manually.

const CRITICAL_SUPPLIER_THRESHOLD = 70; // BIA score >= 70 → critical supplier
const CERT_EXPIRY_WARNING_DAYS = 90; // Alert when cert expires within 90 days

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

    // 1. Re-score all active vendors
    const vendors = await base44.asServiceRole.entities.Vendor.list('-created_date', 500);
    const activeVendors = (vendors || []).filter(v => v.status !== 'inactive');

    let vendorsRescored = 0;
    let criticalVendors = 0;
    let highRiskVendors = 0;

    for (const vendor of activeVendors) {
      try {
        // Fetch linked certifications
        const certs = await base44.asServiceRole.entities.VendorCertification.filter({ vendor_id: vendor.id }).catch(() => []);
        const validCerts = (certs || []).filter(c => c.status === 'valid');
        const expiringCerts = (certs || []).filter(c => c.status === 'expiring');
        const expiredCerts = (certs || []).filter(c => c.status === 'expired');

        // Fetch linked BIA
        const bias = await base44.asServiceRole.entities.VendorBIA.filter({ vendor_id: vendor.id }).catch(() => []);
        const latestBia = (bias || []).sort((a, b) => new Date(b.assessment_date || 0) - new Date(a.assessment_date || 0))[0];

        // Compute composite compliance score
        let complianceScore = 0;
        let factors = [];

        // Factor 1: Certifications (40%)
        const certScore = validCerts.length > 0 ? Math.min(100, validCerts.length * 25) : 0;
        factors.push({ factor: 'certifications', score: certScore, detail: `${validCerts.length} valid, ${expiringCerts.length} expiring, ${expiredCerts.length} expired` });

        // Factor 2: Compliance flags (30%) — soc2, iso27001, gdpr
        const flagScore = (vendor.soc2_compliant ? 33 : 0) + (vendor.iso27001_compliant ? 33 : 0) + (vendor.gdpr_compliant ? 34 : 0);
        factors.push({ factor: 'compliance_flags', score: flagScore, detail: `SOC2: ${vendor.soc2_compliant}, ISO27001: ${vendor.iso27001_compliant}, GDPR: ${vendor.gdpr_compliant}` });

        // Factor 3: BIA criticality (15%)
        const biaScore = latestBia?.bia_score || 0;
        const biaFactor = latestBia ? Math.min(100, 100 - biaScore) : 50; // lower BIA risk = higher compliance
        factors.push({ factor: 'bia_assessment', score: biaFactor, detail: latestBia ? `BIA score: ${biaScore}, critical: ${latestBia.critical_supplier}` : 'No BIA on file' });

        // Factor 4: Assessment status (15%)
        const assessments = await base44.asServiceRole.entities.VendorAssessment.filter({ vendor_id: vendor.id }).catch(() => []);
        const completedAssessments = (assessments || []).filter(a => a.status === 'completed');
        const assessmentFactor = assessments.length > 0 ? Math.round((completedAssessments.length / assessments.length) * 100) : 0;
        factors.push({ factor: 'assessments', score: assessmentFactor, detail: `${completedAssessments.length}/${assessments.length} completed` });

        complianceScore = Math.round(certScore * 0.4 + flagScore * 0.3 + biaFactor * 0.15 + assessmentFactor * 0.15);

        // Update vendor with new scores
        const riskLevel = complianceScore >= 80 ? 'low' : complianceScore >= 60 ? 'medium' : complianceScore >= 40 ? 'high' : 'critical';
        const riskGrade = complianceScore >= 90 ? 'A' : complianceScore >= 80 ? 'B' : complianceScore >= 70 ? 'C' : complianceScore >= 60 ? 'D' : 'F';

        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          risk_score: complianceScore,
          risk_level: riskLevel,
          risk_grade: riskGrade,
          risk_tier: riskLevel,
          last_risk_assessment: new Date().toISOString(),
        });

        vendorsRescored++;
        if (riskLevel === 'critical') criticalVendors++;
        if (riskLevel === 'high') highRiskVendors++;

        // 2. Check certification expiries
        for (const cert of certs || []) {
          if (cert.status === 'expired' || !cert.expiry_date || !cert.continuous_monitoring) continue;
          const expiry = new Date(cert.expiry_date);
          const daysToExpiry = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24));
          const monthsToExpiry = Math.ceil(daysToExpiry / 30);

          let newStatus = cert.status;
          if (daysToExpiry <= 0) newStatus = 'expired';
          else if (daysToExpiry <= CERT_EXPIRY_WARNING_DAYS) newStatus = 'expiring';
          else newStatus = 'valid';

          if (newStatus !== cert.status || cert.months_to_expiry !== monthsToExpiry) {
            await base44.asServiceRole.entities.VendorCertification.update(cert.id, {
              status: newStatus,
              months_to_expiry: monthsToExpiry,
            });
          }
        }

        // 3. Flag critical suppliers based on BIA
        if (latestBia && latestBia.bia_score >= CRITICAL_SUPPLIER_THRESHOLD && !latestBia.critical_supplier) {
          await base44.asServiceRole.entities.VendorBIA.update(latestBia.id, {
            critical_supplier: true,
            criticality_tier: 'tier1_critical',
          });
        }

      } catch (e) {
        console.error(`Vendor re-score error for ${vendor.id}:`, e?.message);
      }
    }

    // 4. Summary of certification status
    const allCerts = await base44.asServiceRole.entities.VendorCertification.list('-created_date', 500).catch(() => []);
    const validCerts = (allCerts || []).filter(c => c.status === 'valid').length;
    const expiringCerts = (allCerts || []).filter(c => c.status === 'expiring').length;
    const expiredCerts = (allCerts || []).filter(c => c.status === 'expired').length;

    // 5. Summary of critical suppliers
    const allBias = await base44.asServiceRole.entities.VendorBIA.list('-created_date', 500).catch(() => []);
    const criticalSuppliers = (allBias || []).filter(b => b.critical_supplier).length;
    const completedBias = (allBias || []).filter(b => b.status === 'completed' || b.status === 'approved').length;

    // 6. Contracts with embedded security requirements
    const contracts = await base44.asServiceRole.entities.Contract.list('-created_date', 500).catch(() => []);
    const contractsWithSecurity = (contracts || []).filter(c => c.security_requirements_embedded).length;

    return Response.json({
      status: 'completed',
      vendors_monitored: activeVendors.length,
      vendors_rescored: vendorsRescored,
      critical_vendors: criticalVendors,
      high_risk_vendors: highRiskVendors,
      certifications: {
        total: allCerts?.length || 0,
        valid: validCerts,
        expiring: expiringCerts,
        expired: expiredCerts,
      },
      bia: {
        total: allBias?.length || 0,
        completed: completedBias,
        critical_suppliers: criticalSuppliers,
      },
      contracts: {
        total: contracts?.length || 0,
        with_security_requirements: contractsWithSecurity,
      },
      message: `Vendor compliance monitor completed — ${vendorsRescored} vendors re-scored, ${criticalVendors} critical, ${expiringCerts} certs expiring, ${criticalSuppliers} critical suppliers identified.`,
    });
  } catch (error) {
    console.error('runVendorComplianceMonitor error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Vendor compliance monitor failed' }, { status: 500 });
  }
});