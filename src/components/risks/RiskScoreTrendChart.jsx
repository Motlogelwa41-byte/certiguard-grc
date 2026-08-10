import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingDown, TrendingUp, Activity } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

/**
 * Reconstructs risk score history from the AuditTrail.
 * Each create/update audit entry for a Risk carries a `changes` JSON:
 *  - create: { risk_score: N, likelihood: N, impact: N, ... }
 *  - update: { risk_score: { from: N, to: M }, likelihood: { from, to }, ... }
 *
 * We walk the entries chronologically, maintaining a live map of
 * entity_id → current score, and at each event record the portfolio
 * average — giving a true time-series of how the org's risk posture evolved.
 */
export default function RiskScoreTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const entries = await base44.entities.AuditTrail.filter(
          { entity_type: "Risk" },
          "created_date",
          500
        );
        // Only create + update entries carry score info
        const events = entries
          .filter((e) => e.action === "create" || e.action === "update")
          .filter((e) => e.changes)
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

        const scoreMap = {}; // entity_id → current score
        const series = [];
        let prevAvg = null;

        for (const ev of events) {
          let parsed;
          try { parsed = JSON.parse(ev.changes); } catch { continue; }

          const eid = ev.entity_id;
          if (!eid) continue;

          if (ev.action === "create") {
            const score = parsed.risk_score ?? (parsed.likelihood ?? 3) * (parsed.impact ?? 3);
            scoreMap[eid] = score;
          } else {
            // update — apply diffs
            let score = scoreMap[eid] ?? 0;
            if (parsed.risk_score && typeof parsed.risk_score === "object") {
              score = parsed.risk_score.to ?? score;
            } else if (parsed.risk_score != null) {
              score = parsed.risk_score;
            }
            // If likelihood or impact changed, recalculate from those
            let lh = null, imp = null;
            if (parsed.likelihood && typeof parsed.likelihood === "object") lh = parsed.likelihood.to;
            else if (parsed.likelihood != null) lh = parsed.likelihood;
            if (parsed.impact && typeof parsed.impact === "object") imp = parsed.impact.to;
            else if (parsed.impact != null) imp = parsed.impact;
            if (lh != null || imp != null) {
              const fallbackL = (Math.floor(score / (Math.floor(score / 5) || 1)) || 3);
              const curL = lh ?? fallbackL;
              const fallbackI = score / curL || 3;
              const curI = imp ?? fallbackI;
              score = curL * curI;
            }
            scoreMap[eid] = score;
          }

          const scores = Object.values(scoreMap).filter((s) => s > 0);
          if (scores.length === 0) continue;
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          const highCount = scores.filter((s) => s >= 15).length;
          const criticalCount = scores.filter((s) => s >= 20).length;

          const date = new Date(ev.created_date);
          const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          // Only push if the average actually changed (avoids flat-line noise from unrelated field updates)
          if (prevAvg === null || Math.abs(avg - prevAvg) > 0.01) {
            series.push({
              date: label,
              timestamp: date.getTime(),
              avgScore: Math.round(avg * 10) / 10,
              riskCount: scores.length,
              highRisk: highCount,
              criticalRisk: criticalCount,
            });
            prevAvg = avg;
          }
        }

        // Cap to last 60 points for readability
        const trimmed = series.slice(-60);
        setData(trimmed);

        if (trimmed.length >= 2) {
          const first = trimmed[0].avgScore;
          const last = trimmed[trimmed.length - 1].avgScore;
          const delta = last - first;
          setStats({
            first,
            last,
            delta,
            improving: delta < 0,
            points: trimmed.length,
          });
        }
      } catch (e) {
        // silent fail — chart is non-critical
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Risk Score Trend</h4>
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (data.length < 2) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Risk Score Trend</h4>
        </div>
        <p className="text-sm text-muted-foreground py-16 text-center">
          Not enough audit history yet to show a trend. As risks are assessed and updated over time, this chart will show how your portfolio risk score evolves.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Risk Score Trend</h4>
          <span className="text-xs font-normal text-muted-foreground">({data.length} data points · portfolio average)</span>
        </div>
        {stats && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Current avg</p>
              <p className="text-lg font-heading font-bold text-foreground">{stats.last}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Change</p>
              <p className={`text-lg font-heading font-bold flex items-center gap-1 ${stats.improving ? "text-emerald-600" : "text-red-600"}`}>
                {stats.improving ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {stats.delta > 0 ? "+" : ""}{stats.delta.toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" />
          <YAxis domain={[0, 25]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} stroke="hsl(var(--border))" label={{ value: "Avg Score", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" } }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="avgScore" name="Avg Risk Score" stroke="hsl(var(--chart-1))" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="highRisk" name="High Risks (≥15)" stroke="hsl(38 92% 50%)" strokeWidth={1.5} dot={false} strokeDasharray="5 3" />
          <Line type="monotone" dataKey="criticalRisk" name="Critical Risks (≥20)" stroke="hsl(0 72% 51%)" strokeWidth={1.5} dot={false} strokeDasharray="2 4" />
        </LineChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground mt-3">
        {stats?.improving
          ? "Your portfolio risk score is trending downward — mitigations are having an impact."
          : "Risk scores are trending upward — review new risks and mitigation effectiveness."}
      </p>
    </div>
  );
}