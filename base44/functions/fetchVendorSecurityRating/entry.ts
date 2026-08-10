import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fetches an external security rating (BitSight/SecurityScorecard-style estimate)
// for a vendor's domain using AI + web search. Stores the rating + factors on the
// Vendor record and returns the breakdown.

function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function extractDomain(url) {
  if (!url) return null;
  try {
    const u = url.startsWith("http") ? new URL(url) : new URL("https://" + url);
    return u.hostname.replace(/^www\./, "");
  } catch (_) {
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { vendor_id } = body;

    if (!vendor_id) {
      return Response.json({ error: "vendor_id is required" }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const vendor = await sr.entities.Vendor.get(vendor_id).catch(() => null);
    if (!vendor) return Response.json({ error: "Vendor not found" }, { status: 404 });

    const domain = extractDomain(vendor.website) || (vendor.name || "").toLowerCase().replace(/\s+/g, "") + ".com";

    // Use InvokeLLM with web search to gather threat intel on the vendor domain
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a cybersecurity threat intelligence analyst. Assess the external security posture of the vendor "${vendor.name}" (domain: ${domain}, category: ${vendor.category || "unknown"}).

Search the web for any public security incidents, breach history, vulnerability disclosures, CVEs, reputation data, SSL/TLS posture, and known threat actor mentions for this organization over the last 24 months.

Return a JSON object with:
- "score": integer 0-100 (BitSight/SecurityScorecard-style security rating, where higher is better)
- "grade": letter grade A/B/C/D/F
- "summary": 2-3 sentence plain-English summary of their external security posture
- "factors": array of {factor, score (0-100), detail} covering: "Breach History", "Vulnerability Exposure", "TLS/SSL Posture", "Reputation", "Compliance Posture"
- "confidence": integer 0-100 (how confident you are in this rating given available data)

Be conservative — if data is sparse, lower the confidence and lean toward a neutral score rather than guessing.`,
      add_context_from_internet: true,
      model: "gemini_3_flash",
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          grade: { type: "string" },
          summary: { type: "string" },
          factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                factor: { type: "string" },
                score: { type: "number" },
                detail: { type: "string" }
              }
            }
          },
          confidence: { type: "number" }
        }
      }
    });

    const rating = llmRes || {};
    const score = Math.max(0, Math.min(100, Math.round(rating.score || 0)));
    const grade = rating.grade || gradeFromScore(score);

    await sr.entities.Vendor.update(vendor_id, {
      external_rating_score: score,
      external_rating_grade: grade,
      external_rating_source: "AI Threat Intel (web search)",
      external_rating_fetched_at: new Date().toISOString(),
      external_rating_factors: JSON.stringify(rating.factors || []),
      external_rating_summary: rating.summary || "",
    });

    return Response.json({
      success: true,
      vendor_id,
      vendor_name: vendor.name,
      domain,
      score,
      grade,
      summary: rating.summary,
      factors: rating.factors || [],
      confidence: rating.confidence || 0,
    });
  } catch (error) {
    console.error("fetchVendorSecurityRating error:", error?.message || error);
    return Response.json({ error: error?.message || "Failed to fetch vendor security rating" }, { status: 500 });
  }
});