import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  CalendarClock, CheckCircle2, Circle, Clock, AlertTriangle, ChevronRight,
  Shield, Lock, ArrowRight, ListChecks, TrendingUp, Flag, FileText,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";

// The two regulatory updates we are tracking adoption progress against.
const REGULATIONS = [
  {
    key: "nist",
    keywords: ["NIST", "800-53"],
    title: "NIST SP 800-53 Rev 6",
    regulator: "NIST",
    icon: Shield,
    accent: "blue",
    description: "Security and privacy controls for federal information systems and organizations.",
  },
  {
    key: "gdpr",
    keywords: ["GDPR", "Article 32"],
    title: "GDPR Article 32",
    regulator: "European Union",
    icon: Lock,
    accent: "emerald",
    description: "Security of processing — appropriate technical and organisational measures.",
  },
];

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function statusForChange(change, tasks) {
  if (!change) return "unknown";
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  if (total > 0 && completed === total) return "complete";
  const deadline = change.compliance_deadline;
  if (deadline) {
    const days = daysBetween(new Date(), deadline);
    if (days < 0) return "overdue";
    if (days <= 30 && completed / Math.max(total, 1) < 0.75) return "at_risk";
  }
  return "on_track";
}

export default function RegulatoryRoadmap() {
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      base44.entities.RegulatoryChange.list("-compliance_deadline", 200).catch(() => []),
      base44.entities.ComplianceTask.list("-due_date", 500).catch(() => []),
    ]).then(([changeRows, taskRows]) => {
      if (!mounted) return;
      setChanges(changeRows || []);
      setTasks(taskRows || []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  // Match each regulation to its RegulatoryChange record and associated tasks.
  const tracks = useMemo(() => {
    return REGULATIONS.map((reg) => {
      const change = changes.find((c) =>
        reg.keywords.some((kw) =>
          (c.title || "").toLowerCase().includes(kw.toLowerCase()) ||
          (c.regulation_name || "").toLowerCase().includes(kw.toLowerCase())
        )
      );
      const regTasks = tasks.filter((t) => {
        const hay = `${t.title || ""} ${t.related_framework_id || ""} ${t.notes || ""}`.toLowerCase();
        return reg.keywords.some((kw) => hay.includes(kw.toLowerCase()));
      });
      return { ...reg, change, tasks: regTasks };
    });
  }, [changes, tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulatory Adoption Roadmap"
        subtitle="Track adoption progress for NIST SP 800-53 Rev 6 and GDPR Article 32 against their compliance deadlines."
        actions={
          <Link to="/regulatory-changes">
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-1.5" /> All Changes
            </Button>
          </Link>
        }
      />

      {/* Summary cards per regulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {tracks.map((track) => (
          <RegulationCard key={track.key} track={track} />
        ))}
      </div>

      {/* Combined timeline */}
      <TimelineView tracks={tracks} />

      {/* Task lists */}
      {tracks.map((track) => (
        <TaskList key={track.key} track={track} />
      ))}
    </div>
  );
}

function RegulationCard({ track }) {
  const { change, tasks, title, regulator, icon: Icon, description } = track;
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
  const overdue = tasks.filter(
    (t) => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")
  ).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const deadline = change?.compliance_deadline;
  const daysLeft = deadline ? daysBetween(new Date(), deadline) : null;
  const status = statusForChange(change, tasks);

  const statusStyles = {
    on_track: { label: "On Track", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    at_risk: { label: "At Risk", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    overdue: { label: "Overdue", cls: "bg-red-100 text-red-700 border-red-200" },
    complete: { label: "Complete", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    unknown: { label: "No Data", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  };
  const st = statusStyles[status] || statusStyles.unknown;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{regulator}</p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${st.cls}`}>{st.label}</span>
      </div>

      {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-muted-foreground">Adoption Progress</span>
          <span className="text-sm font-heading font-bold text-foreground">{pct}%</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 75 ? "#10B981" : pct >= 40 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {completed} done</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> {inProgress} in progress</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> {overdue} overdue</span>
          <span className="ml-auto">{total} total tasks</span>
        </div>
      </div>

      {/* Deadline countdown */}
      {deadline && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Compliance Deadline</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-heading font-bold text-foreground">
              {new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className={`text-xs font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : "text-emerald-600"}`}>
              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days remaining`}
            </p>
          </div>
        </div>
      )}

      {!change && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 mt-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            No RegulatoryChange record found for {title}. Create one on the Regulatory Changes page to link tasks and deadlines.
          </p>
        </div>
      )}
    </div>
  );
}

function TimelineView({ tracks }) {
  const today = new Date();
  // Determine the timeline range: from today to the furthest deadline.
  const deadlines = tracks
    .map((t) => t.change?.compliance_deadline)
    .filter(Boolean)
    .map((d) => new Date(d));
  if (deadlines.length === 0) return null;
  const furthest = new Date(Math.max(...deadlines.map((d) => d.getTime())));
  const totalDays = Math.max(daysBetween(today, furthest), 1);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-5">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-foreground">Adoption Timeline</h3>
      </div>

      <div className="space-y-6">
        {tracks.map((track) => {
          const { change, tasks, title, icon: Icon } = track;
          const deadline = change?.compliance_deadline;
          if (!deadline) {
            return (
              <div key={track.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground">No deadline set — timeline unavailable.</p>
              </div>
            );
          }
          const dlDate = new Date(deadline);
          const dlPct = Math.min(Math.max((daysBetween(today, dlDate) / totalDays) * 100, 2), 100);
          const completed = tasks.filter((t) => t.status === "completed").length;
          const total = tasks.length;
          const progressPct = total > 0 ? (completed / total) * dlPct : 0;

          return (
            <div key={track.key}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {completed}/{total} tasks · due {new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              {/* Timeline bar */}
              <div className="relative h-8 rounded-lg bg-muted/60 overflow-hidden">
                {/* Progress fill (completed portion of timeline) */}
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-400/40 rounded-l-lg"
                  style={{ width: `${progressPct}%` }}
                />
                {/* Today marker */}
                <div className="absolute left-0 top-0 h-full w-0.5 bg-primary z-10" />
                {/* Deadline marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-red-500 z-10"
                  style={{ left: `${dlPct}%` }}
                >
                  <Flag className="absolute -top-1 -translate-x-1/2 w-3.5 h-3.5 text-red-500" />
                </div>
                {/* Task due date dots */}
                {tasks.filter((t) => t.due_date).map((t) => {
                  const tDate = new Date(t.due_date);
                  if (tDate < today || tDate > dlDate) return null;
                  const left = (daysBetween(today, tDate) / totalDays) * 100;
                  const done = t.status === "completed";
                  return (
                    <div
                      key={t.id}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${done ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ left: `${left}%` }}
                      title={`${t.title} — due ${t.due_date}`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                <span>Today</span>
                <span className="text-red-500 font-medium">Deadline {new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed task</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending task</span>
        <span className="flex items-center gap-1.5"><Flag className="w-3 h-3 text-red-500" /> Compliance deadline</span>
      </div>
    </div>
  );
}

function TaskList({ track }) {
  const { tasks, title, change } = track;
  if (tasks.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">{title} — Adoption Tasks</h3>
        </div>
        <Link to="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">
          Task register <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2">
        {tasks.map((t) => {
          const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
          return (
            <Link
              key={t.id}
              to="/tasks"
              className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {t.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : isOverdue ? (
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.assignee_name ? `Assigned to ${t.assignee_name}` : "Unassigned"}
                    {t.due_date ? ` · Due ${t.due_date}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={t.status} />
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}