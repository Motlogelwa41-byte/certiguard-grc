import React from "react";
import { AlertTriangle, Wrench, ClipboardList } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

// Gaps (failing + not-tested controls), open remediation tasks, and audit findings for the framework
export default function GapRemediationPanel({ framework, controls, tasks, findings }) {
  const failing = controls.filter((c) => c.status === "failing");
  const notTested = controls.filter((c) => c.status === "not_tested");
  const openTasks = (tasks || []).filter((t) => t.status !== "completed");
  const fwFindings = (findings || []).filter((f) => f.status === "open" || f.status === "in_remediation");

  return (
    <div className="grid lg:grid-cols-3 gap-4 mb-6">
      {/* Gaps */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Compliance Gaps ({failing.length + notTested.length})
        </h3>
        {failing.length === 0 && notTested.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No gaps — all mapped controls are passing.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {failing.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{c.control_id || "—"}</span>
                <span className="text-xs text-foreground flex-1 truncate">{c.title}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
            {notTested.slice(0, 8).map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{c.control_id || "—"}</span>
                <span className="text-xs text-foreground flex-1 truncate">{c.title}</span>
                <StatusBadge status={c.status} />
              </div>
            ))}
            {notTested.length > 8 && (
              <p className="text-[11px] text-muted-foreground pt-1">+ {notTested.length - 8} more not tested</p>
            )}
          </div>
        )}
      </div>

      {/* Remediation tasks */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-600" />
          Remediation Actions ({openTasks.length})
        </h3>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No open remediation actions.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {openTasks.map((t) => {
              const overdue = t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed");
              return (
                <div key={t.id} className="py-1.5 border-b border-border last:border-0">
                  <p className="text-xs font-medium text-foreground truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={t.status} />
                    {t.due_date && (
                      <span className={`text-[11px] ${overdue ? "text-rose-600 font-semibold" : "text-muted-foreground"}`}>
                        Due {t.due_date}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Findings */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-purple-600" />
          Open Findings ({fwFindings.length})
        </h3>
        {fwFindings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No open audit findings for {framework?.name || "this framework"}.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {fwFindings.map((f) => (
              <div key={f.id} className="py-1.5 border-b border-border last:border-0">
                <p className="text-xs font-medium text-foreground truncate">{f.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={f.status} />
                  <span className="text-[11px] text-muted-foreground capitalize">{f.severity}</span>
                  {f.due_date && <span className="text-[11px] text-muted-foreground">· Due {f.due_date}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}