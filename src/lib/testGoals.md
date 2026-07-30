# CertiGuard GRC — Testing Agent Goals

Copy/paste these goals into the Base44 Testing Agent (test-tube icon, side panel).

---

## Test Account Credentials

**Admin:** boitshwarelomotlogelwa41@gmail.com
**Compliance Officer:** qa.compliance@ethicaledge.co.bw (must accept invite email first)
**Tenant:** Ethical Edge GRC Consulting (tenant_id: 6a5e0c283b019fab0fc65dd9)

---

## 1. Authentication & Onboarding

- "Register a new user account with email testuser@example.com and password Test@12345678, complete the OTP verification, and verify the user lands on the dashboard."
- "Log in with email boitshwarelomotlogelwa41@gmail.com and verify the admin dashboard loads with all navigation sections visible."
- "Log in and navigate to the Architecture page — verify the platform diagram renders and lists DPO Pay as the billing connector (not Stripe)."

## 2. Framework & Control Management

- "As an admin, go to Frameworks, verify the 'SOC 2 Type II' framework exists with 4 of 6 controls passing and a readiness score of 65%."
- "Go to Controls and verify 6 controls are listed (AC-001, CM-001, DE-001, IR-001, VM-001, RA-001). Filter by status 'failing' and confirm IR-001 Incident Response Plan appears."
- "Open control AC-001 (Role-Based Access Control) and verify it shows 3 evidence items, owner 'Boitshwarelo Motlogelwa', and next review date 2026-10-15."
- "Create a new control titled 'Network Segmentation' with category 'network_security', severity 'high', and status 'not_tested'. Verify it appears in the controls list after saving."

## 3. Risk Management

- "Go to Risks and verify 3 risks are listed (RISK-001, RISK-002, RISK-003). Confirm RISK-001 'Data Breach via Phishing Attack' has a risk score of 20 and status 'mitigating'."
- "Create a new risk titled 'Ransomware Attack on File Servers' with likelihood 3, impact 5, category 'technical', and treatment 'mitigate'. Verify the risk score is calculated as 15."
- "Open RISK-003 'Third-Party Vendor Data Exposure' and verify it shows formal risk acceptance by Boitshwarelo Motlogelwa with acceptance expiry date 2027-07-15."
- "Navigate to the Risk Heatmap page and verify the 3 risks are plotted on the 5x5 likelihood vs impact grid."

## 4. Vendor Management

- "Go to Vendors and verify 2 vendors are listed: Amazon Web Services (high risk, approved) and Datadog (medium risk, approved)."
- "Open the AWS vendor record and verify it shows SOC 2, ISO 27001, and GDPR compliance as true, with next assessment date 2027-06-15."
- "Create a new vendor titled 'Microsoft 365' with category 'saas', risk level 'medium', and status 'pending_review'. Verify it appears in the vendor list."
- "Go to Vendor Assessments and verify the assessment workflow can be initiated for the AWS vendor."

## 5. Policy Management

- "Go to Policies and verify the 'Information Security Policy' (v2.0) exists with status 'approved' and next review date 2027-07-01."
- "Open the Information Security Policy and verify the full content renders including sections on Access Control, Data Protection, Incident Response, and Acceptable Use."
- "Create a new policy titled 'Data Retention Policy' with category 'data_privacy', status 'draft', and acknowledgment required. Verify it appears in the policies list."

## 6. Certification & Audit Readiness

- "Go to Certifications and verify 'SOC 2 Type II 2026' (CERT-001) exists with status 'audit_in_progress' and certifying body 'Deloitte & Touche'."
- "Open CERT-001 and verify it shows audit window Aug-Oct 2026, 4 milestones with 2 completed, and 6 linked controls."
- "Go to the Compliance Readiness Report page and verify it generates a report showing 65% readiness with 4 passing and 2 non-passing controls."

## 7. Incident Management

- "Go to Incidents and create a new incident titled 'Suspected Phishing Email' with type 'phishing', severity 'medium', and status 'detected'. Verify it appears in the incidents list."
- "Navigate to Incident Command and verify the incident escalation chain and timeline features are accessible."

## 8. Evidence Management

- "Go to Evidence Manager and verify the page loads with evidence filtering by control, status, and type."
- "Upload a test evidence file (screenshot) and link it to control IR-001. Verify the evidence is saved with status 'pending_review'."

## 9. Dashboard & Reporting

- "Load the main Dashboard and verify it shows framework readiness, control status summary, risk overview, and recent activity."
- "Go to the Management Dashboard and verify it renders compliance KPIs, risk distribution charts, and framework readiness visualizations."
- "Go to the Board Report page and verify the executive summary renders with compliance score, risk count, and framework status."

## 10. Multi-Tenant Isolation

- "Log in as the admin user and verify all data visible belongs to tenant 'Ethical Edge GRC Consulting'. Confirm no records from other tenants (e.g., 'Prosperity Secret International' or 'Botswana Financial Services') are visible in any list view."

## 11. Billing (Expected Failure)

- "Go to the Pricing page and verify 4 plan tiers are displayed (Free Trial, Starter, Professional, Enterprise). Verify only DPO Pay checkout is available — no PayPal or Stripe buttons should appear."
- "Go to the Billing page and verify the subscription tier shows 'Professional' with status 'active'. Verify there is no 'Manage billing in Stripe' or 'Update payment method' button."
- "Attempt to start a DPO Pay checkout for the Starter plan (monthly). This is expected to fail because DPO merchant credentials are not yet configured — verify the error is displayed gracefully."

## 12. Trust Center (Public)

- "Visit /trust-center and verify the public trust center page loads with compliance certifications and security badges."
- "Visit /sla and verify the SLA page renders with uptime guarantees and response time commitments."
- "Visit /data-residency and verify the data residency page renders with hosting location information."
- "Visit /security-overview and verify the security overview page renders with encryption, access control, and compliance certifications listed."