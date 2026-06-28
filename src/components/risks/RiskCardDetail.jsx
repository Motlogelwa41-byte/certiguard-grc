import React, { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import ResidualRiskCalculator from "@/components/risks/ResidualRiskCalculator";

const getRiskColor = (score) => {
  if (score >= 20) return "bg-red-500";
  if (score >= 12) return "bg-orange-500";
  if (score >= 6) return "bg-amber-500";
  return "bg-emerald-500";
};

export default function RiskCardDetail({ r, allControls, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const score = (r.likelihood || 1) * (r.impact || 1);
  const linkedControls = allControls.filter(c => (r.related_control_ids || []).includes(c.id));

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {r.risk_id && <span className="text-xs font-mono text-muted-foreground">{r.risk_id}</span>}
            <StatusBadge status={r.status} />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm">{r.title}</h3>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getRiskColor(score)}`}>
          {score}
        </div>
      </div>

      {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-muted-foreground">Likelihood: </span><span className="font-semibold">{r.likelihood}/5</span></div>
        <div><span className="text-muted-foreground">Impact: </span><span className="font-semibold">{r.impact}/5</span></div>
        <div><span className="text-muted-foreground">Treatment: </span><span className="font-semibold capitalize">{r.treatment}</span></div>
        <div><span className="text-muted-foreground">Category: </span><span className="font-semibold capitalize">{(r.category || "").replace(/_/g, " ")}</span></div>
      </div>

      {linkedControls.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{linkedControls.length} control{linkedControls.length > 1 ? "s" : ""} linked</span>
        </div>
      )}

      {/* Residual risk toggle */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1 w-fit"
      >
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? "Hide" : "Show"} Residual Risk Calculator
      </button>

      {expanded && (
        <ResidualRiskCalculator risk={r} linkedControls={linkedControls} />
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
        <span>{r.owner_name || "Unassigned"}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(r)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(r.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}