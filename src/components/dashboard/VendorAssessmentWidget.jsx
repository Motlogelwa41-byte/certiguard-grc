import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, CheckCircle2, AlertTriangle, Send } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const STATUS_ICONS = {
  submitted: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  reviewed: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
  sent: <Send className="w-3.5 h-3.5 text-blue-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-amber-400" />,
  draft: <Clock className="w-3.5 h-3.5 text-slate-400" />,
};

const RISK_COLORS = {
  low: "text-emerald-500",
  medium: "text-amber-400",
  high: "text-orange-500",
  critical: "text-red-500",
};

export default function VendorAssessmentWidget({ assessments = [] }) {
  const total = assessments.length;
  const submitted = assessments.filter((a) => ["submitted", "completed", "reviewed"].includes(a.status)).length;
  const pending = assessments.filter((a) => ["sent", "in_progress", "draft"].includes(a.status)).length;
  const overdue = assessments.filter((a) => {
    if (!a.due_date) return false;
    return new Date(a.due_date) < new Date() && !["submitted", "completed", "reviewed"].includes(a.status);
  }).length;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground">Vendor Assessments</h3>
        <Link to="/vendor-assessments" className="text-xs text-primary hover:underline flex items-center gap-1">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="flex-1 bg-emerald-500/10 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-500">{submitted}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Submitted</p>
        </div>
        <div className="flex-1 bg-amber-500/10 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-500">{pending}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
        </div>
        {overdue > 0 && (
          <div className="flex-1 bg-red-500/10 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-500">{overdue}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Overdue</p>
          </div>
        )}
      </div>

      {/* List */}
      {assessments.length > 0 ? (
        <div className="space-y-2">
          {assessments.slice(0, 5).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                {STATUS_ICONS[a.status] || <Clock className="w-3.5 h-3.5 text-slate-400" />}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.vendor_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{a.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                {a.risk_score > 0 && (
                  <span className={`text-xs font-bold ${RISK_COLORS[a.risk_level] || "text-muted-foreground"}`}>
                    {a.risk_score}
                  </span>
                )}
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No assessments yet</p>
      )}
    </div>
  );
}