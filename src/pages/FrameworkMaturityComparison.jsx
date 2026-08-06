import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layers, AlertTriangle, CheckCircle2, XCircle, GitCompare } from "lucide-react";

const MATURITY_LEVELS = [
  { level: 1, name: "Initial", color: "#ef4444", range: "0-19%" },
  { level: 2, name: "Managed", color: "#f97316", range: "20-39%" },
  { level: 3, name: "Defined", color: "#eab308", range: "40-59%" },
  { level: 4, name: "Quant. Managed", color: "#22c55e", range: "60-79%" },
  { level: 5, name: "Optimizing", color: "#10b981", range: "80-100%" },
];

function readinessToMaturity(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

function maturityColor(level) {
  return MATURITY_LEVELS.find((m) => m.level === level)?.color || "#94a3b8";
}

function maturityName(level) {
  return MATURITY_LEVELS.find((m) => m.level === level)?.name || "—";
}

const STATUS_STYLES = {
  passing: { bg: "bg-emerald-500/10", text: "text-emerald-700", border: "border-emerald-500/20", icon: CheckCircle2, label: "Passing" },
  failing: { bg: "bg-red-500/10", text: "text-red-700", border: "border-red-500/20", icon: XCircle, label: "Failing" },
  not_tested: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/20", icon: AlertTriangle, label: "Not Tested" },
  not_applicable: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", icon: AlertTriangle, label: "N/A" },
};

export default function FrameworkMaturityComparison() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list("-readiness_score", 50).catch(() => []),
      base44.entities.Control.list("-updated_date", 1000).catch(() => []),
    ])
      .then(([fws, ctrls]) => {
        setFrameworks(fws || []);
        setControls(ctrls || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build a map: frameworkId -> framework object
  const fwMap = useMemo(() => {
    const m = {};
    frameworks.forEach((f) => { m[f.id] = f; });
    return m;
  }, [frameworks]);

  // Per-framework control breakdown
  const fwBreakdown = useMemo(() => {
    const breakdown = {};
    frameworks.forEach((f) => {
      breakdown[f.id] = { passing: 0, failing: 0, not_tested: 0, not_applicable: 0, total: 0 };
    });
    controls.forEach((c) => {
      (c.framework_ids || []).forEach((fid) => {
        if (!breakdown[fid]) return;
        breakdown[fid].total++;
        if (breakdown[fid][c.status] != null) breakdown[fid][c.status]++;
      });
    });
    return breakdown;
  }, [frameworks, controls]);

  // Find overlapping controls (mapped to 2+ frameworks)
  const overlappingControls = useMemo(() => {
    return controls
      .filter((c) => (c.framework_ids || []).length >= 2)
      .map((c) => ({
        ...c,
        fwCount: (c.framework_ids || []).length,
        fwNames: c.framework_names || (c.framework_ids || []).map((fid) => fwMap[fid]?.name || fid),
        isGap: c.status === "failing" || c.status === "not_tested",
      }))
      .sort((a, b) => {
        // Failing overlapping gaps first, then by number of frameworks
        const aGap = a.status === "failing" ? 2 : a.status === "not_tested" ? 1 : 0;
        const bGap = b.status === "failing" ? 2 : b.status === "not_tested" ? 1 : 0;
        if (bGap !== aGap) return bGap - aGap;
        return b.fwCount - a.fwCount;
      });
  }, [controls, fwMap]);

  // Overlapping gaps = controls that are failing/not_tested AND mapped to 2+ frameworks
  const overlappingGaps = overlappingControls.filter((c) => c.isGap);

  // Summary stats
  const totalOverlapping = overlappingControls.length;
  const totalGaps = overlappingGaps.length;
  const failingGaps = overlappingGaps.filter((c) => c.status === "failing").length;
  const avgMaturity = frameworks.length > 0
    ? (frameworks.reduce((s, f) => s + readinessToMaturity(f.readiness_score || 0), 0) / frameworks.length).toFixed(1)
    : "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (frameworks.length === 0) {
    return (
      <div>
        <PageHeader title="Framework Maturity Comparison" subtitle="Side-by-side maturity levels across regulatory frameworks with overlapping control gap analysis." />
        <div className="text-center py-16">
          <GitCompare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Add frameworks to compare maturity levels and identify overlapping gaps.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Framework Maturity Comparison"
        subtitle="Side-by-side maturity levels across regulatory frameworks with overlapping control gap analysis."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              <Layers className="w-3.5 h-3.5" /> Frameworks
            </div>
            <p className="text-2xl font-bold text-foreground">{frameworks.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Avg maturity: <span className="font-semibold text-foreground">{avgMaturity}/5</span></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              <GitCompare className="w-3.5 h-3.5" /> Overlapping Controls
            </div>
            <p className="text-2xl font-bold text-foreground">{totalOverlapping}</p>
            <p className="text-xs text-muted-foreground mt-1">Mapped to 2+ frameworks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Overlapping Gaps
            </div>
            <p className="text-2xl font-bold text-red-600">{totalGaps}</p>
            <p className="text-xs text-muted-foreground mt-1">{failingGaps} failing · {totalGaps - failingGaps} untested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Shared Pass
            </div>
            <p className="text-2xl font-bold text-emerald-600">{totalOverlapping - totalGaps}</p>
            <p className="text-xs text-muted-foreground mt-1">Overlapping & passing</p>
          </CardContent>
        </Card>
      </div>

      {/* Side-by-side framework maturity cards */}
      <div className="mb-6">
        <h3 className="text-sm font-heading font-semibold text-foreground mb-3">Maturity Level by Framework</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {frameworks.map((fw) => {
            const score = fw.readiness_score || 0;
            const maturity = readinessToMaturity(score);
            const color = maturityColor(maturity);
            const bd = fwBreakdown[fw.id] || { passing: 0, failing: 0, not_tested: 0, not_applicable: 0, total: 0 };
            return (
              <Card key={fw.id} className="overflow-hidden">
                <div className="h-1.5" style={{ backgroundColor: color }} />
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{fw.name}</h4>
                      <p className="text-[11px] text-muted-foreground capitalize">{(fw.status || "not_started").replace(/_/g, " ")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-2xl font-bold" style={{ color }}>{score}%</div>
                      <div className="text-[10px] text-muted-foreground">readiness</div>
                    </div>
                  </div>

                  {/* Maturity level bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((lvl) => (
                        <div
                          key={lvl}
                          className="h-2 flex-1 rounded-sm"
                          style={{ backgroundColor: lvl <= maturity ? maturityColor(lvl) : "hsl(var(--muted))" }}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-semibold" style={{ color }}>
                      L{maturity}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mb-3">{maturityName(maturity)} · {MATURITY_LEVELS[maturity - 1]?.range}</p>

                  {/* Control breakdown */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span className="text-muted-foreground">Passing</span>
                      <span className="font-semibold text-foreground ml-auto">{bd.passing}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span className="text-muted-foreground">Failing</span>
                      <span className="font-semibold text-foreground ml-auto">{bd.failing}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-slate-400" />
                      <span className="text-muted-foreground">Untested</span>
                      <span className="font-semibold text-foreground ml-auto">{bd.not_tested}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold text-foreground ml-auto">{bd.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Overlapping gap matrix */}
      {overlappingControls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Overlapping Control Gap Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Controls mapped to multiple frameworks — failing or untested shared controls impact several frameworks at once. Fix once, satisfy many.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-3 py-2 sticky left-0 bg-muted/50">Control</th>
                    <th className="text-center px-3 py-2">Category</th>
                    <th className="text-center px-3 py-2">Frameworks</th>
                    {frameworks.map((fw) => (
                      <th key={fw.id} className="text-center px-3 py-2" title={fw.name}>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="font-medium truncate max-w-[80px]">{fw.name}</span>
                          <span className="text-[9px] normal-case" style={{ color: maturityColor(readinessToMaturity(fw.readiness_score || 0)) }}>
                            L{readinessToMaturity(fw.readiness_score || 0)}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {overlappingControls.slice(0, 50).map((c) => {
                    const StatusIcon = STATUS_STYLES[c.status]?.icon || AlertTriangle;
                    return (
                      <tr key={c.id} className={`border-t border-border hover:bg-accent/30 ${c.isGap ? "bg-red-500/5" : ""}`}>
                        <td className="px-3 py-2 sticky left-0 bg-inherit">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`w-3.5 h-3.5 ${STATUS_STYLES[c.status]?.text || "text-muted-foreground"}`} />
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-foreground truncate max-w-[200px]">{c.title}</div>
                              <div className="text-[10px] text-muted-foreground">{c.control_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-2 text-[11px] text-muted-foreground capitalize">
                          {(c.category || "—").replace(/_/g, " ")}
                        </td>
                        <td className="text-center px-3 py-2">
                          <Badge variant="secondary" className="text-[10px]">{c.fwCount}</Badge>
                        </td>
                        {frameworks.map((fw) => {
                          const isMapped = (c.framework_ids || []).includes(fw.id);
                          if (!isMapped) {
                            return <td key={fw.id} className="text-center px-3 py-2 text-muted-foreground/30">—</td>;
                          }
                          const style = STATUS_STYLES[c.status] || STATUS_STYLES.not_tested;
                          return (
                            <td key={fw.id} className="text-center px-3 py-2">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded ${style.bg} ${style.text} border ${style.border}`}>
                                <style.icon className="w-3.5 h-3.5" />
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {overlappingControls.length > 50 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                Showing top 50 of {overlappingControls.length} overlapping controls (sorted by gap priority).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* High-priority overlapping gaps callout */}
      {failingGaps > 0 && (
        <Card className="mt-6 border-red-500/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-red-700">
              <XCircle className="w-4 h-4" />
              Priority: {failingGaps} Failing Controls Affecting Multiple Frameworks
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              These controls are failing AND mapped to multiple frameworks — fixing them closes gaps across all linked frameworks simultaneously.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overlappingGaps.filter((c) => c.status === "failing").slice(0, 10).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.control_id} · {c.fwCount} frameworks: {c.fwNames.join(", ")}
                      </div>
                    </div>
                  </div>
                  <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">Failing</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}