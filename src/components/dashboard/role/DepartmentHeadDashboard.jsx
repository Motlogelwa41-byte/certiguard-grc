import React from "react";
import { Link } from "react-router-dom";
import { CheckSquare, ShieldCheck, AlertTriangle, Siren, ArrowRight } from "lucide-react";
import useDashboardData from "@/hooks/useDashboardData";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";

export default function DepartmentHeadDashboard() {
  const { tasks, controls, risks, incidents, loading } = useDashboardData();
  const { user } = useAuth();
  const me = user?.full_name || user?.email || "";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Scope to items owned by / assigned to this department head where possible.
  const mine = (val) => !!val && !!me && val.toLowerCase() === me.toLowerCase();
  const myTasks = tasks.filter((t) => mine(t.assignee_name));
  const scopedTasks = myTasks.length ? myTasks : tasks;
  const openTasks = scopedTasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const overdueTasks = scopedTasks.filter((t) => t.status === "overdue");

  const myControls = controls.filter((c) => mine(c.owner_name));
  const scopedControls = myControls.length ? myControls : controls;
  const passing = scopedControls.filter((c) => c.status === "passing").length;
  const failing = scopedControls.filter((c) => c.status === "failing").length;

  const myRisks = risks.filter((r) => mine(r.owner_name));
  const scopedRisks = myRisks.length ? myRisks : risks;
  const openRisks = scopedRisks.filter((r) => r.status === "open" || r.status === "mitigating");

  const myIncidents = incidents.filter((i) => mine(i.assigned_to));
  const scopedIncidents = myIncidents.length ? myIncidents : incidents.filter((i) => !["closed", "false_positive"].includes(i.status));

  return (
    <div>
      <PageHeader
        title="Department Head View"
        subtitle={me ? `Compliance metrics for your area${me ? ` · ${me}` : ""}` : "Compliance metrics for your area"}
        actions={
          <Link to="/tasks" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            My tasks <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="My Open Tasks" value={openTasks.length} icon={CheckSquare} color={openTasks.length > 0 ? "amber" : "green"} trendLabel={`${overdueTasks.length} overdue`} />
        <StatCard label="Controls Owned" value={scopedControls.length} icon={ShieldCheck} color={failing > 0 ? "red" : "green"} trendLabel={`${passing} passing`} />
        <StatCard label="Open Risks" value={openRisks.length} icon={AlertTriangle} color={openRisks.length > 0 ? "amber" : "green"} trendLabel={`${scopedRisks.length} total`} />
        <StatCard label="Active Incidents" value={scopedIncidents.length} icon={Siren} color={scopedIncidents.length > 0 ? "red" : "green"} trendLabel="in my area" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* My tasks */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">My Team's Tasks</h3>
            <Link to="/tasks" className="text-xs text-primary hover:underline">All tasks</Link>
          </div>
          {openTasks.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {openTasks.slice(0, 8).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.assignee_name || "Unassigned"} · due {t.due_date || "—"}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No open tasks assigned to you.</p>
          )}
        </div>

        {/* Controls I own */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Controls I Own</h3>
            <Link to="/controls" className="text-xs text-primary hover:underline">All controls</Link>
          </div>
          {scopedControls.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {scopedControls.filter((c) => c.status !== "passing").slice(0, 8).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{(c.category || "").replace(/_/g, " ")}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No controls assigned to you.</p>
          )}
        </div>
      </div>

      {/* Risks in my area */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-semibold text-foreground">Risks in My Area</h3>
          <Link to="/risks" className="text-xs text-primary hover:underline flex items-center gap-1">Risk register <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {openRisks.length > 0 ? (
          <div className="space-y-2">
            {openRisks.slice(0, 6).map((r) => {
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
          <p className="text-sm text-muted-foreground py-6 text-center">No open risks in your area.</p>
        )}
      </div>
    </div>
  );
}