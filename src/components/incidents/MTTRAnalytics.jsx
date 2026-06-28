import React from "react";
import { Clock, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEV_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981" };

function calcHours(from, to) {
  if (!from || !to) return null;
  const diff = new Date(to) - new Date(from);
  return diff > 0 ? Math.round(diff / 3600000 * 10) / 10 : null;
}

function MetricCard({ label, value, unit, sub, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>
        {value !== null && value !== undefined ? value : "—"}
        {value !== null && value !== undefined && <span className="text-sm font-normal ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function MTTRAnalytics({ incidents }) {
  const closed = incidents.filter(i => ["closed", "remediated"].includes(i.status));

  // Per-incident MTTR (detected → resolved)
  const withMTTR = closed.map(i => ({
    ...i,
    mttr: calcHours(i.detected_date, i.resolved_date || i.remediated_date),
    mttc: calcHours(i.detected_date, i.contained_date),
  })).filter(i => i.mttr !== null);

  const avgMTTR = withMTTR.length ? Math.round(withMTTR.reduce((s, i) => s + i.mttr, 0) / withMTTR.length * 10) / 10 : null;
  const avgMTTC = withMTTR.filter(i => i.mttc).length
    ? Math.round(withMTTR.filter(i => i.mttc).reduce((s, i) => s + i.mttc, 0) / withMTTR.filter(i => i.mttc).length * 10) / 10
    : null;

  // By severity
  const bySeverity = ["critical", "high", "medium", "low"].map(sev => {
    const sevItems = withMTTR.filter(i => i.severity === sev);
    const avg = sevItems.length ? Math.round(sevItems.reduce((s, i) => s + i.mttr, 0) / sevItems.length * 10) / 10 : 0;
    return { severity: sev.charAt(0).toUpperCase() + sev.slice(1), avg, count: sevItems.length };
  }).filter(d => d.count > 0);

  // Open incidents needing attention
  const openCritical = incidents.filter(i => i.severity === "critical" && i.status !== "closed" && i.status !== "remediated" && i.status !== "false_positive").length;
  const openHigh = incidents.filter(i => i.severity === "high" && i.status !== "closed" && i.status !== "remediated" && i.status !== "false_positive").length;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">MTTR Analytics & Severity Overview</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Avg. MTTR" value={avgMTTR} unit="hrs" sub={`Across ${withMTTR.length} closed incidents`} color="text-primary" />
        <MetricCard label="Avg. MTTC" value={avgMTTC} unit="hrs" sub="Mean time to contain" color="text-blue-600" />
        <MetricCard label="Open Critical" value={openCritical} sub="Requiring immediate action" color={openCritical > 0 ? "text-red-600" : "text-emerald-600"} />
        <MetricCard label="Open High" value={openHigh} sub="Requiring urgent action" color={openHigh > 0 ? "text-orange-600" : "text-emerald-600"} />
      </div>

      {bySeverity.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">MTTR by Severity (hours)</p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={bySeverity} barSize={32}>
              <XAxis dataKey="severity" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="h" />
              <Tooltip formatter={(v) => [`${v}h`, "Avg MTTR"]} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {bySeverity.map((entry, i) => (
                  <Cell key={i} fill={SEV_COLORS[entry.severity.toLowerCase()] || "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}