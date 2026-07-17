import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import Stripe from 'npm:stripe@14.21.0';

const TIER_LIMITS = {
  starter: { maxUsers: 10, maxFrameworks: 5 },
  professional: { maxUsers: 100, maxFrameworks: 20 },
  enterprise: { maxUsers: 999999, maxFrameworks: 999999 }
};

const STATUS_MAP = {
  active: 'active',
  past_due: 'past_due',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  incomplete: 'expired',
  incomplete_expired: 'expired',
  trialing: 'trial'
};

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err?.message || err);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const data = event.data.object;
    const md = data.metadata || {};

    if (event.type === 'checkout.session.completed') {
      const tenantId = md.tenant_id;
      const tier = md.tier;
      const billingCycle = md.billing_cycle || 'monthly';
      if (tenantId && TIER_LIMITS[tier]) {
        const limits = TIER_LIMITS[tier];
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          subscription_tier: tier,
          subscription_status: 'active',
          trial_ends_at: null,
          max_users: limits.maxUsers,
          max_frameworks: limits.maxFrameworks,
          billing_cycle: billingCycle,
          stripe_customer_id: data.customer,
          stripe_subscription_id: data.subscription
        });
        await base44.asServiceRole.entities.Subscription.create({
          tenant_id: tenantId,
          tenant_name: md.tenant_name || '',
          tier,
          status: 'active',
          billing_cycle: billingCycle,
          start_date: new Date().toISOString().slice(0, 10),
          auto_renew: true
        }).catch(() => {});
        await base44.asServiceRole.functions.invoke('logAudit', {
          action: 'create',
          entity_type: 'Subscription',
          entity_id: tenantId,
          entity_name: `${tier} (${billingCycle})`,
          changes: JSON.stringify({ tier, billing_cycle: billingCycle }),
          severity: 'info'
        }).catch(() => {});
      }
    } else if (event.type === 'customer.subscription.updated') {
      const tenantId = md.tenant_id;
      if (tenantId) {
        const mapped = STATUS_MAP[data.status] || 'expired';
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          subscription_status: mapped
        }).catch(() => {});
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const tenantId = md.tenant_id;
      if (tenantId) {
        await base44.asServiceRole.entities.Tenant.update(tenantId, {
          subscription_status: 'cancelled'
        }).catch(() => {});
        await base44.asServiceRole.functions.invoke('logAudit', {
          action: 'delete',
          entity_type: 'Subscription',
          entity_id: tenantId,
          entity_name: 'Subscription cancelled',
          changes: JSON.stringify({ status: 'cancelled' }),
          severity: 'warning'
        }).catch(() => {});
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook handler error:', error?.message || error);
    return Response.json({ error: error?.message || 'Handler failed' }, { status: 500 });
  }
});