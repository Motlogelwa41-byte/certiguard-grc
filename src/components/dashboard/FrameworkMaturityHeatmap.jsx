import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowRight, Info } from "lucide-react";

const MATURITY_LEVELS = [
  { level: 1, name: "Initial", color: "#ef4444", bg: "bg-red-500", text: "text-red-700", desc: "0-19%" },
  { level: 2, name: "Managed", color: "#f97316", bg: "bg-orange-500", text: "text-orange-700", desc: "20-39%" },
  { level: 3, name: "Defined", color: "#eab308", bg: "bg-yellow-500", text: "text-yellow-700", desc: "40-59%" },
  { level: 4, name: "Quant. Managed", color: "#22c55e", bg: "bg-green-500", text: "text-green-700", desc: "60-79%" },
  { level: 5, name: "Optimizing", color: "#10b981", bg: "bg-emerald-500", text: "text-emerald-700", desc: "80-100%" },
];

function readinessToMaturity(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

export default function FrameworkMaturityHeatmap() {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Framework.list("-readiness_score", 50)
      .then((f) => setFrameworks(f || []))
      .catch(() => setFrameworks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (frameworks.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <h3 className="font-heading font-semibold text-foreground mb-2">Framework Maturity Heatmap</h3>
        <p className="text-sm text-muted-foreground">Add frameworks to track maturity levels.</p>
      </div>
    );
  }

  const avgMaturity = Math.round(
    frameworks.reduce((s, f) => s + readinessToMaturity(f.readiness_score || 0), 0) / frameworks.length * 10
  ) / 10;

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Framework Maturity Heatmap</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maturity level per framework, derived from readiness score · Avg maturity: <span className="font-semibold text-foreground">{avgMaturity}/5</span>
          </p>
        </div>
        <Link to="/maturity-dashboard" className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
          Maturity Dashboard <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 mt-3">
        {MATURITY_LEVELS.map((ml) => (
          <div key={ml.level} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: ml.color }} />
            <span className="text-[11px] text-muted-foreground">L{ml.level}: {ml.name} <span className="text-muted-foreground/60">({ml.desc})</span></span>
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          {/* Column headers */}
          <div className="grid grid-cols-[180px_repeat(5,1fr)] gap-1 mb-1">
            <div />
            {MATURITY_LEVELS.map((ml) => (
              <div key={ml.level} className="text-center">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">L{ml.level}</div>
                <div className="text-[10px] text-muted-foreground/70 hidden sm:block">{ml.name}</div>
              </div>
            ))}
          </div>

          {/* Framework rows */}
          <div className="space-y-1">
            {frameworks.map((fw) => {
              const score = fw.readiness_score || 0;
              const maturity = readinessToMaturity(score);
              return (
                <div key={fw.id} className="grid grid-cols-[180px_repeat(5,1fr)] gap-1 items-center group">
                  <div className="pr-3 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{fw.name}</div>
                    <div className="text-[10px] text-muted-foreground">{score}% ready</div>
                  </div>
                  {MATURITY_LEVELS.map((ml) => {
                    const isCurrent = ml.level === maturity;
                    return (
                      <div
                        key={ml.level}
                        className={`h-9 rounded-md flex items-center justify-center transition-all ${
                          isCurrent
                            ? "shadow-sm ring-2 ring-foreground/10"
                            : "bg-muted/40 group-hover:bg-muted/60"
                        }`}
                        style={isCurrent ? { backgroundColor: ml.color } : {}}
                        title={`L${ml.level}: ${ml.name} (${ml.desc})${isCurrent ? " — current level" : ""}`}
                      >
                        {isCurrent && (
                          <span className="text-xs font-bold text-white">{ml.level}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-1.5 mt-4 pt-3 border-t border-border">
        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          Maturity is auto-derived from framework readiness: L1 (0-19%) → L5 (80-100%). The highlighted cell shows each framework's current maturity level. Target level 4+ indicates audit readiness.
        </p>
      </div>
    </div>
  );
}