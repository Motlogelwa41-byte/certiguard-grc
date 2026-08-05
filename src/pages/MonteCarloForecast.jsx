import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, Play, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar } from "recharts";

// ── Monte Carlo Simulation Engine ──
// Samples from Poisson(frequency) × LogNormal(impact) for each risk,
// aggregates total loss across N iterations, and projects over time horizons.

function poissonRandom(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function logNormalRandom(median, sigma = 0.5) {
  const mu = Math.log(Math.max(median, 1));
  const z = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / Math.sqrt(0.5);
  return Math.exp(mu + sigma * z);
}

function runSimulation(risks, iterations, mitigationVelocity) {
  // mitigationVelocity = % reduction per quarter (e.g., 0.05 = 5%)
  const validRisks = risks.filter((r) => r.quantitative_single_loss && r.quantitative_annual_rate);
  if (validRisks.length === 0) return null;

  const losses = [];
  for (let i = 0; i < iterations; i++) {
    let totalLoss = 0;
    for (const r of validRisks) {
      const freq = poissonRandom(r.quantitative_annual_rate);
      for (let e = 0; e < freq; e++) {
        totalLoss += logNormalRandom(r.quantitative_single_loss, 0.6);
      }
    }
    losses.push(totalLoss);
  }
  losses.sort((a, b) => a - b);

  const percentile = (p) => losses[Math.floor(p * losses.length)];
  const mean = losses.reduce((s, v) => s + v, 0) / losses.length;

  // Project over 12, 24, 36 months (quarterly steps)
  const months = [12, 24, 36];
  const trajectories = {};
  for (const m of months) {
    const quarters = m / 3;
    const factor = Math.pow(1 - mitigationVelocity, quarters);
    trajectories[`${m}m`] = {
      p50: percentile(0.5) * factor,
      p90: percentile(0.9) * factor,
      p95: percentile(0.95) * factor,
      mean: mean * factor,
    };
  }

  // Monthly projection for chart (0 to 36 months)
  const monthlyData = [];
  for (let mo = 0; mo <= 36; mo++) {
    const quarters = mo / 3;
    const factor = Math.pow(1 - mitigationVelocity, quarters);
    monthlyData.push({
      month: mo,
      P50: Math.round(percentile(0.5) * factor),
      P90: Math.round(percentile(0.9) * factor),
      P95: Math.round(percentile(0.95) * factor),
    });
  }

  // Histogram bins for loss distribution
  const numBins = 20;
  const minLoss = losses[0];
  const maxLoss = losses[losses.length - 1];
  const binSize = (maxLoss - minLoss) / numBins || 1;
  const histogram = [];
  for (let b = 0; b < numBins; b++) {
    const binStart = minLoss + b * binSize;
    const binEnd = binStart + binSize;
    const count = losses.filter((v) => v >= binStart && v < binEnd).length;
    histogram.push({
      bin: `${Math.round(binStart / 1000)}k`,
      count,
    });
  }

  return { losses, mean, p50: percentile(0.5), p90: percentile(0.9), p95: percentile(0.95), trajectories, monthlyData, histogram, iterations };
}

export default function MonteCarloForecast() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState(5000);
  const [mitigationVelocity, setMitigationVelocity] = useState(0.05);
  const [result, setResult] = useState(null);
  const [horizon, setHorizon] = useState("12m");
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Risk.list("-risk_score", 200).then((d) => { setRisks(d); setLoading(false); });
  }, []);

  const quantifiableRisks = useMemo(() => risks.filter((r) => r.quantitative_single_loss && r.quantitative_annual_rate), [risks]);

  const handleRun = async () => {
    setRunning(true);
    // Defer to allow UI to update
    await new Promise((r) => setTimeout(r, 100));
    try {
      const sim = runSimulation(quantifiableRisks, iterations, mitigationVelocity);
      setResult(sim);
      if (!sim) toast({ title: "No quantifiable risks", description: "Add single loss and annual rate values to risks first.", variant: "destructive" });
    } catch (e) {
      toast({ title: "Simulation failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const fmt = (v) => v != null ? `$${Math.round(v).toLocaleString()}` : "—";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Predictive Risk Forecasting"
        subtitle="Monte Carlo simulation projecting financial loss exposure over 12/24/36-month horizons"
        actions={<Button size="sm" onClick={handleRun} disabled={running || quantifiableRisks.length === 0}><Play className="w-4 h-4 mr-1" /> {running ? "Simulating..." : "Run Simulation"}</Button>}
      />

      {/* Controls */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div><Label>Iterations</Label>
            <Select value={String(iterations)} onValueChange={(v) => setIterations(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="1000">1,000</SelectItem><SelectItem value="5000">5,000</SelectItem><SelectItem value="10000">10,000</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Mitigation Velocity (%/quarter)</Label><Input type="number" step="0.01" min="0" max="0.5" value={mitigationVelocity} onChange={(e) => setMitigationVelocity(Number(e.target.value) || 0)} /></div>
          <div><Label>Forecast Horizon</Label>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="12m">12 Months</SelectItem><SelectItem value="24m">24 Months</SelectItem><SelectItem value="36m">36 Months</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{quantifiableRisks.length}</span> of {risks.length} risks have quantitative data (SLE + ARO)
          </div>
        </div>
      </div>

      {quantifiableRisks.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-sm text-amber-700 dark:text-amber-400">
          No risks have quantitative financial data. Add <strong>Quantitative Single Loss</strong> and <strong>Annual Rate</strong> values to your risks to run the Monte Carlo simulation.
        </div>
      )}

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-card rounded-xl border border-border p-4"><DollarSign className="w-5 h-5 text-primary mb-2" /><p className="text-xl font-bold text-foreground">{fmt(result.mean)}</p><p className="text-xs text-muted-foreground">Mean Annual Loss</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><Activity className="w-5 h-5 text-amber-500 mb-2" /><p className="text-xl font-bold text-foreground">{fmt(result.p50)}</p><p className="text-xs text-muted-foreground">P50 (Median)</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><TrendingDown className="w-5 h-5 text-orange-500 mb-2" /><p className="text-xl font-bold text-foreground">{fmt(result.p90)}</p><p className="text-xs text-muted-foreground">P90 (Likely Worst)</p></div>
            <div className="bg-card rounded-xl border border-border p-4"><TrendingDown className="w-5 h-5 text-red-500 mb-2" /><p className="text-xl font-bold text-foreground">{fmt(result.p95)}</p><p className="text-xs text-muted-foreground">P95 (Tail Risk)</p></div>
          </div>

          {/* Horizon Projection */}
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-1">Loss Exposure Trajectory</h3>
            <p className="text-xs text-muted-foreground mb-4">Projected P50/P90/P95 loss over 36 months at {((mitigationVelocity || 0) * 100).toFixed(1)}% quarterly mitigation velocity</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={result.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: "Months", position: "insideBottom", offset: -5, fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} labelFormatter={(l) => `Month ${l}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <ReferenceLine x={12} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: "12mo", fontSize: 10, fill: "#3b82f6" }} />
                <ReferenceLine x={24} stroke="#8b5cf6" strokeDasharray="5 5" label={{ value: "24mo", fontSize: 10, fill: "#8b5cf6" }} />
                <ReferenceLine x={36} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "36mo", fontSize: 10, fill: "#ef4444" }} />
                <Line type="monotone" dataKey="P50" stroke="#10b981" strokeWidth={2} dot={false} name="P50 (Median)" />
                <Line type="monotone" dataKey="P90" stroke="#f59e0b" strokeWidth={2} dot={false} name="P90" />
                <Line type="monotone" dataKey="P95" stroke="#ef4444" strokeWidth={2} dot={false} name="P95 (Tail)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Horizon Summary + Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-heading font-semibold text-foreground mb-3">Horizon Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="text-left pb-2">Horizon</th><th className="text-right pb-2">P50</th><th className="text-right pb-2">P90</th><th className="text-right pb-2">P95</th></tr></thead>
                  <tbody>
                    {Object.entries(result.trajectories).map(([k, v]) => (
                      <tr key={k} className={`border-b border-border/50 ${horizon === k ? "bg-primary/5" : ""}`}>
                        <td className="py-2 font-semibold">{k}</td>
                        <td className="text-right py-2">{fmt(v.p50)}</td>
                        <td className="text-right py-2">{fmt(v.p90)}</td>
                        <td className="text-right py-2">{fmt(v.p95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-heading font-semibold text-foreground mb-3">Loss Distribution Histogram</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.histogram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2">{result.iterations.toLocaleString()} iterations simulated across {quantifiableRisks.length} quantified risks</p>
            </div>
          </div>
        </>
      )}

      {!result && quantifiableRisks.length > 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-primary/40" />
          <p className="font-semibold text-foreground">Ready to simulate</p>
          <p className="text-sm mt-1">Click "Run Simulation" to project loss exposure across {quantifiableRisks.length} quantified risks.</p>
        </div>
      )}
    </div>
  );
}