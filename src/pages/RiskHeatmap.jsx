import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, TrendingUp, Shield, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { subMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import RiskDetailPanel from "@/components/risks/RiskDetailPanel";

const ZONE_COLOR = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 20) return { bg: "bg-red-500/20", border: "border-red-500/40", label: "Critical", text: "text-red-400", dot: "#ef4444" };
  if (score >= 12) return { bg: "bg-orange-500/20", border: "border-orange-500/40", label: "High", text: "text-orange-400", dot: "#f97316" };
  if (score >= 6)  return { bg: "bg-amber-500/20", border: "border-amber-500/40", label: "Medium", text: "text-amber-400", dot: "#f59e0b" };
  return { bg: "bg-emerald-500/20", border: "border-emerald-500/40", label: "Low", text: "text-emerald-400", dot: "#10b981" };
};

const SCORE_BG = (score) => {
  if (score >= 20) return "bg-red-500 text-white";
  if (score >= 12) return "bg-orange-500 text-white";
  if (score >= 6)  return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
};

const CATEGORY_COLORS = {
  operational: "#6366f1", technical: "#3b82f6", compliance: "#8b5cf6",
  financial: "#ec4899", strategic: "#06b6d4", reputational: "#f97316", third_party: "#10b981"
};

const LIKELIHOOD_LABELS = ["", "Rare", "Unlikely", "Possible", "Likely", "Almost Certain"];
const IMPACT_LABELS    = ["", "Negligible", "Minor", "Moderate", "Major", "Catastrophic"];

