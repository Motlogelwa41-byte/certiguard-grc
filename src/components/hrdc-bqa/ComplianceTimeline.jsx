import React from "react";
import { Calendar, AlertCircle } from "lucide-react";

// Botswana-specific regulatory deadlines + tracked task/audit due dates
const REGULATORY_DATES = {
  hrdc_bw: [
    { date: "06-30", label: "Training Levy Annual Return", body: "HRDC", detail: "0.2% of annual payroll — annual reconciliation due" },
    { date: "03-31", label: "Workplace Learning Plan Submission", body: "HRDC", detail: "Annual workplace learning committee plan" },
    { date: "09-30", label: "Industry Training Committee Report", body: "HRDC", detail: "Quarterly industry training committee compliance report" },
    { date: "12-31", label: "Training Provider Re-registration", body: "HRDC", detail: "Annual accreditation renewal for registered training providers" },
  ],
  bqa_bw: [
    { date: "04-30", label: "Annual QA Review Submission", body: "BQA", detail: "Annual quality assurance review for accredited providers" },
    { date: "10-31", label: "Qualification Re-registration", body: "BQA", detail: "NQF qualification registration renewal cycle" },
    { date: "12-31", label: "Foreign Qualification Evaluation Cycle", body: "BQA", detail: "Year-end foreign qualification comparability review" },
  ],
};

function daysUntil(dateStr) {
  const now = new Date();
  const year = now.getFullYear();
  const [m, d] = dateStr.split("-").map(Number);
  let target = new Date(year, m - 1, d);
  if (target < now) target = new Date(year + 1, m - 1, d);
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default function ComplianceTimeline({ libId, tasks, audits }) {
  const regDates = REGULATORY_DATES[libId] || [];

  // Combine regulatory dates + tracked tasks with due dates + audits
  const items = [
    ...regDates.map((r) => ({
      type: "regulatory",
      label: r.label,
      detail: r.detail,
      body: r.body,
      days: daysUntil(r.date),
      dateLabel: r.date,
    })),
    ...(tasks || [])
      .filter((t) => t.due_date && t.status !== "completed")
      .map((t) => ({
        type: "task",
        label: t.title,
        detail: t.assignee_name ? `Assigned to ${t.assignee_name}` : "Unassigned",
        body: "Remediation",
        days: Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
        dateLabel: t.due_date,
      })),
    ...(audits || [])
      .filter((a) => a.start_date)
      .map((a) => ({
        type: "audit",
        label: a.title,
        detail: a.auditor_name || a.auditor_firm || "Internal audit",
        body: "Audit",
        days: Math.ceil((new Date(a.start_date) - new Date()) / (1000 * 60 * 60 * 24)),
        dateLabel: a.start_date,
      })),
  ].sort((a, b) => a.days - b.days);

  const upcoming = items.filter((i) => i.days >= 0).slice(0, 6);
  const overdue = items.filter((i) => i.days < 0);

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Compliance Timeline & Regulatory Deadlines
      </h3>

      {overdue.length > 0 && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-500/10 p-3">
          <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue ({overdue.length})
          </p>
          <div className="space-y-1">
            {overdue.map((o, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{o.label}</span>
                <span className="text-rose-600 font-medium">{Math.abs(o.days)}d ago</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">No upcoming deadlines tracked.</p>
      ) : (
        <div className="space-y-2.5">
          {upcoming.map((item, i) => {
            const urgent = item.days <= 30;
            const soon = item.days <= 60;
            return (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${urgent ? "bg-rose-500" : soon ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                    <span className={`text-xs font-semibold shrink-0 ${urgent ? "text-rose-600" : soon ? "text-amber-600" : "text-emerald-600"}`}>
                      {item.days === 0 ? "Today" : item.days === 1 ? "Tomorrow" : `in ${item.days}d`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.type === "regulatory" ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" :
                      item.type === "audit" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300" :
                      "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                    }`}>{item.body}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}