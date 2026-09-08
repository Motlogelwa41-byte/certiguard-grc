import React from "react";
import { Shield, CheckCircle, XCircle, FileCheck, AlertTriangle, Clock } from "lucide-react";

// Combined overview across both HRDC and BQA frameworks
export default function OverviewCards({ matched }) {
  const imported = matched.filter((m) => m.framework);
  const totalControls = imported.reduce((s, m) => s + m.controls.length, 0);
  const passing = imported.reduce((s, m) => s + m.controls.filter((c) => c.status === "passing").length, 0);
  const failing = imported.reduce((s, m) => s + m.controls.filter((c) => c.status === "failing").length, 0);
  const totalEvidence = imported.reduce((s, m) => s + m.evidence.length, 0);
  const approvedEvidence = imported.reduce((s, m) => s + m.evidence.filter((e) => e.status === "approved").length, 0);
  const gaps = failing + imported.reduce((s, m) => s + m.controls.filter((c) => c.status === "not_tested").length, 0);
  const avgReadiness = imported.length > 0
    ? Math.round(imported.reduce((s, m) => s + (m.framework.readiness_score || 0), 0) / imported.length)
    : 0;
  const openTasks = imported.reduce((s, m) => s + (m.tasks || []).filter((t) => t.status !== "completed").length, 0);
  const overdueTasks = imported.reduce((s, m) => s + (m.tasks || []).filter((t) => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")).length, 0);

  const cards = [
    { icon: Shield, label: "Avg Readiness", value: `${avgReadiness}%`, color: "blue", sub: `${imported.length}/${matched.length} imported` },
    { icon: CheckCircle, label: "Passing Controls", value: passing, color: "green", sub: `${totalControls} total` },
    { icon: XCircle, label: "Failing Controls", value: failing, color: "red", sub: `${gaps} total gaps` },
    { icon: FileCheck, label: "Evidence", value: totalEvidence, color: "purple", sub: `${approvedEvidence} approved` },
    { icon: AlertTriangle, label: "Open Actions", value: openTasks, color: "amber", sub: `${overdueTasks} overdue` },
    { icon: Clock, label: "Frameworks Tracked", value: imported.length, color: "slate", sub: `of ${matched.length} mandatory` },
  ];

  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    red: "text-rose-600 bg-rose-50 dark:bg-rose-500/10",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
    amber: "text-amber-600 bg-amber-50 dark:bg-amber-500/10",
    slate: "text-slate-600 bg-slate-50 dark:bg-slate-500/10",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map((c, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2.5 ${colors[c.color]}`}>
            <c.icon className="w-5 h-5" />
          </div>
          <p className="text-xl font-heading font-bold text-foreground">{c.value}</p>
          <p className="text-xs font-medium text-foreground">{c.label}</p>
          {c.sub && <p className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</p>}
        </div>
      ))}
    </div>
  );
}