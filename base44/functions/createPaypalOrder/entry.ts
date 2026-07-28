import { secrets } from 'base44:runtime';

// USD amounts in cents for each plan + billing cycle
const PLAN_AMOUNTS = {
  starter_monthly: 49900,
  starter_annual: 478800,
  professional_monthly: 149900,
  professional_annual: 1438800
};

function paypalBase() {
  const mode = (secrets.get('PAYPAL_MODE') || 'live').toLowerCase();
  return mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
}

async function paypalAccessToken() {
  const clientId = secrets.get('PAYPAL_CLIENT_ID');
  const secret = secrets.get('PAYPAL_CLIENT_SECRET');
  if (!clientId || !secret) throw new Error('PayPal credentials not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in app secrets.');
  const auth = btoa(`${clientId}:${secret}`);
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('PayPal auth failed:', err);
    throw new Error('PayPal authentication failed');
  }
  const data = await res.json();
  return data.access_token;
}

export default async function(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tier, billing_cycle, tenant_id, tenant_name, billing_email } = body || {};
    const amount = PLAN_AMOUNTS[`${tier}_${billing_cycle}`];
    if (!amount) return Response.json({ error: 'Invalid plan or billing cycle' }, { status: 400 });

    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const token = await paypalAccessToken();

    const orderRes = await fetch(`${paypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': crypto.randomUUID()
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: (amount / 100).toFixed(2) },
          description: `CertiGuard ${tier} plan (${billing_cycle})`,
          custom_id: tenant_id || '',
          invoice_id: `CG-${tier}-${billing_cycle}-${Date.now()}`
        }],
        payer: billing_email ? { email_address: billing_email } : undefined,
        application_context: {
          brand_name: 'CertiGuard',
          return_url: `${origin}/billing?status=success&provider=paypal`,
          cancel_url: `${origin}/billing?status=cancel`,
          user_action: 'PAY_NOW'
        }
      })
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error('PayPal order create failed:', err);
      return Response.json({ error: 'PayPal order creation failed' }, { status: 502 });
    }

    const orderData = await orderRes.json();
    const approval = (orderData.links || []).find((l) => l.rel === 'approve');
    if (!approval) return Response.json({ error: 'No approval link returned' }, { status: 502 });

    return Response.json({ url: approval.href, order_id: orderData.id });
  } catch (error) {
    console.error('createPaypalOrder error:', error?.message || error);
    return Response.json({ error: error?.message || 'PayPal checkout failed' }, { status: 500 });
  }
}