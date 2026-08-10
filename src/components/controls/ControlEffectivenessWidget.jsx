import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const GRADE_CONFIG = {
  excellent: { color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50", label: "Excellent" },
  good: { color: "bg-green-500", text: "text-green-600", bg: "bg-green-50", label: "Good" },
  fair: { color: "bg-amber-500", text: "text-amber-600", bg: "bg-amber-50", label: "Fair" },
  poor: { color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50", label: "Poor" },
  critical: { color: "bg-red-500", text: "text-red-600", bg: "bg-red-50", label: "Critical" },
  untested: { color: "bg-slate-400", text: "text-slate-500", bg: "bg-slate-50", label: "Untested" },
};

export function EffectivenessBadge({ score, grade }) {
  const config = GRADE_CONFIG[grade] || GRADE_CONFIG.untested;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className={`h-full ${config.color}`} style={{ width: `${score || 0}%` }} />
        </div>
        <span className={`text-xs font-semibold ${config.text}`}>{score || 0}%</span>
      </div>
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${config.bg} ${config.text} font-medium`}>{config.label}</span>
    </div>
  );
}

export function EffectivenessFactors({ factorsJson }) {
  if (!factorsJson) return null;
  let factors;
  try { factors = JSON.parse(factorsJson); } catch { return null; }
  const items = [
    { label: "Test Pass Rate", value: factors.test_pass_rate, suffix: "%" },
    { label: "Evidence Freshness", value: factors.evidence_freshness, suffix: "%" },
    { label: "Failure Frequency", value: factors.failure_frequency, suffix: "%" },
    { label: "Remediation Speed", value: factors.remediation_speed, suffix: "%" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 mt-2">
      {items.map((item) => (
        <div key={item.label} className="bg-muted/30 rounded px-2 py-1">
          <p className="text-[10px] text-muted-foreground">{item.label}</p>
          <p className="text-sm font-semibold text-foreground">{item.value !== null ? `${item.value}${item.suffix}` : "—"}</p>
        </div>
      ))}
    </div>
  );
}

export default function ControlEffectivenessWidget({ controls, onRecalculate }) {
  const { toast } = useToast();
  const [calculating, setCalculating] = useState(false);

  const runCalculation = async () => {
    setCalculating(true);
    try {
      const res = await base44.functions.invoke("calculateControlEffectiveness", {});
      const data = res.data || res;
      toast({
        title: `Effectiveness scores calculated for ${data.updated || 0} controls`,
        description: data.summary ? `${data.summary.scored} scored · ${data.summary.grades.excellent} excellent · ${data.summary.grades.critical} critical` : "",
      });
      if (onRecalculate) onRecalculate();
    } catch (e) {
      toast({ title: "Calculation failed", description: e.message, variant: "destructive" });
    }
    setCalculating(false);
  };

  const scored = controls.filter((c) => c.effectiveness_grade && c.effectiveness_grade !== "untested");
  const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, c) => s + (c.effectiveness_score || 0), 0) / scored.length) : 0;
  const gradeCounts = { excellent: 0, good: 0, fair: 0, poor: 0, critical: 0, untested: 0 };
  controls.forEach((c) => { if (c.effectiveness_grade) gradeCounts[c.effectiveness_grade]++; });

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold text-foreground">Control Effectiveness Scoring</h3>
        </div>
        <Button size="sm" variant="outline" onClick={runCalculation} disabled={calculating}>
          {calculating ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Calculating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1" /> Recalculate</>}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Average Score</p>
          <p className="text-2xl font-heading font-bold text-foreground">{avgScore}%</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Scored Controls</p>
          <p className="text-2xl font-heading font-bold text-foreground">{scored.length}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground">Untested</p>
          <p className="text-2xl font-heading font-bold text-muted-foreground">{gradeCounts.untested}</p>
        </div>
      </div>

      {/* Grade Distribution */}
      <div className="space-y-2">
        {Object.entries(gradeCounts).filter(([g]) => g !== "untested").map(([grade, count]) => {
          const config = GRADE_CONFIG[grade];
          const pct = scored.length > 0 ? (count / scored.length) * 100 : 0;
          return (
            <div key={grade} className="flex items-center gap-2">
              <span className="text-xs font-medium w-20 text-muted-foreground">{config.label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${config.color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-semibold w-8 text-right text-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}