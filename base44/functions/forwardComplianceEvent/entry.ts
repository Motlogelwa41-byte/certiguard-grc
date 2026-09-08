import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { secrets } from 'base44:runtime';

// Forwards a compliance event to all active tenant WebhookEndpoints subscribed to the event type.
// Invoked by workflows (control failure, risk exceeded, etc.) or manually from the SIEM Webhooks page.
// Payload: { tenant_id?, event_type, event_data }
// Signs each delivery with HMAC-SHA256 using the endpoint's secret_token (X-CertiGuard-Signature header).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event_type, event_data } = body;
    if (!event_type) {
      return Response.json({ ok: false, error: 'event_type is required' }, { status: 400 });
    }

    // Resolve tenant strictly from the authenticated user, or from a verified
    // internal service-role token (workflow invocations). Never from untrusted
    // body input alone — prevents cross-tenant authorization bypass.
    let tenant_id = null;
    try {
      const user = await base44.auth.me();
      tenant_id = user?.data?.tenant_id || null;
    } catch (_) { /* not a user request — check service-role token below */ }

    if (!tenant_id) {
      const internalToken = req.headers.get('x-internal-token') || body.internal_token;
      const expectedToken = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (internalToken && expectedToken && internalToken === expectedToken) {
        // Verified service-role invocation — allow tenant_id from body
        tenant_id = body.tenant_id;
      }
    }

    if (!tenant_id) {
      return Response.json({ ok: false, error: 'Authentication required to forward compliance events' }, { status: 401 });
    }

    const endpoints = await base44.asServiceRole.entities.WebhookEndpoint.filter({
      tenant_id, is_active: true,
    });
    const subscribed = (endpoints || []).filter((e) =>
      (e.event_types || []).includes(event_type) || (e.event_types || []).includes('all')
    );
    if (subscribed.length === 0) {
      return Response.json({ ok: true, forwarded: 0, reason: 'No subscribed endpoints' });
    }

    const payload = {
      event_type,
      event_data: event_data || {},
      tenant_id,
      sent_at: new Date().toISOString(),
    };
    const payloadStr = JSON.stringify(payload);
    const results = [];

    for (const ep of subscribed) {
      const signature = await hmacSha256(ep.secret_token || '', payloadStr);
      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CertiGuard-Signature': `sha256=${signature}`,
            'X-CertiGuard-Event': event_type,
          },
          body: payloadStr,
        });
        const ok = res.ok;
        results.push({ id: ep.id, name: ep.name, status_code: res.status, ok });
        await base44.asServiceRole.entities.WebhookEndpoint.update(ep.id, {
          last_triggered: new Date().toISOString(),
          last_status: ok ? 'success' : 'failed',
          last_status_code: res.status,
          last_error: ok ? '' : `HTTP ${res.status}`,
          delivery_count: (ep.delivery_count || 0) + 1,
        }).catch(() => {});
      } catch (err) {
        results.push({ id: ep.id, name: ep.name, ok: false, error: err.message });
        await base44.asServiceRole.entities.WebhookEndpoint.update(ep.id, {
          last_triggered: new Date().toISOString(),
          last_status: 'failed',
          last_error: (err.message || 'Delivery failed').slice(0, 500),
        }).catch(() => {});
      }
    }

    const forwarded = results.filter((r) => r.ok).length;
    return Response.json({ ok: true, forwarded, total: subscribed.length, results });
  } catch (error) {
    console.error('forwardComplianceEvent error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Event forwarding failed' }, { status: 500 });
  }
});

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}