import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public (no-auth) function called by the login page to detect whether
// an email's domain has an enterprise SSO provider configured. Returns
// only non-sensitive metadata (provider type + name) so the login page
// can show the right SSO button or a "contact admin" hint.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return Response.json({ sso_configured: false });
    }
    const domain = email.split("@").pop();

    // Search all IdentityProvider records (service role) for a matching domain.
    const idps = await base44.asServiceRole.entities.IdentityProvider
      .filter({ status: "active" })
      .catch(() => []);

    const match = (idps || []).find((idp) => {
      const domains = (idp.domains || []).map((d) => d.toLowerCase().trim());
      return domains.includes(domain);
    });

    if (!match) {
      return Response.json({ sso_configured: false });
    }

    // Also check if this tenant requires SSO (password login disabled)
    let require_sso = false;
    if (match.tenant_id) {
      const settings = await base44.asServiceRole.entities.TenantSettings
        .filter({ tenant_id: match.tenant_id })
        .catch(() => []);
      if (settings && settings.length > 0) {
        require_sso = settings[0].require_sso === true;
      }
    }

    return Response.json({
      sso_configured: true,
      require_sso,
      provider_name: match.name,
      provider_type: match.type,
      // Map provider type to the OIDC button the user should click
      login_method: match.type === "google_workspace" ? "google"
        : match.type === "azure_ad" ? "microsoft"
        : "enterprise_sso",
    });
  } catch (error) {
    console.error("checkSsoDomain error:", error?.message || error);
    return Response.json({ sso_configured: false });
  }
});