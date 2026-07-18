import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import {
  Pickaxe, Landmark, Leaf, Users, Scale, Shield, AlertTriangle, TrendingUp,
  Gauge, CheckCircle, XCircle, FileCheck, Activity, Target, Factory, Banknote,
} from "lucide-react";

// ─── Industry configurations ────────────────────────────────────────────────
const INDUSTRIES = {
  mining: {
    key: "mining",
    label: "Mining & ESG",
    short: "Mining",
    icon: Pickaxe,
    accent: "from-amber-500 to-orange-600",
    tagline: "ESG, GRI & mining-regulation compliance progress",
    matchTerms: ["gri", "tcfd", "ifrs", "sasb", "icmm", "tsm", "irma", "mprda", "mhsa", "nema", "samrec", "samval", "drc", "mines", "mining"],
    pillars: [
      { name: "Environmental", icon: Leaf, frameworks: ["gri", "gri 14", "tcfd", "ifrs", "sasb", "icmm", "irma", "nema", "drc"] },
      { name: "Social", icon: Users, frameworks: ["gri 14", "icmm", "irma", "mac tsm", "mprda", "nema", "tanzania mining"] },
      { name: "Governance", icon: Scale, frameworks: ["gri", "icmm", "irma", "ifrs", "mprda", "samrec"] },
    ],
  },
  financial: {
    key: "financial",
    label: "Financial Services",
    short: "Financial",
    icon: Landmark,
    accent: "from-blue-600 to-indigo-700",
    tagline: "Cyber, prudential & data-privacy regulatory compliance progress",
    matchTerms: ["cbk", "bank of uganda", "bou", "fsra", "pci", "soc 2", "iso 27001", "nist", "sadc finance", "basel", "fatf", "popia", "dpa"],
    pillars: [
      { name: "Cybersecurity", icon: Shield, frameworks: ["cbk", "bank of uganda", "bou", "fsra", "iso 27001", "nist", "cyber"] },
      { name: "Data Privacy", icon: Users, frameworks: ["popia", "dpa", "kenya dpa", "tanzania dpa", "zimbabwe dpa", "gdpr"] },
      { name: "AML / Prudential", icon: Banknote, frameworks: ["sadc finance", "basel", "fatf", "fsra"] },
    ],
  },
};

const FRAMEWORK_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6"];

