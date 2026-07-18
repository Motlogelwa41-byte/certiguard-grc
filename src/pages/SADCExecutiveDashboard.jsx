import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import {
  Shield, TrendingDown, Target, Globe, AlertTriangle, CheckCircle2,
  Download, Landmark, Minus, ArrowDownRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";
import { SADC_LIBRARY } from "@/lib/sadcLibrary";

const STATUS_META = {
  not_started: { label: "Not Started", color: "#94a3b8" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  audit_ready: { label: "Audit Ready", color: "#3b82f6" },
  certified: { label: "Certified", color: "#10b981" },
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.stroke }}>
          {p.name}: <strong>{p.value ?? "—"}</strong>
        </p>
      ))}
    </div>
  );
};

function scoreColor(score) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  if (score >= 30) return "text-orange-600";
  return "text-red-600";
}
function scoreBar(score) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 30) return "bg-orange-500";
  return "bg-red-500";
}

export default function SADCExecutiveDashboard() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list("-created_date"),
    ]).then(([f, c, r]) => {
      setFrameworks(f || []);
      setControls(c || []);
      setRisks(r || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Match imported frameworks to SADC library entries
  const sadcFrameworks = useMemo(() => {
    return SADC_LIBRARY.map((lib) => {
      const imported = frameworks.find(
        (f) => f.name && f.name.toLowerCase().includes(lib.name.toLowerCase())
      );
      return {
        ...lib,
        imported: !!imported,
        readiness_score: imported?.readiness_score || 0,
        passing_controls: imported?.passing_controls || 0,
        total_controls: imported?.total_controls || lib.controls_count,
        status: imported?.status || "not_started",
        framework_id: imported?.id,
      };
    });
  }, [frameworks]);

  // Controls mapped to SADC frameworks via framework_ids / framework_names
  const sadcControlStats = useMemo(() => {
    const libIds = new Set(SADC_LIBRARY.map((l) => l.name.toLowerCase()));
    const mapped = controls.filter((c) => {
      const names = (c.framework_names || []).map((n) => n.toLowerCase());
      return names.some((n) => [...libIds].some((id) => n.includes(id)));
    });
    const passing = mapped.filter((c) => c.status === "passing").length;
    const failing = mapped.filter((c) => c.status === "failing").length;
    const notTested = mapped.filter((c) => c.status === "not_tested").length;
    const total = mapped.length;
    return { total, passing, failing, notTested, passRate: total ? Math.round((passing / total) * 100) : 0 };
  }, [controls]);

  // Risk reduction over time — last 8 months
  const riskTrend = useMemo(() => {
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i));
      return { d, y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString("default", { month: "short", year: "2-digit" }) };
    });
    return months.map(({ y, m, label }) => {
      const opened = risks.filter((r) => {
        const cd = new Date(r.created_date);
        return cd.getFullYear() === y && cd.getMonth() === m;
      }).length;
      const closed = risks.filter((r) => {
        if (r.status !== "closed") return false;
        const cd = new Date(r.updated_date || r.created_date);
        return cd.getFullYear() === y && cd.getMonth() === m;
      }).length;
      const cumulativeOpen = risks.filter((r) => {
        if (r.status === "closed") return false;
        const cd = new Date(r.created_date);
        return cd.getFullYear() < y || (cd.getFullYear() === y && cd.getMonth() <= m);
      }).length;
      return { month: label, opened, closed, open: cumulativeOpen };
    });
  }, [risks]);

  // Avg risk score trend — month-end snapshots based on created_date ordering
  const riskScoreTrend = useMemo(() => {
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (7 - i));
      return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString("default", { month: "short", year: "2-digit" }) };
    });
    return months.map(({ y, m, label }) => {
      const active = risks.filter((r) => {
        const cd = new Date(r.created_date);
        return cd.getFullYear() < y || (cd.getFullYear() === y && cd.getMonth() <= m);
      });
      const avg = active.length
        ? Math.round(active.reduce((s, r) => s + (r.risk_score || (r.likelihood || 3) * (r.impact || 3)), 0) / active.length * 10) / 10
        : 0;
      const openCount = active.filter((r) => r.status !== "closed").length;
      return { month: label, avgScore: avg, openRisks: openCount };
    });
  }, [risks]);

  // Summary metrics
  const summary = useMemo(() => {
    const imported = sadcFrameworks.filter((f) => f.imported);
    const avgReadiness = imported.length
      ? Math.round(imported.reduce((s, f) => s + (f.readiness_score || 0), 0) / imported.length)
      : 0;
    const auditReady = imported.filter((f) => f.status === "audit_ready" || f.status === "certified").length;
    const mandatory = sadcFrameworks.filter((f) => f.mandatory);
    const mandatoryImported = mandatory.filter((f) => f.imported).length;
    const openRisks = risks.filter((r) => r.status !== "closed").length;
    const criticalRisks = risks.filter((r) => (r.risk_score || (r.likelihood || 3) * (r.impact || 3)) >= 15 && r.status !== "closed").length;
    return {
      imported: imported.length,
      total: sadcFrameworks.length,
      avgReadiness,
      auditReady,
      mandatoryTotal: mandatory.length,
      mandatoryImported,
      openRisks,
      criticalRisks,
    };
  }, [sadcFrameworks, risks]);

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(exportRef.current, {
        filename: `sadc-executive-dashboard-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "SADC Compliance Readiness Dashboard",
        subtitle: "Executive summary across Southern & Eastern African regulatory frameworks",
      });
      toast({ title: "PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="SADC Executive Dashboard"
        subtitle="Management-level compliance readiness across all SADC & African regulatory frameworks"
        actions={
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
            <Download className="w-4 h-4 mr-1" />
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        }
      />

      <div className="space-y-6" ref={exportRef}>
        {/* Hero summary */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-5 h-5 text-blue-300" />
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">
              Regional Compliance Posture — SADC & African Union
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className={`text-4xl font-black ${summary.avgReadiness >= 80 ? "text-emerald-400" : summary.avgReadiness >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {summary.avgReadiness}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Avg Readiness</p>
            </div>
            <div>
              <p className="text-4xl font-black text-emerald-400">{summary.auditReady}</p>
              <p className="text-xs text-slate-400 mt-1">Frameworks Audit-Ready</p>
            </div>
            <div>
              <p className="text-4xl font-black text-blue-300">{summary.mandatoryImported}/{summary.mandatoryTotal}</p>
              <p className="text-xs text-slate-400 mt-1">Mandatory Frameworks Adopted</p>
            </div>
            <div>
              <p className={`text-4xl font-black ${summary.criticalRisks === 0 ? "text-emerald-400" : "text-red-400"}`}>
                {summary.criticalRisks}
              </p>
              <p className="text-xs text-slate-400 mt-1">Critical Open Risks</p>
            </div>
          </div>
        </div>

        {/* Risk reduction over time */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                Risk Reduction Over Time
              </h3>
              <p className="text-xs text-muted-foreground">
                Monthly risk activity (opened vs closed) and cumulative open risk backlog — last 8 months
              </p>
            </div>
          </div>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No risk data available yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={riskTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="open" name="Open Backlog" stroke="#ef4444" strokeWidth={2.5} fill="url(#openGrad)" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="opened" name="Newly Opened" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="4 3" dot={{ r: 3 }} />
                <Area type="monotone" dataKey="closed" name="Closed" stroke="#10b981" strokeWidth={2.5} fill="url(#closedGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Avg risk score trend + SADC control pass rate */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-blue-500" />
              Average Risk Score Trend
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Declining trend indicates effective mitigation across SADC-mapped controls
            </p>
            {risks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={riskScoreTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[0, 25]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="avgScore" name="Avg Risk Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              SADC Control Pass Rate
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {sadcControlStats.total} controls mapped to SADC frameworks — {sadcControlStats.passRate}% passing
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: "Passing", value: sadcControlStats.passing, color: "#10b981" },
                  { name: "Failing", value: sadcControlStats.failing, color: "#ef4444" },
                  { name: "Not Tested", value: sadcControlStats.notTested, color: "#94a3b8" },
                ]}
                barSize={48}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.5)" }} />
                <Bar dataKey="value" name="Controls" radius={[4, 4, 0, 0]}>
                  {[
                    { name: "Passing", value: sadcControlStats.passing, color: "#10b981" },
                    { name: "Failing", value: sadcControlStats.failing, color: "#ef4444" },
                    { name: "Not Tested", value: sadcControlStats.notTested, color: "#94a3b8" },
                  ].map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SADC framework readiness table */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-500" />
            Compliance Readiness by SADC Framework
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Readiness scores for all {sadcFrameworks.length} regional frameworks — imported frameworks show live scores
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium py-2 px-2">Framework</th>
                  <th className="text-left font-medium py-2 px-2 hidden sm:table-cell">Region</th>
                  <th className="text-left font-medium py-2 px-2 hidden md:table-cell">Category</th>
                  <th className="text-center font-medium py-2 px-2">Status</th>
                  <th className="text-right font-medium py-2 px-2 w-48">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {sadcFrameworks.map((f) => {
                  const meta = STATUS_META[f.status] || STATUS_META.not_started;
                  return (
                    <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{f.flag}</span>
                          <div>
                            <p className="font-medium text-foreground flex items-center gap-1.5">
                              {f.name}
                              {f.mandatory && (
                                <span className="text-[9px] font-bold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full">
                                  MANDATORY
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground hidden sm:block">{f.full_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">{f.region}</td>
                      <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">{f.category}</td>
                      <td className="py-3 px-2 text-center">
                        {f.imported ? (
                          <span
                            className="text-[10px] font-semibold px-2 py-1 rounded-full"
                            style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
                          >
                            {meta.label}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                            Not Imported
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
                            <div
                              className={`h-2 rounded-full transition-all ${scoreBar(f.readiness_score)}`}
                              style={{ width: `${f.readiness_score}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-9 text-right ${scoreColor(f.readiness_score)}`}>
                            {f.imported ? `${f.readiness_score}%` : "—"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}