export default function RiskHeatmap() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState(null); // {likelihood, impact}
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [panelRisk, setPanelRisk] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [hoveredCell, setHoveredCell] = useState(null);

  useEffect(() => {
    base44.entities.Risk.list().then((r) => { setRisks(r); setLoading(false); });
  }, []);

  const filtered = useMemo(() =>
    risks.filter(r =>
      (filterStatus === "all" || r.status === filterStatus) &&
      (filterCategory === "all" || r.category === filterCategory)
    ), [risks, filterStatus, filterCategory]);

  const getRisksInCell = (l, i) => filtered.filter(r => r.likelihood === l && r.impact === i);

  const cellRisks = selectedCell
    ? getRisksInCell(selectedCell.likelihood, selectedCell.impact)
    : [];

  // Summary counts
  const critical = filtered.filter(r => (r.likelihood * r.impact) >= 20).length;
  const high     = filtered.filter(r => { const s = r.likelihood * r.impact; return s >= 12 && s < 20; }).length;
  const medium   = filtered.filter(r => { const s = r.likelihood * r.impact; return s >= 6  && s < 12; }).length;
  const low      = filtered.filter(r => (r.likelihood * r.impact) < 6).length;

  const categories = [...new Set(risks.map(r => r.category).filter(Boolean))];

  // Build 6-month trend: for each month, compute avg risk score of risks that existed then
  const trendData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
    return months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      // Risks created on or before end of this month
      const existedThen = risks.filter(r => {
        if (!r.created_date) return false;
        try { return parseISO(r.created_date) <= monthEnd; } catch { return false; }
      });
      // Of those, how many were "closed" by this month
      const closedThen = existedThen.filter(r => {
        if (r.status !== "closed" || !r.updated_date) return false;
        try { return parseISO(r.updated_date) <= monthEnd; } catch { return false; }
      });
      const openThen = existedThen.filter(r => !closedThen.includes(r));
      const avgScore = openThen.length
        ? Math.round((openThen.reduce((s, r) => s + ((r.likelihood || 3) * (r.impact || 3)), 0) / openThen.length) * 10) / 10
        : 0;
      const criticalCount = openThen.filter(r => (r.likelihood || 3) * (r.impact || 3) >= 20).length;
      const highCount = openThen.filter(r => { const s = (r.likelihood || 3) * (r.impact || 3); return s >= 12 && s < 20; }).length;
      return {
        month: format(monthDate, "MMM yy"),
        avgScore,
        openRisks: openThen.length,
        critical: criticalCount,
        high: highCount,
      };
    });
  }, [risks]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (risks.length === 0) return (
    <div>
      <PageHeader title="Risk Heatmap" subtitle="Visual plot of risks by likelihood and impact" />
      <EmptyState icon={AlertTriangle} title="No risks found" description="Add risks in the Risk Register to see them plotted here." />
    </div>
  );

  return (
    <><div className="space-y-6">
      <PageHeader
        title="Risk Heatmap"
        subtitle="Interactive plot of identified risks by likelihood and impact"
        actions={
          <div className="flex items-center gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="mitigating">Mitigating</option>
              <option value="accepted">Accepted</option>
              <option value="transferred">Transferred</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</option>)}
            </select>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Critical", value: critical, cls: "bg-red-500/10 border-red-500/30 text-red-400", sub: "Score ≥ 20" },
          { label: "High", value: high, cls: "bg-orange-500/10 border-orange-500/30 text-orange-400", sub: "Score 12–19" },
          { label: "Medium", value: medium, cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", sub: "Score 6–11" },
          { label: "Low", value: low, cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", sub: "Score < 6" },
        ].map(({ label, value, cls, sub }) => (
          <div key={label} className={`rounded-xl border p-4 ${cls}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-medium mt-0.5">{label} Risk</p>
            <p className="text-xs opacity-60 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* 6-month trend chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Risk Profile Trend — Last 6 Months</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Average risk score and critical/high risk counts over time. A downward trend indicates an improving risk posture.</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="score" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} domain={[0, 25]} label={{ value: "Avg Score", angle: -90, position: "insideLeft", offset: 8, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }} />
            <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine yAxisId="score" y={12} stroke="#f97316" strokeDasharray="4 3" strokeOpacity={0.5} label={{ value: "High threshold", position: "insideTopRight", fontSize: 10, fill: "#f97316" }} />
            <Line yAxisId="score" type="monotone" dataKey="avgScore" name="Avg Risk Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} />
            <Line yAxisId="count" type="monotone" dataKey="critical" name="Critical Risks" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} strokeDasharray="5 3" />
            <Line yAxisId="count" type="monotone" dataKey="high" name="High Risks" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} strokeDasharray="5 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Heatmap */}
        <div className="xl:col-span-2 bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-1">Risk Matrix</h3>
          <p className="text-xs text-muted-foreground mb-5">Click a cell to see the risks plotted there. Numbers = count of risks in that zone.</p>

          <div className="flex gap-3">
            {/* Y-axis label */}
            <div className="flex flex-col items-center justify-center gap-1 shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>IMPACT ↑</span>
            </div>

            <div className="flex-1">
              {/* Y-axis labels + grid */}
              {[5, 4, 3, 2, 1].map((impact) => (
                <div key={impact} className="flex items-stretch gap-1 mb-1">
                  {/* Impact label */}
                  <div className="w-20 shrink-0 flex items-center justify-end pr-2">
                    <span className="text-[10px] text-muted-foreground text-right leading-tight">{impact}. {IMPACT_LABELS[impact]}</span>
                  </div>
                  {/* Cells */}
                  {[1, 2, 3, 4, 5].map((likelihood) => {
                    const zone = ZONE_COLOR(likelihood, impact);
                    const risksHere = getRisksInCell(likelihood, impact);
                    const isSelected = selectedCell?.likelihood === likelihood && selectedCell?.impact === impact;
                    const isHovered = hoveredCell?.likelihood === likelihood && hoveredCell?.impact === impact;
                    return (
                      <div
                        key={likelihood}
                        onClick={() => setSelectedCell(isSelected ? null : { likelihood, impact })}
                        onMouseEnter={() => setHoveredCell({ likelihood, impact })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`flex-1 min-h-[64px] rounded-lg border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150
                          ${zone.bg} ${zone.border}
                          ${isSelected ? "ring-2 ring-primary ring-offset-1 scale-105 shadow-lg" : ""}
                          ${isHovered && !isSelected ? "scale-102 brightness-110" : ""}`}
                      >
                        {risksHere.length > 0 ? (
                          <>
                            <span className="text-lg font-bold text-foreground">{risksHere.length}</span>
                            <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                              {risksHere.slice(0, 6).map((r, idx) => (
                                <div key={idx} className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[r.category] || "#6b7280" }} title={r.title} />
                              ))}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 font-medium">{likelihood * impact}</span>
                        )}
                      </div>
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
              { label: "Critical (≥20)", bg: "bg-red-500" },
              { label: "High (12–19)", bg: "bg-orange-500" },
              { label: "Medium (6–11)", bg: "bg-amber-500" },
              { label: "Low (<6)", bg: "bg-emerald-500" },
            ].map(({ label, bg }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3 h-3 rounded-sm ${bg}`} />{label}
              </span>
            ))}
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1">
              <span className="flex gap-0.5">
                {categories.slice(0, 4).map(c => <span key={c} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] || "#6b7280" }} />)}
              </span>
              Dots = categories
            </span>
          </div>
        </div>

        {/* Right panel: cell detail or top risks */}
        <div className="space-y-4">
          {selectedCell ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className={`px-4 py-3 border-b border-border ${ZONE_COLOR(selectedCell.likelihood, selectedCell.impact).bg}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-bold ${ZONE_COLOR(selectedCell.likelihood, selectedCell.impact).text}`}>
                      {ZONE_COLOR(selectedCell.likelihood, selectedCell.impact).label} Zone
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      Likelihood {selectedCell.likelihood} × Impact {selectedCell.impact} = Score {selectedCell.likelihood * selectedCell.impact}
                    </p>
                  </div>
                  <button onClick={() => setSelectedCell(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
                </div>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {cellRisks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No risks in this cell</p>
                ) : cellRisks.map(r => (
                  <div key={r.id} onClick={() => setPanelRisk(r)}
                    className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {r.risk_id && <span className="text-[10px] font-mono text-muted-foreground block">{r.risk_id}</span>}
                        <p className="text-sm font-semibold text-foreground">{r.title}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCORE_BG(r.likelihood * r.impact)}`}>
                        {r.likelihood * r.impact}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge status={r.status} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: CATEGORY_COLORS[r.category] || "#6b7280" }}>
                        {(r.category || "").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm text-foreground">Top Risks by Score</h3>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {[...filtered].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact)).slice(0, 10).map((r, i) => {
                  const score = r.likelihood * r.impact;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${SCORE_BG(score)}`}>{score}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={r.status} />
                          <span className="text-[10px] text-muted-foreground">{r.owner_name || "Unassigned"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category breakdown */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm text-foreground">By Category</h3>
            </div>
            <div className="space-y-2">
              {categories.map(cat => {
                const catRisks = filtered.filter(r => r.category === cat);
                const avgScore = catRisks.length > 0
                  ? Math.round(catRisks.reduce((s, r) => s + (r.likelihood * r.impact), 0) / catRisks.length)
                  : 0;
                const maxScore = 25;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="text-muted-foreground">{catRisks.length} risks · avg {avgScore}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(avgScore / maxScore) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] || "#6b7280" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* All risks table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">All Risks</h3>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Score</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Risk</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">L × I</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Treatment</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Owner</th>
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact)).map(r => {
                const score = r.likelihood * r.impact;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20 cursor-pointer" onClick={() => setPanelRisk(r)}>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${SCORE_BG(score)}`}>{score}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-foreground">{r.title}</p>
                      {r.risk_id && <p className="text-[10px] font-mono text-muted-foreground">{r.risk_id}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs capitalize">{(r.category || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.likelihood} × {r.impact}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{r.treatment}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.owner_name || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <RiskDetailPanel risk={panelRisk} onClose={() => setPanelRisk(null)} />
  </>
  );
}