export default function IndustryDashboard() {
  const [industry, setIndustry] = useState("mining");
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list("-created_date", 500),
      base44.entities.Risk.list("-created_date", 200),
      base44.entities.Incident.list("-created_date", 100),
    ]).then(([f, c, r, i]) => {
      setFrameworks(f || []);
      setControls(c || []);
      setRisks(r || []);
      setIncidents(i || []);
      setLoading(false);
    }).catch((e) => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setLoading(false);
    });
  }, []);

  const cfg = INDUSTRIES[industry];

  const matchedFrameworks = useMemo(() => {
    const terms = cfg.matchTerms.map((t) => t.toLowerCase());
    return frameworks.filter((f) => {
      const n = (f.name || "").toLowerCase();
      return terms.some((t) => n.includes(t));
    });
  }, [frameworks, cfg]);

  const stats = useMemo(() => {
    const total = matchedFrameworks.length;
    const avgReadiness = total > 0 ? Math.round(matchedFrameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / total) : 0;
    const totalControls = matchedFrameworks.reduce((s, f) => s + (f.total_controls || 0), 0);
    const passingControls = matchedFrameworks.reduce((s, f) => s + (f.passing_controls || 0), 0);
    const controlPassRate = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;
    const certified = matchedFrameworks.filter((f) => f.status === "certified" || f.status === "audit_ready").length;

    // Pillar readiness
    const pillarData = cfg.pillars.map((p) => {
      const pf = matchedFrameworks.filter((f) => {
        const n = (f.name || "").toLowerCase();
        return p.frameworks.some((term) => n.includes(term));
      });
      const score = pf.length > 0 ? Math.round(pf.reduce((s, f) => s + (f.readiness_score || 0), 0) / pf.length) : 0;
      return { pillar: p.name, score, icon: p.icon, count: pf.length };
    });

    // Open risks
    const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
    const criticalRisks = risks.filter((r) => (r.status === "open" || r.status === "mitigating") && r.risk_score >= 15).length;
    // Open incidents
    const openIncidents = incidents.filter((i) => i.status === "detected" || i.status === "investigating" || i.status === "contained").length;

    return { total, avgReadiness, totalControls, passingControls, controlPassRate, certified, pillarData, openRisks, criticalRisks, openIncidents };
  }, [matchedFrameworks, risks, incidents, cfg]);

  const readinessChart = matchedFrameworks.map((f) => ({
    name: (f.name || "").length > 14 ? (f.name || "").slice(0, 12) + "…" : (f.name || ""),
    readiness: f.readiness_score || 0,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Industry Compliance Dashboard"
        subtitle="Specialized readiness tracking for your sector's regulatory & sustainability standards"
        actions={
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {Object.values(INDUSTRIES).map((ind) => {
              const Icon = ind.icon;
              const active = industry === ind.key;
              return (
                <Button
                  key={ind.key}
                  size="sm"
                  variant={active ? "default" : "ghost"}
                  onClick={() => setIndustry(ind.key)}
                  className={active ? `bg-gradient-to-r ${ind.accent} text-white` : ""}
                >
                  <Icon className="w-4 h-4 mr-1.5" />
                  {ind.short}
                </Button>
              );
            })}
          </div>
        }
      />

      {/* Industry hero */}
      <div className={`rounded-2xl p-6 mb-6 bg-gradient-to-r ${cfg.accent} text-white shadow-lg`}>
        <div className="flex items-center gap-3 mb-1">
          {(() => { const Icon = cfg.icon; return <Icon className="w-7 h-7" />; })()}
          <h2 className="text-xl font-heading font-bold">{cfg.label} Compliance</h2>
        </div>
        <p className="text-white/90 text-sm">{cfg.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-white/80 uppercase tracking-wide">Standards Tracked</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.avgReadiness}%</p>
            <p className="text-xs text-white/80 uppercase tracking-wide">Avg Readiness</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.controlPassRate}%</p>
            <p className="text-xs text-white/80 uppercase tracking-wide">Control Pass Rate</p>
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.certified}</p>
            <p className="text-xs text-white/80 uppercase tracking-wide">Audit-Ready / Certified</p>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard icon={Gauge} label="Avg Readiness" value={`${stats.avgReadiness}%`} color="text-primary" />
        <KpiCard icon={CheckCircle} label="Controls Passing" value={`${stats.passingControls}/${stats.totalControls}`} color="text-emerald-500" />
        <KpiCard icon={AlertTriangle} label="Open Risks" value={stats.openRisks} sub={`${stats.criticalRisks} critical`} color="text-amber-500" />
        <KpiCard icon={Activity} label="Open Incidents" value={stats.openIncidents} color="text-rose-500" />
      </div>

      {matchedFrameworks.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Factory className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-heading font-bold text-foreground mb-1">No {cfg.label} frameworks imported yet</h3>
          <p className="text-sm text-muted-foreground">
            Import {cfg.label} standards from the SADC Framework Library to begin tracking progress against them.
          </p>
          <Button className="mt-4" onClick={() => (window.location.href = "/sadc-frameworks")}>
            <FileCheck className="w-4 h-4 mr-1.5" /> Open Framework Library
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Readiness bar chart */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-bold text-foreground mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Readiness by Standard
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Progress score (0–100) against each tracked standard</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={readinessChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
                <Bar dataKey="readiness" radius={[0, 4, 4, 0]}>
                  {readinessChart.map((_, i) => (
                    <Cell key={i} fill={FRAMEWORK_COLORS[i % FRAMEWORK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ESG / regulatory pillar radar */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-heading font-bold text-foreground mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" /> {industry === "mining" ? "ESG Pillar" : "Regulatory Domain"} Readiness
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {industry === "mining" ? "Environmental · Social · Governance" : "Cybersecurity · Data Privacy · AML/Prudential"} score breakdown
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={stats.pillarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Radar name="Readiness" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Framework progress cards */}
      {matchedFrameworks.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-primary" /> Tracked Standards — Detailed Progress
          </h3>
          <div className="space-y-3">
            {matchedFrameworks.map((f, i) => {
              const readiness = f.readiness_score || 0;
              const passing = f.passing_controls || 0;
              const total = f.total_controls || 0;
              const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
              const barColor = readiness >= 75 ? "bg-emerald-500" : readiness >= 50 ? "bg-amber-500" : "bg-rose-500";
              return (
                <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border bg-background/50">
                  <div className="flex items-center gap-3 sm:w-64 shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${barColor}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.version} · {f.status || "not_started"}</p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{passing}/{total} controls passing</span>
                      <span className="text-xs font-semibold text-foreground">{readiness}% ready</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${readiness}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 sm:w-32 justify-end">
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{pct}%</p>
                      <p className="text-[10px] text-muted-foreground">controls</p>
                    </div>
                    {readiness >= 75 ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : readiness >= 50 ? (
                      <Activity className="w-5 h-5 text-amber-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>}
    </div>
  );
}