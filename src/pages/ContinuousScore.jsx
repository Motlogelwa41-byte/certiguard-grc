import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Gauge, TrendingDown, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

const gradeColors = {
  "A+": "text-emerald-500", A: "text-emerald-500", B: "text-blue-500",
  C: "text-amber-500", D: "text-orange-500", E: "text-red-500", F: "text-red-600",
};

export default function ContinuousScore() {
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();

  const calculate = useCallback(async () => {
    setCalculating(true);
    try {
      const res = await base44.functions.invoke("calculateComplianceScore", {});
      const data = res?.data || res;
      setScore(data);
    } catch (e) {
      toast({ title: "Failed to calculate score", description: e.message, variant: "destructive" });
    } finally {
      setCalculating(false);
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { calculate(); }, [calculate]);

  const scorePct = score?.score ?? 0;
  const circumference = 2 * Math.PI * 80;
  const offset = circumference - (scorePct / 100) * circumference;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Continuous Compliance Score"
        subtitle="Real-time weighted compliance posture across controls, evidence, tests, findings, and risks"
        actions={<Button onClick={calculate} disabled={calculating} variant="default">
          <RefreshCw className={`h-4 w-4 mr-2 ${calculating ? "animate-spin" : ""}`} />
          {calculating ? "Calculating..." : "Recalculate"}
        </Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : score ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Score Gauge */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" /> Compliance Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--primary))" strokeWidth="12"
                      strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                      className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold font-heading">{score.score}</span>
                    <span className={`text-2xl font-bold ${gradeColors[score.grade] || "text-foreground"}`}>{score.grade}</span>
                  </div>
                </div>
                {score.penalty > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
                    <TrendingDown className="h-4 w-4" />
                    <span>Raw: {score.rawScore} · Penalty: -{score.penalty} (open findings)</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Component Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Score Components</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: "controls", label: "Control Pass Rate", icon: ShieldCheck, color: "bg-blue-500" },
                  { key: "evidence", label: "Evidence Coverage", icon: CheckCircle2, color: "bg-emerald-500" },
                  { key: "tests", label: "Test Pass Rate", icon: Gauge, color: "bg-purple-500" },
                  { key: "findings", label: "Finding Resolution", icon: AlertTriangle, color: "bg-amber-500" },
                  { key: "risks", label: "Risk Mitigation", icon: ShieldCheck, color: "bg-cyan-500" },
                ].map(({ key, label, icon: Icon, color }) => {
                  const c = score.components[key];
                  if (!c) return null;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {label}
                          <Badge variant="outline" className="text-xs">Weight: {c.weight}%</Badge>
                        </div>
                        <span className="text-sm font-bold">{c.score}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${c.score}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {key === "controls" && `${c.passing}/${c.total} controls passing`}
                        {key === "evidence" && `${c.approved}/${c.total} evidence approved`}
                        {key === "tests" && `${c.passed}/${c.total} tests passed`}
                        {key === "findings" && `${c.resolved}/${c.total} resolved · ${c.open} open`}
                        {key === "risks" && `${c.mitigated}/${c.total} mitigated`}
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Policies Published</span>
                    <span className="font-medium">{score.components.policies?.published}/{score.components.policies?.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Finding Penalty Detail */}
          {(score.criticalOpenFindings > 0 || score.highOpenFindings > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Finding Penalty Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard label="Critical Open" value={score.criticalOpenFindings} icon={AlertTriangle} color="text-red-500" />
                  <StatCard label="High Open" value={score.highOpenFindings} icon={AlertTriangle} color="text-orange-500" />
                  <StatCard label="Total Penalty" value={`-${score.penalty}`} icon={TrendingDown} color="text-amber-500" />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Penalty: min(20, critical × 5 + high × 2). Critical open findings deduct 5 points each; high deduct 2 each, capped at 20.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground">No score data available.</div>
      )}
    </div>
  );
}