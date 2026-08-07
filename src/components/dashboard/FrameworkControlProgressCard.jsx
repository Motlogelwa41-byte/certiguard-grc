import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle, Clock, AlertCircle, ArrowRight } from "lucide-react";

// Analytics summary card: shows % of controls completed vs pending for each active framework.
// "Completed" = passing. "Pending" = not_tested + failing + not_applicable (everything not yet passing).
export default function FrameworkControlProgressCard({ frameworks = [], controls = [] }) {
  const data = useMemo(() => {
    return frameworks
      .map((fw) => {
        const fwControls = controls.filter(
          (c) => c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
        );
        const total = fwControls.length || fw.total_controls || 0;
        const completed = fwControls.filter((c) => c.status === "passing").length || fw.passing_controls || 0;
        const pending = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : fw.readiness_score || 0;
        return { id: fw.id, name: fw.name, total, completed, pending, pct };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [frameworks, controls]);

  const totals = useMemo(() => {
    const total = data.reduce((s, d) => s + d.total, 0);
    const completed = data.reduce((s, d) => s + d.completed, 0);
    const pending = data.reduce((s, d) => s + d.pending, 0);
    return { total, completed, pending, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [data]);

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Framework Control Progress</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Completed vs pending controls per active framework</p>
        </div>
        <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Overall summary */}
      <div className="flex items-center gap-4 mb-5 pb-5 border-b border-border">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke={totals.pct >= 80 ? "#10B981" : totals.pct >= 50 ? "#f59e0b" : "#ef4444"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(totals.pct / 100) * 213.6} 213.6`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-foreground">{totals.pct}%</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{totals.completed}</p>
              <p className="text-[11px] text-muted-foreground">Completed</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{totals.pending}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Per-framework bars */}
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.slice(0, 6).map((d) => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="text-xs font-medium text-foreground w-28 truncate shrink-0">{d.name}</span>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-end pr-1.5"
                  style={{ width: `${d.pct}%` }}
                  title={`${d.completed} completed`}
                >
                  {d.pct > 15 && <span className="text-[9px] font-bold text-white">{d.completed}</span>}
                </div>
                {d.pending > 0 && d.pct < 85 && (
                  <div className="h-full flex-1 flex items-center justify-start pl-1.5" title={`${d.pending} pending`}>
                    {d.pct < 85 && <span className="text-[9px] font-bold text-muted-foreground">{d.pending}</span>}
                  </div>
                )}
              </div>
              <span className="text-xs font-semibold text-foreground w-10 text-right shrink-0">{d.pct}%</span>
            </div>
          ))}
          {data.length > 6 && (
            <p className="text-xs text-muted-foreground text-center pt-1">+{data.length - 6} more frameworks</p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">No active frameworks with controls yet</p>
      )}
    </div>
  );
}