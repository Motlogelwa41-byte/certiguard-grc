import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { mode, ...params } = body;

    const prompts: Record<string, string> = {
      risk: `You are a senior GRC risk analyst. Analyze the following risk scenario for a ${String(params.industry || '').replace(/_/g, ' ')} organization and provide:

1. **Risk Rating** (Critical/High/Medium/Low) with justification
2. **Likelihood Score** (1-5) and **Impact Score** (1-5) → Overall Risk Score
3. **Key Risk Drivers** (bullet list)
4. **Immediate Mitigation Steps** (numbered, actionable)
5. **Long-term Controls to Implement**
6. **Relevant Frameworks** that address this risk (SOC 2, ISO 27001, POPIA, etc.)
7. **Residual Risk** after mitigation

Scenario: ${params.scenario}

Be specific, practical, and reference SADC regulatory context where relevant.`,

      policy: `Generate a comprehensive, production-ready **${params.policyType || 'Information Security Policy'}** for ${params.companyName}.

Company context: ${params.companyContext || "A mid-sized organization operating in the SADC region."}

The policy must include:
1. **Purpose & Scope**
2. **Policy Statement**
3. **Roles & Responsibilities** (specific role names)
4. **Policy Requirements** (detailed, numbered)
5. **Procedures** (step-by-step)
6. **Compliance & Enforcement**
7. **Review & Update Schedule**
8. **Related Policies & Standards**
9. **Definitions & Glossary**
10. **Approval signature block**

Format in professional Markdown. Reference relevant frameworks (ISO 27001, SOC 2, POPIA as applicable). Make it ready to use immediately.`,

      controls: `You are a GRC controls expert. For the **${params.framework || 'SOC 2'}** framework, identify the top 15 most critical controls that organizations commonly miss or implement poorly.

Existing controls already in place: ${params.existingControls || "None specified"}

For each recommended control provide:
- **Control ID & Name**
- **Why it's critical** (1-2 sentences)
- **Implementation guidance** (3-5 bullet points)
- **Evidence required** for audit
- **Automation opportunity** (can this be automated?)
- **Priority**: Critical / High / Medium

Focus on gaps. Format as a structured, actionable list. Include SADC-specific regulatory considerations where relevant.`,

      incident: `You are a senior incident response analyst. Perform a structured root cause analysis for this ${String(params.incidentType || '').replace(/_/g, ' ')} incident:

Incident Description: ${params.incidentDesc}

Provide:
1. **Root Cause Analysis** (5 Whys methodology)
2. **Contributing Factors** (technical, process, human)
3. **Attack/Failure Timeline** (reconstruct if possible)
4. **Affected Systems & Data Classification**
5. **Immediate Containment Actions** (already taken or recommended)
6. **Eradication Steps** (numbered)
7. **Recovery Plan**
8. **Lessons Learned** (top 5)
9. **Preventive Controls to Implement**
10. **Regulatory Notification Requirements** (POPIA, GDPR, sector-specific)
11. **MTTR Benchmark** (how long similar incidents typically take to resolve)

Be detailed and technical. Format with clear headers.`,

      chat: `You are an expert GRC (Governance, Risk & Compliance) consultant with deep knowledge of SOC 2, ISO 27001, NIST CSF, POPIA, GDPR, PCI DSS, and SADC regional regulations including BOCRA, RBZ guidelines, and King IV.

Answer compliance questions clearly, cite specific framework requirements, and give practical actionable advice.

Conversation history:
${params.historyContext || ''}

Answer the latest user question thoroughly and practically. If referencing specific controls or clauses, cite them.`,
    };

    const prompt = prompts[mode];
    if (!prompt) return Response.json({ error: 'Invalid mode' }, { status: 400 });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ result });
  } catch (error) {
    console.error('aiHubAssistant error:', error?.message || error);
    return Response.json({ error: error?.message || 'Request failed' }, { status: 500 });
  }
}