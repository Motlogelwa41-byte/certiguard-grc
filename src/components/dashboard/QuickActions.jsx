import React from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, AlertTriangle, Paperclip, Brain, ClipboardList, ShieldAlert, Target } from "lucide-react";

const actions = [
  { label: "Add Control", icon: Plus, path: "/controls", color: "bg-blue-500 hover:bg-blue-600" },
  { label: "Log Risk", icon: AlertTriangle, path: "/risks", color: "bg-amber-500 hover:bg-amber-600" },
  { label: "New Policy", icon: FileText, path: "/policies", color: "bg-purple-500 hover:bg-purple-600" },
  { label: "Upload Evidence", icon: Paperclip, path: "/evidence", color: "bg-emerald-500 hover:bg-emerald-600" },
  { label: "AI Hub", icon: Brain, path: "/ai-hub", color: "bg-indigo-500 hover:bg-indigo-600" },
  { label: "Report Incident", icon: ShieldAlert, path: "/incidents", color: "bg-red-500 hover:bg-red-600" },
  { label: "Risk Heatmap", icon: Target, path: "/risk-heatmap", color: "bg-rose-500 hover:bg-rose-600" },
  { label: "Audit Checklist", icon: ClipboardList, path: "/audit-checklists", color: "bg-cyan-500 hover:bg-cyan-600" },
];

export default function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-heading font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.path}
              to={a.path}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl text-white transition-all ${a.color} shadow-sm hover:shadow-md hover:-translate-y-0.5`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium text-center leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}