import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const { tenant_id } = await req.json();
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!tenant_id || user.tenant_id !== tenant_id) {
      return Response.json({ error: 'Tenant mismatch' }, { status: 403 });
    }

    const tenant = await base44.asServiceRole.entities.Tenant.get(tenant_id);
    if (!tenant?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found. Please subscribe first.' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const session = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${origin}/billing`
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createPortalSession error:', error?.message || error);
    return Response.json({ error: error?.message || 'Portal failed' }, { status: 500 });
  }
});