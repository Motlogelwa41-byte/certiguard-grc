import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ShieldAlert, Target } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const ZONE = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 20) return { bg: "bg-red-500/25", border: "border-red-500/50", label: "Critical", text: "text-red-400" };
  if (score >= 12) return { bg: "bg-orange-500/25", border: "border-orange-500/50", label: "High", text: "text-orange-400" };
  if (score >= 6)  return { bg: "bg-amber-500/20", border: "border-amber-500/40", label: "Medium", text: "text-amber-400" };
  return { bg: "bg-emerald-500/15", border: "border-emerald-500/35", label: "Low", text: "text-emerald-400" };
};

const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ComplianceHeatmap({ risks = [], controls = [] }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const openRisks = useMemo(
    () => risks.filter((r) => r.status === "open" || r.status === "mitigating"),
    [risks]
  );

  const getRisksInCell = (l, i) => openRisks.filter((r) => (r.likelihood || 1) === l && (r.impact || 1) === i);

  // Critical compliance gaps = failing controls (critical/high severity first)
  const failingControls = useMemo(
    () => controls
      .filter((c) => c.status === "failing")
      .sort((a, b) => (SEV_RANK[a.severity] ?? 9) - (SEV_RANK[b.severity] ?? 9)),
    [controls]
  );

  const criticalGaps = failingControls.filter((c) => c.severity === "critical" || c.severity === "high");

  const critical = openRisks.filter((r) => (r.likelihood || 1) * (r.impact || 1) >= 20).length;
  const high = openRisks.filter((r) => { const s = (r.likelihood || 1) * (r.impact || 1); return s >= 12 && s < 20; }).length;

  const cellRisks = selectedCell ? getRisksInCell(selectedCell.likelihood, selectedCell.impact) : [];

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Compliance Risk Heatmap
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Likelihood × Impact matrix — {critical} critical, {high} high risk zones. Click a cell to drill in.
          </p>
        </div>
        <Link to="/risk-heatmap" className="text-xs text-primary hover:underline flex items-center gap-1">
          Full heatmap <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Heatmap matrix */}
        <div className="xl:col-span-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>IMPACT ↑</span>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((impact) => (
                <div key={impact} className="flex items-stretch gap-1 mb-1">
                  <div className="w-16 shrink-0 flex items-center justify-end pr-2">
                    <span className="text-[10px] text-muted-foreground text-right">{impact}</span>
                  </div>
                  {[1, 2, 3, 4, 5].map((likelihood) => {
                    const zone = ZONE(likelihood, impact);
                    const count = getRisksInCell(likelihood, impact).length;
                    const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                    return (
                      <div
                        key={likelihood}
                        onClick={() => setSelectedCell(isSelected ? null : { likelihood, impact })}
                        className={`flex-1 min-h-[52px] rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150
                          ${zone.bg} ${zone.border}
                          ${isSelected ? "ring-2 ring-primary ring-offset-1 scale-105 shadow-lg" : "hover:brightness-125"}`}
                      >
                        {count > 0 ? (
                          <span className="text-base font-bold text-foreground">{count}</span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">{likelihood * impact}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="flex gap-1 mt-1">
                <div className="w-16 shrink-0" />
                {[1, 2, 3, 4, 5].map((l) => (
                  <div key={l} className="flex-1 text-center">
                    <span className="text-[10px] text-muted-foreground">{l}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-1">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-widest">LIKELIHOOD →</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border">
            {[
              { label: "Critical (≥20)", bg: "bg-red-500" },
              { label: "High (12–19)", bg: "bg-orange-500" },
              { label: "Medium (6–11)", bg: "bg-amber-500" },
              { label: "Low (<6)", bg: "bg-emerald-500" },
            ].map(({ label, bg }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm ${bg}`} />{label}
              </span>
            ))}
          </div>
        </div>

        {/* Right panel: cell risks OR critical compliance gaps */}
        <div className="xl:col-span-2">
          {selectedCell ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden h-full">
              <div className={`px-4 py-3 border-b border-border ${ZONE(selectedCell.likelihood, selectedCell.impact).bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-bold ${ZONE(selectedCell.likelihood, selectedCell.impact).text}`}>
                      {ZONE(selectedCell.likelihood, selectedCell.impact).label} Zone
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      L{selectedCell.likelihood} × I{selectedCell.impact} = Score {selectedCell.likelihood * selectedCell.impact}
                    </p>
                  </div>
                  <button onClick={() => setSelectedCell(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                </div>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {cellRisks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No risks in this cell</p>
                ) : cellRisks.map((r) => (
                  <div key={r.id} className="p-3">
                    <p className="text-sm font-semibold text-foreground">{r.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={r.status} />
                      <span className="text-[10px] text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{r.owner_name || "Unassigned"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden h-full flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-red-500/5">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <h3 className="font-semibold text-sm text-foreground">Critical Compliance Gaps</h3>
                <span className="ml-auto text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">{criticalGaps.length}</span>
              </div>
              <div className="divide-y divide-border flex-1 max-h-80 overflow-y-auto">
                {criticalGaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-1">
                    <Target className="w-8 h-8 text-emerald-500/40" />
                    <p className="text-sm text-muted-foreground">No critical/high failing controls</p>
                    <p className="text-xs text-muted-foreground/70">Audit posture is healthy</p>
                  </div>
                ) : criticalGaps.map((c) => (
                  <div key={c.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {c.control_id && <span className="text-[10px] font-mono text-muted-foreground block">{c.control_id}</span>}
                        <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${c.severity === "critical" ? "bg-red-500 text-white" : "bg-orange-500 text-white"}`}>
                        {c.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <StatusBadge status={c.status} />
                      <span className="text-[10px] text-muted-foreground capitalize">{(c.category || "").replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{c.owner_name || "Unassigned"}</span>
                    </div>
                  </div>
                ))}
              </div>
              {criticalGaps.length > 0 && (
                <Link to="/controls" className="text-xs text-primary hover:underline text-center py-2 border-t border-border flex items-center justify-center gap-1">
                  Remediate controls <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}