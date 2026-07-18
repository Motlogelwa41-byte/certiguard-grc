import React, { useState } from "react";
import { Pencil, Trash2, ChevronDown, ChevronUp, ShieldAlert } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import ResidualRiskCalculator from "@/components/risks/ResidualRiskCalculator";

const APPETITE_BANDS = {
  within_appetite:  { label: "Within Appetite",  cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  tolerance_zone:   { label: "Tolerance Zone",   cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  above_appetite:   { label: "Above Appetite",   cls: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  unacceptable:     { label: "Unacceptable",     cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function getAppetiteBand(score) {
  try {
    const t = JSON.parse(localStorage.getItem("riskAppetiteThresholds") || "{}");
    const low = t.low || 6; const med = t.medium || 12; const high = t.high || 19;
    if (score <= low) return "within_appetite";
    if (score <= med) return "tolerance_zone";
    if (score <= high) return "above_appetite";
    return "unacceptable";
  } catch { return null; }
}

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
  const bandKey = r.appetite_override ? r.appetite_override_band : (r.appetite_band || getAppetiteBand(score));
  const band = bandKey ? APPETITE_BANDS[bandKey] : null;
  const exceedsTolerance = bandKey === "above_appetite" || bandKey === "unacceptable";

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {r.risk_id && <span className="text-xs font-mono text-muted-foreground">{r.risk_id}</span>}
            <StatusBadge status={r.status} />
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm">{r.title}</h3>
          {band && (
            <span className={`mt-1 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${band.cls}`}>
              {exceedsTolerance && <ShieldAlert className="w-3 h-3" />}
              {band.label}
            </span>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getRiskColor(score)}`}>
          {score}
        </div>
      </div>

      {exceedsTolerance && r.tolerance_justification && (
        <div className="flex items-start gap-1.5 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-700">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" /> <span><strong>Tolerance justification:</strong> {r.tolerance_justification}</span>
        </div>
      )}
      {exceedsTolerance && !r.tolerance_justification && (
        <div className="flex items-center gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> Exceeds tolerance — justification required
        </div>
      )}

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
          {onEdit && <button onClick={() => onEdit(r)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>}
          {onDelete && <button onClick={() => onDelete(r.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
    </div>
  );
}