import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Target, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ZONE_COLOR = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 20) return "bg-rose-500/70";
  if (score >= 12) return "bg-orange-500/60";
  if (score >= 6) return "bg-amber-400/50";
  return "bg-emerald-400/40";
};

const SCORE_BG = (score) => {
  if (score >= 20) return "bg-rose-500 text-white";
  if (score >= 12) return "bg-orange-500 text-white";
  if (score >= 6) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
};

export default function PostureSummary() {
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Risk.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
    ])
      .then(([r, c]) => {
        setRisks(r || []);
        setControls(c || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const openRisks = useMemo(
    () => risks.filter((r) => r.status === "open" || r.status === "mitigating"),
    [risks]
  );

  const getRisksInCell = (l, i) =>
    openRisks.filter((r) => r.likelihood === l && r.impact === i);

  const critical = openRisks.filter((r) => (r.likelihood * r.impact) >= 20).length;
  const high = openRisks.filter((r) => { const s = r.likelihood * r.impact; return s >= 12 && s < 20; }).length;

  const ctlPassing = controls.filter((c) => c.status === "passing").length;
  const ctlFailing = controls.filter((c) => c.status === "failing").length;
  const ctlNotTested = controls.filter((c) => c.status === "not_tested").length;
  const ctlPassRate = controls.length > 0 ? Math.round((ctlPassing / controls.length) * 100) : 0;

  const topRisks = useMemo(
    () =>
      [...openRisks]
        .sort((a, b) => b.likelihood * b.impact - (a.likelihood * a.impact))
        .slice(0, 5),
    [openRisks]
  );

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Security Posture Summary
          <span className="text-xs font-normal text-muted-foreground ml-2">
            Live risk heatmap & control status
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mini heatmap */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Risk Heatmap
              </h4>
              <Link to="/risk-heatmap" className="text-xs text-primary hover:underline">
                Full view →
              </Link>
            </div>

            {openRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No open risks.</p>
            ) : (
              <div className="flex gap-2">
                {/* Y-axis label */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[9px] font-semibold text-muted-foreground tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
                    IMPACT
                  </span>
                </div>

                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map((impact) => (
                    <div key={impact} className="flex items-stretch gap-0.5 mb-0.5">
                      <div className="w-14 shrink-0 flex items-center justify-end pr-1">
                        <span className="text-[8px] text-muted-foreground text-right leading-tight">{impact}</span>
                      </div>
                      {[1, 2, 3, 4, 5].map((likelihood) => {
                        const cellRisks = getRisksInCell(likelihood, impact);
                        const hasRisks = cellRisks.length > 0;
                        return (
                          <div
                            key={likelihood}
                            className={`flex-1 min-h-[36px] rounded-md border border-border/50 flex items-center justify-center ${ZONE_COLOR(likelihood, impact)} ${hasRisks ? "shadow-sm" : "opacity-50"}`}
                            title={hasRisks ? `${cellRisks.length} risk(s) — score ${likelihood * impact}` : `Score ${likelihood * impact}`}
                          >
                            {hasRisks ? (
                              <span className="text-xs font-bold text-white drop-shadow-sm">{cellRisks.length}</span>
                            ) : (
                              <span className="text-[9px] text-muted-foreground">{likelihood * impact}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex gap-0.5 mt-0.5">
                    <div className="w-14 shrink-0" />
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div key={l} className="flex-1 text-center">
                        <span className="text-[8px] text-muted-foreground">{l}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center mt-0.5">
                    <span className="text-[9px] font-semibold text-muted-foreground tracking-widest">LIKELIHOOD</span>
                  </div>
                </div>
              </div>
            )}

            {/* Risk legend */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded bg-rose-500/70" /> Critical
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded bg-orange-500/60" /> High
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded bg-amber-400/50" /> Medium
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-3 h-3 rounded bg-emerald-400/40" /> Low
              </span>
              <span className="ml-auto text-[10px] text-muted-foreground">
                {critical} critical · {high} high
              </span>
            </div>

            {/* Top risks */}
            {topRisks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Top Open Risks
                </p>
                <div className="space-y-1.5">
                  {topRisks.map((r, i) => {
                    const score = r.likelihood * r.impact;
                    return (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold shrink-0 ${SCORE_BG(score)}`}>
                          {score}
                        </span>
                        <span className="text-foreground truncate flex-1">{r.title}</span>
                        <span className="text-muted-foreground shrink-0">{r.owner_name || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Control status */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Control Status
              </h4>
              <Link to="/controls" className="text-xs text-primary hover:underline">
                Full view →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-emerald-600">{ctlPassing}</div>
                <div className="text-[10px] text-muted-foreground">Passing</div>
              </div>
              <div className="text-center bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3">
                <XCircle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-rose-600">{ctlFailing}</div>
                <div className="text-[10px] text-muted-foreground">Failing</div>
              </div>
              <div className="text-center bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <div className="text-2xl font-bold text-amber-600">{ctlNotTested}</div>
                <div className="text-[10px] text-muted-foreground">Not Tested</div>
              </div>
              <div className="text-center bg-slate-50 dark:bg-slate-500/10 rounded-lg p-3">
                <Shield className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-slate-600">{controls.length}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
            </div>

            {/* Pass rate bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-foreground">Overall Pass Rate</span>
                <span className={`font-bold ${ctlPassRate >= 80 ? "text-emerald-600" : ctlPassRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>
                  {ctlPassRate}%
                </span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${ctlPassRate >= 80 ? "bg-emerald-500" : ctlPassRate >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                  style={{ width: `${ctlPassRate}%` }}
                />
              </div>
            </div>

            {/* Quick stats */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Open/Mitigating Risks
                </span>
                <span className="font-semibold text-foreground">{openRisks.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Critical/High Risks
                </span>
                <span className="font-semibold text-rose-600">{critical + high}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Controls Passing
                </span>
                <Badge variant="secondary" className="text-emerald-600">{ctlPassRate}%</Badge>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}