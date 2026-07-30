import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Clock, Activity, Database, RefreshCw, Bell, Server, AlertTriangle, Mail, FileText } from "lucide-react";

const SEVERITIES = [
  { level: "Critical", desc: "Production service completely unavailable or security breach in progress.", response: "15 minutes", resolution: "4 hours", update: "Every 60 minutes" },
  { level: "High", desc: "Major functionality impaired with no workaround available.", response: "1 hour", resolution: "8 hours", update: "Every 2 hours" },
  { level: "Medium", desc: "Partial impairment with workaround available.", response: "4 business hours", resolution: "2 business days", update: "Daily" },
  { level: "Low", desc: "Cosmetic issue or feature request with no operational impact.", response: "1 business day", resolution: "Best effort", update: "As needed" },
];

export default function SLA() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-900 to-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/90 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Service Level Agreement</h1>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto">Formal uptime, support, and recovery commitments for CertiGuard GRC platform customers.</p>
          <p className="text-xs text-slate-400 mt-3">Effective Date: 1 January 2026 · Version 2.0</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Uptime */}
        <section>
          <SectionHeader icon={Activity} title="1. Service Uptime Commitment" />
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            CertiGuard GRC commits to a monthly uptime of <strong className="text-slate-900">99.9%</strong> for the production platform,
            excluding scheduled maintenance windows. Uptime is measured as the percentage of minutes the web application and API
            endpoints respond successfully to health-check requests.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Uptime Target", value: "99.9%", sub: "Monthly" },
              { label: "Max Downtime", value: "~43 min", sub: "Per month" },
              { label: "Monitoring", value: "24/7", sub: "Real-time" },
              { label: "Status Page", value: "Public", sub: "Live updates" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{s.value}</p>
                <p className="text-xs text-slate-700 font-medium mt-1">{s.label}</p>
                <p className="text-[10px] text-slate-400">{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Support Response */}
        <section>
          <SectionHeader icon={Clock} title="2. Support Response & Resolution SLAs" />
          <p className="text-slate-600 text-sm leading-relaxed mb-4">
            All support tickets are triaged by severity. Response times are measured from ticket submission to first
            human response from the CertiGuard support team. Business hours are 08:00–17:00 Africa/Johannesburg, Monday–Friday.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">First Response</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Resolution Target</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Updates</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {SEVERITIES.map((s) => (
                  <tr key={s.level} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.level}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{s.desc}</td>
                    <td className="px-4 py-3 font-medium text-emerald-600 whitespace-nowrap">{s.response}</td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{s.resolution}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{s.update}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incident Notification */}
        <section>
          <SectionHeader icon={Bell} title="3. Incident Notification" />
          <div className="space-y-3">
            {[
              { t: "Detection & Triage", d: "Incidents detected by automated monitoring or customer reports are triaged within 15 minutes of detection." },
              { t: "Customer Notification", d: "Affected customers are notified by email within 30 minutes of incident confirmation for Critical and High severity events." },
              { t: "Status Updates", d: "Regular status updates are posted to the public status page and emailed to affected customers at the cadence defined by severity." },
              { t: "Post-Incident Report", d: "A detailed root-cause analysis and remediation plan is delivered within 5 business days of incident resolution." },
            ].map((item) => (
              <div key={item.t} className="flex gap-3 rounded-lg bg-slate-50 p-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.t}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Backup & Recovery */}
        <section>
          <SectionHeader icon={RefreshCw} title="4. Backup & Disaster Recovery" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">Recovery Point Objective (RPO)</p>
              <p className="text-3xl font-bold text-emerald-600 mb-1">≤ 15 min</p>
              <p className="text-xs text-slate-500">Maximum potential data loss in a disaster scenario. Database snapshots are taken every 15 minutes.</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-900 mb-2">Recovery Time Objective (RTO)</p>
              <p className="text-3xl font-bold text-emerald-600 mb-1">≤ 4 hours</p>
              <p className="text-xs text-slate-500">Maximum time to restore full service availability after a declared disaster.</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>• Database backups are encrypted at rest (AES-256) and retained for 35 days.</p>
            <p>• Evidence and document storage is replicated across multiple availability zones.</p>
            <p>• Disaster recovery procedures are tested quarterly with documented results.</p>
            <p>• Immutable audit trail records (IGGL) are protected against tampering and deletion.</p>
          </div>
        </section>

        {/* Scheduled Maintenance */}
        <section>
          <SectionHeader icon={Server} title="5. Scheduled Maintenance" />
          <p className="text-slate-600 text-sm leading-relaxed">
            Scheduled maintenance windows are conducted during low-traffic periods (Sundays 02:00–05:00 Africa/Johannesburg).
            Customers are notified at least <strong className="text-slate-900">72 hours in advance</strong> for any maintenance
            that may cause brief service interruption. Emergency maintenance may be conducted with shorter notice for critical
            security patches, with notification provided as early as possible.
          </p>
        </section>

        {/* Service Credits */}
        <section>
          <SectionHeader icon={FileText} title="6. Service Credits" />
          <p className="text-slate-600 text-sm leading-relaxed mb-3">
            If monthly uptime falls below 99.9%, customers are eligible for service credits applied to the next billing cycle:
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Monthly Uptime</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Service Credit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr><td className="px-4 py-3 text-slate-700">99.0% – 99.89%</td><td className="px-4 py-3 font-medium text-emerald-600">10% of monthly fee</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">95.0% – 98.99%</td><td className="px-4 py-3 font-medium text-emerald-600">25% of monthly fee</td></tr>
                <tr><td className="px-4 py-3 text-slate-700">Below 95.0%</td><td className="px-4 py-3 font-medium text-emerald-600">50% of monthly fee</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Support Contact */}
        <section className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center">
          <Mail className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900 mb-1">Support Contact</h3>
          <p className="text-sm text-slate-600 mb-3">For SLA-related queries or to report a service incident:</p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <a href="mailto:support@ethicaledgegrcconsulting.com" className="text-emerald-600 font-medium hover:underline">support@ethicaledgegrcconsulting.com</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-6 text-center text-xs text-slate-400 space-y-1">
          <p>CertiGuard GRC · A product of Ethical Edge GRC Consulting (Pty) Ltd · Gaborone, Botswana</p>
          <p className="flex items-center justify-center gap-3">
            <Link to="/trust-center" className="underline hover:text-slate-600">Trust Center</Link>
            <span>·</span>
            <Link to="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            <span>·</span>
            <Link to="/terms" className="underline hover:text-slate-600">Terms of Service</Link>
            <span>·</span>
            <Link to="/data-residency" className="underline hover:text-slate-600">Data Residency</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}