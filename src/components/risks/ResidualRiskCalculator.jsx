import React, { useState, useMemo } from "react";
import { Calculator, TrendingDown, Shield, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const CONTROL_EFFECTIVENESS = {
  automated:           { label: "Automated",            reduction: 0.70 },
  partially_automated: { label: "Partially Automated",  reduction: 0.45 },
  manual:              { label: "Manual",               reduction: 0.25 },
};

const getRiskLevel = (score) => {
  if (score >= 20) return { label: "Critical", color: "text-red-600",    bg: "bg-red-100",    ring: "ring-red-400" };
  if (score >= 12) return { label: "High",     color: "text-orange-600", bg: "bg-orange-100", ring: "ring-orange-400" };
  if (score >= 6)  return { label: "Medium",   color: "text-amber-600",  bg: "bg-amber-100",  ring: "ring-amber-400" };
  return                  { label: "Low",      color: "text-emerald-600",bg: "bg-emerald-100",ring: "ring-emerald-400" };
};

const ScoreGauge = ({ score, label, size = "md" }) => {
  const lvl = getRiskLevel(score);
  const pct = Math.min((score / 25) * 100, 100);
  const r = size === "sm" ? 28 : 36;
  const cx = size === "sm" ? 36 : 44;
  const cy = size === "sm" ? 36 : 44;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (pct / 100) * circumference;
  const svgSize = size === "sm" ? 72 : 88;
  const fontSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
          <circle
            cx={cx} cy={cy} r={r} fill="none" strokeWidth="6"
            stroke={score >= 20 ? "#ef4444" : score >= 12 ? "#f97316" : score >= 6 ? "#f59e0b" : "#10b981"}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${fontSize} ${lvl.color}`}>{score}</span>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lvl.bg} ${lvl.color}`}>{lvl.label}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

export default function ResidualRiskCalculator({ risk, linkedControls = [] }) {
  const [selectedControlIds, setSelectedControlIds] = useState(
    risk.related_control_ids || []
  );
  const [manualLikelihood, setManualLikelihood] = useState(
    risk.residual_likelihood || risk.likelihood || 3
  );
  const [manualImpact, setManualImpact] = useState(
    risk.residual_impact || risk.impact || 3
  );
  const [useManual, setUseManual] = useState(false);

  const inherentScore = (risk.likelihood || 1) * (risk.impact || 1);

  const controlReduction = useMemo(() => {
    if (useManual) return 0;
    const selected = linkedControls.filter(c => selectedControlIds.includes(c.id));
    if (selected.length === 0) return 0;
    // Compound reduction: each control reduces the remaining risk
    let remaining = 1.0;
    selected.forEach(c => {
      const eff = CONTROL_EFFECTIVENESS[c.automation_status] || CONTROL_EFFECTIVENESS.manual;
      remaining *= (1 - eff.reduction);
    });
    return 1 - remaining;
  }, [selectedControlIds, linkedControls, useManual]);

  const residualScore = useMemo(() => {
    if (useManual) return manualLikelihood * manualImpact;
    const raw = inherentScore * (1 - controlReduction);
    return Math.max(1, Math.round(raw));
  }, [inherentScore, controlReduction, useManual, manualLikelihood, manualImpact]);

  const reduction = inherentScore - residualScore;
  const reductionPct = inherentScore > 0 ? Math.round((reduction / inherentScore) * 100) : 0;

  const toggleControl = (id) => {
    setSelectedControlIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-foreground text-sm">Residual Risk Calculator</h3>
      </div>

      {/* Score comparison */}
      <div className="flex items-center justify-center gap-6 py-2">
        <ScoreGauge score={inherentScore} label="Inherent Risk" />
        <div className="flex flex-col items-center gap-1">
          <TrendingDown className="w-5 h-5 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600">-{reductionPct}%</span>
        </div>
        <ScoreGauge score={residualScore} label="Residual Risk" />
      </div>

      {reductionPct > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700 flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 shrink-0" />
          Applying {selectedControlIds.length} control{selectedControlIds.length !== 1 ? "s" : ""} reduces your risk score by <strong>{reduction} points ({reductionPct}%)</strong>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setUseManual(false)}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${!useManual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Control-Based
        </button>
        <button
          onClick={() => setUseManual(true)}
          className={`flex-1 py-1.5 text-xs rounded-md font-medium transition-colors ${useManual ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Manual Override
        </button>
      </div>

      {useManual ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Residual Likelihood (1-5)</Label>
            <Input
              type="number" min="1" max="5"
              value={manualLikelihood}
              onChange={e => setManualLikelihood(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Residual Impact (1-5)</Label>
            <Input
              type="number" min="1" max="5"
              value={manualImpact}
              onChange={e => setManualImpact(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
              className="mt-1"
            />
          </div>
        </div>
      ) : (
        <div>
          <Label className="text-xs mb-2 block">Select controls to apply</Label>
          {linkedControls.length === 0 ? (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
              <Info className="w-3.5 h-3.5" />
              Link controls to this risk in the edit form to use them here.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              {linkedControls.map(ctl => {
                const eff = CONTROL_EFFECTIVENESS[ctl.automation_status] || CONTROL_EFFECTIVENESS.manual;
                const checked = selectedControlIds.includes(ctl.id);
                return (
                  <label key={ctl.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${checked ? "bg-primary/10 border border-primary/30" : "bg-muted/40 hover:bg-muted/60"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleControl(ctl.id)} className="rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{ctl.title}</p>
                      <p className="text-xs text-muted-foreground">{eff.label} — reduces risk by ~{Math.round(eff.reduction * 100)}%</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}