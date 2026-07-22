import React from "react";
import { Link } from "react-router-dom";
import { FileSearch, ClipboardList, ShieldCheck, ArrowRight, FileText } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import useDashboardData from "@/hooks/useDashboardData";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

export default function AuditorDashboard() {
  const { controls, evidence, auditFindings, frameworks, loading } = useDashboardData();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const notTested = controls.filter((c) => c.status === "not_tested").length;
  const passing = controls.filter((c) => c.status === "passing").length;
  const failing = controls.filter((c) => c.status === "failing").length;
  const evidencePending = evidence.filter((e) => e.status === "pending_review").length;
  const openFindings = auditFindings.filter((f) => f.status === "open" || f.status === "in_remediation").length;
  const resolvedFindings = auditFindings.filter((f) => f.status === "resolved" || f.status === "closed").length;

  const controlStatusData = [
    { name: "Passing", value: passing },
    { name: "Failing", value: failing },
    { name: "Not Tested", value: notTested },
    { name: "N/A", value: controls.filter((c) => c.status === "not_applicable").length },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Auditor View"
        subtitle="Read-only oversight: control testing, evidence review, audit findings and readiness"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/audits" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Audits <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/audit-trail" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Audit trail <ArrowRight className="w-4 h-4" /></Link>
          </div>
        }
      />

      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/60 border border-border rounded-full px-2.5 py-1 mb-6">
        <ShieldCheck className="w-3.5 h-3.5" /> Read-only role — no mutating actions
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Controls Not Tested" value={notTested} icon={ClipboardList} color={notTested > 0 ? "amber" : "green"} trendLabel={`${controls.length} total`} />
        <StatCard label="Evidence Pending Review" value={evidencePending} icon={FileSearch} color={evidencePending > 0 ? "amber" : "green"} trendLabel={`${evidence.length} total`} />
        <StatCard label="Open Findings" value={openFindings} icon={FileText} color={openFindings > 0 ? "red" : "green"} trendLabel={`${auditFindings.length} total`} />
        <StatCard label="Resolved Findings" value={resolvedFindings} icon={ShieldCheck} color="green" trendLabel="this period" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Control status */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Control Status</h3>
          {controlStatusData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={controlStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                    {controlStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {controlStatusData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No controls added yet.</p>
          )}
        </div>

        {/* Evidence pending review */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Evidence Awaiting Review</h3>
            <Link to="/evidence" className="text-xs text-primary hover:underline">Review queue</Link>
          </div>
          {evidencePending > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {evidence.filter((e) => e.status === "pending_review").slice(0, 8).map((e) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{e.control_title || e.control_id || "No control"} · {e.collected_date || "—"}</p>
                  </div>
                  <StatusBadge status="pending_review" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">All evidence reviewed.</p>
          )}
        </div>
      </div>

      {/* Open audit findings */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Open Audit Findings</h3>
          <Link to="/audit-findings" className="text-xs text-primary hover:underline">All findings</Link>
        </div>
        {openFindings > 0 ? (
          <div className="space-y-2">
            {auditFindings.filter((f) => f.status === "open" || f.status === "in_remediation").slice(0, 8).map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                  <p className="text-xs text-muted-foreground capitalize">{f.severity} · {f.finding_type?.replace(/_/g, " ") || "finding"} · {f.audit_title || "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={f.severity} />
                  <StatusBadge status={f.status} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">No open findings.</p>
        )}
      </div>

      {/* Framework readiness */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Framework Readiness</h3>
          <Link to="/frameworks" className="text-xs text-primary hover:underline">View all</Link>
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
    </div>
  );
}