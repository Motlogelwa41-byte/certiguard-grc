import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { vendor_id } = body;

  if (!vendor_id) {
    return Response.json({ error: "vendor_id is required" }, { status: 400 });
  }

  try {
    const vendor = await base44.asServiceRole.entities.Vendor.get(vendor_id).catch(() => null);
    if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

    const assessments = await base44.asServiceRole.entities.VendorAssessment.filter({ vendor_id }).catch(() => []);
    const findings = await base44.asServiceRole.entities.SecurityFinding.filter({ source_vendor_id: vendor_id }).catch(() => []);
    const certs = await base44.asServiceRole.entities.Certification.filter({ vendor_id }).catch(() => []);
    const contracts = await base44.asServiceRole.entities.Contract.filter({ vendor_id }).catch(() => []);

    let score = 100;
    const factors = [];

    const failedAssessments = assessments.filter(a => a.overall_result === "fail" || a.overall_result === "non_compliant");
    if (failedAssessments.length > 0) {
      const penalty = failedAssessments.length * 15;
      score -= penalty;
      factors.push({ factor: "Failed assessments", penalty, detail: `${failedAssessments.length} failed assessment(s)` });
    }

    const openFindings = findings.filter(f => f.status === "open" || f.status === "in_progress");
    const criticalFindings = openFindings.filter(f => f.severity === "critical");
    const highFindings = openFindings.filter(f => f.severity === "high");
    if (criticalFindings.length > 0) {
      const penalty = criticalFindings.length * 20;
      score -= penalty;
      factors.push({ factor: "Critical findings", penalty, detail: `${criticalFindings.length} critical finding(s)` });
    }
    if (highFindings.length > 0) {
      const penalty = highFindings.length * 10;
      score -= penalty;
      factors.push({ factor: "High findings", penalty, detail: `${highFindings.length} high finding(s)` });
    }

    const validCerts = certs.filter(c => c.status === "active" || c.status === "valid");
    if (validCerts.length > 0) {
      const bonus = Math.min(validCerts.length * 5, 15);
      score += bonus;
      factors.push({ factor: "Valid certifications", penalty: -bonus, detail: `${validCerts.length} active cert(s)` });
    }

    const expiredContracts = contracts.filter(c => c.status === "expired");
    if (expiredContracts.length > 0) {
      const penalty = expiredContracts.length * 10;
      score -= penalty;
      factors.push({ factor: "Expired contracts", penalty, detail: `${expiredContracts.length} expired contract(s)` });
    }

    if (vendor.criticality === "critical") {
      score -= 5;
      factors.push({ factor: "Critical vendor amplification", penalty: 5, detail: "Critical vendor tier" });
    }

    score = Math.max(0, Math.min(100, score));

    let grade = "F";
    if (score >= 90) grade = "A";
    else if (score >= 80) grade = "B";
    else if (score >= 70) grade = "C";
    else if (score >= 60) grade = "D";

    let risk_tier = "low";
    if (score < 50) risk_tier = "critical";
    else if (score < 65) risk_tier = "high";
    else if (score < 80) risk_tier = "medium";

    await base44.asServiceRole.entities.Vendor.update(vendor_id, {
      risk_score: score,
      risk_grade: grade,
      risk_tier,
      last_risk_assessment: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      vendor_id,
      vendor_name: vendor.name,
      score,
      grade,
      risk_tier,
      factors,
      assessment_count: assessments.length,
      finding_count: openFindings.length,
      cert_count: validCerts.length,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}