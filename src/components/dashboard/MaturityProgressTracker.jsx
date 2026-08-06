import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Legend, Area, AreaChart,
} from "recharts";
import { TrendingUp, Target, Award, Gauge } from "lucide-react";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function readinessToMaturity(score) {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

const MATURITY_NAMES = ["", "Initial", "Managed", "Defined", "Quant. Managed", "Optimizing"];

export default function MaturityProgressTracker() {
  const [trendData, setTrendData] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reports, runs, benchmarks] = await Promise.all([
          base44.entities.ManagementReport.list("-created_date", 100).catch(() => []),
          base44.entities.ComplianceRun.list("-created_date", 200).catch(() => []),
          base44.entities.ComplianceBenchmark.list("-created_date", 50).catch(() => []),
        ]);

        // Build 6-month trend (same logic as ComplianceTrendChart)
        const now = new Date();
        const buckets = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          });
        }

        const reportByMonth = {};
        reports.forEach((r) => {
          if (r.report_month && r.compliance_score != null) {
            reportByMonth[r.report_month] = r.compliance_score;
          }
        });
        const runByMonth = {};
        runs.forEach((r) => {
          if (!r.created_date || r.score == null) return;
          const m = String(r.created_date).slice(0, 7);
          (runByMonth[m] = runByMonth[m] || []).push(r.score);
        });

        const series = buckets.map((b) => {
          let score = null;
          if (reportByMonth[b.key] != null) {
            score = Math.round(reportByMonth[b.key]);
          } else if (runByMonth[b.key] && runByMonth[b.key].length) {
            const arr = runByMonth[b.key];
            score = Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
          }
          return { month: b.label, score };
        });

        setTrendData(series);
        setBenchmarks(benchmarks || []);
      } catch {
        setTrendData([]);
        setBenchmarks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasTrend = trendData.some((d) => d.score != null);

  // Industry benchmark summary — use "Control pass rate" or first available benchmark
  const benchmarkMetric = benchmarks.find((b) =>
    (b.metric_name || "").toLowerCase().includes("pass rate") ||
    (b.metric_name || "").toLowerCase().includes("compliance")
  ) || benchmarks[0];

  const industryMedian = benchmarkMetric?.industry_median ?? null;
  const topQuartile = benchmarkMetric?.top_quartile ?? null;
  const bottomQuartile = benchmarkMetric?.bottom_quartile ?? null;
  const percentileRank = benchmarkMetric?.percentile_rank ?? null;

  const latestScore = [...trendData].reverse().find((d) => d.score != null)?.score ?? null;
  const latestMaturity = latestScore != null ? readinessToMaturity(latestScore) : null;

  // Build chart data with benchmark reference lines
  const chartData = trendData.map((d) => ({
    ...d,
    industryMedian,
    topQuartile,
    bottomQuartile,
  }));

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Maturity Progress Tracker
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Compliance score over time vs industry benchmarks · 6-month trend
          </p>
        </div>
        {latestMaturity != null && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Current maturity:</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              <Gauge className="w-3 h-3" />
              L{latestMaturity} — {MATURITY_NAMES[latestMaturity]}
            </span>
          </div>
        )}
      </div>

      {/* Benchmark comparison cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Gauge className="w-3 h-3" /> Your Score
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{latestScore != null ? `${latestScore}%` : "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Target className="w-3 h-3" /> Industry Median
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{industryMedian != null ? `${Math.round(industryMedian)}%` : "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <Award className="w-3 h-3" /> Top Quartile
          </div>
          <p className="text-xl font-bold text-emerald-600 mt-1">{topQuartile != null ? `${Math.round(topQuartile)}%` : "—"}</p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            <TrendingUp className="w-3 h-3" /> Percentile Rank
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{percentileRank != null ? `${Math.round(percentileRank)}%` : "—"}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : hasTrend ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 5 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
            <Tooltip
              formatter={(v, name) => {
                if (v == null) return ["—", name];
                const labels = { score: "Your Score", industryMedian: "Industry Median", topQuartile: "Top Quartile", bottomQuartile: "Bottom Quartile" };
                return [`${Math.round(v)}%`, labels[name] || name];
              }}
            />
            <Legend formatter={(v) => {
              const labels = { score: "Your Score", industryMedian: "Industry Median", topQuartile: "Top Quartile", bottomQuartile: "Bottom Quartile" };
              return labels[v] || v;
            }} />
            {industryMedian != null && (
              <ReferenceLine y={industryMedian} stroke="#64748b" strokeDasharray="5 5" strokeWidth={1.5} />
            )}
            {topQuartile != null && (
              <ReferenceLine y={topQuartile} stroke="#10B981" strokeDasharray="3 3" strokeWidth={1.5} />
            )}
            {bottomQuartile != null && (
              <ReferenceLine y={bottomQuartile} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
            )}
            <Area
              type="monotone"
              dataKey="score"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#scoreGradient)"
              dot={{ r: 4, fill: "#10B981" }}
              name="score"
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No historical compliance scores yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Run compliance checks or generate reports to start building your maturity trend.
          </p>
        </div>
      )}

      {/* Maturity level scale */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {[
            { lvl: 1, name: "Initial", range: "0-19%", color: "#ef4444" },
            { lvl: 2, name: "Managed", range: "20-39%", color: "#f97316" },
            { lvl: 3, name: "Defined", range: "40-59%", color: "#eab308" },
            { lvl: 4, name: "Quant. Managed", range: "60-79%", color: "#22c55e" },
            { lvl: 5, name: "Optimizing", range: "80-100%", color: "#10b981" },
          ].map((ml) => (
            <div key={ml.lvl} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-full h-2 rounded-full ${latestMaturity === ml.lvl ? "ring-2 ring-foreground/20" : ""}`}
                style={{ backgroundColor: latestMaturity === ml.lvl ? ml.color : "hsl(var(--muted))" }}
              />
              <span className={`font-medium ${latestMaturity === ml.lvl ? "text-foreground" : "text-muted-foreground/60"}`}>
                L{ml.lvl}
              </span>
              <span className="text-muted-foreground/50">{ml.range}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}