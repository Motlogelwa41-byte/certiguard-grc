import React from "react";
import { Link } from "react-router-dom";
import { Shield, Mail } from "lucide-react";

const SECTIONS = [
  { id: "intro", title: "1. Introduction" },
  { id: "data", title: "2. Data We Collect" },
  { id: "use", title: "3. How We Use Your Data" },
  { id: "legal", title: "4. Legal Basis for Processing" },
  { id: "sharing", title: "5. Data Sharing & Sub-processors" },
  { id: "retention", title: "6. Data Retention" },
  { id: "security", title: "7. Data Security" },
  { id: "rights", title: "8. Your Data Protection Rights" },
  { id: "transfers", title: "9. International Data Transfers" },
  { id: "cookies", title: "10. Cookies" },
  { id: "children", title: "11. Children's Privacy" },
  { id: "changes", title: "12. Changes to This Policy" },
  { id: "contact", title: "13. Contact Us" },
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-emerald-600" />
            <h1 className="text-3xl font-extrabold text-slate-900">Privacy Policy</h1>
          </div>
          <p className="text-slate-500">How CertiGuard GRC collects, uses, and protects your data</p>
          <p className="text-xs text-slate-400 mt-2">Last updated: 29 July 2026</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-[220px_1fr] gap-10">
        <nav className="hidden md:block">
          <ul className="space-y-2 sticky top-6">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-xs text-slate-500 hover:text-slate-900 transition-colors block py-1">{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>

        <article className="prose prose-slate max-w-none space-y-8 text-slate-600 text-sm leading-relaxed">
          <section id="intro">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Introduction</h2>
            <p>CertiGuard GRC ("CertiGuard", "we", "us", or "our") is a governance, risk, and compliance platform operated by <strong>Ethical Edge GRC Consulting (Pty) Ltd</strong>, registered in Gaborone, Botswana. We are committed to protecting the privacy and personal data of our users and their stakeholders in accordance with the <strong>Protection of Personal Information Act (POPIA)</strong> of South Africa, the <strong>General Data Protection Regulation (GDPR)</strong>, and applicable data protection laws across the SADC region.</p>
            <p className="mt-2">This Privacy Policy explains what personal data we collect, how we use it, and the rights you have over your data. By using CertiGuard, you agree to the practices described in this policy.</p>
          </section>

          <section id="data">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account data:</strong> name, email address, role, and authentication credentials when you register or are invited to a tenant.</li>
              <li><strong>Tenant & billing data:</strong> company name, industry, country, billing email, and payment references (we do not store full card numbers — payments are processed by our PCI-compliant payment providers).</li>
              <li><strong>Content data:</strong> the compliance controls, risks, policies, evidence files, and other records you and your team create within the platform.</li>
              <li><strong>Usage data:</strong> login times, feature usage, and IP addresses for security auditing and service improvement.</li>
              <li><strong>Directory data:</strong> if you connect an identity provider (e.g. Google Workspace, Azure AD), we sync user names, emails, and group memberships you configure — only with your explicit authorisation.</li>
            </ul>
          </section>

          <section id="use">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. How We Use Your Data</h2>
            <p>We process your personal data to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Provide, maintain, and secure the CertiGuard platform and its features.</li>
              <li>Provision and administer your tenant account, users, and subscription.</li>
              <li>Run automated compliance checks, evidence collection, and reporting workflows that you configure.</li>
              <li>Detect, prevent, and respond to security incidents and fraudulent activity.</li>
              <li>Communicate with you about your account, service updates, and support requests.</li>
              <li>Comply with legal obligations and cooperate with regulators or auditors where required.</li>
            </ul>
          </section>

          <section id="legal">
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Legal Basis for Processing</h2>
            <p>Under GDPR, we rely on the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Contract:</strong> processing necessary to deliver the service under our Terms of Service.</li>
              <li><strong>Legal obligation:</strong> compliance with applicable laws and regulatory requirements.</li>
              <li><strong>Legitimate interests:</strong> security monitoring, service improvement, and fraud prevention.</li>
              <li><strong>Consent:</strong> for optional analytics and marketing communications, which you can withdraw at any time.</li>
            </ul>
            <p className="mt-2">Under POPIA, we process personal information for the lawful purposes described above and in accordance with the conditions for lawful processing.</p>
          </section>

          <section id="sharing">
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Data Sharing & Sub-processors</h2>
            <p>We do not sell your personal data. We share data only with trusted sub-processors who support our service delivery, under written agreements that meet GDPR and POPIA requirements. Key sub-processors include:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Cloud infrastructure:</strong> hosting and database providers for application runtime and storage.</li>
              <li><strong>Payment processors:</strong> DPO Pay and PayPal for subscription billing.</li>
              <li><strong>Email & notifications:</strong> providers for transactional and notification emails.</li>
              <li><strong>Integrations:</strong> third-party services (Google Workspace, Slack, Jira, etc.) that you explicitly connect — data is shared only with those connectors you authorise.</li>
            </ul>
            <p className="mt-2">A current list of sub-processors is available on request. We may also disclose data when required by law or to protect our legal rights.</p>
          </section>

          <section id="retention">
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Data Retention</h2>
            <p>We retain your personal data for as long as your account is active and for a reasonable period thereafter to comply with legal obligations, resolve disputes, and enforce agreements. Upon account termination, we delete or anonymise your data within 90 days, except where retention is required by law (e.g. audit trail records, which are retained on an immutable, append-only basis for the regulatory retention period applicable to your jurisdiction).</p>
          </section>

          <section id="security">
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Data Security</h2>
            <p>We implement industry-leading security measures to protect your data:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>AES-256 encryption at rest and TLS 1.3 in transit.</li>
              <li>Strict multi-tenant isolation with row-level security enforcing per-tenant data separation.</li>
              <li>Role-based access control and least-privilege principles across all systems.</li>
              <li>Cryptographic hash-chained immutable audit trails for every system event.</li>
              <li>Regular security assessments, vulnerability scanning, and penetration testing.</li>
              <li>Secure/HttpOnly/SameSite=Strict session cookies and enforced password complexity.</li>
            </ul>
          </section>

          <section id="rights">
            <h2 className="text-lg font-bold text-slate-900 mb-2">8. Your Data Protection Rights</h2>
            <p>Under GDPR and POPIA, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access:</strong> request a copy of the personal data we hold about you.</li>
              <li><strong>Rectification:</strong> request correction of inaccurate or incomplete data.</li>
              <li><strong>Erasure:</strong> request deletion of your personal data ("right to be forgotten").</li>
              <li><strong>Portability:</strong> receive your data in a structured, machine-readable format.</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interests.</li>
              <li><strong>Restriction:</strong> request that we restrict processing of your data in certain circumstances.</li>
              <li><strong>Withdraw consent:</strong> where processing is based on consent, withdraw it at any time.</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at <a href="mailto:privacy@certiguard.io" className="text-emerald-600 underline">privacy@certiguard.io</a>. We respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.</p>
          </section>

          <section id="transfers">
            <h2 className="text-lg font-bold text-slate-900 mb-2">9. International Data Transfers</h2>
            <p>Your data may be processed in countries outside your jurisdiction. Where this occurs, we ensure appropriate safeguards are in place, such as standard contractual clauses or other transfer mechanisms approved under GDPR and POPIA. We prioritise data residency options for clients with specific regulatory requirements.</p>
          </section>

          <section id="cookies">
            <h2 className="text-lg font-bold text-slate-900 mb-2">10. Cookies</h2>
            <p>We use essential cookies to maintain your authenticated session and remember your preferences. We do not use cookies for third-party advertising. You can control cookies through your browser settings, but disabling essential cookies may affect platform functionality.</p>
          </section>

          <section id="children">
            <h2 className="text-lg font-bold text-slate-900 mb-2">11. Children's Privacy</h2>
            <p>CertiGuard is a business-to-business platform and is not directed at children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with data, please contact us and we will delete it.</p>
          </section>

          <section id="changes">
            <h2 className="text-lg font-bold text-slate-900 mb-2">12. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify users of material changes via email or an in-app notification and update the "last updated" date above. Continued use of CertiGuard after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section id="contact">
            <h2 className="text-lg font-bold text-slate-900 mb-2">13. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or your data rights, please contact our Information Officer:</p>
            <div className="bg-slate-50 rounded-xl p-4 mt-2 flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:privacy@certiguard.io" className="text-emerald-600 underline">privacy@certiguard.io</a>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100">
            <Link to="/terms" className="text-sm text-slate-500 hover:text-slate-900 underline">View our Terms of Service →</Link>
          </div>
        </article>
      </div>
    </div>
  );
}