import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingUp, TrendingDown, Calculator, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { useToast } from "@/components/ui/use-toast";

export default function CostOfComplianceModeler() {
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [annualComplianceCost, setAnnualComplianceCost] = useState(500000);
  const [avgBreachCost, setAvgBreachCost] = useState(1500000);
  const [breachProbabilityReduction, setBreachProbabilityReduction] = useState(60);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Risk.list("-risk_score", 200).catch(() => []),
      base44.entities.Control.list().catch(() => []),
    ]).then(([r, c]) => { setRisks(r); setControls(c); setLoading(false); });
  }, []);

  const metrics = useMemo(() => {
    // Total ALE from quantified risks
    const totalALE = risks.reduce((sum, r) => sum + (r.annualized_loss_expectancy || 0), 0);
    const totalSLE = risks.reduce((sum, r) => sum + (r.quantitative_single_loss || 0), 0);
    const totalResidualALE = risks.reduce((sum, r) => sum + (r.residual_annualized_loss_expectancy || 0), 0);
    const aleReduction = totalALE - totalResidualALE;

    // ROI calculation
    // Expected loss without compliance = avgBreachCost * breachProbability (assume 15% baseline)
    const baselineBreachProb = 0.15;
    const expectedLossWithout = avgBreachCost * baselineBreachProb;
    const reducedBreachProb = baselineBreachProb * (1 - breachProbabilityReduction / 100);
    const expectedLossWith = avgBreachCost * reducedBreachProb;
    const lossAvoided = expectedLossWithout - expectedLossWith;
    const netBenefit = lossAvoided - annualComplianceCost;
    const roi = annualComplianceCost > 0 ? Math.round((netBenefit / annualComplianceCost) * 100) : 0;

    // Fine avoidance (estimated regulatory fine for non-compliance)
    const estimatedFine = avgBreachCost * 0.4; // typical regulatory fine is ~40% of breach cost
    const totalRiskMitigationValue = lossAvoided + (estimatedFine * breachProbabilityReduction / 100);

    return {
      totalALE, totalSLE, totalResidualALE, aleReduction,
      expectedLossWithout, expectedLossWith, lossAvoided,
      annualComplianceCost, netBenefit, roi,
      estimatedFine, totalRiskMitigationValue,
      controlCount: controls.length,
      passingControls: controls.filter((c) => c.status === "passing").length,
    };
  }, [risks, controls, annualComplianceCost, avgBreachCost, breachProbabilityReduction]);

  // Chart data: Cost vs Benefit comparison
  const comparisonData = [
    { name: "Annual Compliance Cost", value: metrics.annualComplianceCost, color: "#3b82f6" },
    { name: "Expected Loss (No Controls)", value: metrics.expectedLossWithout, color: "#ef4444" },
    { name: "Expected Loss (With Controls)", value: metrics.expectedLossWith, color: "#f59e0b" },
    { name: "Loss Avoided", value: metrics.lossAvoided, color: "#10b981" },
  ];

  // ROI over 3 years (projecting cumulative benefit vs cost)
  const roiData = useMemo(() => {
    const data = [];
    for (let year = 0; year <= 3; year++) {
      const cumulativeCost = metrics.annualComplianceCost * year;
      const cumulativeBenefit = metrics.lossAvoided * year;
      data.push({ year: `Year ${year}`, cost: cumulativeCost, benefit: cumulativeBenefit, net: cumulativeBenefit - cumulativeCost });
    }
    return data;
  }, [metrics]);

  // ALE breakdown by risk
  const aleByRisk = useMemo(() => risks.filter((r) => r.annualized_loss_expectancy > 0).sort((a, b) => b.annualized_loss_expectancy - a.annualized_loss_expectancy).slice(0, 8).map((r) => ({ name: r.title?.slice(0, 25) + "...", inherent: r.annualized_loss_expectancy || 0, residual: r.residual_annualized_loss_expectancy || 0 })), [risks]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Cost of Compliance & Risk Loss-Expectancy Modeler" subtitle="Calculate ROI of proactive control implementations vs potential regulatory fines and breach costs" />

      {/* Input Controls */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Annual Compliance Cost (ZAR)</Label><Input type="number" value={annualComplianceCost} onChange={(e) => setAnnualComplianceCost(Number(e.target.value) || 0)} /></div>
          <div><Label>Avg. Breach Cost (ZAR)</Label><Input type="number" value={avgBreachCost} onChange={(e) => setAvgBreachCost(Number(e.target.value) || 0)} /></div>
          <div><Label>Breach Probability Reduction (%)</Label><Input type="number" min="0" max="100" value={breachProbabilityReduction} onChange={(e) => setBreachProbabilityReduction(Number(e.target.value) || 0)} /></div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><DollarSign className="w-5 h-5 text-blue-500 mb-2" /><p className="text-xl font-bold text-foreground">R{metrics.annualComplianceCost.toLocaleString()}</p><p className="text-xs text-muted-foreground">Annual Compliance Cost</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><TrendingDown className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-xl font-bold text-foreground">R{Math.round(metrics.lossAvoided).toLocaleString()}</p><p className="text-xs text-muted-foreground">Annual Loss Avoided</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Calculator className="w-5 h-5 text-primary mb-2" /><p className="text-xl font-bold text-foreground">R{Math.round(metrics.netBenefit).toLocaleString()}</p><p className="text-xs text-muted-foreground">Net Benefit</p></div>
        <div className={`bg-card rounded-xl border p-4 ${metrics.roi >= 0 ? "border-emerald-300" : "border-red-300"}`}>
          <TrendingUp className={`w-5 h-5 mb-2 ${metrics.roi >= 0 ? "text-emerald-500" : "text-red-500"}`} />
          <p className={`text-xl font-bold ${metrics.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>{metrics.roi}%</p>
          <p className="text-xs text-muted-foreground">Compliance ROI</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-3">Cost vs. Benefit Comparison</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v) => `R${v.toLocaleString()}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-3">3-Year Cumulative ROI Projection</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={roiData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `R${v.toLocaleString()}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} name="Cumulative Cost" />
              <Line type="monotone" dataKey="benefit" stroke="#10b981" strokeWidth={2} name="Cumulative Benefit" />
              <Line type="monotone" dataKey="net" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" name="Net Position" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ALE Breakdown */}
      {aleByRisk.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-3">Inherent vs. Residual ALE by Risk</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aleByRisk}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => `R${v.toLocaleString()}`} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="inherent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Inherent ALE" />
              <Bar dataKey="residual" fill="#10b981" radius={[4, 4, 0, 0]} name="Residual ALE" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Insight */}
      <div className={`rounded-xl border p-5 ${metrics.roi >= 0 ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
        <div className="flex items-start gap-3">
          <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${metrics.roi >= 0 ? "text-emerald-600" : "text-red-600"}`} />
          <div>
            <h3 className={`font-heading font-semibold mb-1 ${metrics.roi >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>Compliance Investment Analysis</h3>
            <p className="text-sm text-foreground">
              Your annual compliance investment of <strong>R{metrics.annualComplianceCost.toLocaleString()}</strong> is projected to avoid <strong>R{Math.round(metrics.lossAvoided).toLocaleString()}</strong> in annual breach losses
              {metrics.aleReduction > 0 && <> and reduce ALE by <strong>R{Math.round(metrics.aleReduction).toLocaleString()}</strong></>}.
              The net benefit is <strong className={metrics.roi >= 0 ? "text-emerald-600" : "text-red-600"}>R{Math.round(metrics.netBenefit).toLocaleString()}</strong> ({metrics.roi}% ROI).
              {metrics.roi >= 0 ? " This investment is financially justified — proactive controls are delivering positive returns." : " Consider increasing control coverage or optimizing compliance spend to improve ROI."}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Based on {metrics.controlCount} controls ({metrics.passingControls} passing) and {risks.length} registered risks. Adjust the input parameters above to model different scenarios.</p>
          </div>
        </div>
      </div>
    </div>
  );
}