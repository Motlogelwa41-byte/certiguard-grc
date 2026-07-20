import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import {
  AlertTriangle, TrendingDown, TrendingUp, ShieldCheck, Target,
  Download, Activity, Flame,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";

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
        <div className={`flex items-center gap-1 text-xs mt-2 font-semibold ${up ? "text-red-500" : "text-emerald-600"}`}>
          {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trendLabel || `${Math.abs(trend)}% vs last month`}
        </div>
      )}
    </div>
  );
}

const MONTHS = 12;

export default function ExecutiveRiskSummary() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Risk.list("-created_date", 1000).then((r) => {
      setRisks(r || []);
      setLoading(false);
    });
  }, []);

  const scoreOf = (r) => r.risk_score || (r.likelihood || 3) * (r.impact || 3);
  const residualOf = (r) => (r.residual_likelihood || 1) * (r.residual_impact || 1);

  // Current snapshot
  const snapshot = useMemo(() => {
    const total = risks.length;
    const open = risks.filter((r) => r.status === "open").length;
    const mitigating = risks.filter((r) => r.status === "mitigating").length;
    const closed = risks.filter((r) => r.status === "closed").length;
    const critical = risks.filter((r) => scoreOf(r) >= 15 && r.status !== "closed").length;
    const active = risks.filter((r) => r.status !== "closed");
    const avgInherent = active.length ? Math.round(active.reduce((s, r) => s + scoreOf(r), 0) / active.length * 10) / 10 : 0;
    const avgResidual = active.length ? Math.round(active.reduce((s, r) => s + residualOf(r), 0) / active.length * 10) / 10 : 0;
    const reductionPct = avgInherent > 0 ? Math.round(((avgInherent - avgResidual) / avgInherent) * 100) : 0;
    return { total, open, mitigating, closed, critical, avgInherent, avgResidual, reductionPct, active: active.length };
  }, [risks]);

  // Monthly trend over last 12 months
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: MONTHS }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (MONTHS - 1 - i));
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);

      const createdThisMonth = risks.filter((r) => {
        const cd = new Date(r.created_date);
        return cd.getFullYear() === y && cd.getMonth() === m;
      });
      const newRisks = createdThisMonth.length;
      const newCritical = createdThisMonth.filter((r) => scoreOf(r) >= 15).length;

      // Risks active at end of month: created on/before monthEnd and not closed
      // (no closed_date field — approximate closed risks as excluded from "active" once status===closed
      // using updated_date as proxy for when closure happened)
      const activeAtMonth = risks.filter((r) => {
        const cd = new Date(r.created_date);
        if (cd > monthEnd) return false;
        if (r.status === "closed") {
          const closedAt = new Date(r.updated_date || r.created_date);
          return closedAt > monthEnd;
        }
        return true;
      });
      const avgScore = activeAtMonth.length
        ? Math.round(activeAtMonth.reduce((s, r) => s + scoreOf(r), 0) / activeAtMonth.length * 10) / 10
        : null;
      const avgResidual = activeAtMonth.length
        ? Math.round(activeAtMonth.reduce((s, r) => s + residualOf(r), 0) / activeAtMonth.length * 10) / 10
        : null;
      const openCount = activeAtMonth.filter((r) => r.status === "open").length;
      const mitigatingCount = activeAtMonth.filter((r) => r.status === "mitigating").length;

      return { month: label, avgScore, avgResidual, openCount, mitigatingCount, newRisks, newCritical };
    });
  }, [risks]);

  // Month-over-month change in avg residual (risk reduction trend)
  const momTrend = useMemo(() => {
    const vals = monthlyTrend.map((m) => m.avgResidual).filter((v) => v != null);
    if (vals.length < 2) return null;
    const prev = vals[vals.length - 2];
    const cur = vals[vals.length - 1];
    if (prev == null || cur == null || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }, [monthlyTrend]);

  // Risk score distribution (current active)
  const scoreDist = useMemo(() => {
    const bands = [
      { label: "Low (1–4)", min: 1, max: 4, color: "#10b981" },
      { label: "Medium (5–9)", min: 5, max: 9, color: "#f59e0b" },
      { label: "High (10–14)", min: 10, max: 14, color: "#f97316" },
      { label: "Critical (15–25)", min: 15, max: 25, color: "#ef4444" },
    ];
    return bands.map((b) => ({
      ...b,
      count: risks.filter((r) => r.status !== "closed" && scoreOf(r) >= b.min && scoreOf(r) <= b.max).length,
    }));
  }, [risks]);

  // Top open risks
  const topRisks = useMemo(
    () => [...risks].filter((r) => r.status !== "closed").sort((a, b) => scoreOf(b) - scoreOf(a)).slice(0, 8),
    [risks]
  );

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(exportRef.current, {
        filename: `executive-risk-summary-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Executive Risk Summary",
        subtitle: "Monthly risk score trend & security posture",
      });
      toast({ title: "PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Executive Risk Summary"
        subtitle="Monthly aggregation of risk scores with reduction trend for leadership"
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            <Download className="w-4 h-4 mr-1" />{exporting ? "Exporting…" : "Export PDF"}
          </Button>
        }
      />
      <div className="space-y-6" ref={exportRef}>

        {/* Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 mb-2">Risk Reduction Posture</p>
              <p className={`text-5xl font-black ${snapshot.reductionPct >= 40 ? "text-emerald-400" : snapshot.reductionPct >= 20 ? "text-amber-400" : "text-red-400"}`}>
                {snapshot.reductionPct}%
              </p>
              <p className="text-sm text-slate-400 mt-1">Inherent → residual risk reduction across active risks</p>
            </div>
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-black text-blue-200">{snapshot.avgInherent}</p>
                <p className="text-xs text-slate-400 mt-1">Avg Inherent Score</p>
              </div>
              <div>
                <p className="text-3xl font-black text-emerald-400">{snapshot.avgResidual}</p>
                <p className="text-xs text-slate-400 mt-1">Avg Residual Score</p>
              </div>
              <div>
                <p className={`text-3xl font-black ${snapshot.critical === 0 ? "text-emerald-400" : "text-red-400"}`}>{snapshot.critical}</p>
                <p className="text-xs text-slate-400 mt-1">Critical Active Risks</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Open Risks" value={snapshot.open} sub={`${snapshot.active} active total`} icon={AlertTriangle} color={snapshot.open > 0 ? "text-amber-600" : "text-emerald-600"} />
          <KPICard label="Mitigating" value={snapshot.mitigating} sub="Active remediation in progress" icon={Activity} color="text-blue-600" />
          <KPICard label="Closed" value={snapshot.closed} sub="Risks resolved" icon={ShieldCheck} color="text-emerald-600" />
          <KPICard
            label="Residual Trend"
            value={momTrend == null ? "—" : `${momTrend > 0 ? "+" : ""}${momTrend}%`}
            sub="Month-over-month avg residual"
            icon={momTrend != null && momTrend > 0 ? TrendingUp : TrendingDown}
            color={momTrend == null ? "text-muted-foreground" : momTrend > 0 ? "text-red-600" : "text-emerald-600"}
            trend={momTrend ?? undefined}
          />
        </div>

        {/* Risk score trend over time */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-0.5">Monthly Risk Score Trend — Last 12 Months</h3>
          <p className="text-xs text-muted-foreground mb-4">Average inherent vs residual risk score of risks active each month</p>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No risks recorded yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} domain={[0, 25]} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avgScore" name="Avg Inherent Score" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="avgResidual" name="Avg Residual Score" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Active risk count trend + new risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-0.5">Active Risk Volume Over Time</h3>
            <p className="text-xs text-muted-foreground mb-4">Open vs mitigating risks active at month end</p>
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={monthlyTrend}>
                  <defs>
                    <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="mitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="openCount" name="Open" stroke="#ef4444" strokeWidth={2} fill="url(#openGrad)" connectNulls />
                  <Area type="monotone" dataKey="mitigatingCount" name="Mitigating" stroke="#f59e0b" strokeWidth={2} fill="url(#mitGrad)" connectNulls />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-0.5">New Risks Identified Per Month</h3>
            <p className="text-xs text-muted-foreground mb-4">Volume of newly logged risks, with critical count</p>
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyTrend} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="newRisks" name="New Risks" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="newCritical" name="Critical" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Score distribution + top risks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-0.5">Current Risk Score Distribution</h3>
            <p className="text-xs text-muted-foreground mb-4">Active risks by severity band</p>
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No risks</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scoreDist} barSize={40} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={110} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Risks" radius={[0, 4, 4, 0]}>
                    {scoreDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground mb-0.5">Top Active Risks</h3>
            <p className="text-xs text-muted-foreground mb-4">Highest-scoring risks requiring leadership attention</p>
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No active risks</p>
            ) : (
              <div className="space-y-2">
                {topRisks.map((r, i) => {
                  const sc = scoreOf(r);
                  return (
                    <div key={r.id || i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${sc >= 15 ? "bg-red-100 text-red-700" : sc >= 10 ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                        {sc}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")} · {r.status}</p>
                      </div>
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">
                        Residual {residualOf(r)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}