import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Shield, CheckCircle, Lock, Eye, Server, Globe, Mail, Award,
  AlertTriangle, Activity, Zap, FileCheck, Users, Clock,
  ChevronDown, ChevronUp, ExternalLink, Star, TrendingUp
} from "lucide-react";

function parse(val) {
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

const statusColor = (status) => {
  if (status === "certified") return { bg: "#dcfce7", text: "#15803d", label: "Certified", dot: "#16a34a" };
  if (status === "audit_ready") return { bg: "#dbeafe", text: "#1d4ed8", label: "Audit Ready", dot: "#2563eb" };
  if (status === "in_progress") return { bg: "#fef9c3", text: "#a16207", label: "In Progress", dot: "#d97706" };
  return { bg: "#f1f5f9", text: "#64748b", label: "Planned", dot: "#94a3b8" };
};

const SADC_BADGE_MAP = {
  "POPIA": { flag: "🇿🇦", region: "South Africa" },
  "FSRA Cyber Rules": { flag: "🇧🇼", region: "Botswana" },
  "Zimbabwe DPA": { flag: "🇿🇼", region: "Zimbabwe" },
  "Zimbabwe Cyber Act": { flag: "🇿🇼", region: "Zimbabwe" },
  "CBK Cyber Guidelines": { flag: "🇰🇪", region: "Kenya" },
  "Kenya DPA": { flag: "🇰🇪", region: "Kenya" },
  "Tanzania DPA": { flag: "🇹🇿", region: "Tanzania" },
  "AU Cyber Framework": { flag: "🌍", region: "African Union" },
  "SADC Finance Protocol": { flag: "🌍", region: "SADC Region" },
  "BOU Cyber Guidelines": { flag: "🇺🇬", region: "Uganda" },
  "Malawi Cyber Act": { flag: "🇲🇼", region: "Malawi" },
  "Zambia Cyber Act": { flag: "🇿🇲", region: "Zambia" },
};

const SADC_NAMES = Object.keys(SADC_BADGE_MAP);

function isSADC(name) {
  return SADC_NAMES.some(n => name?.toLowerCase().includes(n.toLowerCase()));
}

function getSADCMeta(name) {
  return SADC_NAMES.map(n => ({ n, meta: SADC_BADGE_MAP[n] })).find(({ n }) => name?.toLowerCase().includes(n.toLowerCase()))?.meta;
}

export default function TrustCenterPublic() {
  const [config, setConfig] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState({ total: 0, passing: 0, failing: 0 });
  const [risks, setRisks] = useState({ open: 0, critical: 0 });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedFw, setExpandedFw] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [tcs, fws, ctrls, rks] = await Promise.all([
          base44.entities.TrustCenter.list(),
          base44.entities.Framework.list(),
          base44.entities.Control.list(),
          base44.entities.Risk.list(),
        ]);
        const tc = tcs?.[0];
        if (!tc || !tc.is_published) { setNotFound(true); setLoading(false); return; }
        setConfig(tc);
        setFrameworks(fws || []);
        const passing = (ctrls || []).filter(c => c.status === "passing").length;
        const failing = (ctrls || []).filter(c => c.status === "failing").length;
        setControls({ total: ctrls?.length || 0, passing, failing });
        const openRisks = (rks || []).filter(r => r.status === "open");
        const criticalRisks = openRisks.filter(r => (r.likelihood || 1) * (r.impact || 1) >= 16);
        setRisks({ open: openRisks.length, critical: criticalRisks.length });
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
      <p className="text-slate-500 max-w-sm">This organisation's Trust Center is not yet published. Please contact them directly for security information.</p>
    </div>
  );

  const accent = config.accent_color || "#2563eb";
  const subprocessors = parse(config.subprocessors);
  const customSections = parse(config.custom_sections);
  const passRate = controls.total > 0 ? Math.round((controls.passing / controls.total) * 100) : 0;
  const sadcFrameworks = frameworks.filter(f => isSADC(f.name));
  const intlFrameworks = frameworks.filter(f => !isSADC(f.name));

  const securityStatus = passRate >= 85 ? "Operational" : passRate >= 60 ? "Monitoring" : "Attention Required";
  const statusColors = { "Operational": { bg: "#dcfce7", text: "#15803d", dot: "#16a34a" }, "Monitoring": { bg: "#fef9c3", text: "#a16207", dot: "#d97706" }, "Attention Required": { bg: "#fee2e2", text: "#b91c1c", dot: "#dc2626" } };
  const sc = statusColors[securityStatus];

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Hero */}
      <div style={{ background: `linear-gradient(160deg, ${accent}18 0%, ${accent}06 60%, white 100%)` }}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-10">
            <div className="flex-1 text-center md:text-left">
              {config.logo_url && (
                <img src={config.logo_url} alt={config.company_name} className="h-12 object-contain mb-6 mx-auto md:mx-0" />
              )}
              <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                <Shield className="w-8 h-8 shrink-0" style={{ color: accent }} />
                <h1 className="text-4xl font-extrabold text-slate-900">{config.company_name}</h1>
              </div>
              <p className="text-xl text-slate-500 mb-4">{config.company_tagline || "Security & Trust Center"}</p>
              {config.company_description && (
                <p className="text-slate-500 max-w-xl leading-relaxed">{config.company_description}</p>
              )}
              <div className="flex items-center justify-center md:justify-start gap-5 mt-6 flex-wrap">
                {config.website_url && (
                  <a href={config.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <Globe className="w-4 h-4" />{config.website_url.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {config.contact_email && (
                  <a href={`mailto:${config.contact_email}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <Mail className="w-4 h-4" />{config.contact_email}
                  </a>
                )}
              </div>
            </div>

            {/* Live status card */}
            <div className="w-full md:w-72 shrink-0 bg-white border border-slate-200 rounded-2xl shadow-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Live Security Status</h3>
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: sc.bg, color: sc.text }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: sc.dot }} />
                  {securityStatus}
                </span>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Control Pass Rate</span>
                    <span className="font-bold text-slate-800">{passRate}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${passRate}%`, backgroundColor: passRate >= 80 ? "#10b981" : passRate >= 60 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{controls.passing} passing · {controls.failing} failing · {controls.total} total</p>
                </div>
                {config.show_uptime && (
                  <div className="flex items-center justify-between py-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-emerald-500" />Uptime</span>
                    <span className="text-sm font-bold text-slate-800">{config.uptime_percentage || 99.9}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 flex items-center gap-1.5"><FileCheck className="w-3.5 h-3.5" style={{ color: accent }} />Frameworks</span>
                  <span className="text-sm font-bold text-slate-800">{frameworks.length}</span>
                </div>
                {config.show_pentest && config.pentest_date && (
                  <div className="flex items-center justify-between py-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-purple-500" />Last Pen Test</span>
                    <span className="text-xs font-semibold text-slate-700">{config.pentest_date}</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 text-center">
                Updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-14 space-y-16">

        {/* SADC Compliance showcase — unique differentiator */}
        {sadcFrameworks.length > 0 && (
          <section>
            <SectionHeader icon={Globe} accent={accent} title="SADC & African Regulatory Compliance" badge="Regional Leader" />
            <p className="text-slate-500 text-sm mt-2 mb-6 max-w-2xl">
              We are compliant with Southern and Eastern African regulatory frameworks — providing customers across the region with confidence in our legal and data governance practices.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sadcFrameworks.map(fw => {
                const s = statusColor(fw.status);
                const meta = getSADCMeta(fw.name);
                const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
                const isOpen = expandedFw === fw.id + "_sadc";
                return (
                  <div key={fw.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-2">
                          <span className="text-2xl">{meta?.flag || "🌍"}</span>
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm">{fw.name}</h3>
                            <p className="text-[11px] text-slate-400">{meta?.region}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: s.bg, color: s.text }}>{s.label}</span>
                      </div>
                      {fw.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{fw.description}</p>}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>Readiness</span><span className="font-bold text-slate-700">{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                      </div>
                    </div>
                    {fw.certification_date && (
                      <div className="px-5 pb-3 text-xs text-emerald-600 font-medium">
                        ✓ Certified {fw.certification_date}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* International Frameworks */}
        {config.show_frameworks && intlFrameworks.length > 0 && (
          <section>
            <SectionHeader icon={Award} accent={accent} title="International Certifications & Frameworks" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {intlFrameworks.map(fw => {
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

        {/* Security Practices */}
        <section>
          <SectionHeader icon={Lock} accent={accent} title="Security Practices" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {[
              { icon: Lock, title: "Encryption", desc: "AES-256 at rest, TLS 1.3 in transit for all data." },
              { icon: Users, title: "Access Control", desc: "Role-based least-privilege access enforced across all systems." },
              { icon: Eye, title: "Immutable Audit Trail", desc: "Cryptographic hash-chained logs for every system event." },
              { icon: Zap, title: "Vulnerability Management", desc: "Regular scans, timely patching, and responsible disclosure." },
              { icon: Activity, title: "Incident Response", desc: "Documented IR plan with defined SLAs for detection and containment." },
              { icon: Server, title: "Business Continuity", desc: "Tested backup and recovery ensuring data resilience and availability." },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
                  <item.icon className="w-4 h-4" style={{ color: accent }} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why SADC compliant — pitch section */}
        {sadcFrameworks.length > 0 && (
          <section className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)`, border: `1px solid ${accent}25` }}>
            <Star className="w-8 h-8 mx-auto mb-3" style={{ color: accent }} />
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Built for African Businesses</h2>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm leading-relaxed">
              Unlike global competitors, we are purpose-built for the SADC and East African regulatory environment. Our compliance programme spans <strong>{sadcFrameworks.length} regional frameworks</strong> covering data protection laws, cybersecurity regulations, and financial services requirements across {new Set(sadcFrameworks.map(f => getSADCMeta(f.name)?.region).filter(Boolean)).size} jurisdictions — so your data stays compliant wherever you operate.
            </p>
          </section>
        )}

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
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
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
        <footer className="border-t border-slate-100 pt-8 text-center space-y-1">
          <p className="text-xs text-slate-400">
            This Trust Center is powered by <strong className="text-slate-600">CertiGuard GRC</strong> — Africa's leading compliance platform
          </p>
          <p className="text-xs text-slate-400">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
          {config.contact_email && (
            <p className="text-xs text-slate-400">Security questions? <a href={`mailto:${config.contact_email}`} className="underline hover:text-slate-600">{config.contact_email}</a></p>
          )}
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, accent, title, badge }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${accent}15` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      {badge && (
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">{badge}</span>
      )}
    </div>
  );
}