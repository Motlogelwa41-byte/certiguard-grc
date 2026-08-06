import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus, DollarSign, Crosshair, BarChart3 } from "lucide-react";

// Industry benchmark FAIR data (simulated industry averages)
const INDUSTRY_BENCHMARKS = {
  "Financial Services": { avg_ale: 4500000, avg_sle: 850000, avg_aro: 5.3, avg_residual: 1200000 },
  "Healthcare": { avg_ale: 3200000, avg_sle: 720000, avg_aro: 4.4, avg_residual: 900000 },
  "Technology": { avg_ale: 2800000, avg_sle: 560000, avg_aro: 5.0, avg_residual: 780000 },
  "Retail": { avg_ale: 1900000, avg_sle: 420000, avg_aro: 4.5, avg_residual: 520000 },
  "Manufacturing": { avg_ale: 2100000, avg_sle: 480000, avg_aro: 4.4, avg_residual: 580000 },
  "Government": { avg_ale: 3800000, avg_sle: 950000, avg_aro: 4.0, avg_residual: 1100000 },
  "SADC Average": { avg_ale: 2400000, avg_sle: 520000, avg_aro: 4.6, avg_residual: 680000 },
};

export default function FairBenchmarks() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndustry, setSelectedIndustry] = useState("SADC Average");

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.Risk.list("-risk_score", 200);
      setRisks(data || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const quantifiedRisks = risks.filter(r => r.annualized_loss_expectancy > 0 || r.quantitative_single_loss > 0);
  const myAvgALE = quantifiedRisks.length > 0
    ? Math.round(quantifiedRisks.reduce((s, r) => s + (r.annualized_loss_expectancy || 0), 0) / quantifiedRisks.length)
    : 0;
  const myAvgSLE = quantifiedRisks.length > 0
    ? Math.round(quantifiedRisks.reduce((s, r) => s + (r.quantitative_single_loss || 0), 0) / quantifiedRisks.length)
    : 0;
  const myAvgARO = quantifiedRisks.length > 0
    ? (quantifiedRisks.reduce((s, r) => s + (r.quantitative_annual_rate || 0), 0) / quantifiedRisks.length).toFixed(1)
    : 0;
  const myAvgResidual = quantifiedRisks.length > 0
    ? Math.round(quantifiedRisks.reduce((s, r) => s + (r.residual_annualized_loss_expectancy || 0), 0) / quantifiedRisks.length)
    : 0;

  const benchmark = INDUSTRY_BENCHMARKS[selectedIndustry] || INDUSTRY_BENCHMARKS["SADC Average"];

  const comparisonData = [
    { metric: "Avg ALE", yours: myAvgALE, industry: benchmark.avg_ale },
    { metric: "Avg SLE", yours: myAvgSLE, industry: benchmark.avg_sle },
    { metric: "Avg Residual", yours: myAvgResidual, industry: benchmark.avg_residual },
  ];

  const radarData = [
    { dimension: "ALE", you: myAvgALE, benchmark: benchmark.avg_ale },
    { dimension: "SLE", you: myAvgSLE, benchmark: benchmark.avg_sle },
    { dimension: "ARO", you: parseFloat(myAvgARO) * 100000, benchmark: benchmark.avg_aro * 100000 },
    { dimension: "Residual", you: myAvgResidual, benchmark: benchmark.avg_residual },
  ];

  const formatCurrency = (v) => {
    if (v >= 1000000) return `R${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R${(v / 1000).toFixed(0)}K`;
    return `R${v}`;
  };

  const getTrend = (yours, industry) => {
    if (yours < industry * 0.8) return { icon: TrendingDown, color: "text-emerald-500", label: "Better than industry" };
    if (yours > industry * 1.2) return { icon: TrendingUp, color: "text-red-500", label: "Worse than industry" };
    return { icon: Minus, color: "text-amber-500", label: "At industry average" };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="FAIR Quantitative Risk Benchmarks"
        subtitle="Compare your FAIR (Factor Analysis of Information Risk) metrics against industry peers and SADC averages"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Your Avg ALE" value={formatCurrency(myAvgALE)} icon={DollarSign} color="blue" />
        <StatCard label="Your Avg SLE" value={formatCurrency(myAvgSLE)} icon={Crosshair} color="purple" />
        <StatCard label="Your Avg ARO" value={`${myAvgARO}/yr`} icon={BarChart3} color="amber" />
        <StatCard label="Your Avg Residual" value={formatCurrency(myAvgResidual)} icon={TrendingDown} color="green" />
      </div>

      {/* Industry selector */}
      <Card>
        <CardHeader><CardTitle>Industry Benchmark Comparison</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(INDUSTRY_BENCHMARKS).map(ind => (
              <Badge
                key={ind}
                variant={selectedIndustry === ind ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedIndustry(ind)}
              >
                {ind}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonData.map((d, i) => {
              const trend = getTrend(d.yours, d.industry);
              const TrendIcon = trend.icon;
              return (
                <div key={i} className="p-4 rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-1">{d.metric}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{formatCurrency(d.yours)}</span>
                    <span className="text-xs text-muted-foreground">vs {formatCurrency(d.industry)}</span>
                  </div>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${trend.color}`}>
                    <TrendIcon className="h-3.5 w-3.5" /> {trend.label}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>You vs Industry — Bar Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={formatCurrency} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="yours" fill="hsl(var(--chart-1))" name="Your Org" radius={[4, 4, 0, 0]} />
                <Bar dataKey="industry" fill="hsl(var(--chart-3))" name={`${selectedIndustry} Avg`} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>FAIR Dimensions — Radar</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid className="opacity-30" />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis tickFormatter={formatCurrency} tick={{ fontSize: 9 }} />
                <Radar name="Your Org" dataKey="you" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.3} />
                <Radar name={selectedIndustry} dataKey="benchmark" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top quantified risks */}
      <Card>
        <CardHeader><CardTitle>Top Quantified Risks (by ALE)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : quantifiedRisks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No quantified risks. Add quantitative single loss and annual rate to your risks to see FAIR benchmarks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/50">
                    <th className="p-3 font-medium">Risk</th>
                    <th className="p-3 font-medium">SLE</th>
                    <th className="p-3 font-medium">ARO</th>
                    <th className="p-3 font-medium">ALE</th>
                    <th className="p-3 font-medium">Residual ALE</th>
                    <th className="p-3 font-medium">Reduction</th>
                  </tr>
                </thead>
                <tbody>
                  {quantifiedRisks.slice(0, 10).map(r => {
                    const reduction = r.annualized_loss_expectancy > 0
                      ? Math.round(((r.annualized_loss_expectancy - (r.residual_annualized_loss_expectancy || 0)) / r.annualized_loss_expectancy) * 100)
                      : 0;
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/30">
                        <td className="p-3 font-medium">{r.title}</td>
                        <td className="p-3 font-mono">{formatCurrency(r.quantitative_single_loss || 0)}</td>
                        <td className="p-3 font-mono">{r.quantitative_annual_rate || 0}/yr</td>
                        <td className="p-3 font-mono font-bold">{formatCurrency(r.annualized_loss_expectancy || 0)}</td>
                        <td className="p-3 font-mono">{formatCurrency(r.residual_annualized_loss_expectancy || 0)}</td>
                        <td className="p-3"><Badge variant={reduction > 50 ? "default" : "outline"} className="text-xs">{reduction}%</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}