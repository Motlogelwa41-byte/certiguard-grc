import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/shared/StatusBadge";
import { Target } from "lucide-react";

// Color zones per the user's spec:
//   score 1-4   → green
//   score 5-9   → yellow
//   score 10-14 → orange
//   score 15-25 → red
const zoneStyle = (score) => {
  if (score >= 15) return { bg: "bg-red-500", hover: "hover:bg-red-600", ring: "ring-red-300", label: "High", text: "text-white" };
  if (score >= 10) return { bg: "bg-orange-500", hover: "hover:bg-orange-600", ring: "ring-orange-300", label: "Medium-High", text: "text-white" };
  if (score >= 5)  return { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", ring: "ring-yellow-300", label: "Medium", text: "text-white" };
  return { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", ring: "ring-emerald-300", label: "Low", text: "text-white" };
};

const IMPACT_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];
const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];

export default function RiskHeatmapGrid({ risks = [] }) {
  const [selectedCell, setSelectedCell] = useState(null);

  // Count risks per (likelihood, impact) coordinate
  const grid = useMemo(() => {
    const map = {};
    for (let l = 1; l <= 5; l++) {
      for (let i = 1; i <= 5; i++) {
        map[`${l}-${i}`] = [];
      }
    }
    risks.forEach((r) => {
      const l = r.likelihood;
      const i = r.impact;
      if (l >= 1 && l <= 5 && i >= 1 && i <= 5) {
        map[`${l}-${i}`].push(r);
      }
    });
    return map;
  }, [risks]);

  const cellRisks = selectedCell ? grid[`${selectedCell.likelihood}-${selectedCell.impact}`] || [] : [];
  const cellScore = selectedCell ? selectedCell.likelihood * selectedCell.impact : 0;

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
          <Target className="w-4 h-4 text-indigo-500" />
        </div>
        <h3 className="font-heading font-semibold text-foreground">Risk Heatmap (5×5)</h3>
        <span className="ml-auto text-xs text-muted-foreground">{risks.length} risk{risks.length !== 1 ? "s" : ""} plotted</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Click a cell to view the risks in that zone.</p>

      <div className="flex gap-3">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center gap-1 shrink-0">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>IMPACT ↑</span>
        </div>

        <div className="flex-1">
          {/* Grid rows: impact 5 (top) down to 1 (bottom) */}
          {[5, 4, 3, 2, 1].map((impact) => (
            <div key={impact} className="flex items-stretch gap-1 mb-1">
              <div className="w-20 shrink-0 flex items-center justify-end pr-2">
                <span className="text-[10px] text-muted-foreground text-right leading-tight">{impact}. {IMPACT_LABELS[impact]}</span>
              </div>
              {[1, 2, 3, 4, 5].map((likelihood) => {
                const score = likelihood * impact;
                const zone = zoneStyle(score);
                const count = grid[`${likelihood}-${impact}`]?.length || 0;
                return (
                  <button
                    key={likelihood}
                    onClick={() => setSelectedCell({ likelihood, impact })}
                    className={`flex-1 min-h-[64px] rounded-lg ${zone.bg} ${zone.hover} ${zone.text} flex flex-col items-center justify-center transition-all duration-150 hover:scale-[1.04] hover:shadow-md cursor-pointer ${count > 0 ? "ring-1 ring-white/20" : "opacity-70"}`}
                  >
                    {count > 0 ? (
                      <span className="text-xl font-bold drop-shadow-sm">{count}</span>
                    ) : (
                      <span className="text-xs font-semibold opacity-50">{score}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* X-axis labels */}
          <div className="flex gap-1 mt-1">
            <div className="w-20 shrink-0" />
            {[1, 2, 3, 4, 5].map((l) => (
              <div key={l} className="flex-1 text-center">
                <span className="text-[10px] text-muted-foreground leading-tight">{l}. {LIKELIHOOD_LABELS[l]}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-1">
            <span className="text-[10px] font-semibold text-muted-foreground tracking-widest">LIKELIHOOD →</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border">
        {[
          { label: "Low (1–4)", cls: "bg-emerald-500" },
          { label: "Medium (5–9)", cls: "bg-yellow-500" },
          { label: "Medium-High (10–14)", cls: "bg-orange-500" },
          { label: "High (15–25)", cls: "bg-red-500" },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-3.5 h-3.5 rounded-md ${cls}`} />{label}
          </span>
        ))}
      </div>

      {/* Cell detail modal */}
      <Dialog open={!!selectedCell} onOpenChange={(open) => !open && setSelectedCell(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCell && (
                <span className="flex items-center gap-2">
                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${zoneStyle(cellScore).bg} ${zoneStyle(cellScore).text}`}>
                    {cellScore}
                  </span>
                  Likelihood {selectedCell.likelihood} × Impact {selectedCell.impact}
                  <span className="text-sm font-normal text-muted-foreground">— {zoneStyle(cellScore).label} zone</span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {cellRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No risks in this cell.</p>
            ) : (
              <div className="divide-y divide-border">
                {cellRisks.map((r) => (
                  <div key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {r.risk_id && <span className="text-[10px] font-mono text-muted-foreground block">{r.risk_id}</span>}
                        <p className="text-sm font-semibold text-foreground">{r.title}</p>
                        {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${zoneStyle(cellScore).bg} ${zoneStyle(cellScore).text}`}>
                        {r.likelihood * r.impact}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge status={r.status} />
                      <span className="text-[10px] text-muted-foreground">{r.owner_name || "Unassigned"}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}