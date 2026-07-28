import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Printer, FileDown, FileSpreadsheet, AlertTriangle, ArrowRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import { exportToCsv, exportToExcel } from "@/lib/exportCsv";

export default function StakeholderSummary() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
    ]).then(([f, c, r]) => {
      setFrameworks(f);
      setControls(c);
      setRisks(r);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const passing = controls.filter((c) => c.status === "passing").length;
  const failing = controls.filter((c) => c.status === "failing").length;
  const notTested = controls.filter((c) => c.status === "not_tested").length;
  const controlScore = controls.length ? Math.round((passing / controls.length) * 100) : 0;
  const frameworkScore = frameworks.length
    ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length)
    : 0;
  const overall = frameworks.length ? Math.round(controlScore * 0.6 + frameworkScore * 0.4) : controlScore;

  const highRisks = risks
    .filter((r) => (r.status === "open" || r.status === "mitigating") && (r.impact >= 4 || (r.likelihood * r.impact) >= 12))
    .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));

  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  const buildData = () => {
    const summary = [{
      Section: "Overall", Name: "Compliance Readiness", Readiness_Pct: overall,
      Passing: passing, Total: controls.length, Failing: failing, Untested: notTested,
    }];
    const fw = frameworks.map((f) => ({
      Section: "Framework", Name: f.name, Status: f.status,
      Readiness_Pct: f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : (f.readiness_score || 0),
      Passing: f.passing_controls || 0, Total: f.total_controls || 0,
    }));
    const rk = highRisks.map((r) => ({
      Section: "High-Priority Risk", Name: r.title, Category: (r.category || "").replace(/_/g, " "),
      Likelihood: r.likelihood, Impact: r.impact, Score: r.likelihood * r.impact,
      Status: r.status, Owner: r.owner_name || "Unassigned",
    }));
    return [...summary, ...fw, ...rk];
  };
  const handleCsv = () => exportToCsv(buildData(), "stakeholder-summary");
  const handleExcel = () => exportToExcel(buildData(), "stakeholder-summary");

  const barColor = (pct) => (pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444");
  const scoreText = (pct) => (pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600");

  return (
    <div className="print:bg-white">
      <div className="print:hidden">
        <PageHeader
          title="Stakeholder Summary"
          subtitle={`One-page readiness snapshot · ${today}`}
          actions={
            <div className="flex items-center gap-2">
              <button onClick={handleCsv} className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                <FileDown className="w-4 h-4" /> CSV
              </button>
              <button onClick={handleExcel} className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                <Printer className="w-4 h-4" /> Print
              </button>
            </div>
          }
        />
      </div>
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">CertiGuard — Stakeholder Summary</h1>
        <p className="text-sm text-slate-500">Generated {today}</p>
      </div>

      {/* Overall readiness */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-5 print:break-inside-avoid">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="shrink-0">
            <ComplianceScoreRing score={overall} size={120} />
          </div>
          <div className="flex-1 w-full">
            <h2 className="font-heading text-lg font-bold text-foreground mb-1">Overall Compliance Readiness</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Weighted across {frameworks.length} framework{frameworks.length !== 1 ? "s" : ""} and {controls.length} controls
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
                <div className="text-xl font-bold text-emerald-600">{passing}</div>
                <div className="text-[11px] text-muted-foreground">Passing</div>
              </div>
              <div className="text-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3">
                <div className="text-xl font-bold text-rose-600">{failing}</div>
                <div className="text-[11px] text-muted-foreground">Failing</div>
              </div>
              <div className="text-center bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <div className="text-xl font-bold text-amber-600">{notTested}</div>
                <div className="text-[11px] text-muted-foreground">Untested</div>
              </div>
              <div className="text-center bg-slate-50 dark:bg-slate-500/10 rounded-lg p-3">
                <div className="text-xl font-bold text-slate-600">{frameworks.length}</div>
                <div className="text-[11px] text-muted-foreground">Frameworks</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Framework readiness */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-5 print:break-inside-avoid">
        <h2 className="font-heading font-semibold text-foreground mb-4">Framework Readiness</h2>
        {frameworks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No frameworks added yet.</p>
        ) : (
          <div className="space-y-3">
            {frameworks.map((fw) => {
              const pct = fw.total_controls > 0
                ? Math.round((fw.passing_controls / fw.total_controls) * 100)
                : (fw.readiness_score || 0);
              return (
                <div key={fw.id} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 truncate text-sm font-medium text-foreground" title={fw.name}>{fw.name}</div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                  </div>
                  <div className={`w-12 text-right text-sm font-bold ${scoreText(pct)}`}>{pct}%</div>
                  <div className="hidden sm:block"><StatusBadge status={fw.status} /></div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* High-priority risks */}
      <div className="bg-card rounded-2xl border border-border p-5 print:break-inside-avoid">
        <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          High-Priority Risks — Immediate Attention
        </h2>
        {highRisks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No high-priority open risks. 🎉</p>
        ) : (
          <div className="divide-y divide-border">
            {highRisks.slice(0, 8).map((r) => {
              const score = r.likelihood * r.impact;
              return (
                <div key={r.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(r.category || "").replace(/_/g, " ")} · {r.owner_name || "Unassigned"} · L×I {r.likelihood}×{r.impact}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${score >= 20 ? "bg-red-500" : score >= 12 ? "bg-orange-500" : "bg-amber-500"}`}>
                      {score}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              );
            })}
            {highRisks.length > 8 && (
              <Link to="/risks" className="block text-center text-xs text-primary hover:underline py-2">
                View all {highRisks.length} high-priority risks <ArrowRight className="w-3 h-3 inline" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}