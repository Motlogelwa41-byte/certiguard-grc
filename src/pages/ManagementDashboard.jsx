import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, XCircle, Clock, Target, Download } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";

const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
const STATUS_COLORS = { passing: "#10b981", failing: "#ef4444", not_tested: "#6b7280", not_applicable: "#94a3b8" };
const RISK_COLORS = { open: "#ef4444", mitigating: "#f59e0b", accepted: "#6366f1", transferred: "#06b6d4", closed: "#10b981" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value ?? "—"}</strong></p>
      ))}
    </div>
  );
};

function KPICard({ label, value, sub, icon: Icon, color = "text-foreground", trend, trendLabel }) {
  const up = trend > 0;
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        {Icon && <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Icon className="w-4 h-4 text-muted-foreground" /></div>}
      </div>
      <p className={`text-3xl font-black ${color}`}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      {trend != null && (
        <div className={`flex items-center gap-1 text-xs mt-2 font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trendLabel || `${Math.abs(trend)}% vs last month`}
        </div>
      )}
    </div>
  );
}

export default function ManagementDashboard() {
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(exportRef.current, {
        filename: `management-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Management Security Dashboard",
        subtitle: "Risk posture · Control health · Compliance readiness",
      });
      toast({ title: "PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Framework.list(),
      base44.entities.Incident.list("-created_date"),
    ]).then(([c, r, f, i]) => {
      setControls(c); setRisks(r); setFrameworks(f); setIncidents(i);
      setLoading(false);
    });
  }, []);

  // Control metrics
  const controlMetrics = useMemo(() => {
    const total = controls.length;
    const passing = controls.filter(c => c.status === "passing").length;
    const failing = controls.filter(c => c.status === "failing").length;
    const not_tested = controls.filter(c => c.status === "not_tested").length;
    const not_applicable = controls.filter(c => c.status === "not_applicable").length;
    const passRate = total ? Math.round((passing / total) * 100) : 0;
    return { total, passing, failing, not_tested, not_applicable, passRate };
  }, [controls]);

  // Risk metrics
  const riskMetrics = useMemo(() => {
    const open = risks.filter(r => r.status === "open").length;
    const critical = risks.filter(r => (r.risk_score || r.likelihood * r.impact || 0) >= 15).length;
    const mitigating = risks.filter(r => r.status === "mitigating").length;
    const closed = risks.filter(r => r.status === "closed").length;
    const avgScore = risks.length
      ? Math.round(risks.reduce((s, r) => s + (r.risk_score || (r.likelihood || 3) * (r.impact || 3)), 0) / risks.length * 10) / 10
      : 0;
    return { open, critical, mitigating, closed, avgScore };
  }, [risks]);

  // Controls by category (bar chart)
  const controlsByCategory = useMemo(() => {
    const cats = {};
    controls.forEach(c => {
      const cat = (c.category || "other").replace(/_/g, " ");
      if (!cats[cat]) cats[cat] = { category: cat, passing: 0, failing: 0, not_tested: 0 };
      if (c.status === "passing") cats[cat].passing++;
      else if (c.status === "failing") cats[cat].failing++;
      else cats[cat].not_tested++;
    });
    return Object.values(cats).sort((a, b) => (b.passing + b.failing + b.not_tested) - (a.passing + a.failing + a.not_tested)).slice(0, 8);
  }, [controls]);

  // Control status pie
  const controlStatusPie = useMemo(() => [
    { name: "Passing", value: controlMetrics.passing, color: STATUS_COLORS.passing },
    { name: "Failing", value: controlMetrics.failing, color: STATUS_COLORS.failing },
    { name: "Not Tested", value: controlMetrics.not_tested, color: STATUS_COLORS.not_tested },
    { name: "N/A", value: controlMetrics.not_applicable, color: STATUS_COLORS.not_applicable },
  ].filter(d => d.value > 0), [controlMetrics]);

  // Risk by category (bar)
  const riskByCategory = useMemo(() => {
    const cats = {};
    risks.forEach(r => {
      const cat = (r.category || "other").replace(/_/g, " ");
      if (!cats[cat]) cats[cat] = { category: cat, open: 0, mitigating: 0, closed: 0, accepted: 0 };
      cats[cat][r.status] = (cats[cat][r.status] || 0) + 1;
    });
    return Object.values(cats).sort((a, b) => (b.open + b.mitigating) - (a.open + a.mitigating));
  }, [risks]);

  // Risk score distribution
  const riskScoreDist = useMemo(() => {
    const bands = [
      { label: "Low (1–4)", min: 1, max: 4, color: "#10b981" },
      { label: "Medium (5–9)", min: 5, max: 9, color: "#f59e0b" },
      { label: "High (10–14)", min: 10, max: 14, color: "#f97316" },
      { label: "Critical (15–25)", min: 15, max: 25, color: "#ef4444" },
    ];
    return bands.map(b => ({
      ...b,
      count: risks.filter(r => {
        const s = r.risk_score || (r.likelihood || 3) * (r.impact || 3);
        return s >= b.min && s <= b.max;
      }).length,
    }));
  }, [risks]);

  // Framework readiness
  const frameworkReadiness = useMemo(() =>
    frameworks.map(f => ({
      name: f.name.length > 14 ? f.name.slice(0, 13) + "…" : f.name,
      score: f.readiness_score || 0,
      status: f.status,
    })).sort((a, b) => b.score - a.score),
  [frameworks]);

  // Incident trend — last 6 months
  const incidentTrend = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const y = d.getFullYear(); const m = d.getMonth();
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const monthInc = incidents.filter(inc => {
      const cd = new Date(inc.detected_date || inc.created_date);
      return cd.getFullYear() === y && cd.getMonth() === m;
    });
    return {
      month: label,
      total: monthInc.length,
      critical: monthInc.filter(i => i.severity === "critical").length,
      resolved: monthInc.filter(i => ["closed", "remediated"].includes(i.status)).length,
    };
  }), [incidents]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Management Security Dashboard"
        subtitle="Executive-level overview of risk posture, control health, and compliance readiness"
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            <Download className="w-4 h-4 mr-1" />{exporting ? "Exporting…" : "Export PDF"}
          </Button>
        }
      />
      <div className="space-y-6" ref={exportRef}>

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-4">Overall Security Posture</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className={`text-4xl font-black ${controlMetrics.passRate >= 80 ? "text-emerald-400" : controlMetrics.passRate >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {controlMetrics.passRate}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Control Pass Rate</p>
          </div>
          <div>
            <p className={`text-4xl font-black ${riskMetrics.critical === 0 ? "text-emerald-400" : "text-red-400"}`}>{riskMetrics.critical}</p>
            <p className="text-xs text-slate-400 mt-1">Critical Risks</p>
          </div>
          <div>
            <p className={`text-4xl font-black ${frameworks.filter(f => f.status === "audit_ready" || f.status === "certified").length > 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {frameworks.filter(f => f.status === "audit_ready" || f.status === "certified").length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Frameworks Audit-Ready</p>
          </div>
          <div>
            <p className={`text-4xl font-black ${incidents.filter(i => !["closed", "false_positive", "remediated"].includes(i.status)).length === 0 ? "text-emerald-400" : "text-orange-400"}`}>
              {incidents.filter(i => !["closed", "false_positive", "remediated"].includes(i.status)).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Open Incidents</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard label="Passing Controls" value={`${controlMetrics.passing}/${controlMetrics.total}`} sub={`${controlMetrics.passRate}% pass rate`} icon={CheckCircle2} color="text-emerald-600" />
        <KPICard label="Failing Controls" value={controlMetrics.failing} sub="Require immediate attention" icon={XCircle} color={controlMetrics.failing > 0 ? "text-red-600" : "text-emerald-600"} />
        <KPICard label="Open Risks" value={riskMetrics.open} sub={`Avg risk score: ${riskMetrics.avgScore}`} icon={AlertTriangle} color={riskMetrics.open > 0 ? "text-amber-600" : "text-emerald-600"} />
        <KPICard label="Frameworks Active" value={frameworks.length} sub={`${frameworks.filter(f => f.status === "certified").length} certified`} icon={Target} color="text-primary" />
      </div>

      {/* Control pass rate + risk score dist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control status pie */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Control Health Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Current status of all {controlMetrics.total} controls</p>
          {controls.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No controls found</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={controlStatusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {controlStatusPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 shrink-0">
                {controlStatusPie.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-bold text-foreground ml-auto pl-4">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Risk score distribution */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Risk Score Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Number of risks per severity band</p>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No risks found</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskScoreDist} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Risks" radius={[4, 4, 0, 0]}>
                  {riskScoreDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Controls by category */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-0.5">Control Pass Rate by Category</h3>
        <p className="text-xs text-muted-foreground mb-4">Stacked view of passing, failing, and untested controls per domain</p>
        {controls.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No controls found</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={controlsByCategory} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="passing" name="Passing" stackId="a" fill="#10b981" />
              <Bar dataKey="failing" name="Failing" stackId="a" fill="#ef4444" />
              <Bar dataKey="not_tested" name="Not Tested" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Risk by category + Framework readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk by category */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Risk Exposure by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Open and mitigating risks per risk domain</p>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No risks found</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskByCategory} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="open" name="Open" stackId="a" fill="#ef4444" />
                <Bar dataKey="mitigating" name="Mitigating" stackId="a" fill="#f59e0b" />
                <Bar dataKey="accepted" name="Accepted" stackId="a" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Framework readiness */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Framework Readiness</h3>
          <p className="text-xs text-muted-foreground mb-4">Compliance readiness score per active framework</p>
          {frameworks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No frameworks configured</p>
          ) : (
            <div className="space-y-3 mt-1">
              {frameworkReadiness.map(f => (
                <div key={f.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-foreground truncate max-w-48">{f.name}</span>
                    <span className={`font-bold ${f.score >= 80 ? "text-emerald-600" : f.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{f.score}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${f.score >= 80 ? "bg-emerald-500" : f.score >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Incident trend */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-0.5">Incident Trend — Last 6 Months</h3>
        <p className="text-xs text-muted-foreground mb-4">Monthly incident volume with resolution tracking</p>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={incidentTrend}>
            <defs>
              <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="total" name="Total Incidents" stroke="#3b82f6" strokeWidth={2} fill="url(#totalGrad)" dot={{ r: 3 }} />
            <Line type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
    </>
  );
}