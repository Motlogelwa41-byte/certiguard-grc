import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Server, CheckCircle, XCircle, AlertTriangle, Zap, TrendingDown, FileText, Brain, RefreshCw, Plus, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function parse(val) { try { return JSON.parse(val || "[]"); } catch { return []; } }

export default function AdaptiveScoping() {
  const [profiles, setProfiles] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [form, setForm] = useState({ title: "", framework_id: "", audit_type: "soc2_type2", analysis_period_days: 90 });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [profs, fws] = await Promise.all([
        base44.entities.AdaptiveScopeProfile.list('-created_date'),
        base44.entities.Framework.list()
      ]);
      setProfiles(profs || []);
      setFrameworks(fws || []);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load scope profiles", variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAnalyze = async () => {
    if (!form.title) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setAnalyzing(true);
    try {
      const fw = frameworks.find(f => f.id === form.framework_id);
      const res = await base44.functions.invoke("runAdaptiveScoping", {
        ...form,
        framework_name: fw?.name || ""
      });
      toast({ title: "Adaptive scoping complete", description: `${res.data?.summary?.in_scope || 0} systems in scope, ${res.data?.summary?.out_of_scope || 0} excluded` });
      setOpen(false);
      setForm({ title: "", framework_id: "", audit_type: "soc2_type2", analysis_period_days: 90 });
      load();
    } catch (e) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    }
    setAnalyzing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Adaptive Scoping"
        subtitle="Dynamically adjust audit scope based on actual system usage — reduce over-scoping and evidence burden"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> New Scope Analysis
          </Button>
        }
      />

      {/* How It Works */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground mb-1">How Adaptive Scoping Works</h3>
            <p className="text-sm text-muted-foreground">
              The engine analyzes IT asset usage signals — activity recency, linked controls, evidence freshness, security findings, and criticality —
              to recommend which systems should be in or out of audit scope. AI then generates prioritized recommendations and a risk assessment,
              so you only collect evidence for systems that actually matter.
            </p>
          </div>
        </div>
      </div>

      {/* Profile List */}
      {profiles.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground mb-1">No scope analyses yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first adaptive scope analysis to reduce audit over-scoping.</p>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> New Scope Analysis</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {profiles.map((p) => {
            const inScope = parse(p.in_scope_systems);
            const outScope = parse(p.out_of_scope_systems);
            const borderline = parse(p.borderline_systems);
            const recommendations = parse(p.scope_recommendations);
            const isExpanded = selectedProfile === p.id;

            return (
              <div key={p.id} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Profile Header */}
                <div className="p-5 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedProfile(isExpanded ? null : p.id)}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-foreground truncate">{p.title}</h3>
                        {p.analysis_status === 'completed' && <Badge className="bg-emerald-100 text-emerald-700 border-0">Completed</Badge>}
                        {p.analysis_status === 'analyzing' && <Badge className="bg-blue-100 text-blue-700 border-0">Analyzing</Badge>}
                        {p.analysis_status === 'applied' && <Badge className="bg-purple-100 text-purple-700 border-0">Applied</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {p.framework_name || 'No framework'} · {p.audit_type?.toUpperCase()} · {p.analysis_period_days}d period
                        {p.analysis_completed_at && ` · ${new Date(p.analysis_completed_at).toLocaleDateString("en-GB")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-2xl font-heading font-bold text-emerald-600 tabular-nums">{p.systems_in_scope || 0}</p>
                        <p className="text-xs text-muted-foreground">In Scope</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-heading font-bold text-red-500 tabular-nums">{p.systems_out_of_scope || 0}</p>
                        <p className="text-xs text-muted-foreground">Excluded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-heading font-bold text-amber-500 tabular-nums">{p.systems_borderline || 0}</p>
                        <p className="text-xs text-muted-foreground">Borderline</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-heading font-bold text-blue-600 tabular-nums">{p.scope_reduction_pct || 0}%</p>
                        <p className="text-xs text-muted-foreground">Reduction</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && p.analysis_status === 'completed' && (
                  <div className="border-t border-border">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 bg-muted/20">
                      <StatCard label="Systems Analyzed" value={p.total_systems_analyzed || 0} icon={Server} color="slate" />
                      <StatCard label="Evidence Saved" value={p.evidence_savings || 0} icon={TrendingDown} color="green" />
                      <StatCard label="Confidence Score" value={`${p.confidence_score || 0}%`} icon={Brain} color="blue" />
                      <StatCard label="Usage Data Points" value={p.usage_data_points || 0} icon={Zap} color="purple" />
                    </div>

                    {/* In-Scope Systems */}
                    <div className="p-5 border-t border-border">
                      <h4 className="font-heading font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> In Scope ({inScope.length})
                      </h4>
                      {inScope.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No systems recommended for scope inclusion.</p>
                      ) : (
                        <div className="space-y-2">
                          {inScope.slice(0, 10).map((s, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-muted-foreground">{s.environment}</span>
                                <Badge className="bg-emerald-100 text-emerald-700 border-0">{s.usage_score}/100</Badge>
                              </div>
                            </div>
                          ))}
                          {inScope.length > 10 && <p className="text-xs text-muted-foreground">+{inScope.length - 10} more...</p>}
                        </div>
                      )}
                    </div>

                    {/* Out-of-Scope Systems */}
                    <div className="p-5 border-t border-border">
                      <h4 className="font-heading font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                        <XCircle className="w-4 h-4" /> Excluded from Scope ({outScope.length})
                      </h4>
                      {outScope.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No systems recommended for exclusion.</p>
                      ) : (
                        <div className="space-y-2">
                          {outScope.slice(0, 10).map((s, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {s.days_inactive != null && <span className="text-xs text-muted-foreground">{s.days_inactive}d inactive</span>}
                                <Badge className="bg-red-100 text-red-600 border-0">{s.usage_score}/100</Badge>
                              </div>
                            </div>
                          ))}
                          {outScope.length > 10 && <p className="text-xs text-muted-foreground">+{outScope.length - 10} more...</p>}
                        </div>
                      )}
                    </div>

                    {/* Borderline Systems */}
                    {borderline.length > 0 && (
                      <div className="p-5 border-t border-border">
                        <h4 className="font-heading font-semibold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Borderline — Manual Review ({borderline.length})
                        </h4>
                        <div className="space-y-2">
                          {borderline.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{s.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{s.reason}</p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-700 border-0">{s.usage_score}/100</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Recommendations */}
                    {recommendations.length > 0 && (
                      <div className="p-5 border-t border-border">
                        <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Brain className="w-4 h-4 text-blue-500" /> AI Recommendations
                        </h4>
                        <div className="space-y-2">
                          {recommendations.map((r, i) => (
                            <div key={i} className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={
                                  r.priority === 'high' ? 'bg-red-100 text-red-700 border-0' :
                                  r.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-0' :
                                  'bg-slate-100 text-slate-600 border-0'
                                }>{r.priority}</Badge>
                                <p className="text-sm font-medium text-foreground">{r.recommendation}</p>
                              </div>
                              {r.impact && <p className="text-xs text-muted-foreground ml-1">Impact: {r.impact}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {p.risk_assessment && (
                      <div className="p-5 border-t border-border">
                        <h4 className="font-heading font-semibold text-foreground mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-500" /> Risk Assessment
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{p.risk_assessment}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Analysis Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Adaptive Scope Analysis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Analysis Title *</Label>
              <Input
                placeholder="e.g. SOC 2 Type II — Q4 2026 Adaptive Scope"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Framework (optional)</Label>
              <Select value={form.framework_id} onValueChange={(v) => setForm({ ...form, framework_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select framework" /></SelectTrigger>
                <SelectContent>
                  {frameworks.map(fw => <SelectItem key={fw.id} value={fw.id}>{fw.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Audit Type</Label>
                <Select value={form.audit_type} onValueChange={(v) => setForm({ ...form, audit_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soc2_type2">SOC 2 Type II</SelectItem>
                    <SelectItem value="soc2_type1">SOC 2 Type I</SelectItem>
                    <SelectItem value="iso27001">ISO 27001</SelectItem>
                    <SelectItem value="pci_dss">PCI DSS</SelectItem>
                    <SelectItem value="hipaa">HIPAA</SelectItem>
                    <SelectItem value="nist_csf">NIST CSF</SelectItem>
                    <SelectItem value="gdpr">GDPR</SelectItem>
                    <SelectItem value="popia">POPIA</SelectItem>
                    <SelectItem value="nis2">NIS2</SelectItem>
                    <SelectItem value="iso42001">ISO 42001</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Analysis Period (days)</Label>
                <Input
                  type="number"
                  value={form.analysis_period_days}
                  onChange={(e) => setForm({ ...form, analysis_period_days: parseInt(e.target.value) || 90 })}
                />
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
              The engine will analyze all IT assets, their usage signals (activity recency, linked controls, evidence, findings, criticality),
              and use AI to recommend which systems should be in or out of audit scope.
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Analyzing...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-1" /> Run Analysis</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}