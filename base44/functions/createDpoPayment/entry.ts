import { secrets } from 'base44:runtime';

// USD amounts in cents for each plan + billing cycle (matches Stripe/PayPal pricing)
const PLAN_AMOUNTS = {
  starter_monthly: 49900,
  starter_annual: 478800,
  professional_monthly: 149900,
  professional_annual: 1438800
};

// DPO API base URL — test sandbox vs live production
function dpoBase() {
  const mode = (secrets.get('DPO_MODE') || 'live').toLowerCase();
  return mode === 'test' ? 'https://secure1.dpopg.com' : 'https://secure.3gdirectpay.com';
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tier, billing_cycle, tenant_id, tenant_name, billing_email } = body || {};
    const amountCents = PLAN_AMOUNTS[`${tier}_${billing_cycle}`];
    if (!amountCents) {
      return Response.json({ error: 'Invalid plan or billing cycle' }, { status: 400 });
    }

    const companyToken = secrets.get('DPO_COMPANY_TOKEN');
    const serviceType = secrets.get('DPO_SERVICE_TYPE');
    if (!companyToken || !serviceType) {
      throw new Error('DPO credentials not configured. Add DPO_COMPANY_TOKEN and DPO_SERVICE_TYPE in app secrets.');
    }

    const amount = (amountCents / 100).toFixed(2);
    const origin = req.headers.get('origin') || 'https://app.base44.com';
    const companyRef = `CG-${tier}-${billing_cycle}-${Date.now()}`;
    const serviceDate = new Date().toISOString().slice(0, 10);

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<APIRequest>
  <CompanyToken>${companyToken}</CompanyToken>
  <Request>createToken</Request>
  <Transaction>
    <PaymentAmount>${amount}</PaymentAmount>
    <PaymentCurrency>USD</PaymentCurrency>
    <CompanyRef>${companyRef}</CompanyRef>
    <CompanyRefUnique>1</CompanyRefUnique>
    <RedirectURL>${origin}/billing?status=success&amp;provider=dpo</RedirectURL>
    <BackURL>${origin}/billing?status=cancel</BackURL>
    ${billing_email ? `<customerEmail>${billing_email}</customerEmail>` : ''}
  </Transaction>
  <Services>
    <Service>
      <ServiceType>${serviceType}</ServiceType>
      <ServiceDescription>CertiGuard ${tier} plan (${billing_cycle})</ServiceDescription>
      <ServiceDate>${serviceDate}</ServiceDate>
    </Service>
  </Services>
</APIRequest>`;

    const res = await fetch(`${dpoBase()}/API/v6/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        Accept: 'application/xml'
      },
      body: xml
    });

    const text = await res.text();
    console.log('DPO createToken response:', text);

    // Parse result code, token, and explanation from XML response
    const resultMatch = text.match(/<Result>(.*?)<\/Result>/);
    const tokenMatch = text.match(/<TransToken>(.*?)<\/TransToken>/);
    const explainMatch = text.match(/<ResultExplanation>(.*?)<\/ResultExplanation>/);

    const result = resultMatch ? resultMatch[1].trim() : '';
    const token = tokenMatch ? tokenMatch[1].trim() : '';
    const explanation = explainMatch ? explainMatch[1].trim() : 'Unknown DPO error';

    // Result code "000" = success
    if (result !== '000' || !token) {
      console.error('DPO createToken failed:', result, explanation);
      return Response.json({ error: `DPO payment creation failed: ${explanation}` }, { status: 502 });
    }

    return Response.json({
      url: `${dpoBase()}/pay.asp?ID=${token}`,
      order_id: companyRef
    });
  } catch (error) {
    console.error('createDpoPayment error:', error?.message || error);
    return Response.json({ error: error?.message || 'DPO checkout failed' }, { status: 500 });
  }
}