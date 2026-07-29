import React from "react";
import { Link } from "react-router-dom";
import { FileText, Mail } from "lucide-react";

const SECTIONS = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "service", title: "2. Service Description" },
  { id: "account", title: "3. Account Registration & Security" },
  { id: "use", title: "4. Acceptable Use Policy" },
  { id: "billing", title: "5. Subscription & Billing" },
  { id: "trial", title: "6. Free Trial" },
  { id: "ip", title: "7. Intellectual Property" },
  { id: "confidentiality", title: "8. Confidentiality" },
  { id: "availability", title: "9. Service Availability & Support" },
  { id: "liability", title: "10. Limitation of Liability" },
  { id: "indemnity", title: "11. Indemnification" },
  { id: "termination", title: "12. Termination" },
  { id: "changes", title: "13. Changes to Terms" },
  { id: "law", title: "14. Governing Law" },
  { id: "contact", title: "15. Contact Us" },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-slate-100 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-7 h-7 text-emerald-600" />
            <h1 className="text-3xl font-extrabold text-slate-900">Terms of Service</h1>
          </div>
          <p className="text-slate-500">The terms under which you may access and use CertiGuard GRC</p>
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
          <section id="acceptance">
            <h2 className="text-lg font-bold text-slate-900 mb-2">1. Acceptance of Terms</h2>
            <p>These Terms of Service ("Terms") govern your access to and use of the CertiGuard GRC platform ("Service") operated by <strong>Ethical Edge GRC Consulting (Pty) Ltd</strong> ("CertiGuard", "we", or "us"). By creating an account, logging in, or using the Service, you agree to be bound by these Terms and our <Link to="/privacy" className="text-emerald-600 underline">Privacy Policy</Link>. If you do not agree, you may not use the Service.</p>
          </section>

          <section id="service">
            <h2 className="text-lg font-bold text-slate-900 mb-2">2. Service Description</h2>
            <p>CertiGuard GRC is a cloud-based governance, risk, and compliance platform that provides continuous compliance automation, risk management, audit readiness, vendor assessment, and related tools. The Service is offered in subscription tiers with varying feature sets and usage limits as described on our pricing page.</p>
          </section>

          <section id="account">
            <h2 className="text-lg font-bold text-slate-900 mb-2">3. Account Registration & Security</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must be authorised to bind your organisation to these Terms.</li>
              <li>You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</li>
              <li>You must enforce password complexity requirements (minimum 12 characters) and use multi-factor authentication where available.</li>
              <li>You agree to notify us immediately of any unauthorised access or security breach.</li>
              <li>You are responsible for ensuring that users you invite to your tenant comply with these Terms.</li>
            </ul>
          </section>

          <section id="use">
            <h2 className="text-lg font-bold text-slate-900 mb-2">4. Acceptable Use Policy</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Service for any unlawful purpose or in violation of applicable laws.</li>
              <li>Attempt to access data belonging to other tenants or circumvent security controls.</li>
              <li>Upload malware, malicious code, or content that infringes third-party intellectual property rights.</li>
              <li>Reverse engineer, decompile, or disassemble the Service except as permitted by law.</li>
              <li>Interfere with or disrupt the Service, its servers, or its integrations.</li>
              <li>Resell or sublicense access to the Service without our written consent.</li>
            </ul>
          </section>

          <section id="billing">
            <h2 className="text-lg font-bold text-slate-900 mb-2">5. Subscription & Billing</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Subscription fees are billed in advance on a monthly or annual basis as selected at checkout.</li>
              <li>Payment is processed through our supported payment providers (DPO Pay, PayPal) or via manual invoicing for enterprise clients.</li>
              <li>Plan usage limits (users, frameworks) are enforced by the platform. Exceeding limits requires an upgrade or additional licensing.</li>
              <li>Fees are non-refundable except where required by law. Annual plans may be cancelled at the end of the billing period.</li>
              <li>We may change our fees upon reasonable notice. Price changes take effect at your next renewal.</li>
            </ul>
          </section>

          <section id="trial">
            <h2 className="text-lg font-bold text-slate-900 mb-2">6. Free Trial</h2>
            <p>We may offer a free trial of the Service for a limited period. Trial access is subject to these Terms and may be limited in features or data. We may terminate a trial at any time without notice. Upon trial expiry, your account and data may be suspended or deleted unless you convert to a paid subscription.</p>
          </section>

          <section id="ip">
            <h2 className="text-lg font-bold text-slate-900 mb-2">7. Intellectual Property</h2>
            <p>The Service, its software, design, and content are the intellectual property of CertiGuard and its licensors. You retain all rights to the data and content you upload to the Service ("Customer Data"). You grant us a limited licence to process Customer Data solely as necessary to provide the Service to you.</p>
          </section>

          <section id="confidentiality">
            <h2 className="text-lg font-bold text-slate-900 mb-2">8. Confidentiality</h2>
            <p>Each party agrees to keep the other's non-public information confidential and to use it only for the purposes of these Terms. This obligation survives termination. CertiGuard protects Customer Data in accordance with its Privacy Policy and industry security standards.</p>
          </section>

          <section id="availability">
            <h2 className="text-lg font-bold text-slate-900 mb-2">9. Service Availability & Support</h2>
            <p>We strive to maintain high availability and target 99.9% uptime for the Service. We are not liable for downtime caused by factors outside our control (internet outages, third-party services, force majeure). Scheduled maintenance is communicated in advance. Support is provided via email and in-app channels according to your subscription tier.</p>
          </section>

          <section id="liability">
            <h2 className="text-lg font-bold text-slate-900 mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>The Service is provided "as is" and "as available" without warranties of any kind.</li>
              <li>CertiGuard shall not be liable for indirect, incidental, special, or consequential damages.</li>
              <li>Our total liability for any claim is limited to the fees you paid in the 12 months preceding the claim.</li>
              <li>We are not liable for data loss caused by your failure to maintain backups or configure integrations correctly.</li>
            </ul>
          </section>

          <section id="indemnity">
            <h2 className="text-lg font-bold text-slate-900 mb-2">11. Indemnification</h2>
            <p>You agree to indemnify and hold CertiGuard harmless from claims, damages, and expenses arising from your use of the Service, your violation of these Terms, or your infringement of third-party rights.</p>
          </section>

          <section id="termination">
            <h2 className="text-lg font-bold text-slate-900 mb-2">12. Termination</h2>
            <p>You may cancel your subscription at any time. We may suspend or terminate your access if you breach these Terms, fail to pay fees, or if required to protect the Service or other tenants. Upon termination, we will retain Customer Data for 90 days to allow export, after which it will be deleted (except where legal retention applies).</p>
          </section>

          <section id="changes">
            <h2 className="text-lg font-bold text-slate-900 mb-2">13. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</p>
          </section>

          <section id="law">
            <h2 className="text-lg font-bold text-slate-900 mb-2">14. Governing Law</h2>
            <p>These Terms are governed by the laws of the Republic of Botswana. Any disputes shall be subject to the exclusive jurisdiction of the courts of Botswana, unless otherwise agreed in writing or required by mandatory consumer protection laws in your jurisdiction.</p>
          </section>

          <section id="contact">
            <h2 className="text-lg font-bold text-slate-900 mb-2">15. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="bg-slate-50 rounded-xl p-4 mt-2 flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-emerald-600" />
              <a href="mailto:legal@certiguard.io" className="text-emerald-600 underline">legal@certiguard.io</a>
            </div>
          </section>

          <div className="pt-6 border-t border-slate-100">
            <Link to="/privacy" className="text-sm text-slate-500 hover:text-slate-900 underline">View our Privacy Policy →</Link>
          </div>
        </article>
      </div>
    </div>
  );
}