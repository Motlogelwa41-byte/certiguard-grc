import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Calculator, Plus, Edit2, Trash2, Zap, Copy, Check, Layers,
  TrendingUp, AlertTriangle, Shield
} from "lucide-react";

const REGISTER_TYPES = [
  { value: "operational", label: "Operational Risk" },
  { value: "technical", label: "Technical/Cyber Risk" },
  { value: "compliance", label: "Compliance Risk" },
  { value: "financial", label: "Financial Risk" },
  { value: "strategic", label: "Strategic Risk" },
  { value: "reputational", label: "Reputational Risk" },
  { value: "third_party", label: "Third-Party/Vendor Risk" },
  { value: "emerging", label: "Emerging Risk" },
  { value: "all", label: "All Registers (Universal)" }
];

const SCORING_METHODS = [
  { value: "qualitative_matrix", label: "Qualitative Matrix (L×I)" },
  { value: "weighted_formula", label: "Weighted Formula" },
  { value: "fair_model", label: "FAIR Model (Quantitative)" },
  { value: "cvss_style", label: "CVSS-Style Weighted" },
  { value: "custom", label: "Custom" }
];

export default function RiskScoringModels() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [applying, setApplying] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [form, setForm] = useState({
    model_id: "",
    name: "",
    description: "",
    register_type: "all",
    scoring_method: "qualitative_matrix",
    likelihood_weight: 1,
    impact_weight: 1,
    velocity_weight: 0,
    control_effectiveness_weight: 0,
    financial_impact_weight: 0,
    max_score: 25,
    threshold_low: 5,
    threshold_medium: 10,
    threshold_high: 15,
    threshold_critical: 20,
    use_control_reduction: false,
    formula_description: "",
    is_default: false,
    status: "active"
  });

  const loadModels = useCallback(async () => {
    try {
      const data = await base44.functions.calculateRiskScoreWithModel({ action: "list_models" });
      setModels(data.models || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load scoring models", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadModels(); }, [loadModels]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      model_id: `RSM-${Date.now().toString().slice(-6)}`,
      name: "",
      description: "",
      register_type: "all",
      scoring_method: "qualitative_matrix",
      likelihood_weight: 1,
      impact_weight: 1,
      velocity_weight: 0,
      control_effectiveness_weight: 0,
      financial_impact_weight: 0,
      max_score: 25,
      threshold_low: 5,
      threshold_medium: 10,
      threshold_high: 15,
      threshold_critical: 20,
      use_control_reduction: false,
      formula_description: "",
      is_default: false,
      status: "active"
    });
    setShowDialog(true);
  };

  const openEdit = (model) => {
    setEditing(model);
    setForm({ ...model });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await base44.entities.RiskScoringModel.update(editing.id, form);
        toast({ title: "Model updated" });
      } else {
        await base44.entities.RiskScoringModel.create(form);
        toast({ title: "Model created" });
      }
      setShowDialog(false);
      loadModels();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (model) => {
    if (!confirm(`Delete "${model.name}"?`)) return;
    await base44.entities.RiskScoringModel.delete(model.id);
    toast({ title: "Model deleted" });
    loadModels();
  };

  const applyToAll = async (model) => {
    setApplying(model.id);
    try {
      const result = await base44.functions.calculateRiskScoreWithModel({
        action: "apply_to_all",
        model_id: model.id
      });
      toast({ title: `Applied to ${result.updated} risks`, description: `All ${model.register_type} risks re-scored using "${model.name}"` });
      loadModels();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setApplying(null);
    }
  };

  const previewModel = async () => {
    setPreviewing(true);
    setPreviewResult(null);
    try {
      const result = await base44.functions.calculateRiskScoreWithModel({
        action: "preview",
        risk_data: { likelihood: 4, impact: 5, velocity: 3, control_effectiveness_pct: 60, annualized_loss_expectancy: 250000 },
        model_id: editing ? editing.id : null
      });
      setPreviewResult(result);
    } catch (err) {
      toast({ title: "Preview error", description: "Save the model first to preview", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const getRegisterLabel = (val) => REGISTER_TYPES.find(r => r.value === val)?.label || val;
  const getMethodLabel = (val) => SCORING_METHODS.find(m => m.value === val)?.label || val;

  const gradeColor = (grade) => {
    const map = { critical: "bg-red-500/10 text-red-400 border-red-500/20", high: "bg-orange-500/10 text-orange-400 border-orange-500/20", medium: "bg-amber-500/10 text-amber-400 border-amber-500/20", low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", minimal: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    return map[grade] || map.minimal;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Custom Risk Scoring Models"
        subtitle="Configure different scoring formulas per risk register — cyber, vendor, operational, and more"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />New Model</Button>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active Models" value={models.filter(m => m.status === "active").length} icon={Calculator} color="blue" />
        <StatCard label="Register Types Covered" value={new Set(models.map(m => m.register_type)).size} icon={Layers} color="purple" />
        <StatCard label="Default Models" value={models.filter(m => m.is_default).length} icon={Check} color="green" />
        <StatCard label="Risks Scored" value={models.reduce((sum, m) => sum + (m.applied_risk_count || 0), 0)} icon={TrendingUp} color="amber" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calculator className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">No scoring models configured yet.</p>
            <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Create your first model</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {models.map(model => (
            <Card key={model.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {model.name}
                      {model.is_default && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Default</Badge>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{model.description || "No description"}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(model)}><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(model)}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{getRegisterLabel(model.register_type)}</Badge>
                  <Badge variant="outline">{getMethodLabel(model.scoring_method)}</Badge>
                  <Badge variant="outline">Max: {model.max_score}</Badge>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Likelihood</p>
                    <p className="font-semibold">{model.likelihood_weight}×</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Impact</p>
                    <p className="font-semibold">{model.impact_weight}×</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Velocity</p>
                    <p className="font-semibold">{model.velocity_weight}×</p>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <p className="text-muted-foreground">Control</p>
                    <p className="font-semibold">{model.control_effectiveness_weight}×</p>
                  </div>
                </div>
                {model.formula_description && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{model.formula_description}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">{model.applied_risk_count || 0} risks scored</span>
                  <Button size="sm" onClick={() => applyToAll(model)} disabled={applying === model.id}>
                    {applying === model.id ? (
                      <><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />Applying...</>
                    ) : (
                      <><Zap className="w-3.5 h-3.5 mr-1.5" />Apply to All</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Scoring Model" : "New Scoring Model"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Model Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Cyber Risk Scoring Model" />
              </div>
              <div>
                <Label>Register Type</Label>
                <Select value={form.register_type} onValueChange={v => setForm({ ...form, register_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGISTER_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What this model scores and why" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scoring Method</Label>
                <Select value={form.scoring_method} onValueChange={v => setForm({ ...form, scoring_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCORING_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Max Score</Label>
                <Input type="number" value={form.max_score} onChange={e => setForm({ ...form, max_score: Number(e.target.value) })} />
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-semibold">Component Weights</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Likelihood Weight</Label>
                  <Input type="number" step="0.1" value={form.likelihood_weight} onChange={e => setForm({ ...form, likelihood_weight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Impact Weight</Label>
                  <Input type="number" step="0.1" value={form.impact_weight} onChange={e => setForm({ ...form, impact_weight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Velocity Weight</Label>
                  <Input type="number" step="0.1" value={form.velocity_weight} onChange={e => setForm({ ...form, velocity_weight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Control Effectiveness Weight</Label>
                  <Input type="number" step="0.1" value={form.control_effectiveness_weight} onChange={e => setForm({ ...form, control_effectiveness_weight: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Financial Impact (ALE) Weight</Label>
                  <Input type="number" step="0.1" value={form.financial_impact_weight} onChange={e => setForm({ ...form, financial_impact_weight: Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Switch checked={form.use_control_reduction} onCheckedChange={v => setForm({ ...form, use_control_reduction: v })} />
                <Label>Apply control effectiveness as residual reduction</Label>
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-semibold">Classification Thresholds</p>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <Label>Low ≥</Label>
                  <Input type="number" value={form.threshold_low} onChange={e => setForm({ ...form, threshold_low: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Medium ≥</Label>
                  <Input type="number" value={form.threshold_medium} onChange={e => setForm({ ...form, threshold_medium: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>High ≥</Label>
                  <Input type="number" value={form.threshold_high} onChange={e => setForm({ ...form, threshold_high: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Critical ≥</Label>
                  <Input type="number" value={form.threshold_critical} onChange={e => setForm({ ...form, threshold_critical: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <div>
              <Label>Formula Description (human-readable)</Label>
              <Textarea value={form.formula_description} onChange={e => setForm({ ...form, formula_description: e.target.value })} rows={2} placeholder="e.g. Score = (L×1.2) + (I×1.5) + (V×0.3), reduced by control effectiveness" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
              <Label>Set as default for this register type</Label>
            </div>
            {previewResult && (
              <div className="rounded-lg border border-border p-4 bg-muted/30">
                <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Calculator className="w-4 h-4" />Preview (L=4, I=5, V=3, Ctrl=60%, ALE=250K)</p>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold">{previewResult.score?.toFixed(1)}</span>
                  <Badge className={gradeColor(previewResult.grade)}>{previewResult.grade}</Badge>
                  <Badge variant="outline">{previewResult.band}</Badge>
                </div>
                {previewResult.breakdown && (
                  <pre className="text-xs text-muted-foreground mt-2 overflow-x-auto">{JSON.stringify(previewResult.breakdown, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {editing && <Button variant="outline" onClick={previewModel} disabled={previewing}><Calculator className="w-4 h-4 mr-2" />{previewing ? "Calculating..." : "Preview"}</Button>}
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}