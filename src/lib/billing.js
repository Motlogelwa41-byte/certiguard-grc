import { base44 } from "@/api/base44Client";

/**
 * Start a DPO Pay checkout for a subscription plan.
 * DPO Pay supports Botswana (BWP) and international (USD) payments including Mobile Money.
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