import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// SCIM 2.0 inbound endpoint — receives push-based provisioning/deprovisioning
// events from identity providers (Okta, Azure AD, OneLogin, JumpCloud).
// Authenticates via Bearer token matched against IdentityProvider.scim_inbound_token.
// Uses service role for all entity operations (no user auth — webhook style).
//
// Supported operations (IdP configures base URL as):
//   POST   /functions/scimEndpoint              → create user
//   GET    /functions/scimEndpoint?id={id}      → retrieve user
//   GET    /functions/scimEndpoint?filter=...   → list/filter users
//   PUT    /functions/scimEndpoint?id={id}      → full update
//   PATCH  /functions/scimEndpoint?id={id}      → partial update
//   DELETE /functions/scimEndpoint?id={id}      → deactivate user

function scimError(status, detail) {
  return Response.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
    status: String(status),
    detail,
  }, { status });
}

function dirUserToScim(u) {
  const parts = (u.full_name || "").split(" ");
  const givenName = parts[0] || "";
  const familyName = parts.slice(1).join(" ");
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: u.id,
    externalId: u.external_id || u.id,
    userName: u.email,
    name: { givenName, familyName },
    displayName: u.full_name || "",
    emails: u.email ? [{ value: u.email, type: "work", primary: true }] : [],
    active: u.status === "active",
    title: u.title || "",
    department: u.department || "",
    groups: (u.groups || []).map((g) => ({ value: g, display: g })),
    meta: {
      resourceType: "User",
      created: u.created_date || new Date().toISOString(),
      lastModified: u.updated_date || new Date().toISOString(),
    },
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // --- Authenticate via Bearer token ---
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return scimError(401, "Authorization Bearer token required");

    // Look up the IdentityProvider by the inbound token (service role — no user auth)
    const idps = await base44.asServiceRole.entities.IdentityProvider.filter({
      scim_inbound_token: token,
      scim_enabled: true,
      status: "active",
    });
    if (!idps || idps.length === 0) return scimError(401, "Invalid or expired bearer token");
    const idp = idps[0];
    const tenantId = idp.tenant_id;
    if (!tenantId) return scimError(403, "Identity provider has no tenant association");

    const url = new URL(req.url);
    const userId = url.searchParams.get("id");
    const method = req.method;

    // --- POST: Create user ---
    if (method === "POST") {
      const body = await req.json();
      const email = body.userName || (body.emails?.[0]?.value) || "";
      if (!email) return scimError(400, "userName or emails[0].value is required");

      // De-duplicate: don't create if email already exists in this tenant
      const existing = await base44.asServiceRole.entities.DirectoryUser.filter({
        tenant_id: tenantId,
        email,
      });
      if (existing && existing.length > 0) {
        return scimError(409, `User with email ${email} already exists`);
      }

      const givenName = body.name?.givenName || "";
      const familyName = body.name?.familyName || "";
      const fullName = body.displayName || `${givenName} ${familyName}`.trim() || email;

      const created = await base44.asServiceRole.entities.DirectoryUser.create({
        tenant_id: tenantId,
        idp_id: idp.id,
        idp_name: idp.name,
        external_id: body.externalId || body.id || email,
        email,
        full_name: fullName,
        status: body.active === false ? "suspended" : "active",
        title: body.title || "",
        department: body.department || "",
        groups: (body.groups || []).map((g) => g.value || g.display || g),
        roles: [],
        provisioning_status: "synced",
        last_synced_at: new Date().toISOString(),
      });

      return Response.json(dirUserToScim(created), { status: 201 });
    }

    // --- GET: Retrieve single user ---
    if (method === "GET" && userId) {
      const user = await base44.asServiceRole.entities.DirectoryUser.get(userId);
      if (!user || user.tenant_id !== tenantId) return scimError(404, "User not found");
      return Response.json(dirUserToScim(user));
    }

    // --- GET: List / filter users ---
    if (method === "GET") {
      const filter = url.searchParams.get("filter");
      const startIndex = parseInt(url.searchParams.get("startIndex") || "1", 10);
      const count = Math.min(parseInt(url.searchParams.get("count") || "100", 10), 500);

      let users = await base44.asServiceRole.entities.DirectoryUser.filter({
        tenant_id: tenantId,
        idp_id: idp.id,
      });

      // Simple SCIM filter support: emails.value eq "x" or userName eq "x"
      if (filter) {
        const m = filter.match(/emails\.value\s+eq\s+"([^"]+)"/) || filter.match(/userName\s+eq\s+"([^"]+)"/);
        if (m) users = users.filter((u) => u.email === m[1]);
      }

      const total = users.length;
      const paged = users.slice(startIndex - 1, startIndex - 1 + count);

      return Response.json({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
        totalResults: total,
        startIndex,
        itemsPerPage: paged.length,
        Resources: paged.map(dirUserToScim),
      });
    }

    // --- PUT: Full update ---
    if (method === "PUT") {
      if (!userId) return scimError(400, "User id required as query param (?id=)");
      const body = await req.json();
      const user = await base44.asServiceRole.entities.DirectoryUser.get(userId);
      if (!user || user.tenant_id !== tenantId) return scimError(404, "User not found");

      const email = body.userName || (body.emails?.[0]?.value) || user.email;
      const givenName = body.name?.givenName || "";
      const familyName = body.name?.familyName || "";
      const fullName = body.displayName || `${givenName} ${familyName}`.trim() || email;

      const updated = await base44.asServiceRole.entities.DirectoryUser.update(userId, {
        email,
        full_name: fullName,
        status: body.active === false ? "suspended" : "active",
        title: body.title || "",
        department: body.department || "",
        groups: (body.groups || []).map((g) => g.value || g.display || g),
        last_synced_at: new Date().toISOString(),
      });

      return Response.json(dirUserToScim(updated));
    }

    // --- PATCH: Partial update ---
    if (method === "PATCH") {
      if (!userId) return scimError(400, "User id required as query param (?id=)");
      const body = await req.json();
      const user = await base44.asServiceRole.entities.DirectoryUser.get(userId);
      if (!user || user.tenant_id !== tenantId) return scimError(404, "User not found");

      const updates = {};
      for (const op of body.Operations || []) {
        if (op.op === "replace") {
          if (op.path === "active") {
            updates.status = op.value === true || op.value === "true" ? "active" : "suspended";
          } else if (op.path === "userName" || op.path === "emails.value" || op.path === "emails") {
            updates.email = typeof op.value === "string" ? op.value : (op.value?.value || op.value?.[0]?.value || user.email);
          } else if (op.path === "displayName") {
            updates.full_name = op.value;
          } else if (op.path === "title") {
            updates.title = op.value;
          } else if (op.path === "department") {
            updates.department = op.value;
          }
        }
      }
      updates.last_synced_at = new Date().toISOString();

      const updated = await base44.asServiceRole.entities.DirectoryUser.update(userId, updates);
      return Response.json(dirUserToScim(updated));
    }

    // --- DELETE: Deactivate ---
    if (method === "DELETE") {
      if (!userId) return scimError(400, "User id required as query param (?id=)");
      const user = await base44.asServiceRole.entities.DirectoryUser.get(userId);
      if (!user || user.tenant_id !== tenantId) return scimError(404, "User not found");

      await base44.asServiceRole.entities.DirectoryUser.update(userId, {
        status: "deprovisioned",
        last_synced_at: new Date().toISOString(),
      });

      return new Response(null, { status: 204 });
    }

    return scimError(405, `Method ${method} not supported`);
  } catch (error) {
    console.error("scimEndpoint error", error?.message || error);
    return scimError(500, error?.message || "Internal server error");
  }
}