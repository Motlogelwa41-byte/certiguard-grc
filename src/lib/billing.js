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

/**
 * Start a PayPal checkout for a subscription plan (no US registration required).
 * Blocks checkout inside an iframe (preview) — PayPal requires top-level navigation.
 */
export async function startPaypalCheckout(tier, billingCycle) {
  if (window.self !== window.top) {
    alert("Checkout works only from the published app. Open the app in a new tab to subscribe.");
    return;
  }
  try {
    const me = await base44.auth.me().catch(() => null);
    const tenantId = me?.tenant_id || me?.data?.tenant_id;
    const res = await base44.functions.invoke("createPaypalOrder", {
      tier,
      billing_cycle: billingCycle,
      tenant_id: tenantId || "",
      tenant_name: me?.full_name || me?.email || "",
      billing_email: me?.email || ""
    });
    if (res?.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert(res?.data?.error || "PayPal checkout could not be started.");
    }
  } catch (e) {
    alert("Could not start PayPal checkout: " + (e?.message || "unknown error"));
  }
}

/**
 * Start a DPO Pay checkout for a subscription plan.
 * DPO Pay supports Botswana (BWP) and international (USD) payments.
 * Blocks checkout inside an iframe (preview) — DPO requires top-level navigation.
 */
export async function startDpoCheckout(tier, billingCycle) {
  if (window.self !== window.top) {
    alert("Checkout works only from the published app. Open the app in a new tab to subscribe.");
    return;
  }
  try {
    const me = await base44.auth.me().catch(() => null);
    const tenantId = me?.tenant_id || me?.data?.tenant_id;
    const res = await base44.functions.invoke("createDpoPayment", {
      tier,
      billing_cycle: billingCycle,
      tenant_id: tenantId || "",
      tenant_name: me?.full_name || me?.email || "",
      billing_email: me?.email || ""
    });
    if (res?.data?.url) {
      window.location.href = res.data.url;
    } else {
      alert(res?.data?.error || "DPO checkout could not be started.");
    }
  } catch (e) {
    alert("Could not start DPO checkout: " + (e?.message || "unknown error"));
  }
}