import React from "react";
import { Link } from "react-router-dom";
import { Shield, FileCheck, AlertTriangle, CheckSquare, FileDown, ArrowRight, CalendarClock } from "lucide-react";
import useDashboardData from "@/hooks/useDashboardData";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import ComplianceTrendChart from "@/components/dashboard/ComplianceTrendChart";

export default function ExecutiveDashboard() {
  const { frameworks, controls, risks, tasks, loading } = useDashboardData();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const passing = controls.filter((c) => c.status === "passing").length;
  const controlScore = controls.length ? Math.round((passing / controls.length) * 100) : 0;
  const fwScore = frameworks.length
    ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length)
    : 0;
  const complianceScore = frameworks.length ? Math.round(controlScore * 0.6 + fwScore * 0.4) : controlScore;
  const verdict = complianceScore >= 80 ? "Audit Ready" : complianceScore >= 60 ? "On Track" : "Needs Attention";

  const certified = frameworks.filter((f) => f.status === "certified").length;
  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
  const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
  const topRisks = risks
    .filter((r) => ["above_appetite", "unacceptable"].includes(r.appetite_band) || r.exceeds_tolerance)
    .slice(0, 5);

  return (
    <div>
      {/* Executive hero */}
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(217_33%_15%)] to-[hsl(215_28%_9%)] p-6 sm:p-8">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-[hsl(160_84%_37%)]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(160_84%_60%)] bg-[hsl(160_84%_37%)]/10 border border-[hsl(160_84%_37%)]/25 rounded-full px-3 py-1">
              <Shield className="w-3.5 h-3.5" /> Executive Overview
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">Compliance Posture</h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-xl">Board-level view of organizational compliance and risk posture.</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">Posture:</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${complianceScore >= 80 ? "text-[hsl(160_84%_55%)] bg-[hsl(160_84%_37%)]/15 border-[hsl(160_84%_37%)]/30" : complianceScore >= 60 ? "text-amber-300 bg-amber-500/15 border-amber-400/30" : "text-rose-300 bg-rose-500/15 border-rose-400/30"}`}>{verdict}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to="/board-report" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                <FileDown className="w-3.5 h-3.5" /> Board Report
              </Link>
              <Link to="/management-dashboard" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                Management Dashboard
              </Link>
              <Link to="/audit-readiness-report" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                <CalendarClock className="w-3.5 h-3.5" /> Audit Readiness
              </Link>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur">
            <ComplianceScoreRing score={complianceScore} size={140} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Compliance Score" value={`${complianceScore}%`} icon={Shield} color={complianceScore >= 80 ? "green" : complianceScore >= 60 ? "amber" : "red"} trendLabel={verdict} />
        <StatCard label="Certified Frameworks" value={certified} icon={FileCheck} color="blue" trendLabel={`${frameworks.length} total`} />
        <StatCard label="Open Risks" value={openRisks} icon={AlertTriangle} color={openRisks > 0 ? "amber" : "green"} trendLabel={`${risks.length} total`} />
        <StatCard label="Overdue Tasks" value={overdueTasks} icon={CheckSquare} color={overdueTasks > 0 ? "red" : "green"} trendLabel={overdueTasks > 0 ? "needs attention" : "on track"} />
      </div>

      <div className="mb-8">
        <ComplianceTrendChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Framework readiness */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Framework Readiness</h3>
            <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {frameworks.length > 0 ? (
            <div className="space-y-3">
              {frameworks.map((fw) => {
                const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
                return (
                  <div key={fw.id} className="flex items-center gap-4">
                    <span className="text-sm font-medium text-foreground w-32 truncate">{fw.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">{pct}%</span>
                    <StatusBadge status={fw.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No frameworks tracked.</p>
          )}
        </div>

        {/* Top risks */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Top Risks (Above Appetite)</h3>
            <Link to="/risks" className="text-xs text-primary hover:underline flex items-center gap-1">Risk register <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {topRisks.length > 0 ? (
            <div className="space-y-2">
              {topRisks.map((r) => {
                const score = (r.likelihood || 1) * (r.impact || 1);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")} · score {score}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No risks above appetite.</p>
          )}
        </div>
      </div>
    </div>
  );
}