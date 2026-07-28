import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, FileCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  Printer, ArrowRight, TrendingUp, Target, AlertCircle, FileDown
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import { exportToCsv, exportToExcel } from "@/lib/exportCsv";
import { FileSpreadsheet } from "lucide-react";

export default function ComplianceReadinessReport() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Risk.list(),
    ]).then(([f, c, t, r]) => {
      setFrameworks(f);
      setControls(c);
      setTasks(t);
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

  // Overall score
  const passingControls = controls.filter((c) => c.status === "passing").length;
  const failingControls = controls.filter((c) => c.status === "failing").length;
  const notTested = controls.filter((c) => c.status === "not_tested").length;
  const notApplicable = controls.filter((c) => c.status === "not_applicable").length;

  const controlScore = controls.length > 0 ? Math.round((passingControls / controls.length) * 100) : 0;
  const frameworkScore = frameworks.length > 0
    ? Math.round(frameworks.reduce((sum, f) => sum + (f.readiness_score || 0), 0) / frameworks.length)
    : 0;
  const complianceScore = frameworks.length > 0
    ? Math.round(controlScore * 0.6 + frameworkScore * 0.4)
    : controlScore;

  // Gaps
  const overdueTasks = tasks.filter((t) => t.status === "overdue");
  const dueSoonTasks = tasks.filter((t) => {
    if (!t.due_date || t.status === "completed") return false;
    const due = new Date(t.due_date);
    const now = new Date();
    const days = (due - now) / 86400000;
    return days >= 0 && days <= 7;
  });
  const openHighRisks = risks.filter((r) =>
    (r.status === "open" || r.status === "mitigating") &&
    (r.impact >= 4 || r.risk_score >= 12)
  );
  const failingControlList = controls.filter((c) => c.status === "failing");
  const notTestedList = controls.filter((c) => c.status === "not_tested");

  const today = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

  const scoreColor = (pct) => pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-rose-600";
  const barColor = (pct) => pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444";

  const buildReportData = () => {
    const overall = {
      Framework: "OVERALL",
      Status: "",
      Total_Controls: controls.length,
      Passing: passingControls,
      Readiness_Pct: complianceScore,
      Failing: failingControls,
      Untested: notTested,
      Certification_Date: "",
      Expiry_Date: "",
    };
    const frameworkRows = frameworks.map((fw) => {
      const pct = fw.total_controls > 0
        ? Math.round((fw.passing_controls / fw.total_controls) * 100)
        : fw.readiness_score || 0;
      const fwControls = controls.filter((c) =>
        c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
      );
      return {
        Framework: fw.name,
        Status: fw.status,
        Total_Controls: fw.total_controls || 0,
        Passing: fw.passing_controls || 0,
        Readiness_Pct: pct,
        Failing: fwControls.filter((c) => c.status === "failing").length,
        Untested: fwControls.filter((c) => c.status === "not_tested").length,
        Certification_Date: fw.certification_date || "",
        Expiry_Date: fw.expiry_date || "",
      };
    });
    return [overall, ...frameworkRows];
  };

  const handleExportCsv = () => exportToCsv(buildReportData(), "compliance-readiness-report");
  const handleExportExcel = () => exportToExcel(buildReportData(), "compliance-readiness-report");

  return (
    <div className="print:bg-white">
      <div className="print:hidden">
        <PageHeader
          title="Compliance Readiness Report"
          subtitle={`Generated ${today} · Framework-by-framework readiness and gap summary`}
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                <FileDown className="w-4 h-4" /> CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
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

      {/* Print header (only visible when printing) */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">CertiGuard — Compliance Readiness Report</h1>
        <p className="text-sm text-slate-500 mt-1">Generated {today}</p>
      </div>

      {/* Overall Score Hero */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="shrink-0">
            <ComplianceScoreRing score={complianceScore} size={120} />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-bold text-foreground mb-1">Overall Compliance Readiness</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Weighted score across {frameworks.length} framework{frameworks.length !== 1 ? "s" : ""} and {controls.length} controls
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-emerald-600">{passingControls}</div>
                <div className="text-xs text-muted-foreground">Passing</div>
              </div>
              <div className="text-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-rose-600">{failingControls}</div>
                <div className="text-xs text-muted-foreground">Failing</div>
              </div>
              <div className="text-center bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-amber-600">{notTested}</div>
                <div className="text-xs text-muted-foreground">Not Tested</div>
              </div>
              <div className="text-center bg-slate-50 dark:bg-slate-500/10 rounded-lg p-3">
                <div className="text-2xl font-bold text-slate-600">{notApplicable}</div>
                <div className="text-xs text-muted-foreground">N/A</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Areas Requiring Attention */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Key Areas Requiring Attention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/controls?status=failing" className="block bg-rose-50 dark:bg-rose-500/10 rounded-xl p-4 hover:ring-2 hover:ring-rose-300 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-5 h-5 text-rose-500" />
              <span className="text-2xl font-bold text-rose-600">{failingControlList.length}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Failing Controls</p>
            <p className="text-xs text-muted-foreground mt-1">Must remediate to pass audit</p>
          </Link>
          <Link to="/controls?status=not_tested" className="block bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 hover:ring-2 hover:ring-amber-300 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-600">{notTestedList.length}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Untested Controls</p>
            <p className="text-xs text-muted-foreground mt-1">Need evidence or testing</p>
          </Link>
          <Link to="/tasks?status=overdue" className="block bg-rose-50 dark:bg-rose-500/10 rounded-xl p-4 hover:ring-2 hover:ring-rose-300 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <span className="text-2xl font-bold text-rose-600">{overdueTasks.length}</span>
            </div>
            <p className="text-sm font-medium text-foreground">Overdue Tasks</p>
            <p className="text-xs text-muted-foreground mt-1">Past deadline — escalate</p>
          </Link>
          <Link to="/risks?status=open" className="block bg-orange-50 dark:bg-orange-500/10 rounded-xl p-4 hover:ring-2 hover:ring-orange-300 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold text-orange-600">{openHighRisks.length}</span>
            </div>
            <p className="text-sm font-medium text-foreground">High-Priority Risks</p>
            <p className="text-xs text-muted-foreground mt-1">Open & high impact</p>
          </Link>
        </div>
      </div>

      {/* Framework-by-Framework Breakdown */}
      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold text-foreground">Framework Readiness Breakdown</h2>
          <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">
            Manage frameworks <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {frameworks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No frameworks added yet.</p>
        ) : (
          <div className="space-y-4">
            {frameworks.map((fw) => {
              const pct = fw.total_controls > 0
                ? Math.round((fw.passing_controls / fw.total_controls) * 100)
                : fw.readiness_score || 0;
              const gap = (fw.total_controls || 0) - (fw.passing_controls || 0);
              const fwControls = controls.filter((c) =>
                c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
              );
              const fwFailing = fwControls.filter((c) => c.status === "failing").length;
              const fwNotTested = fwControls.filter((c) => c.status === "not_tested").length;

              return (
                <div key={fw.id} className="border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{fw.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fw.passing_controls || 0} of {fw.total_controls || 0} controls passing
                        {gap > 0 && <span className="text-amber-600"> · {gap} gap{gap !== 1 ? "s" : ""}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-bold ${scoreColor(pct)}`}>{pct}%</span>
                      <StatusBadge status={fw.status} />
                    </div>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: barColor(pct) }}
                    />
                  </div>
                  {(fwFailing > 0 || fwNotTested > 0) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {fwFailing > 0 && (
                        <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 px-2 py-1 rounded-full font-medium">
                          <XCircle className="w-3 h-3" /> {fwFailing} failing
                        </span>
                      )}
                      {fwNotTested > 0 && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full font-medium">
                          <Clock className="w-3 h-3" /> {fwNotTested} untested
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Failing Controls Detail */}
      {failingControlList.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-500" />
            Failing Controls — Immediate Action Required
          </h2>
          <div className="space-y-2">
            {failingControlList.slice(0, 10).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    <span className="text-muted-foreground font-mono text-xs mr-2">{c.control_id}</span>
                    {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.owner_name || "Unassigned"} · {c.category?.replace(/_/g, " ") || "—"}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            ))}
            {failingControlList.length > 10 && (
              <Link to="/controls?status=failing" className="block text-center text-sm text-primary hover:underline py-2">
                View all {failingControlList.length} failing controls <ArrowRight className="w-3 h-3 inline" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tasks Due Soon */}
      {dueSoonTasks.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Tasks Due in Next 7 Days
          </h2>
          <div className="space-y-2">
            {dueSoonTasks.slice(0, 8).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.assignee_name || "Unassigned"} · Due {t.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    t.priority === "critical" ? "bg-rose-100 text-rose-700"
                    : t.priority === "high" ? "bg-orange-100 text-orange-700"
                    : "bg-slate-100 text-slate-700"
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

      {/* Improvement Roadmap */}
      <div className="bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-900/50 dark:to-emerald-900/20 rounded-2xl border border-border p-6 print:bg-none">
        <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Recommended Next Steps
        </h2>
        <div className="space-y-3">
          {failingControls > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 font-bold text-sm">1</div>
              <div>
                <p className="text-sm font-medium text-foreground">Remediate {failingControls} failing control{failingControls !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Failing controls directly block audit certification. Assign owners and set remediation deadlines.</p>
                <Link to="/controls?status=failing" className="text-xs text-primary hover:underline mt-1 inline-block">Go to failing controls →</Link>
              </div>
            </div>
          )}
          {notTested > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 font-bold text-sm">{failingControls > 0 ? "2" : "1"}</div>
              <div>
                <p className="text-sm font-medium text-foreground">Test {notTested} untested control{notTested !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Collect evidence and run control tests to move these to passing status.</p>
                <Link to="/control-tests" className="text-xs text-primary hover:underline mt-1 inline-block">Run control tests →</Link>
              </div>
            </div>
          )}
          {overdueTasks.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 font-bold text-sm">{failingControls + notTested > 0 ? "3" : "1"}</div>
              <div>
                <p className="text-sm font-medium text-foreground">Clear {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">Overdue tasks delay evidence collection. Reassign or complete immediately.</p>
                <Link to="/tasks?status=overdue" className="text-xs text-primary hover:underline mt-1 inline-block">View overdue tasks →</Link>
              </div>
            </div>
          )}
          {openHighRisks.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 shrink-0 rounded-lg bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 font-bold text-sm">{failingControls + notTested + overdueTasks.length > 0 ? "4" : "1"}</div>
              <div>
                <p className="text-sm font-medium text-foreground">Mitigate {openHighRisks.length} high-priority risk{openHighRisks.length !== 1 ? "s" : ""}</p>
                <p className="text-xs text-muted-foreground">High-impact risks can jeopardize certification. Review treatment plans.</p>
                <Link to="/risks?status=open" className="text-xs text-primary hover:underline mt-1 inline-block">Review risks →</Link>
              </div>
            </div>
          )}
          {complianceScore >= 80 && failingControls === 0 && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-7 h-7 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-foreground">You're audit-ready!</p>
                <p className="text-xs text-muted-foreground">Compliance score is {complianceScore}%. Schedule your audit or generate a board report.</p>
                <Link to="/board-report" className="text-xs text-primary hover:underline mt-1 inline-block">Generate board report →</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}