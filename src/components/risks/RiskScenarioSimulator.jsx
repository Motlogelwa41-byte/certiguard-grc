import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Play, Loader2, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";

const SCENARIOS = {
  data_breach: {
    label: "Data Breach",
    description: "Simulate a personal data breach exposing customer records.",
    defaultSLE: 2500000,
    defaultARO: 0.3,
    defaultImpact: 5,
    defaultLikelihood: 3,
  },
  supply_chain: {
    label: "Supply Chain Disruption",
    description: "Simulate a critical vendor supply chain failure.",
    defaultSLE: 1500000,
    defaultARO: 0.4,
    defaultImpact: 4,
    defaultLikelihood: 3,
  },
  ransomware: {
    label: "Ransomware Attack",
    description: "Simulate a ransomware encryption event with downtime.",
    defaultSLE: 3000000,
    defaultARO: 0.25,
    defaultImpact: 5,
    defaultLikelihood: 2,
  },
  insider_threat: {
    label: "Insider Threat",
    description: "Simulate a malicious insider data exfiltration event.",
    defaultSLE: 1000000,
    defaultARO: 0.15,
    defaultImpact: 4,
    defaultLikelihood: 2,
  },
  regulatory_fine: {
    label: "Regulatory Enforcement",
    description: "Simulate a POPIA/GDPR regulatory fine for non-compliance.",
    defaultSLE: 5000000,
    defaultARO: 0.1,
    defaultImpact: 4,
    defaultLikelihood: 2,
  },
};

const ZONE = (score) => {
  if (score >= 20) return { label: "Critical", color: "text-red-600", bg: "bg-red-50 border-red-200" };
  if (score >= 12) return { label: "High", color: "text-orange-600", bg: "bg-orange-50 border-orange-200" };
  if (score >= 6) return { label: "Medium", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" };
  return { label: "Low", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
};

export default function RiskScenarioSimulator({ open, onOpenChange }) {
  const { toast } = useToast();
  const [scenario, setScenario] = useState("data_breach");
  const [likelihood, setLikelihood] = useState(3);
  const [impact, setImpact] = useState(5);
  const [sle, setSle] = useState(2500000);
  const [aro, setAro] = useState(0.3);
  const [mitigationReduction, setMitigationReduction] = useState(40);
  const [saving, setSaving] = useState(false);

  const config = SCENARIOS[scenario];

  const onScenarioChange = (key) => {
    const s = SCENARIOS[key];
    setScenario(key);
    setLikelihood(s.defaultLikelihood);
    setImpact(s.defaultImpact);
    setSle(s.defaultSLE);
    setAro(s.defaultARO);
  };

  const inherentALE = useMemo(() => Math.round(sle * aro), [sle, aro]);
  const residualSLE = useMemo(() => Math.round(sle * (1 - mitigationReduction / 100)), [sle, mitigationReduction]);
  const residualARO = useMemo(() => Math.round(aro * (1 - mitigationReduction / 100) * 100) / 100, [aro, mitigationReduction]);
  const residualALE = useMemo(() => Math.round(residualSLE * residualARO), [residualSLE, residualARO]);
  const inherentScore = likelihood * impact;
  const residualScore = Math.max(1, Math.round(inherentScore * (1 - mitigationReduction / 100)));
  const inherentZone = ZONE(inherentScore);
  const residualZone = ZONE(residualScore);
  const aleReduction = inherentALE - residualALE;

  const saveAsRisk = async () => {
    setSaving(true);
    try {
      await base44.entities.Risk.create({
        title: `[Simulated] ${config.label}`,
        description: `What-if scenario: ${config.description} | Inherent ALE: R${inherentALE.toLocaleString()} → Residual ALE: R${residualALE.toLocaleString()} (${mitigationReduction}% mitigation)`,
        likelihood,
        impact,
        risk_score: inherentScore,
        quantitative_single_loss: sle,
        quantitative_annual_rate: aro,
        annualized_loss_expectancy: inherentALE,
        residual_financial_impact: residualSLE,
        residual_likelihood_pct: Math.round(residualARO * 100),
        residual_annualized_loss_expectancy: residualALE,
        category: "operational",
        status: "open",
        treatment: "mitigate",
        mitigation_plan: `Simulated ${mitigationReduction}% mitigation effectiveness. Review and adjust based on actual control implementation.`,
      });
      toast({ title: "Scenario saved as risk", description: "Find it in the Risk Register for further tracking." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Predictive Risk Scenario Simulator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Scenario Type</Label>
            <Select value={scenario} onValueChange={onScenarioChange}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(SCENARIOS).map(([key, s]) => (
                  <SelectItem key={key} value={key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Likelihood (1-5): {likelihood}</Label>
              <input type="range" min="1" max="5" value={likelihood} onChange={(e) => setLikelihood(+e.target.value)} className="w-full accent-primary" />
            </div>
            <div>
              <Label className="mb-1.5 block">Impact (1-5): {impact}</Label>
              <input type="range" min="1" max="5" value={impact} onChange={(e) => setImpact(+e.target.value)} className="w-full accent-primary" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block">Single Loss Expectancy (R)</Label>
              <Input type="number" value={sle} onChange={(e) => setSle(+e.target.value)} step={100000} />
            </div>
            <div>
              <Label className="mb-1.5 block">Annual Rate of Occurrence</Label>
              <Input type="number" value={aro} onChange={(e) => setAro(+e.target.value)} step={0.05} min="0" />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block">Mitigation Effectiveness: {mitigationReduction}%</Label>
            <input type="range" min="0" max="90" value={mitigationReduction} onChange={(e) => setMitigationReduction(+e.target.value)} className="w-full accent-primary" />
            <p className="text-xs text-muted-foreground mt-1">Simulate how much a control investment would reduce both likelihood and impact.</p>
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl border p-4 ${inherentZone.bg}`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Inherent Exposure</p>
              <p className={`text-2xl font-bold ${inherentZone.color}`}>R {inherentALE.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">ALE = SLE × ARO</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/60">Score: {inherentScore}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${inherentZone.color}`}>{inherentZone.label}</span>
              </div>
            </div>
            <div className={`rounded-xl border p-4 ${residualZone.bg}`}>
              <p className="text-xs font-medium text-muted-foreground mb-1">Residual Exposure</p>
              <p className={`text-2xl font-bold ${residualZone.color}`}>R {residualALE.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">After {mitigationReduction}% mitigation</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/60">Score: {residualScore}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 ${residualZone.color}`}>{residualZone.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <p className="text-sm text-emerald-700">
              <strong>R {aleReduction.toLocaleString()}</strong> annual loss exposure reduction with {mitigationReduction}% mitigation effectiveness.
            </p>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={saveAsRisk} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
            Save as Risk Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}