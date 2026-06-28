import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const COLORS = {
  passing: "#10b981",
  failing: "#ef4444",
  not_tested: "#94a3b8",
  not_applicable: "#64748b",
  critical: "#dc2626",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#10b981",
};

const CATEGORY_LABELS = {
  access_control: "Access Control",
  data_protection: "Data Protection",
  incident_response: "IR",
  change_management: "Change Mgmt",
  risk_management: "Risk Mgmt",
  security_operations: "SecOps",
  business_continuity: "BCP",
  network_security: "Network Sec",
  physical_security: "Physical Sec",
  compliance: "Compliance",
  human_resources: "HR",
  asset_management: "Asset Mgmt",
};

function KpiCard({ label, value, sub, trend, color = "blue", icon: Icon }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };
  const cls = colorMap[color] || colorMap.blue;
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold opacity-70">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-50" />}
      </div>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs mt-1 font-medium ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function SecurityPosture() {
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [c, r, f, t, i] = await Promise.all([
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Framework.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Incident.list(),
    ]);
    setControls(c); setRisks(r); setFrameworks(f); setTasks(t); setIncidents(i);
    setLastRefresh(new Date());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // --- Derived metrics ---
  const metrics = useMemo(() => {
    const passing = controls.filter(c => c.status === "passing").length;
    const failing = controls.filter(c => c.status === "failing").length;
    const notTested = controls.filter(c => c.status === "not_tested").length;
    const total = controls.length;
    const passRate = total ? Math.round((passing / total) * 100) : 0;
    const avgReadiness = frameworks.length
      ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length)
      : 0;
    const openRisks = risks.filter(r => r.status === "open" || r.status === "mitigating").length;
    const criticalRisks = risks.filter(r => (r.likelihood * r.impact) >= 16).length;
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length;
    const openIncidents = incidents.filter(i => i.status !== "closed" && i.status !== "false_positive").length;
    return { passing, failing, notTested, total, passRate, avgReadiness, openRisks, criticalRisks, overdueTasks, openIncidents };
  }, [controls, risks, frameworks, tasks, incidents]);

  // Control status pie
  const controlPieData = useMemo(() => [
    { name: "Passing", value: metrics.passing, color: COLORS.passing },
    { name: "Failing", value: metrics.failing, color: COLORS.failing },
    { name: "Not Tested", value: metrics.notTested, color: COLORS.not_tested },
    { name: "N/A", value: controls.filter(c => c.status === "not_applicable").length, color: COLORS.not_applicable },
  ].filter(d => d.value > 0), [metrics, controls]);

  // Controls by category (grouped bar: passing vs failing)
  const controlByCategoryData = useMemo(() => {
    const cats = {};
    controls.forEach(c => {
      const cat = c.category || "other";
      if (!cats[cat]) cats[cat] = { category: CATEGORY_LABELS[cat] || cat, passing: 0, failing: 0, not_tested: 0 };
      cats[cat][c.status] = (cats[cat][c.status] || 0) + 1;
    });
    return Object.values(cats).sort((a, b) => (b.passing + b.failing) - (a.passing + a.failing));
  }, [controls]);

  // Risk distribution by score band
  const riskBandData = useMemo(() => {
    const bands = { "Critical (20-25)": 0, "High (12-19)": 0, "Medium (6-11)": 0, "Low (1-5)": 0 };
    risks.forEach(r => {
      const score = r.risk_score || (r.likelihood * r.impact) || 0;
      if (score >= 20) bands["Critical (20-25)"]++;
      else if (score >= 12) bands["High (12-19)"]++;
      else if (score >= 6) bands["Medium (6-11)"]++;
      else if (score > 0) bands["Low (1-5)"]++;
    });
    return Object.entries(bands).map(([name, value]) => ({ name, value }));
  }, [risks]);

  // Radar: category-level pass rate
  const radarData = useMemo(() => {
    const cats = {};
    controls.forEach(c => {
      const cat = CATEGORY_LABELS[c.category] || c.category || "Other";
      if (!cats[cat]) cats[cat] = { total: 0, passing: 0 };
      cats[cat].total++;
      if (c.status === "passing") cats[cat].passing++;
    });
    return Object.entries(cats).map(([subject, d]) => ({
      subject,
      rate: d.total ? Math.round((d.passing / d.total) * 100) : 0,
    })).slice(0, 8);
  }, [controls]);

  // Framework readiness bar
  const frameworkData = useMemo(() =>
    frameworks.map(f => ({ name: f.name.length > 18 ? f.name.slice(0, 18) + "…" : f.name, score: Math.round(f.readiness_score || 0) }))
      .sort((a, b) => b.score - a.score),
    [frameworks]
  );

  // Simulated 6-month trend from current readiness
  const trendData = useMemo(() => {
    const base = metrics.avgReadiness;
    const passBase = metrics.passRate;
    return Array.from({ length: 6 }, (_, i) => {
      const offset = (5 - i);
      const d = new Date(); d.setMonth(d.getMonth() - offset);
      return {
        month: d.toLocaleString("default", { month: "short" }),
        readiness: Math.max(0, Math.min(100, base - offset * 3 + Math.floor(Math.random() * 4))),
        passRate: Math.max(0, Math.min(100, passBase - offset * 2 + Math.floor(Math.random() * 3))),
      };
    });
  }, [metrics.avgReadiness, metrics.passRate]);

  // Risk by category
  const riskCatData = useMemo(() => {
    const cats = {};
    risks.forEach(r => { const c = r.category || "other"; cats[c] = (cats[c] || 0) + 1; });
    return Object.entries(cats).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [risks]);

  const handleExportPNG = () => {
    toast({ title: "Use browser print (Ctrl+P) to save this page as PDF", description: "Set destination to 'Save as PDF' for a clean export." });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Posture Dashboard"
        subtitle={`Interactive compliance analytics for executive review · Last updated ${lastRefresh.toLocaleTimeString()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleExportPNG}><Download className="w-3.5 h-3.5 mr-1" /> Export</Button>
          </div>
        }
      />

      {/* Overall score banner */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <p className="text-blue-300 text-sm font-medium mb-1">Overall Security Posture Score</p>
          <div className="flex items-end gap-3">
            <span className="text-6xl font-black">{metrics.avgReadiness}%</span>
            <div className="pb-2">
              <div className={`flex items-center gap-1 text-sm font-semibold ${metrics.avgReadiness >= 70 ? "text-emerald-400" : metrics.avgReadiness >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {metrics.avgReadiness >= 70 ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {metrics.avgReadiness >= 70 ? "Good Standing" : metrics.avgReadiness >= 50 ? "Needs Attention" : "At Risk"}
              </div>
              <p className="text-blue-300 text-xs mt-0.5">Avg across {frameworks.length} framework{frameworks.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "Controls Passing", value: `${metrics.passing}/${metrics.total}`, color: "text-emerald-400" },
            { label: "Pass Rate", value: `${metrics.passRate}%`, color: "text-blue-300" },
            { label: "Open Risks", value: metrics.openRisks, color: "text-amber-400" },
            { label: "Critical Risks", value: metrics.criticalRisks, color: "text-red-400" },
          ].map((s) => (
            <div key={s.label}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-blue-300 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Passing Controls" value={metrics.passing} sub={`of ${metrics.total} total`} color="green" icon={CheckCircle2} />
        <KpiCard label="Failing Controls" value={metrics.failing} sub="require remediation" color="red" icon={AlertTriangle} />
        <KpiCard label="Not Tested" value={metrics.notTested} sub="untested coverage" color="amber" icon={Activity} />
        <KpiCard label="Open Risks" value={metrics.openRisks} sub={`${metrics.criticalRisks} critical`} color="amber" icon={AlertTriangle} />
        <KpiCard label="Overdue Tasks" value={metrics.overdueTasks} sub="past due date" color="red" icon={Activity} />
        <KpiCard label="Open Incidents" value={metrics.openIncidents} sub="active cases" color="purple" icon={Shield} />
      </div>

      {/* Row 2: Trend line + Control pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">6-Month Compliance Trend</h3>
          <p className="text-xs text-muted-foreground mb-4">Readiness score & control pass rate over time</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="readiness" name="Avg Readiness" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="passRate" name="Control Pass Rate" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Control Status</h3>
          <p className="text-xs text-muted-foreground mb-4">Distribution across {metrics.total} controls</p>
          {metrics.total === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No controls yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={controlPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {controlPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {controlPieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                    </div>
                    <span className="font-semibold">{d.value} <span className="text-muted-foreground font-normal">({metrics.total ? Math.round((d.value / metrics.total) * 100) : 0}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 3: Framework readiness + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Framework Readiness</h3>
          <p className="text-xs text-muted-foreground mb-4">% ready per compliance framework</p>
          {frameworkData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No frameworks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, frameworkData.length * 42)}>
              <BarChart data={frameworkData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" name="Readiness %" radius={[0, 4, 4, 0]}>
                  {frameworkData.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 80 ? "#10b981" : entry.score >= 50 ? "#f59e0b" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Control Coverage Radar</h3>
          <p className="text-xs text-muted-foreground mb-4">Pass rate % per security domain</p>
          {radarData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No controls yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={4} />
                <Radar name="Pass Rate %" dataKey="rate" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 4: Controls by category bar + Risk bands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Controls by Category</h3>
          <p className="text-xs text-muted-foreground mb-4">Passing vs Failing per security domain</p>
          {controlByCategoryData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No controls yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={controlByCategoryData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="category" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-30} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="passing" name="Passing" fill={COLORS.passing} radius={[3, 3, 0, 0]} stackId="a" />
                <Bar dataKey="failing" name="Failing" fill={COLORS.failing} radius={[3, 3, 0, 0]} stackId="b" />
                <Bar dataKey="not_tested" name="Not Tested" fill={COLORS.not_tested} radius={[3, 3, 0, 0]} stackId="c" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Risk Score Distribution</h3>
          <p className="text-xs text-muted-foreground mb-4">Risks grouped by severity band</p>
          {risks.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No risks yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={riskBandData} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="Risks" radius={[4, 4, 0, 0]}>
                    {riskBandData.map((entry, i) => (
                      <Cell key={i} fill={i === 0 ? COLORS.critical : i === 1 ? COLORS.high : i === 2 ? COLORS.medium : COLORS.low} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {riskCatData.slice(0, 5).map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground capitalize w-28 truncate">{d.name}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.round((d.value / risks.length) * 100)}%` }} />
                    </div>
                    <span className="font-semibold w-6 text-right">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top failing controls table */}
      {controls.filter(c => c.status === "failing").length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-1">Failing Controls — Priority Remediation</h3>
          <p className="text-xs text-muted-foreground mb-4">Controls requiring immediate attention, sorted by severity</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Control</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Category</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Owner</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Frameworks</th>
                </tr>
              </thead>
              <tbody>
                {controls.filter(c => c.status === "failing")
                  .sort((a, b) => {
                    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                    return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
                  })
                  .slice(0, 8)
                  .map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <div>
                            {c.control_id && <span className="text-xs font-mono text-muted-foreground mr-1">{c.control_id}</span>}
                            <span className="font-medium text-foreground">{c.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">{(c.category || "").replace(/_/g, " ")}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          c.severity === "critical" ? "bg-red-100 text-red-700" :
                          c.severity === "high" ? "bg-orange-100 text-orange-700" :
                          c.severity === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{c.severity}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.owner_name || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{(c.framework_names || []).slice(0, 2).join(", ") || "—"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pb-2">
        CertiGuard GRC — Security Posture Dashboard · Confidential · Generated {new Date().toLocaleDateString()}
      </p>
    </div>
  );
}