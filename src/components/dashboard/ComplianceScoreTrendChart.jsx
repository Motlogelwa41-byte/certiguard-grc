import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// Displays the month-over-month compliance readiness score trend from
// ComplianceScoreSnapshot records. Falls back to the live score if no snapshots exist.

export default function ComplianceScoreTrendChart() {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.ComplianceScoreSnapshot.list("snapshot_date", 90);
        setSnapshots(data || []);
      } catch { setSnapshots([]); }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <div className="h-[260px] flex items-center justify-center"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold text-foreground mb-1">Compliance Score Trend</h3>
        <p className="text-sm text-muted-foreground">No trend data yet. Daily snapshots are recorded automatically — check back after the first scheduled run.</p>
      </div>
    );
  }

  const chartData = snapshots.slice().reverse().map((s) => ({
    date: new Date(s.snapshot_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: s.score,
    grade: s.grade,
  }));

  const latest = snapshots[0];
  const previous = snapshots[1];
  const delta = previous ? latest.score - previous.score : 0;
  const trendIcon = delta > 0 ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : delta < 0 ? <TrendingDown className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4 text-muted-foreground" />;
  const trendColor = delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Compliance Score Trend</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Daily readiness score — last {snapshots.length} days</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-3xl font-heading font-bold text-foreground">{latest.score}</span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
              latest.grade === "A+" || latest.grade === "A" ? "bg-emerald-100 text-emerald-700" :
              latest.grade === "B" ? "bg-blue-100 text-blue-700" :
              latest.grade === "C" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>{latest.grade}</span>
          </div>
          {previous && (
            <div className={`flex items-center gap-1 justify-end text-xs mt-1 ${trendColor}`}>
              {trendIcon}
              {delta > 0 ? "+" : ""}{delta} vs yesterday
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
          />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 80", fontSize: 10, fill: "#10b981", position: "insideBottomRight" }} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Min 60", fontSize: 10, fill: "#f59e0b", position: "insideBottomRight" }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ fill: "hsl(var(--primary))", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}