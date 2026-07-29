import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Mirrors the questionnaire defined in the frontend pages
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
// Security relies on the unguessable assessment UUID, same model as auditor links.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, assessment_id, answers } = body;

    if (!assessment_id) {
      return Response.json({ error: "Assessment ID is required." }, { status: 400 });
    }

    const assessment = await base44.asServiceRole.entities.VendorAssessment.get(assessment_id);
    if (!assessment) {
      return Response.json({ error: "Assessment not found." }, { status: 404 });
    }

    if (action === "load") {
      return Response.json({
        title: assessment.title,
        vendor_name: assessment.vendor_name,
        due_date: assessment.due_date,
        status: assessment.status,
        answers: assessment.answers,
        total_questions: assessment.total_questions,
        answered_questions: assessment.answered_questions,
      });
    }

    if (action === "submit") {
      if (assessment.status === "submitted" || assessment.status === "completed") {
        return Response.json({ error: "This assessment has already been submitted." }, { status: 400 });
      }

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

      await base44.asServiceRole.entities.VendorAssessment.update(assessment_id, {
        answers: JSON.stringify(answeredList),
        answered_questions: answered,
        risk_score,
        risk_level: calcRiskLevel(risk_score),
        status: "submitted",
        completed_date: new Date().toISOString().split("T")[0],
      });

      return Response.json({ success: true, risk_score, risk_level: calcRiskLevel(risk_score) });
    }

    return Response.json({ error: "Invalid action. Use 'load' or 'submit'." }, { status: 400 });
  } catch (error) {
    console.error("submitVendorAssessment error:", error?.message || error);
    return Response.json({ error: error?.message || "Submission failed" }, { status: 500 });
  }
}