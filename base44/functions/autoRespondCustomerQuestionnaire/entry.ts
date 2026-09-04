import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Inbound Customer Questionnaire Auto-Response Engine
// When a prospect/customer sends a security questionnaire, AI auto-drafts answers
// from approved Trust Center content, control library, evidence, and framework mappings.
// Reduces response time from days to hours.
// This is the enhanced inbound engine (vs autoFillQuestionnaire which is the basic outbound one).

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

    // Get all pending items
    const items = await sr.entities.QuestionnaireItem.filter({ questionnaire_id: questionnaireId }, "created_date", 500);
    const pending = (items || []).filter((i) => !i.answer && i.status !== "answered");
    if (!pending.length) return Response.json({ message: "No pending items to draft", drafted: 0 });

    // Gather trust content from multiple sources
    const [trustCenters, controls, policies, evidence, frameworks] = await Promise.all([
      sr.entities.TrustCenter.list("-created_date", 5).catch(() => []),
      sr.entities.Control.list("-created_date", 100).catch(() => []),
      sr.entities.Policy.list("-created_date", 50).catch(() => []),
      sr.entities.Evidence.list("-created_date", 50).catch(() => []),
      sr.entities.RegulatoryFramework.list("-created_date", 20).catch(() => []),
    ]);

    // Build comprehensive context from Trust Center
    const ctx = [];
    const tc = (trustCenters || [])[0];
    if (tc) {
      ctx.push("=== TRUST CENTER CONTENT ===");
      ctx.push(`Company: ${tc.company_name || ""}`);
      if (tc.company_description) ctx.push(`Description: ${tc.company_description}`);
      if (tc.uptime_percentage) ctx.push(`Uptime: ${tc.uptime_percentage}%`);
      if (tc.pentest_firm) ctx.push(`Latest Pen Test: ${tc.pentest_firm} (${tc.pentest_date || "N/A"})`);
      if (tc.subprocessors) {
        try {
          const subs = JSON.parse(tc.subprocessors);
          ctx.push(`Subprocessors: ${subs.map(s => s.name).join(", ")}`);
        } catch (_) {}
      }
      if (tc.custom_sections) {
        try {
          const sections = JSON.parse(tc.custom_sections);
          for (const s of sections) {
            ctx.push(`\n${s.title}:\n${(s.content || "").slice(0, 500)}`);
          }
        } catch (_) {}
      }
    }

    // Controls context
    ctx.push("\n=== CONTROL LIBRARY ===");
    const passingControls = (controls || []).filter(c => c.status === "passing");
    ctx.push(`Total Controls: ${(controls || []).length} (${passingControls.length} passing)`);
    (controls || []).slice(0, 40).forEach((c) => {
      ctx.push(`- [${c.control_id || ""}] ${c.title}: ${(c.description || "").slice(0, 200)} (Status: ${c.status})`);
    });

    // Policies context
    ctx.push("\n=== POLICIES ===");
    (policies || []).slice(0, 15).forEach((p) => {
      ctx.push(`- ${p.title}: ${(p.description || "").slice(0, 200)}`);
    });

    // Evidence context
    ctx.push("\n=== EVIDENCE INVENTORY ===");
    ctx.push(`Total Evidence Items: ${(evidence || []).length}`);
    (evidence || []).slice(0, 20).forEach((e) => {
      ctx.push(`- ${e.title || e.name || "Evidence"}: ${(e.description || "").slice(0, 150)}`);
    });

    // Framework coverage
    ctx.push("\n=== FRAMEWORK COVERAGE ===");
    (frameworks || []).slice(0, 10).forEach((f) => {
      ctx.push(`- ${f.name} (${f.code || ""}): ${f.total_requirements || 0} requirements`);
    });

    const context = ctx.join("\n");

    // Batch questions (max 15 per LLM call to keep prompt manageable)
    const batchSize = 15;
    const batches = [];
    for (let i = 0; i < pending.length; i += batchSize) {
      batches.push(pending.slice(i, i + batchSize));
    }

    let totalDrafted = 0;
    let totalNeedsInput = 0;

    for (const batch of batches) {
      const questionsBlock = batch.map((q, idx) => `${idx}. [${q.section || "general"}] ${q.question}`).join("\n");

      const prompt = `You are an expert security compliance assistant drafting responses to an INBOUND security questionnaire from a customer/prospect (${questionnaire.client_name || "our customer"}). 

Using ONLY the approved organizational context below (Trust Center content, control library, policies, evidence, and framework coverage), write a concise, accurate, and professional answer (max 400 chars) for each question.

Rules:
- Only state what is supported by the context — do not fabricate
- If the context fully supports an answer, set confidence to "drafted"
- If context partially supports it, give a best-effort answer and set confidence to "needs_input"
- Reference specific controls or evidence by ID where relevant (e.g. "See control AC-001")
- Match the tone of a formal security questionnaire response

CONTEXT:
${context}

QUESTIONS:
${questionsBlock}

Return JSON: { "answers": [{ "index": number, "answer": string, "confidence": "drafted"|"needs_input", "source_control_id": string|null, "source_evidence_id": string|null }] }`;

      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              answers: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    answer: { type: "string" },
                    confidence: { type: "string" },
                    source_control_id: { type: "string" },
                    source_evidence_id: { type: "string" },
                  },
                },
              },
            },
          },
        });

        const answers = res.answers || (res.data && res.data.answers) || [];

        for (const a of answers) {
          const item = batch[a.index];
          if (!item) continue;
          try {
            await sr.entities.QuestionnaireItem.update(item.id, {
              suggested_answer: a.answer,
              confidence: a.confidence === "needs_input" ? "needs_input" : "drafted",
              status: "drafted",
              source_control_id: a.source_control_id || null,
              source_evidence_id: a.source_evidence_id || null,
            });
            totalDrafted++;
            if (a.confidence === "needs_input") totalNeedsInput++;
          } catch (_) {}
        }
      } catch (e) {
        console.error("LLM batch error:", e?.message);
      }
    }

    // Update questionnaire status
    const totalCount = (items || []).length;
    const draftedCount = (items || []).filter(i => i.status === "drafted" || i.status === "answered").length + totalDrafted;
    try {
      await sr.entities.SecurityQuestionnaire.update(questionnaireId, {
        status: "drafting",
        drafted_count: draftedCount,
      });
    } catch (_) {}

    return Response.json({
      status: "completed",
      questionnaire_id: questionnaireId,
      customer: questionnaire.client_name,
      total_questions: pending.length,
      answers_drafted: totalDrafted,
      needs_human_input: totalNeedsInput,
      confidence_rate: totalDrafted > 0 ? Math.round(((totalDrafted - totalNeedsInput) / totalDrafted) * 100) : 0,
      sources_used: {
        trust_center: tc ? true : false,
        controls: (controls || []).length,
        policies: (policies || []).length,
        evidence: (evidence || []).length,
        frameworks: (frameworks || []).length,
      },
      message: `AI auto-response complete — ${totalDrafted} answers drafted from Trust Center + control library (${totalNeedsInput} need human review).`,
    });
  } catch (error) {
    console.error("autoRespondCustomerQuestionnaire error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});