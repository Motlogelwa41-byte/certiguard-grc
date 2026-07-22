import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Target, TrendingDown, Shield, Info } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

// Default appetite thresholds (loaded from localStorage if saved)
const DEFAULT_THRESHOLDS = { appetite: 6, tolerance: 12 };

function getCellZone(score, appetite, tolerance) {
  if (score > tolerance) return { label: "Unacceptable", bg: "linear-gradient(135deg, rgba(220,38,38,0.32), rgba(190,18,60,0.38))", border: "#ef4444", text: "#fca5a5", glow: "0 8px 20px -6px rgba(239,68,68,0.55)", ring: "#ef4444", accent: "#ef4444" };
  if (score > appetite) return { label: "Tolerance Zone", bg: "linear-gradient(135deg, rgba(245,158,11,0.30), rgba(217,119,6,0.34))", border: "#f59e0b", text: "#fcd34d", glow: "0 6px 16px -6px rgba(245,158,11,0.5)", ring: "#f59e0b", accent: "#f59e0b" };
  return { label: "Within Appetite", bg: "linear-gradient(135deg, rgba(16,185,129,0.26), rgba(13,148,136,0.30))", border: "#10b981", text: "#6ee7b7", glow: "0 6px 16px -6px rgba(16,185,129,0.45)", ring: "#10b981", accent: "#10b981" };
}

function getCellScore(l, i) { return l * i; }

