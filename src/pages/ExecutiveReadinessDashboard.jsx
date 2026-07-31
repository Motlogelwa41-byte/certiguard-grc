import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Printer, Shield, CheckCircle2, XCircle, AlertTriangle, Clock,
  Target, Activity, TrendingUp, FileDown,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import StatusBadge from "@/components/shared/StatusBadge";
import { exportToCsv } from "@/lib/exportCsv";

export default function ExecutiveReadinessDashboard() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Incident.list(),
    ])
      .then(([f, c, r, t, i]) => {
        setFrameworks(f || []);
        setControls(c || []);
        setRisks(r || []);
        setTasks(t || []);
        setIncidents(i || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Compute the same metrics as weeklyComplianceReadinessSummary
  const fwTotal = frameworks.length;
  const fwReady = frameworks.filter((f) => f.status === "audit_ready" || f.status === "certified").length;
  const avgReadiness = fwTotal > 0
    ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / fwTotal)
    : 0;

  const ctlTotal = controls.length;
  const ctlPassing = controls.filter((c) => c.status === "passing").length;
  const ctlFailing = controls.filter((c) => c.status === "failing").length;
  const ctlNotTested = controls.filter((c) => c.status === "not_tested").length;
  const ctlPassRate = ctlTotal > 0 ? Math.round((ctlPassing / ctlTotal) * 100) : 0;

  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
  const criticalRisks = risks.filter(
    (r) => (r.status === "open" || r.status === "mitigating") && (r.risk_score || 0) >= 15
  ).length;

  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
  const openTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "in_progress" || t.status === "in_review"
  ).length;

  const openIncidents = incidents.filter(
    (i) => i.status === "detected" || i.status === "investigating" || i.status === "contained"
  ).length;
  const criticalIncidents = incidents.filter(
    (i) => i.status !== "closed" && i.status !== "remediated" && i.status !== "false_positive" && i.severity === "critical"
  ).length;

  const weekOf = new Date().toISOString().slice(0, 10);

  const verdict =
    avgReadiness >= 80 && ctlFailing === 0 && criticalRisks === 0
      ? { label: "Strong", color: "text-emerald-600", bg: "bg-emerald-50", icon: "🟢" }
      : avgReadiness >= 60 && criticalRisks <= 1
      ? { label: "On Track", color: "text-amber-600", bg: "bg-amber-50", icon: "🟡" }
      : { label: "Needs Attention", color: "text-rose-600", bg: "bg-rose-50", icon: "🔴" };

  const highPriority = tasks
    .filter((t) => (t.priority === "critical" || t.priority === "high") && t.status !== "completed")
    .sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"))
    .slice(0, 10);

  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  const metricCards = [
    { label: "Frameworks", value: fwTotal, sub: `${fwReady} audit-ready · ${avgReadiness}% avg`, icon: Shield, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
    { label: "Controls", value: ctlTotal, sub: `${ctlPassRate}% pass rate`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
    { label: "Open Risks", value: openRisks, sub: `${criticalRisks} critical`, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-500/10" },
    { label: "Open Tasks", value: openTasks, sub: `${overdueTasks} overdue`, icon: Clock, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-500/10" },
    { label: "Incidents", value: openIncidents, sub: `${criticalIncidents} critical`, icon: Activity, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-500/10" },
  ];

  const handleExportCsv = () => {
    const rows = frameworks.map((fw) => {
      const fwControls = controls.filter(
        (c) => c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
      );
      const pct = fw.total_controls > 0
        ? Math.round((fw.passing_controls / fw.total_controls) * 100)
        : fw.readiness_score || 0;
      return {
        Week_Of: weekOf,
        Framework: fw.name,
        Status: fw.status,
        Readiness_Pct: pct,
        Total_Controls: fw.total_controls || 0,
        Passing: fw.passing_controls || 0,
        Failing: fwControls.filter((c) => c.status === "failing").length,
        Not_Tested: fwControls.filter((c) => c.status === "not_tested").length,
      };
    });
    exportToCsv(rows, `executive-readiness-${weekOf}`);
  };

  return (
    <div className="print:bg-white">
      {/* Screen header */}
      <div className="print:hidden">
        <PageHeader
          title="Executive Readiness Dashboard"
          subtitle={`Week of ${weekOf} · Weekly compliance readiness summary for executive review`}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                <FileDown className="w-4 h-4" /> CSV
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
            </div>
          }
        />
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-8">
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">CertiGuard GRC</h1>
            <p className="text-sm text-slate-500 mt-0.5">Executive Compliance Readiness Dashboard</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-700">Week of {weekOf}</p>
            <p className="text-xs text-slate-500">Generated {today}</p>
          </div>
        </div>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-2xl border border-border p-6 mb-6 ${verdict.bg}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{verdict.icon}</span>
            <div>
              <h2 className="font-heading text-xl font-bold text-foreground">Overall Verdict: {verdict.label}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Average readiness {avgReadiness}% · {ctlFailing} failing controls · {criticalRisks} critical risks
              </p>
            </div>
          </div>
          <ComplianceScoreRing score={avgReadiness} size={80} />
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {metricCards.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`rounded-xl border border-border p-5 ${m.bg}`}>
              <Icon className={`w-6 h-6 ${m.color} mb-2`} />
              <div className="text-3xl font-heading font-bold text-foreground">{m.value}</div>
              <div className="text-sm font-medium text-foreground mt-1">{m.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{m.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Control status breakdown */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4">Control Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-600">{ctlPassing}</div>
            <div className="text-xs text-muted-foreground">Passing</div>
          </div>
          <div className="text-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-4">
            <XCircle className="w-6 h-6 text-rose-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-rose-600">{ctlFailing}</div>
            <div className="text-xs text-muted-foreground">Failing</div>
          </div>
          <div className="text-center bg-amber-50 dark:bg-amber-500/10 rounded-lg p-4">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-amber-600">{ctlNotTested}</div>
            <div className="text-xs text-muted-foreground">Not Tested</div>
          </div>
          <div className="text-center bg-slate-50 dark:bg-slate-500/10 rounded-lg p-4">
            <Shield className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-slate-600">{ctlTotal}</div>
            <div className="text-xs text-muted-foreground">Total Controls</div>
          </div>
        </div>
      </div>

      {/* Framework readiness table */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4">Framework Readiness</h2>
        {frameworks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No frameworks configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 pr-4 font-semibold text-foreground">Framework</th>
                  <th className="pb-2 px-4 font-semibold text-foreground">Status</th>
                  <th className="pb-2 px-4 font-semibold text-foreground text-right">Readiness</th>
                  <th className="pb-2 px-4 font-semibold text-foreground text-right">Passing</th>
                  <th className="pb-2 pl-4 font-semibold text-foreground text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {frameworks.map((fw) => {
                  const pct = fw.total_controls > 0
                    ? Math.round((fw.passing_controls / fw.total_controls) * 100)
                    : fw.readiness_score || 0;
                  return (
                    <tr key={fw.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">{fw.name}</td>
                      <td className="py-2.5 px-4"><StatusBadge status={fw.status} /></td>
                      <td className={`py-2.5 px-4 text-right font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600"}`}>{pct}%</td>
                      <td className="py-2.5 px-4 text-right text-foreground">{fw.passing_controls || 0}</td>
                      <td className="py-2.5 pl-4 text-right text-muted-foreground">{fw.total_controls || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* High-priority tasks */}
      {highPriority.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-500" />
            High-Priority Pending Tasks ({highPriority.length})
          </h2>
          <div className="space-y-2">
            {highPriority.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.assignee_name || "Unassigned"}{t.due_date ? ` · Due ${t.due_date}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    t.priority === "critical" ? "bg-rose-100 text-rose-700"
                    : "bg-orange-100 text-orange-700"
                  }`}>
                    {t.priority}
                  </span>
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk & incident summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Risk Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Open / Mitigating</span>
              <span className="text-lg font-bold text-foreground">{openRisks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Critical (score ≥ 15)</span>
              <span className="text-lg font-bold text-rose-600">{criticalRisks}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Registered</span>
              <span className="text-lg font-bold text-foreground">{risks.length}</span>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-rose-500" />
            Incident Summary
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Open Incidents</span>
              <span className="text-lg font-bold text-foreground">{openIncidents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Critical Severity</span>
              <span className="text-lg font-bold text-rose-600">{criticalIncidents}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Logged</span>
              <span className="text-lg font-bold text-foreground">{incidents.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4 print:py-8">
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="w-3.5 h-3.5" />
          Confidential — Prepared for Executive Review · CertiGuard GRC · {today}
        </div>
      </div>
    </div>
  );
}