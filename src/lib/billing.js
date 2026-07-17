import { base44 } from "@/api/base44Client";

/**
 * Start a Stripe Checkout session for a subscription plan.
 * Blocks checkout inside an iframe (preview) — Stripe requires top-level navigation.
 */
export async function startCheckout(tier, billingCycle) {
  if (window.self !== window.top) {
    alert("Checkout works only from the published app. Open the app in a new tab to subscribe.");
    return;
  }
  try {
    const me = await base44.auth.me().catch(() => null);
    if (!me) {
      window.location.href = "/register";
      return;
    }
    const tenantId = me.tenant_id || me.data?.tenant_id;
    if (!tenantId) {
      alert("Please complete your workspace setup before subscribing.");
      window.location.href = "/tenant-admin";
      return;
    }
    const res = await base44.functions.invoke("createCheckoutSession", {
      tier,
      billing_cycle: billingCycle,
      tenant_id: tenantId,
      tenant_name: me.full_name || me.email,
      billing_email: me.email
    });
    if (res?.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert("Checkout could not be started.");
    }
  } catch (e) {
    alert("Could not start checkout: " + (e?.message || "unknown error"));
  }
}

/**
 * Open the Stripe customer portal so the admin can update cards, change plans, or cancel.
 */
export async function openBillingPortal() {
  if (window.self !== window.top) {
    alert("Billing management works only from the published app. Open the app in a new tab.");
    return;
  }
  try {
    const me = await base44.auth.me();
    const tenantId = me.tenant_id || me.data?.tenant_id;
    if (!tenantId) {
      alert("No workspace found.");
      return;
    }
    const res = await base44.functions.invoke("createPortalSession", { tenant_id: tenantId });
    if (res?.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert(res?.data?.error || "Could not open billing portal.");
    }
  } catch (e) {
    alert("Could not open billing portal: " + (e?.message || "unknown error"));
  }
}