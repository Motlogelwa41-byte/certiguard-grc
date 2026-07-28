import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const questionnaireId = body.questionnaire_id;
    if (!questionnaireId) return Response.json({ error: "questionnaire_id required" }, { status: 400 });

    const questionnaire = await sr.entities.SecurityQuestionnaire.get(questionnaireId);
    if (questionnaire.tenant_id && user.data?.tenant_id && user.data.tenant_id !== questionnaire.tenant_id) {
      return Response.json({ error: "Cross-tenant access denied" }, { status: 403 });
    }
    const items = await sr.entities.QuestionnaireItem.filter({ questionnaire_id: questionnaireId }, "created_date", 500);
    const pending = (items || []).filter((i) => !i.answer && i.status !== "answered");
    if (!pending.length) return Response.json({ message: "No pending items to draft", drafted: 0 });

    const [policies, controls] = await Promise.all([
      sr.entities.Policy.list("-created_date", 50),
      sr.entities.Control.list("-created_date", 100),
    ]);

    const ctx = [];
    ctx.push("POLICIES:");
    (policies || []).slice(0, 20).forEach((p) => ctx.push(`- ${p.title}: ${(p.description || "").slice(0, 200)}`));
    ctx.push("CONTROLS:");
    (controls || []).slice(0, 30).forEach((c) => ctx.push(`- ${c.title}: ${(c.description || "").slice(0, 150)}`));
    const context = ctx.join("\n");

    const questionsBlock = pending.map((q, idx) => `${idx}. [${q.section || "general"}] ${q.question}`).join("\n");

    const prompt = `You are a security compliance assistant drafting responses to a third-party security questionnaire for ${questionnaire.client_name || "our organization"}. Using the organizational context below (policies and controls), write a concise, accurate answer (max 300 chars) for each question. If context is insufficient, still give a best-effort answer and set confidence to "needs_input"; otherwise "drafted".\n\nCONTEXT:\n${context}\n\nQUESTIONS:\n${questionsBlock}\n\nReturn JSON: { "answers": [{ "index": number, "answer": string, "confidence": "drafted"|"needs_input" }] }`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          answers: {
            type: "array",
            items: {
              type: "object",
              properties: { index: { type: "number" }, answer: { type: "string" }, confidence: { type: "string" } },
            },
          },
        },
      },
    });

    const answers = res.answers || (res.data && res.data.answers) || [];
    let drafted = 0;
    for (const a of answers) {
      const item = pending[a.index];
      if (!item) continue;
      try {
        await sr.entities.QuestionnaireItem.update(item.id, {
          suggested_answer: a.answer,
          confidence: a.confidence === "needs_input" ? "needs_input" : "drafted",
          status: "drafted",
        });
        drafted++;
      } catch (_) { /* ignore single failure */ }
    }

    // mark questionnaire as drafting
    try {
      await sr.entities.SecurityQuestionnaire.update(questionnaireId, { status: "drafting" });
    } catch (_) { /* ignore */ }

    return Response.json({ drafted, total: pending.length });
  } catch (error) {
    console.error("autoFillQuestionnaire error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});