export default function RiskAppetiteHeatmap() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("risk_appetite_thresholds") || "null") || DEFAULT_THRESHOLDS; }
    catch { return DEFAULT_THRESHOLDS; }
  });
  const [editThresholds, setEditThresholds] = useState(false);
  const [tmpThresholds, setTmpThresholds] = useState(thresholds);
  const [selectedCell, setSelectedCell] = useState(null);
  const [view, setView] = useState("inherent"); // "inherent" | "residual" | "both"

  useEffect(() => {
    base44.entities.Risk.list().then(d => { setRisks(d); setLoading(false); });
  }, []);

  const saveThresholds = () => {
    setThresholds(tmpThresholds);
    localStorage.setItem("risk_appetite_thresholds", JSON.stringify(tmpThresholds));
    setEditThresholds(false);
  };

  // Helper: get risks in a cell for inherent or residual
  const getRisksInCell = (l, i, type) => {
    return risks.filter(r => {
      if (type === "residual") return r.residual_likelihood === l && r.residual_impact === i;
      return r.likelihood === l && r.impact === i;
    });
  };

  // Summary counts
  const counts = useMemo(() => {
    const inherentExceeds = risks.filter(r => (r.likelihood * r.impact) > thresholds.tolerance).length;
    const residualExceeds = risks.filter(r => {
      const rs = (r.residual_likelihood || 1) * (r.residual_impact || 1);
      return rs > thresholds.tolerance;
    }).length;
    const improved = risks.filter(r => {
      const inherent = r.likelihood * r.impact;
      const residual = (r.residual_likelihood || r.likelihood) * (r.residual_impact || r.impact);
      return residual < inherent;
    }).length;
    const withinAppetite = risks.filter(r => (r.likelihood * r.impact) <= thresholds.appetite).length;
    return { inherentExceeds, residualExceeds, improved, withinAppetite };
  }, [risks, thresholds]);

  const cellRisks = selectedCell
    ? { inherent: getRisksInCell(selectedCell.l, selectedCell.i, "inherent"), residual: getRisksInCell(selectedCell.l, selectedCell.i, "residual") }
    : null;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (risks.length === 0) return (
    <div>
      <PageHeader title="Risk Appetite Heatmap" subtitle="Inherent vs residual risk mapped against your appetite thresholds" />
      <EmptyState icon={AlertTriangle} title="No risks found" description="Add risks in the Risk Register to visualize them against your appetite." />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Appetite Heatmap"
        subtitle="Inherent vs residual risk mapped against your appetite & tolerance thresholds"
        actions={
          <button
            onClick={() => { setTmpThresholds(thresholds); setEditThresholds(!editThresholds); }}
            className="text-sm px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted flex items-center gap-1.5"
          >
            <Target className="w-3.5 h-3.5" /> Configure Thresholds
          </button>
        }
      />

      {/* Threshold editor */}
      {editThresholds && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Risk Appetite Configuration</h4>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Appetite Threshold (score ≤ this = within appetite)
              </label>
              <input type="range" min={1} max={24} value={tmpThresholds.appetite} onChange={e => setTmpThresholds(p => ({ ...p, appetite: +e.target.value }))} className="w-full accent-emerald-500" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span className="font-bold text-emerald-600">{tmpThresholds.appetite}</span><span>24</span></div>
              <p className="text-xs text-muted-foreground mt-1">Scores ≤ {tmpThresholds.appetite} = <span className="text-emerald-600 font-medium">Within Appetite</span></p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">
                Tolerance Threshold (score ≤ this = tolerance zone)
              </label>
              <input type="range" min={tmpThresholds.appetite + 1} max={25} value={tmpThresholds.tolerance} onChange={e => setTmpThresholds(p => ({ ...p, tolerance: +e.target.value }))} className="w-full accent-amber-500" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>{tmpThresholds.appetite + 1}</span><span className="font-bold text-amber-600">{tmpThresholds.tolerance}</span><span>25</span></div>
              <p className="text-xs text-muted-foreground mt-1">Scores {tmpThresholds.appetite + 1}–{tmpThresholds.tolerance} = <span className="text-amber-600 font-medium">Tolerance Zone</span> · Above = <span className="text-red-600 font-medium">Unacceptable</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveThresholds} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">Save Thresholds</button>
            <button onClick={() => setEditThresholds(false)} className="px-4 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">Cancel</button>
          </div>
        </div>
      )}

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Inherent > Tolerance", value: counts.inherentExceeds, cls: "bg-red-50 border-red-200 text-red-700", sub: "Unacceptable inherent risk" },
          { label: "Residual > Tolerance", value: counts.residualExceeds, cls: "bg-orange-50 border-orange-200 text-orange-700", sub: "Still unacceptable after controls" },
          { label: "Improved by Controls", value: counts.improved, cls: "bg-blue-50 border-blue-200 text-blue-700", sub: "Inherent → lower residual" },
          { label: "Within Appetite", value: counts.withinAppetite, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", sub: `Score ≤ ${thresholds.appetite}` },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
            <p className="text-xs opacity-70 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
        {[{ v: "inherent", label: "Inherent Risk" }, { v: "residual", label: "Residual Risk" }, { v: "both", label: "Both Overlaid" }].map(opt => (
          <button key={opt.v} onClick={() => setView(opt.v)} className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${view === opt.v ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {opt.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Heatmap */}
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">Risk Matrix — Appetite Overlay</h3>
            </div>
            <span className="text-xs text-muted-foreground">{view === "both" ? "Inherent ● Residual ◆" : view === "residual" ? "Residual positions" : "Inherent positions"}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Cell colors show appetite zone. Numbers = risk count. Click a cell to drill down.</p>

          {/* Legend zones */}
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs"><span className="w-3.5 h-3.5 rounded-md" style={{ background: "linear-gradient(135deg,#10b981,#0d9488)", boxShadow: "0 2px 6px -2px #10b98180" }} />Within Appetite (≤{thresholds.appetite})</div>
            <div className="flex items-center gap-1.5 text-xs"><span className="w-3.5 h-3.5 rounded-md" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", boxShadow: "0 2px 6px -2px #f59e0b80" }} />Tolerance Zone ({thresholds.appetite + 1}–{thresholds.tolerance})</div>
            <div className="flex items-center gap-1.5 text-xs"><span className="w-3.5 h-3.5 rounded-md" style={{ background: "linear-gradient(135deg,#ef4444,#be123c)", boxShadow: "0 2px 6px -2px #ef444480" }} />Unacceptable (&gt;{thresholds.tolerance})</div>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>IMPACT ↑</span>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map(impact => (
                <div key={impact} className="flex items-stretch gap-1 mb-1">
                <div className="w-20 shrink-0 flex items-center justify-end pr-2">
                  <span className="text-[10px] text-muted-foreground text-right leading-tight">{impact}. {IMPACT_LABELS[impact]}</span>
                </div>
                {[1, 2, 3, 4, 5].map(likelihood => {
                  const score = getCellScore(likelihood, impact);
                  const zone = getCellZone(score, thresholds.appetite, thresholds.tolerance);
                  const inherentRisks = getRisksInCell(likelihood, impact, "inherent");
                  const residualRisks = getRisksInCell(likelihood, impact, "residual");
                  const showCount = view === "inherent" ? inherentRisks.length : view === "residual" ? residualRisks.length : inherentRisks.length + residualRisks.length;
                  const isSelected = selectedCell?.l === likelihood && selectedCell?.i === impact;

                  return (
                    <div
                      key={likelihood}
                      onClick={() => setSelectedCell(isSelected ? null : { l: likelihood, i: impact })}
                      className={`relative flex-1 min-h-[68px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 ${isSelected ? "scale-[1.06] z-10" : ""}`}
                      style={{
                        background: zone.bg,
                        borderColor: zone.border,
                        boxShadow: isSelected
                          ? `0 0 0 2px ${zone.ring}, 0 8px 22px -4px ${zone.accent}66`
                          : showCount > 0
                          ? zone.glow
                          : "none",
                      }}
                    >
                      <span className="absolute inset-x-1 top-1 h-1/3 rounded-t-xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                      <span className="absolute top-1 right-1.5 text-[10px] font-mono text-muted-foreground/50">{score}</span>
                      {showCount > 0 ? (
                        <>
                          <span className="relative text-lg font-bold text-white drop-shadow-sm">{showCount}</span>
                          {view === "both" && (
                            <div className="relative flex items-center gap-1 mt-1.5">
                              {inherentRisks.length > 0 && <span className="text-[9px] px-1 rounded bg-white/25 text-white font-semibold">I:{inherentRisks.length}</span>}
                              {residualRisks.length > 0 && <span className="text-[9px] px-1 rounded bg-blue-500/40 text-white font-semibold">R:{residualRisks.length}</span>}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  );
                })}
                </div>
              ))}
              <div className="flex gap-1 mt-1">
                <div className="w-20 shrink-0" />
                {[1, 2, 3, 4, 5].map(l => (
                  <div key={l} className="flex-1 text-center">
                    <span className="text-[10px] text-muted-foreground">{l}. {LIKELIHOOD_LABELS[l]}</span>
                  </div>
                ))}
              </div>
              <div className="text-center mt-1">
                <span className="text-[10px] font-semibold text-muted-foreground tracking-widest">LIKELIHOOD →</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Cell drill-down */}
          {selectedCell ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between" style={{ background: getCellZone(getCellScore(selectedCell.l, selectedCell.i), thresholds.appetite, thresholds.tolerance).bg }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: getCellZone(getCellScore(selectedCell.l, selectedCell.i), thresholds.appetite, thresholds.tolerance).text }}>
                    {getCellZone(getCellScore(selectedCell.l, selectedCell.i), thresholds.appetite, thresholds.tolerance).label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">L{selectedCell.l} × I{selectedCell.i} = {getCellScore(selectedCell.l, selectedCell.i)}</p>
                </div>
                <button onClick={() => setSelectedCell(null)} className="text-muted-foreground hover:text-foreground text-lg">×</button>
              </div>
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {(view === "residual" ? cellRisks.residual : cellRisks.inherent).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No risks in this cell</p>
                ) : (view === "residual" ? cellRisks.residual : cellRisks.inherent).map(r => {
                  const inherentScore = r.likelihood * r.impact;
                  const residualScore = (r.residual_likelihood || r.likelihood) * (r.residual_impact || r.impact);
                  return (
                    <div key={r.id} className="p-3">
                      <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">I:{inherentScore}</span>
                        <span className="text-xs">→</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${residualScore < inherentScore ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>R:{residualScore}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.exceeds_tolerance && (
                        <p className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Exceeds tolerance</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Click any cell to drill down</p>
              </div>
              <p className="text-xs text-muted-foreground p-4">Select a cell on the heatmap to see which risks are plotted there, including their inherent vs residual scores.</p>
            </div>
          )}

          {/* Risks exceeding tolerance */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-foreground">Exceeding Tolerance</h3>
              <span className="ml-auto text-xs text-muted-foreground">{counts.inherentExceeds}</span>
            </div>
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {risks.filter(r => (r.likelihood * r.impact) > thresholds.tolerance)
                .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact))
                .slice(0, 8)
                .map(r => {
                  const iScore = r.likelihood * r.impact;
                  const rScore = (r.residual_likelihood || r.likelihood) * (r.residual_impact || r.impact);
                  return (
                    <div key={r.id} className="p-3">
                      <p className="text-xs font-semibold text-foreground">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-mono font-bold">I:{iScore}</span>
                        <TrendingDown className="w-3 h-3 text-muted-foreground" />
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${rScore <= thresholds.tolerance ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>R:{rScore}</span>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.tolerance_justification && (
                        <p className="text-xs text-muted-foreground mt-1 italic truncate">"{r.tolerance_justification}"</p>
                      )}
                    </div>
                  );
                })}
              {counts.inherentExceeds === 0 && (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Shield className="w-6 h-6 mb-1 text-emerald-500" />
                  <p className="text-xs">All risks within tolerance</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}