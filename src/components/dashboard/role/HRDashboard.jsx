import React from "react";
import { Link } from "react-router-dom";
import { GraduationCap, FileText, UserCheck, ClipboardCheck, ArrowRight, AlertTriangle } from "lucide-react";
import useDashboardData from "@/hooks/useDashboardData";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";

export default function HRDashboard() {
  const { training, policies, accessReviews, tasks, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const activeTraining = training.filter((t) => t.status === "active");
  const assignedTotal = activeTraining.reduce((s, t) => s + (t.assignee_count || 0), 0);
  const completedTotal = activeTraining.reduce((s, t) => s + (t.completed_count || 0), 0);
  const completionRate = assignedTotal > 0 ? Math.round((completedTotal / assignedTotal) * 100) : 0;

  const today = new Date().toISOString().slice(0, 10);
  const mandatoryDue = activeTraining.filter((t) => t.mandatory && t.due_date && t.due_date < today);
  const overdueTasks = tasks.filter((t) => t.status === "overdue");

  const approvedPolicies = policies.filter((p) => p.status === "approved");
  const pendingPolicies = policies.filter((p) => p.status === "pending_approval" || p.status === "in_review");

  const activeReviews = accessReviews.filter((r) => r.status === "active" || r.status === "in_review");
  const reviewCompletion = activeReviews.length
    ? Math.round((activeReviews.reduce((s, r) => s + (r.completed_items || 0), 0) /
        Math.max(1, activeReviews.reduce((s, r) => s + (r.total_items || 0), 0))) * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="HR Compliance View"
        subtitle="Your focus: training, policy acknowledgments, access reviews and people compliance"
        actions={
          <Link to="/training" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Manage training <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Training Completion" value={`${completionRate}%`} icon={GraduationCap} color={completionRate >= 80 ? "green" : completionRate >= 50 ? "amber" : "red"} trendLabel={`${completedTotal}/${assignedTotal} done`} />
        <StatCard label="Mandatory Due" value={mandatoryDue.length} icon={AlertTriangle} color={mandatoryDue.length > 0 ? "red" : "green"} trendLabel={`${activeTraining.length} active`} />
        <StatCard label="Approved Policies" value={approvedPolicies.length} icon={FileText} color="blue" trendLabel={`${pendingPolicies.length} pending`} />
        <StatCard label="Access Reviews Active" value={activeReviews.length} icon={UserCheck} color={activeReviews.length > 0 ? "amber" : "green"} trendLabel={`${reviewCompletion}% complete`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Training compliance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Mandatory Training Due</h3>
            <Link to="/training" className="text-xs text-primary hover:underline">All training</Link>
          </div>
          {mandatoryDue.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {mandatoryDue.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">Due {t.due_date} · {t.completed_count || 0}/{t.assignee_count || 0} completed</p>
                  </div>
                  <StatusBadge status="overdue" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No mandatory training overdue.</p>
          )}
        </div>

        {/* Policy acknowledgments */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Policy Acknowledgments</h3>
            <Link to="/policy-acknowledgments" className="text-xs text-primary hover:underline">View</Link>
          </div>
          {approvedPolicies.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {approvedPolicies.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.acknowledgment_count || 0} acknowledged · v{p.version || "1.0"}</p>
                  </div>
                  <StatusBadge status="approved" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No approved policies.</p>
          )}
        </div>
      </div>

      {/* Access reviews */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Access Review Campaigns</h3>
          <Link to="/access-recertification" className="text-xs text-primary hover:underline flex items-center gap-1">Manage <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {activeReviews.length > 0 ? (
          <div className="space-y-3">
            {activeReviews.map((r) => {
              const pct = r.total_items > 0 ? Math.round((r.completed_items / r.total_items) * 100) : 0;
              return (
                <div key={r.id} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground w-40 truncate">{r.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                  <span className="text-sm font-semibold text-foreground w-12 text-right">{pct}%</span>
                  <StatusBadge status={r.status} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No active access review campaigns.</p>
        )}
      </div>
    </div>
  );
}