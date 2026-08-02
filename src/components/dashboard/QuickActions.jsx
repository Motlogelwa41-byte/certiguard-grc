import React from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, AlertTriangle, Paperclip, Brain, ClipboardList, ShieldAlert, Target } from "lucide-react";

const actions = [
  { label: "Add Control", icon: Plus, path: "/controls", accent: "text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" },
  { label: "Log Risk", icon: AlertTriangle, path: "/risks", accent: "text-amber-400 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
  { label: "New Policy", icon: FileText, path: "/policies", accent: "text-violet-400 bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20" },
  { label: "Upload Evidence", icon: Paperclip, path: "/evidence", accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
  { label: "AI Hub", icon: Brain, path: "/ai-hub", accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20" },
  { label: "Report Incident", icon: ShieldAlert, path: "/incidents", accent: "text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" },
  { label: "Risk Heatmap", icon: Target, path: "/risk-heatmap", accent: "text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20" },
  { label: "Audit Checklist", icon: ClipboardList, path: "/audit-checklists", accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20 hover:bg-cyan-500/20" },
];

export default function QuickActions() {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground">Quick Actions</h3>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Frequently Used</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.path}
              to={a.path}
              className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${a.accent}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium text-center leading-tight text-foreground">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}