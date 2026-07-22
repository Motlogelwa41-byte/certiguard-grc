import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ComplianceTrendChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [reports, runs] = await Promise.all([
          base44.entities.ManagementReport.list("-created_date", 100).catch(() => []),
          base44.entities.ComplianceRun.list("-created_date", 200).catch(() => []),
        ]);

        const now = new Date();
        const buckets = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          buckets.push({
            key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
            label: `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          });
        }

        // Prefer monthly management report snapshots (report_month -> compliance_score)
        const reportByMonth = {};
        reports.forEach((r) => {
          if (r.report_month && r.compliance_score != null) {
            reportByMonth[r.report_month] = r.compliance_score;
          }
        });

        // Fall back to compliance run scores averaged per month
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

        setData(series);
      } catch {
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasData = data.some((d) => d.score != null);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Compliance Readiness Trend
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 6 months</p>
        </div>
      </div>
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ left: -10, right: 10, top: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
            <Tooltip formatter={(v) => (v == null ? "No data" : `${v}%`)} />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#10B981"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#10B981" }}
              name="Compliance Score"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">No historical compliance scores yet.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Run compliance checks or generate reports to start building your 6-month trend.
          </p>
        </div>
      )}
    </div>
  );
}