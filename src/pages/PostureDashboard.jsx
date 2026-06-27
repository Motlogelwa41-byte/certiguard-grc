import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle, AlertTriangle, ShieldAlert, FileCheck, Upload,
  TrendingUp, TrendingDown, Minus, Clock, Shield, Download, RefreshCw
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { subMonths, format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { generatePostureReportHTML, downloadPostureReport } from "@/lib/postureReportExport";
import { useToast } from "@/components/ui/use-toast";

const COLORS = {
  passing: "#10b981", failing: "#ef4444", not_tested: "#94a3b8", not_applicable: "#cbd5e1",
  open: "#f97316", mitigating: "#3b82f6", accepted: "#8b5cf6", closed: "#10b981",
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981",
};

function MetricCard({ icon: Icon, label, value, sub, color = "blue", trend }) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-lg bg-current/10 flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function PostureDashboard() {
  const [data, setData] = useState({ controls: [], risks: [], evidence: [], tasks: [], frameworks: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = () => {
    setExporting(true);
    try {
      const html = generatePostureReportHTML({ ...data });
      const filename = `compliance-posture-report-${format(new Date(), "yyyy-MM-dd")}.html`;
      downloadPostureReport(html, filename);
      toast({ title: "Report exported", description: "Open the downloaded HTML file in any browser to print as PDF." });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  useEffect(() => {
    Promise.all([
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Evidence.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Framework.list(),
    ]).then(([controls, risks, evidence, tasks, frameworks]) => {
      setData({ controls, risks, evidence, tasks, frameworks });
      setLoading(false);
    });
  }, []);

  const metrics = useMemo(() => {
    const { controls, risks, evidence, tasks } = data;
    const passing = controls.filter(c => c.status === "passing").length;
    const failing = controls.filter(c => c.status === "failing").length;
    const total = controls.length;
    const complianceScore = total > 0 ? Math.round((passing / total) * 100) : 0;

    const openRisks = risks.filter(r => r.status === "open" || r.status === "mitigating").length;
    const criticalRisks = risks.filter(r => (r.likelihood || 3) * (r.impact || 3) >= 20).length;

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const recentEvidence = evidence.filter(e => {
      try { return e.created_date && parseISO(e.created_date) >= thisMonthStart; } catch { return false; }
    }).length;

    const overdueTasks = tasks.filter(t => {
      if (!t.due_date || t.status === "completed") return false;
      return new Date(t.due_date) < now;
    }).length;

    const pendingTasks = tasks.filter(t => t.status === "todo" || t.status === "in_progress").length;

    return { passing, failing, total, complianceScore, openRisks, criticalRisks, recentEvidence, overdueTasks, pendingTasks };
  }, [data]);

  // Controls by status for pie chart
  const controlStatusData = useMemo(() => {
    const counts = {};
    data.controls.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(/_/g, " "), value, key: name }));
  }, [data.controls]);

  // Risk distribution by category
  const riskCategoryData = useMemo(() => {
    const counts = {};
    data.risks.filter(r => r.status !== "closed").forEach(r => {
      const cat = (r.category || "other").replace(/_/g, " ");
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [data.risks]);

  // Evidence submissions — last 6 months
  const evidenceTrendData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const count = data.evidence.filter(e => {
        try { const d = parseISO(e.created_date); return d >= start && d <= end; } catch { return false; }
      }).length;
      return { month: format(m, "MMM yy"), submissions: count };
    });
  }, [data.evidence]);

  // Framework readiness
  const frameworkData = useMemo(() =>
    data.frameworks.map(f => ({
      name: f.name?.length > 12 ? f.name.slice(0, 12) + "…" : f.name,
      score: f.readiness_score || 0,
    })).sort((a, b) => b.score - a.score)
  , [data.frameworks]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Posture Dashboard"
        subtitle="Real-time overview of your organisation's compliance health, risk exposure, and evidence coverage"
        actions={
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            {exporting
              ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              : <Download className="w-4 h-4 mr-1" />}
            Export Report
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard icon={Shield} label="Compliance Score" value={`${metrics.complianceScore}%`}
          sub={`${metrics.passing}/${metrics.total} controls`}
          color={metrics.complianceScore >= 80 ? "green" : metrics.complianceScore >= 50 ? "amber" : "red"} />
        <MetricCard icon={CheckCircle} label="Passing Controls" value={metrics.passing}
          sub="Currently passing" color="green" />
        <MetricCard icon={ShieldAlert} label="Failing Controls" value={metrics.failing}
          sub="Need remediation" color={metrics.failing > 0 ? "red" : "green"} />
        <MetricCard icon={AlertTriangle} label="Open Risks" value={metrics.openRisks}
          sub={`${metrics.criticalRisks} critical`} color={metrics.criticalRisks > 0 ? "red" : "amber"} />
        <MetricCard icon={Upload} label="Evidence This Month" value={metrics.recentEvidence}
          sub="Submissions" color="blue" />
        <MetricCard icon={Clock} label="Overdue Tasks" value={metrics.overdueTasks}
          sub={`${metrics.pendingTasks} pending`} color={metrics.overdueTasks > 0 ? "red" : "green"} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls by Status */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Controls by Status</h3>
          </div>
          {controlStatusData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No controls data</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={controlStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3}>
                    {controlStatusData.map((entry) => (
                      <Cell key={entry.key} fill={COLORS[entry.key] || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {controlStatusData.map(d => (
                  <div key={d.key} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground capitalize">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[d.key] || "#6b7280" }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Framework Readiness */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Framework Readiness</h3>
          </div>
          {frameworkData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No frameworks data</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={frameworkData} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={(v) => [`${v}%`, "Readiness"]} contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence Submission Trend */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Evidence Submission Rate</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">New evidence records submitted per month over the last 6 months.</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={evidenceTrendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
              <Line type="monotone" dataKey="submissions" name="Evidence Submitted" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk by Category */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Open Risks by Category</h3>
          </div>
          {riskCategoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No open risks</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={riskCategoryData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" name="Open Risks" radius={[4, 4, 0, 0]} fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom: Top failing controls + high risks side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failing Controls */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm text-foreground">Failing Controls</h3>
            <span className="ml-auto text-xs text-muted-foreground">{metrics.failing} total</span>
          </div>
          {data.controls.filter(c => c.status === "failing").length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">All controls passing ✓</p>
          ) : (
            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {data.controls.filter(c => c.status === "failing").slice(0, 10).map(c => (
                <div key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{(c.category || "").replace(/_/g, " ")} · {c.owner_name || "Unassigned"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                    c.severity === "critical" ? "bg-red-100 text-red-700" :
                    c.severity === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"
                  }`}>{c.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High + Critical Open Risks */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-sm text-foreground">High & Critical Open Risks</h3>
            <span className="ml-auto text-xs text-muted-foreground">{metrics.criticalRisks} critical</span>
          </div>
          {data.risks.filter(r => (r.likelihood * r.impact) >= 12 && r.status !== "closed").length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No high/critical open risks ✓</p>
          ) : (
            <div className="divide-y divide-border max-h-60 overflow-y-auto">
              {data.risks
                .filter(r => (r.likelihood * r.impact) >= 12 && r.status !== "closed")
                .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact))
                .slice(0, 10)
                .map(r => {
                  const score = r.likelihood * r.impact;
                  return (
                    <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")} · {r.owner_name || "Unassigned"}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${score >= 20 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}`}>
                        Score {score}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}