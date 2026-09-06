import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, CheckCircle2, XCircle, Clock, FileCheck,
  AlertTriangle, TrendingUp, Loader2, ChevronRight, FileText,
  Calendar, Activity
} from "lucide-react";

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [evidence, setEvidence] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ctrl, tsk, ev] = await Promise.all([
        base44.entities.Control.list("-updated_date", 500).catch(() => []),
        base44.entities.ComplianceTask.list("-due_date", 200).catch(() => []),
        base44.entities.Evidence.list("-updated_date", 50).catch(() => []),
      ]);
      setControls(ctrl || []);
      setTasks(tsk || []);
      setEvidence((ev || []).filter((e) => e.file_url).slice(0, 10));
    } catch (e) {
      // best-effort
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Readiness metrics
  const tested = controls.filter((c) => c.status === "passing" || c.status === "failing");
  const passing = controls.filter((c) => c.status === "passing");
  const failing = controls.filter((c) => c.status === "failing");
  const notTested = controls.filter((c) => c.status === "not_tested");
  const readinessScore = tested.length > 0 ? Math.round((passing.length / tested.length) * 100) : 0;
  const readinessGrade = readinessScore >= 90 ? "A" : readinessScore >= 80 ? "B" : readinessScore >= 70 ? "C" : readinessScore >= 60 ? "D" : "F";

  // Task metrics
  const today = new Date();
  const openTasks = tasks.filter((t) => !["completed", "done", "cancelled"].includes(t.status));
  const overdueTasks = openTasks.filter((t) => t.due_date && new Date(t.due_date) < today);
  const dueSoonTasks = openTasks.filter((t) => {
    if (!t.due_date) return false;
    const days = Math.ceil((new Date(t.due_date) - today) / 86400000);
    return days >= 0 && days <= 7;
  });
  const completedTasks = tasks.filter((t) => ["completed", "done"].includes(t.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Client Dashboard"
        subtitle="A clean progress view for bank auditors and stakeholders — security readiness, task status, and recent evidence at a glance."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Live Progress
          </Badge>
        }
      />

      {/* Readiness Score — Hero */}
      <Card className="mb-6 border-primary/20 overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={readinessScore >= 80 ? "hsl(var(--success))" : readinessScore >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(readinessScore / 100) * 327} 327`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute text-center">
                <p className="text-4xl font-heading font-bold text-foreground tabular-nums">{readinessScore}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">Grade {readinessGrade}</p>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              <ReadinessStat label="Passing" value={passing.length} icon={CheckCircle2} color="text-emerald-600" />
              <ReadinessStat label="Failing" value={failing.length} icon={XCircle} color="text-rose-600" />
              <ReadinessStat label="Not Tested" value={notTested.length} icon={Clock} color="text-amber-600" />
              <ReadinessStat label="Total Controls" value={controls.length} icon={ShieldCheck} color="text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Task Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-primary" /> Active Task Status</span>
              <Link to="/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <TaskStat label="Open" value={openTasks.length} color="text-blue-600" />
              <TaskStat label="Due ≤7d" value={dueSoonTasks.length} color="text-amber-600" />
              <TaskStat label="Overdue" value={overdueTasks.length} color="text-rose-600" />
              <TaskStat label="Done" value={completedTasks.length} color="text-emerald-600" />
            </div>
            {openTasks.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-sm text-muted-foreground">All tasks completed</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {openTasks.slice(0, 6).map((t) => {
                  const isOverdue = t.due_date && new Date(t.due_date) < today;
                  const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date) - today) / 86400000) : null;
                  return (
                    <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {t.due_date || "No due date"}
                          {t.assignee_name && ` · ${t.assignee_name}`}
                        </p>
                      </div>
                      {isOverdue ? (
                        <Badge variant="destructive" className="shrink-0">Overdue</Badge>
                      ) : daysLeft !== null && daysLeft <= 7 ? (
                        <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/20 shrink-0">{daysLeft}d left</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0 capitalize">{t.status?.replace(/_/g, " ")}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Evidence Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" /> Recent Evidence Uploads</span>
              <Link to="/evidence" className="text-xs text-primary hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {evidence.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <FileText className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No evidence uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {e.control_title || e.control_id || "Unlinked"} · {e.file_name || "file"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {e.status === "approved" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</Badge>
                      ) : e.status === "rejected" ? (
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejected</Badge>
                      ) : e.status === "expired" ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {e.expiry_date && (
                        <p className="text-xs text-muted-foreground mt-1">Exp: {e.expiry_date}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick summary bar */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground">Readiness:</span>
              <span className="font-semibold text-foreground">{readinessScore}% (Grade {readinessGrade})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Open Tasks:</span>
              <span className="font-semibold text-foreground">{openTasks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-muted-foreground">Overdue:</span>
              <span className="font-semibold text-foreground">{overdueTasks.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground">Evidence Items:</span>
              <span className="font-semibold text-foreground">{evidence.length} recent</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReadinessStat({ label, value, icon: Icon, color }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <Icon className={`w-4 h-4 mx-auto mb-1.5 ${color}`} />
      <p className={`text-2xl font-heading font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function TaskStat({ label, value, color }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className={`text-2xl font-heading font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}