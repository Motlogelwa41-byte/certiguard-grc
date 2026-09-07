import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { TrendingDown, DollarSign, Users, Briefcase } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link } from "react-router-dom";

export default function RevenueImpactWidget({ risks = [] }) {
  const [currency, setCurrency] = useState("ZAR");

  useEffect(() => {
    base44.entities.TenantSettings.list().then((s) => {
      if (s?.[0]?.base_currency) setCurrency(s[0].base_currency);
    }).catch(() => {});
  }, []);

  const currencySym = { ZAR: "R", USD: "$", BWP: "P", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵" }[currency] || "";

  const fmtMoney = (val) => {
    if (val == null) return "—";
    if (val >= 1e9) return `${currencySym}${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `${currencySym}${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `${currencySym}${(val / 1e3).toFixed(0)}K`;
    return `${currencySym}${val.toLocaleString()}`;
  };

  const risksWithRevenue = risks.filter((r) => r.revenue_impact_annual != null && r.revenue_impact_annual > 0);
  const totalRevenueAtRisk = risksWithRevenue.reduce((sum, r) => sum + (r.revenue_impact_annual || 0), 0);
  const totalCustomersImpacted = risksWithRevenue.reduce((sum, r) => sum + (r.customer_impact_count || 0), 0);
  const topRisks = [...risksWithRevenue].sort((a, b) => (b.revenue_impact_annual || 0) - (a.revenue_impact_annual || 0)).slice(0, 5);

  const chartData = topRisks.map((r) => ({
    name: r.title?.length > 20 ? r.title.slice(0, 18) + "…" : r.title || "Untitled",
    value: r.revenue_impact_annual || 0,
    pct: r.revenue_at_risk_pct || 0,
  }));

  if (risksWithRevenue.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <TrendingDown className="w-5 h-5 text-orange-500" />
          <h3 className="font-heading font-semibold text-foreground">Revenue Impact Analysis</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Briefcase className="w-10 h-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No revenue impact data yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add <span className="font-medium">Annual Revenue Impact</span> values to risks in the Risk Register to see financial exposure here.
          </p>
          <Link to="/risks" className="mt-3 text-xs text-primary hover:underline">Go to Risk Register →</Link>
        </div>
      </div>
    );
  }

  const barColor = (val) => {
    if (val >= 1e7) return "#EF4444";
    if (val >= 1e6) return "#F97316";
    if (val >= 1e5) return "#F59E0B";
    return "#22C55E";
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-8 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-orange-500" />
          <h3 className="font-heading font-semibold text-foreground">Revenue Impact Analysis</h3>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{risksWithRevenue.length} Risks Quantified</span>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20 p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Total Revenue at Risk</span>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{fmtMoney(totalRevenueAtRisk)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Annual exposure across {risksWithRevenue.length} risk{risksWithRevenue.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-900/30 dark:bg-orange-950/20 p-4">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Customers Impacted</span>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{totalCustomersImpacted > 0 ? totalCustomersImpacted.toLocaleString() : "—"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Estimated across all quantified risks</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <Briefcase className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wide">Highest Single Exposure</span>
          </div>
          <p className="text-2xl font-heading font-bold text-foreground">{fmtMoney(topRisks[0]?.revenue_impact_annual)}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{topRisks[0]?.title}</p>
        </div>
      </div>

      {/* Bar chart — top 5 revenue-impacting risks */}
      {chartData.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3">Top Revenue-Impacting Risks ({currency})</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtMoney(v)} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [fmtMoney(v), "Revenue Impact"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={barColor(d.value)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Business process breakdown */}
      {risksWithRevenue.some((r) => r.business_process_impacted) && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Business Processes at Risk</p>
          <div className="flex flex-wrap gap-2">
            {[...new Set(risksWithRevenue.map((r) => r.business_process_impacted).filter(Boolean))].map((proc) => {
              const procTotal = risksWithRevenue.filter((r) => r.business_process_impacted === proc).reduce((s, r) => s + (r.revenue_impact_annual || 0), 0);
              return (
                <span key={proc} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border">
                  {proc}: <span className="font-semibold text-foreground">{fmtMoney(procTotal)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}