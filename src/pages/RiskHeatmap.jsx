import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, TrendingUp, Shield, Target, Download } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { subMonths, format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import RiskDetailPanel from "@/components/risks/RiskDetailPanel";
import RiskScenarioSimulator from "@/components/risks/RiskScenarioSimulator";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";
import { Play } from "lucide-react";

const ZONE_COLOR = (likelihood, impact) => {
  const score = likelihood * impact;
  if (score >= 20) return { bg: "bg-gradient-to-br from-red-500/35 via-red-600/30 to-rose-700/35", border: "border-red-400/50", glow: "shadow-lg shadow-red-500/30", label: "Critical", text: "text-red-300", dot: "#ef4444", ring: "ring-red-400", accent: "#ef4444" };
  if (score >= 12) return { bg: "bg-gradient-to-br from-orange-400/30 via-orange-500/30 to-orange-600/35", border: "border-orange-400/50", glow: "shadow-lg shadow-orange-500/25", label: "High", text: "text-orange-300", dot: "#f97316", ring: "ring-orange-400", accent: "#f97316" };
  if (score >= 6)  return { bg: "bg-gradient-to-br from-amber-300/25 via-amber-400/30 to-amber-500/30", border: "border-amber-400/50", glow: "shadow-md shadow-amber-500/20", label: "Medium", text: "text-amber-200", dot: "#f59e0b", ring: "ring-amber-300", accent: "#f59e0b" };
  return { bg: "bg-gradient-to-br from-emerald-400/20 via-emerald-500/25 to-teal-600/25", border: "border-emerald-400/40", glow: "shadow-md shadow-emerald-500/20", label: "Low", text: "text-emerald-200", dot: "#10b981", ring: "ring-emerald-300", accent: "#10b981" };
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
  const [controls, setControls] = useState([]);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(exportRef.current, {
        filename: `risk-heatmap-${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Risk Heatmap Report",
        subtitle: "Likelihood × Impact matrix and trend analysis",
      });
      toast({ title: "PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    base44.entities.Risk.list().then((r) => { setRisks(r); setLoading(false); });
    base44.entities.Control.list().then(setControls).catch(() => {});
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

  // Department / owner attention: group risks by owner_name (proxy for department)
  const departmentAttention = useMemo(() => {
    const map = new Map();
    filtered.forEach(r => {
      const key = r.owner_name?.trim() || "Unassigned";
      if (!map.has(key)) map.set(key, { owner: key, total: 0, criticalHigh: 0, scoreSum: 0, open: 0 });
      const entry = map.get(key);
      entry.total += 1;
      const score = (r.likelihood || 0) * (r.impact || 0);
      entry.scoreSum += score;
      if (score >= 12) entry.criticalHigh += 1;
      if (r.status === "open" || r.status === "mitigating") entry.open += 1;
    });
    return [...map.values()]
      .map(d => ({ ...d, avg: d.total ? Math.round((d.scoreSum / d.total) * 10) / 10 : 0 }))
      .sort((a, b) => b.criticalHigh - a.criticalHigh || b.scoreSum - a.scoreSum);
  }, [filtered]);

  // Control attention: group risks by linked control, resolve control titles
  const controlTitleById = useMemo(() => {
    const m = new Map();
    controls.forEach(c => m.set(c.id, c.title || c.control_id || "Untitled control"));
    return m;
  }, [controls]);

  const controlAttention = useMemo(() => {
    const map = new Map();
    filtered.forEach(r => {
      const ids = Array.isArray(r.related_control_ids) ? r.related_control_ids : [];
      if (ids.length === 0) return;
      ids.forEach(id => {
        if (!map.has(id)) map.set(id, { id, title: controlTitleById.get(id) || id, total: 0, criticalHigh: 0, scoreSum: 0, open: 0 });
        const entry = map.get(id);
        entry.total += 1;
        const score = (r.likelihood || 0) * (r.impact || 0);
        entry.scoreSum += score;
        if (score >= 12) entry.criticalHigh += 1;
        if (r.status === "open" || r.status === "mitigating") entry.open += 1;
      });
    });
    return [...map.values()]
      .map(c => ({ ...c, avg: c.total ? Math.round((c.scoreSum / c.total) * 10) / 10 : 0 }))
      .sort((a, b) => b.criticalHigh - a.criticalHigh || b.scoreSum - a.scoreSum);
  }, [filtered, controlTitleById]);

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
    <>
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
            <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
              <Download className="w-4 h-4 mr-1" />{exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button size="sm" onClick={() => setSimulatorOpen(true)}>
              <Play className="w-4 h-4 mr-1" /> Simulate
            </Button>
          </div>
        }
      />
      <RiskScenarioSimulator open={simulatorOpen} onOpenChange={setSimulatorOpen} />
      <div className="space-y-6" ref={exportRef}>

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
        <div className="xl:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">Risk Matrix</h3>
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} risk{filtered.length !== 1 ? "s" : ""} plotted</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Click a cell to inspect the risks in that zone. Dots = risk categories.</p>

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
                    const hasRisks = risksHere.length > 0;
                    return (
                      <div
                        key={likelihood}
                        onClick={() => setSelectedCell(isSelected ? null : { likelihood, impact })}
                        onMouseEnter={() => setHoveredCell({ likelihood, impact })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className={`relative flex-1 min-h-[68px] rounded-xl border flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ease-out
                          ${zone.bg} ${zone.border}
                          ${hasRisks ? zone.glow : "shadow-sm"}
                          ${isSelected ? `ring-2 ${zone.ring} ring-offset-2 ring-offset-card scale-[1.06] z-10` : ""}
                          ${isHovered && !isSelected ? "scale-[1.03] brightness-110 -translate-y-0.5" : ""}
                          ${!hasRisks && !isSelected ? "opacity-70 hover:opacity-100" : ""}`}
                        style={hasRisks && !isSelected ? { boxShadow: `0 4px 14px -4px ${zone.accent}40` } : undefined}
                      >
                        {/* subtle top sheen */}
                        <span className="absolute inset-x-1 top-1 h-1/3 rounded-t-xl bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
                        {hasRisks ? (
                          <>
                            <span className="relative text-lg font-bold text-white drop-shadow-sm">{risksHere.length}</span>
                            <div className="relative flex gap-0.5 mt-1.5 flex-wrap justify-center px-1 max-w-[90%]">
                              {risksHere.slice(0, 6).map((r, idx) => (
                                <div key={idx} className="w-2 h-2 rounded-full ring-1 ring-white/30" style={{ backgroundColor: CATEGORY_COLORS[r.category] || "#6b7280" }} title={r.title} />
                              ))}
                              {risksHere.length > 6 && <span className="text-[9px] text-white/80 font-medium leading-none">+{risksHere.length - 6}</span>}
                            </div>
                          </>
                        ) : (
                          <span className="relative text-xs font-semibold text-muted-foreground/50">{likelihood * impact}</span>
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
              { label: "Critical (≥20)", grad: "from-red-500 to-rose-600", dot: "#ef4444" },
              { label: "High (12–19)", grad: "from-orange-400 to-orange-600", dot: "#f97316" },
              { label: "Medium (6–11)", grad: "from-amber-400 to-amber-500", dot: "#f59e0b" },
              { label: "Low (<6)", grad: "from-emerald-400 to-teal-500", dot: "#10b981" },
            ].map(({ label, grad, dot }) => (
              <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-3.5 h-3.5 rounded-md bg-gradient-to-br ${grad} shadow-sm`} />{label}
              </span>
            ))}
            <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="flex gap-0.5">
                {categories.slice(0, 4).map(c => <span key={c} className="w-2.5 h-2.5 rounded-full ring-1 ring-white/20" style={{ backgroundColor: CATEGORY_COLORS[c] || "#6b7280" }} />)}
              </span>
              Categories
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

      {/* Attention required: departments & controls at a glance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-heading font-semibold text-foreground">Departments / Owners Needing Attention</h3>
            <span className="ml-auto text-xs text-muted-foreground">{departmentAttention.length} groups</span>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {departmentAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No risks to group</p>
            ) : departmentAttention.map(d => {
              const severity = d.criticalHigh > 0 ? "bg-red-500" : d.open > 0 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={d.owner} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${severity}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.owner}</p>
                    <p className="text-xs text-muted-foreground">{d.total} risks · {d.open} open · avg {d.avg}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">{d.criticalHigh}</p>
                      <p className="text-[10px] text-muted-foreground">critical/high</p>
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${Math.min(100, (d.criticalHigh / Math.max(1, d.total)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-500" />
            <h3 className="font-heading font-semibold text-foreground">Controls Needing Attention</h3>
            <span className="ml-auto text-xs text-muted-foreground">{controlAttention.length} controls</span>
          </div>
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {controlAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No risks linked to controls yet. Link risks to controls in the Risk Register.</p>
            ) : controlAttention.slice(0, 12).map(c => {
              const severity = c.criticalHigh > 0 ? "bg-red-500" : c.open > 0 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${severity}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.total} linked risks · {c.open} open · avg {c.avg}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">{c.criticalHigh}</p>
                      <p className="text-[10px] text-muted-foreground">critical/high</p>
                    </div>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-500" style={{ width: `${Math.min(100, (c.criticalHigh / Math.max(1, c.total)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
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