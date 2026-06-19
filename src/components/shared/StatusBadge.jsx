import React from "react";

const statusStyles = {
  passing: "bg-emerald-100 text-emerald-700",
  failing: "bg-red-100 text-red-700",
  not_tested: "bg-slate-100 text-slate-600",
  not_applicable: "bg-slate-100 text-slate-500",
  open: "bg-amber-100 text-amber-700",
  mitigating: "bg-blue-100 text-blue-700",
  accepted: "bg-slate-100 text-slate-600",
  transferred: "bg-purple-100 text-purple-700",
  closed: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  in_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  archived: "bg-slate-100 text-slate-500",
  pending_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
  not_started: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  audit_ready: "bg-emerald-100 text-emerald-700",
  certified: "bg-emerald-100 text-emerald-800",
  planned: "bg-slate-100 text-slate-600",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  todo: "bg-slate-100 text-slate-600",
  overdue: "bg-red-100 text-red-700",
  pass: "bg-emerald-100 text-emerald-700",
  pass_with_exceptions: "bg-amber-100 text-amber-700",
  fail: "bg-red-100 text-red-700",
  pending: "bg-slate-100 text-slate-600",
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
  under_review: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
  automated: "bg-blue-100 text-blue-700",
  manual: "bg-slate-100 text-slate-600",
  partially_automated: "bg-purple-100 text-purple-700",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const style = statusStyles[status] || "bg-slate-100 text-slate-600";
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}