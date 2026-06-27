import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, Lock, Eye, Server, ExternalLink, Globe, Mail, Award, AlertTriangle } from "lucide-react";

function parse(val) {
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

const statusColor = (status) => {
  if (status === "certified") return { bg: "#dcfce7", text: "#15803d", label: "Certified" };
  if (status === "audit_ready") return { bg: "#dbeafe", text: "#1d4ed8", label: "Audit Ready" };
  if (status === "in_progress") return { bg: "#fef9c3", text: "#a16207", label: "In Progress" };
  return { bg: "#f1f5f9", text: "#64748b", label: "Planned" };
};

export default function TrustCenterPublic() {
  const [config, setConfig] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState({ total: 0, passing: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [tcs, fws, ctrls] = await Promise.all([
          base44.entities.TrustCenter.list(),
          base44.entities.Framework.list(),
          base44.entities.Control.list(),
        ]);
        const tc = tcs?.[0];
        if (!tc || !tc.is_published) { setNotFound(true); setLoading(false); return; }
        setConfig(tc);
        setFrameworks(fws || []);
        const passing = (ctrls || []).filter(c => c.status === "passing").length;
        setControls({ total: ctrls?.length || 0, passing });
      } catch { setNotFound(true); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 text-center px-4">
      <Shield className="w-16 h-16 text-slate-300" />
      <h1 className="text-2xl font-bold text-slate-700">Trust Center Not Available</h1>
      <p className="text-slate-500 max-w-sm">This organization's Trust Center is not yet published. Please contact them directly for security information.</p>
    </div>
  );

  const accent = config.accent_color || "#2563eb";
  const subprocessors = parse(config.subprocessors);
  const customSections = parse(config.custom_sections);
  const certifiedFrameworks = frameworks.filter(f => ["certified", "audit_ready", "in_progress"].includes(f.status));
  const passRate = controls.total > 0 ? Math.round((controls.passing / controls.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <div style={{ background: `linear-gradient(135deg, ${accent}15 0%, ${accent}05 100%)`, borderBottom: `3px solid ${accent}20` }}>
        <div className="max-w-5xl mx-auto px-6 py-16 text-center">
          {config.logo_url && (
            <img src={config.logo_url} alt={config.company_name} className="h-14 object-contain mx-auto mb-6" />
          )}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-8 h-8" style={{ color: accent }} />
            <h1 className="text-4xl font-extrabold text-slate-900">{config.company_name}</h1>
          </div>
          <p className="text-xl text-slate-600 mb-2">{config.company_tagline || "Security & Trust Center"}</p>
          {config.company_description && (
            <p className="text-slate-500 max-w-2xl mx-auto mt-3">{config.company_description}</p>
          )}
          <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
            {config.website_url && (
              <a href={config.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                <Globe className="w-4 h-4" />{config.website_url.replace(/^https?:\/\//, "")}
              </a>
            )}
            {config.contact_email && (
              <a href={`mailto:${config.contact_email}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                <Mail className="w-4 h-4" />{config.contact_email}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-14">

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: Shield, label: "Frameworks", value: certifiedFrameworks.length || frameworks.length, sub: "tracked" },
            config.show_controls_count && { icon: CheckCircle, label: "Controls Passing", value: `${passRate}%`, sub: `${controls.passing}/${controls.total}` },
            config.show_uptime && { icon: Server, label: "Uptime", value: `${config.uptime_percentage || 99.9}%`, sub: "last 90 days" },
            config.show_pentest && config.pentest_date && { icon: Eye, label: "Last Pen Test", value: config.pentest_date, sub: config.pentest_firm || "Third party" },
          ].filter(Boolean).map((stat, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-5 text-center border border-slate-100">
              <stat.icon className="w-6 h-6 mx-auto mb-2" style={{ color: accent }} />
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mt-0.5">{stat.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* Frameworks / Certifications */}
        {config.show_frameworks && frameworks.length > 0 && (
          <section>
            <SectionHeader icon={Award} accent={accent} title="Compliance Certifications & Frameworks" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {frameworks.map(fw => {
                const s = statusColor(fw.status);
                const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
                return (
                  <div key={fw.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{fw.name}</h3>
                        {fw.version && <p className="text-xs text-slate-400">v{fw.version}</p>}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                    </div>
                    {fw.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{fw.description}</p>}
                    <div>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Readiness</span><span className="font-semibold text-slate-700">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                    </div>
                    {fw.certification_date && (
                      <p className="text-xs text-slate-400 mt-2">Certified: {fw.certification_date}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Security practices */}
        <section>
          <SectionHeader icon={Lock} accent={accent} title="Security Practices" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            {[
              { title: "Encryption at Rest & in Transit", desc: "All data is encrypted using AES-256 at rest and TLS 1.3 in transit." },
              { title: "Access Control", desc: "Role-based access control with least-privilege principles enforced across all systems." },
              { title: "Audit Logging", desc: "Immutable audit trail with cryptographic hash chaining for all system events." },
              { title: "Vulnerability Management", desc: "Regular vulnerability scans and timely patching of identified issues." },
              { title: "Incident Response", desc: "Documented incident response plan with defined SLAs for detection and containment." },
              { title: "Business Continuity", desc: "Tested backup and recovery procedures ensuring data resilience and availability." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: accent }} />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sub-processors */}
        {config.show_subprocessors && subprocessors.length > 0 && (
          <section>
            <SectionHeader icon={Server} accent={accent} title="Sub-processors & Third Parties" />
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Purpose</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {subprocessors.map((sp, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-slate-800">{sp.name}</td>
                      <td className="px-4 py-3 text-slate-600">{sp.purpose}</td>
                      <td className="px-4 py-3 text-slate-500">{sp.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Custom sections */}
        {customSections.map((sec, i) => (
          <section key={i}>
            <SectionHeader icon={Shield} accent={accent} title={sec.title} />
            <p className="text-slate-600 mt-4 leading-relaxed whitespace-pre-line">{sec.content}</p>
          </section>
        ))}

        {/* Footer */}
        <footer className="border-t border-slate-100 pt-8 text-center text-xs text-slate-400 space-y-1">
          <p>This Trust Center is powered by <strong className="text-slate-600">CertiGuard GRC</strong></p>
          <p>Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          {config.contact_email && <p>Security questions? <a href={`mailto:${config.contact_email}`} className="underline">{config.contact_email}</a></p>}
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, accent, title }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${accent}15` }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
  );
}