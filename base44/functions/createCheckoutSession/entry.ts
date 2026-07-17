import Stripe from 'npm:stripe@14.21.0';

// Maps plan tier + billing cycle to the Stripe Price IDs created for this app.
const PRICE_MAP = {
  starter_monthly: 'price_1TuJXh8jGG7uWzBIILSDuL2X',
  starter_annual: 'price_1TuJXh8jGG7uWzBIv7HVFfQr',
  professional_monthly: 'price_1TuJXh8jGG7uWzBIamOBumTZ',
  professional_annual: 'price_1TuJXh8jGG7uWzBINfkvWMCV'
};

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { tier, billing_cycle, tenant_id, tenant_name, billing_email } = body || {};
    const priceId = PRICE_MAP[`${tier}_${billing_cycle}`];
    if (!priceId) {
      return Response.json({ error: 'Invalid plan or billing cycle' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://app.base44.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?status=cancel`,
      customer_email: billing_email || undefined,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        tenant_id,
        tenant_name: tenant_name || '',
        tier,
        billing_cycle
      },
      subscription_data: {
        metadata: {
          tenant_id,
          tenant_name: tenant_name || '',
          tier,
          billing_cycle
        }
      }
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckoutSession error:', error?.message || error);
    return Response.json({ error: error?.message || 'Checkout failed' }, { status: 500 });
  }
});