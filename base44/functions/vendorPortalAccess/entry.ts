import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const QUESTIONNAIRE = [
  { category: "Data Security", question: "Do you encrypt data at rest and in transit?" },
  { category: "Data Security", question: "Do you have a formal data classification policy?" },
  { category: "Access Control", question: "Do you enforce multi-factor authentication for all users?" },
  { category: "Access Control", question: "Do you follow the principle of least privilege?" },
  { category: "Incident Response", question: "Do you have a documented incident response plan?" },
  { category: "Incident Response", question: "What is your average time to notify customers of a breach?" },
  { category: "Compliance", question: "Are you SOC 2 Type II certified?" },
  { category: "Compliance", question: "Are you ISO 27001 certified?" },
  { category: "Business Continuity", question: "Do you have a tested business continuity plan?" },
  { category: "Business Continuity", question: "What is your RTO/RPO for critical systems?" },
];

const SCORE_MAP = { Yes: 10, Partial: 5, No: 0, "N/A": 7 };

function calcRiskLevel(score) {
  if (score >= 80) return "low";
  if (score >= 60) return "medium";
  if (score >= 40) return "high";
  return "critical";
}

// Public endpoint (no user auth) — external vendors are not app users.
// Security relies on the unguessable secure_token stored on the Vendor record.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, token, answers } = body;

    if (!token) {
      return Response.json({ error: "Token is required." }, { status: 400 });
    }

    // Look up vendor by secure_token (service role bypasses RLS)
    const vendors = await base44.asServiceRole.entities.Vendor.filter({ secure_token: token }, '-created_date', 1);
    if (!vendors || vendors.length === 0) {
      return Response.json({ error: "Invalid or expired token." }, { status: 404 });
    }
    const vendor = vendors[0];

    if (action === "load") {
      return Response.json({
        vendor_name: vendor.name,
        vendor_category: vendor.category,
        vendor_website: vendor.website,
        vendor_id: vendor.id,
        status: vendor.status,
      });
    }

    if (action === "submit") {
      const ansMap = answers || {};
      const answeredList = QUESTIONNAIRE.map((q, i) => ({
        ...q,
        answer: ansMap[i] || "",
        score: SCORE_MAP[ansMap[i]] ?? 0,
      }));
      const answered = answeredList.filter((x) => x.answer).length;
      const rawScore = answeredList.reduce((s, x) => s + x.score, 0);
      const maxScore = QUESTIONNAIRE.length * 10;
      const risk_score = Math.round((rawScore / maxScore) * 100);
      const risk_level = calcRiskLevel(risk_score);

      // Create a VendorAssessment record so it appears on the client's dashboard
      await base44.asServiceRole.entities.VendorAssessment.create({
        tenant_id: vendor.tenant_id,
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        title: `Security Questionnaire — ${vendor.name}`,
        status: "submitted",
        risk_score,
        risk_level,
        completed_date: new Date().toISOString().split("T")[0],
        answers: JSON.stringify(answeredList),
        total_questions: QUESTIONNAIRE.length,
        answered_questions: answered,
        notes: "Submitted via vendor portal (token-based access).",
      });

      // Update the vendor's risk profile so the client sees the latest assessment
      await base44.asServiceRole.entities.Vendor.update(vendor.id, {
        risk_level,
        status: "under_review",
        last_assessment_date: new Date().toISOString().split("T")[0],
      });

      return Response.json({ success: true, risk_score, risk_level });
    }

    return Response.json({ error: "Invalid action. Use 'load' or 'submit'." }, { status: 400 });
  } catch (error) {
    console.error("vendorPortalAccess error:", error?.message || error);
    return Response.json({ error: error?.message || "Request failed" }, { status: 500 });
  }
}