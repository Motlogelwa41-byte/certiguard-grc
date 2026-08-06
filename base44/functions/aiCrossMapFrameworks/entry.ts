import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const { control_title, control_description, control_category } = body;

  if (!control_title) {
    return Response.json({ error: "control_title is required" }, { status: 400 });
  }

  try {
    const prompt = `You are a GRC compliance expert. Given the following security control, identify which framework requirements it satisfies across these frameworks: SOC 2, ISO 27001, NIST CSF, HIPAA Security Rule, PCI-DSS v4, GDPR, and POPIA (South Africa).

Control Title: ${control_title}
Control Description: ${control_description || "N/A"}
Control Category: ${control_category || "N/A"}

Return a JSON array of mappings. Each mapping should have:
- framework: the framework name
- requirement_ref: the specific requirement/clause reference (e.g. "CC6.1", "A.9.1.1", "PR.AC-1")
- requirement_title: brief title of the requirement
- coverage_pct: estimated coverage percentage (0-100)
- notes: brief explanation of how the control maps

Only include mappings where coverage_pct is 50 or higher. Return at most 15 mappings.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          mappings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                framework: { type: "string" },
                requirement_ref: { type: "string" },
                requirement_title: { type: "string" },
                coverage_pct: { type: "number" },
                notes: { type: "string" },
              },
            },
          },
        },
      },
    });

    return Response.json({ success: true, mappings: result.mappings || [] });
  } catch (e) {
    return Response.json({ error: e.message, mappings: [] }, { status: 500 });
  }
}