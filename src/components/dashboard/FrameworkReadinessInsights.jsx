import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldAlert, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// Readiness insights panel for the main dashboard.
// Shows the current readiness % for each active framework plus a small chart
// highlighting the top three missing (failing / not-tested) controls across all
// frameworks, ranked by severity and framework coverage.

const SEVERITY_WEIGHT = { critical: 4, high: 3, medium: 2, low: 1 };
const SEVERITY_COLOR = { critical: "#EF4444", high: "#F97316", medium: "#F59E0B", low: "#0EA5E9" };
const SEVERITY_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

function readinessPct(fw) {
  return fw.total_controls > 0
    ? Math.round((fw.passing_controls / fw.total_controls) * 100)
    : fw.readiness_score || 0;
}

function barColor(pct) {
  return pct >= 80 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
}

export default function FrameworkReadinessInsights({ frameworks, controls }) {
  // Active frameworks = anything that isn't "not_started"
  const active = (frameworks || []).filter((f) => f.status && f.status !== "not_started");
  const avgReadiness = active.length > 0
    ? Math.round(active.reduce((s, f) => s + readinessPct(f), 0) / active.length)
    : 0;

  // Missing controls = failing or not tested (exclude passing & N/A)
  const missing = (controls || [])
    .filter((c) => c.status === "failing" || c.status === "not_tested")
    .map((c) => ({
      id: c.id,
      title: c.title || "Untitled control",
      severity: c.severity || "medium",
      frameworkCount: Array.isArray(c.framework_ids) ? c.framework_ids.length : 0,
      weight: (SEVERITY_WEIGHT[c.severity] || 2) + (Array.isArray(c.framework_ids) ? c.framework_ids.length : 0),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const chartData = missing.map((m) => ({
    name: m.title.length > 26 ? m.title.slice(0, 24) + "…" : m.title,
    fullName: m.title,
    gap: m.weight,
    severity: m.severity,
    frameworks: m.frameworkCount,
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Readiness Insights</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Live readiness across active frameworks & your biggest control gaps</p>
        </div>
        <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active framework readiness */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Framework Readiness</span>
            <span className="text-xs text-muted-foreground">Avg <span className="font-bold text-foreground">{avgReadiness}%</span></span>
          </div>
          {active.length > 0 ? (
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
              {active.map((fw) => {
                const pct = readinessPct(fw);
                return (
                  <div key={fw.id} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-32 truncate" title={fw.name}>{fw.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor(pct) }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-9 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No active frameworks yet.
            </div>
          )}
        </div>

        {/* Top missing controls chart */}
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Missing Controls</span>
            <span className="text-xs text-muted-foreground">By severity × framework coverage</span>
          </div>
          {chartData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                    content={({ payload }) => {
                      if (!payload || !payload.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-2 text-xs shadow-md max-w-[240px]">
                          <p className="font-semibold text-foreground">{d.fullName}</p>
                          <p className="text-muted-foreground mt-0.5">Severity: <span className="font-medium" style={{ color: SEVERITY_COLOR[d.severity] }}>{SEVERITY_LABEL[d.severity]}</span></p>
                          <p className="text-muted-foreground">Affects {d.frameworks} framework{d.frameworks !== 1 ? "s" : ""}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="gap" radius={[0, 4, 4, 0]} barSize={22}>
                    {chartData.map((d, i) => <Cell key={i} fill={SEVERITY_COLOR[d.severity]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 justify-center mt-1">
                {chartData.map((d, i) => (
                  <span key={i} className="text-[10px] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SEVERITY_COLOR[d.severity] }} />
                    <span className="text-muted-foreground capitalize">{SEVERITY_LABEL[d.severity]}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              No missing controls — all passing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}