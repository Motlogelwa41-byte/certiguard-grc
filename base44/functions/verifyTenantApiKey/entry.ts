import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Extract API key from Authorization header or x-api-key
    const authHeader = req.headers.get('authorization') || '';
    const xApiKey = req.headers.get('x-api-key') || '';
    const apiKey = xApiKey || authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      return Response.json({ valid: false, error: 'Missing API key' }, { status: 401 });
    }

    // Service-role lookup: find the TenantApiKey record matching this key
    const keys = await base44.asServiceRole.entities.TenantApiKey.filter({ api_key: apiKey, is_active: true });
    if (!keys || keys.length === 0) {
      return Response.json({ valid: false, error: 'Invalid or revoked API key' }, { status: 401 });
    }

    const apiKeyRecord = keys[0];
    const tenantId = apiKeyRecord.tenant_id;
    if (!tenantId) {
      return Response.json({ valid: false, error: 'API key not linked to a tenant' }, { status: 403 });
    }

    // --- Token-bucket rate limiting (per-hour window) ---
    const now = new Date();
    const rateLimitPerHour = apiKeyRecord.rate_limit_per_hour || 1000;
    const windowStart = apiKeyRecord.hour_window_start ? new Date(apiKeyRecord.hour_window_start) : null;
    const hourMs = 60 * 60 * 1000;

    let requestsThisHour = apiKeyRecord.requests_this_hour || 0;
    let windowStartDate = windowStart;

    // Reset window if more than an hour has passed
    if (!windowStartDate || (now.getTime() - windowStartDate.getTime()) >= hourMs) {
      requestsThisHour = 0;
      windowStartDate = now;
    }

    // Check if rate limit exceeded
    if (requestsThisHour >= rateLimitPerHour) {
      return Response.json({
        valid: false,
        error: 'Rate limit exceeded',
        retry_after_seconds: Math.ceil((hourMs - (now.getTime() - windowStartDate.getTime())) / 1000),
      }, { status: 429 });
    }

    // Increment counter and persist
    requestsThisHour += 1;
    await base44.asServiceRole.entities.TenantApiKey.update(apiKeyRecord.id, {
      requests_this_hour: requestsThisHour,
      hour_window_start: windowStartDate.toISOString(),
      last_used_at: now.toISOString(),
    });

    // Look up the tenant for context
    const tenant = await base44.asServiceRole.entities.Tenant.get(tenantId).catch(() => null);

    return Response.json({
      valid: true,
      tenant_id: tenantId,
      tenant_name: tenant?.name || null,
      key_label: apiKeyRecord.label,
      rate_limit_per_hour: rateLimitPerHour,
      requests_remaining: rateLimitPerHour - requestsThisHour,
    });
  } catch (error) {
    return Response.json({ valid: false, error: error.message }, { status: 500 });
  }
}