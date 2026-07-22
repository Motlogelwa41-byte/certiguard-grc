import React from "react";
import StatusBadge from "@/components/shared/StatusBadge";
import { Check, Circle } from "lucide-react";

const STAGES = [
  { key: "planned", label: "Planned" },
  { key: "gap_assessment", label: "Gap Assessment" },
  { key: "implementation", label: "Implementation" },
  { key: "audit_in_progress", label: "Audit" },
  { key: "remediation", label: "Remediation" },
  { key: "certified", label: "Certified" },
];

export default function LifecycleTimeline({ status, milestones }) {
  const activeIdx = STAGES.findIndex((s) => s.key === status);
  const reached = (idx) => {
    if (status === "expired" || status === "lapsed" || status === "suspended") return idx <= 5;
    return activeIdx >= 0 && idx <= activeIdx;
  };

  return (
    <div>
      <div className="flex items-center mb-6 overflow-x-auto pb-2">
        {STAGES.map((stage, idx) => {
          const done = reached(idx);
          const current = idx === activeIdx;
          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center min-w-[90px]">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${done ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border text-muted-foreground"} ${current ? "ring-2 ring-primary/40" : ""}`}>
                  {done && !current ? <Check className="w-4 h-4" /> : <Circle className="w-3 h-3" />}
                </div>
                <span className={`text-[10px] mt-1 text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>{stage.label}</span>
              </div>
              {idx < STAGES.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-5 ${reached(idx + 1) ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-3">Milestones</h3>
      {milestones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No milestones defined. Add milestones to track the certification journey.</p>
      ) : (
        <div className="space-y-2">
          {[...milestones].sort((a, b) => (a.order || 0) - (b.order || 0)).map((m) => (
            <div key={m.id} className="flex items-start gap-3 border border-border rounded-lg p-3">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${m.status === "completed" ? "bg-emerald-500" : m.status === "in_progress" ? "bg-blue-500" : m.status === "overdue" ? "bg-red-500" : "bg-slate-300"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.title}</span>
                  <StatusBadge status={m.status === "completed" ? "completed" : m.status === "in_progress" ? "in_progress" : m.status === "overdue" ? "overdue" : "not_started"} />
                </div>
                <p className="text-xs text-muted-foreground capitalize">{(m.milestone_type || "").replace(/_/g, " ")} · due {m.due_date || "—"} {m.assignee_name ? `· ${m.assignee_name}` : ""}</p>
                {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}