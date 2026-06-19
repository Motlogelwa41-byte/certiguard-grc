import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileSearch, Plus, Pencil, Trash2, Brain, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { title: "", framework_name: "", description: "", status: "draft", total_gaps: 0, critical_gaps: 0, high_gaps: 0, medium_gaps: 0, low_gaps: 0, remediation_plan: "", assigned_to: "", target_date: "", findings: "" };

export default function GapAnalysisPage() {
  const [items, setItems] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [running, setRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const { toast } = useToast();

  const load = () => {
    Promise.all([
      base44.entities.GapAnalysis.list(),
      base44.entities.Framework.list()
    ]).then(([g, f]) => { setItems(g); setFrameworks(f); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const runAIGapAnalysis = async () => {
    if (!form.framework_name) { toast({ title: "Select a framework first", variant: "destructive" }); return; }
    setRunning(true);
    setAiResult(null);
    try {
      const framework = frameworks.find(f => f.name === form.framework_name);
      const controls = await base44.entities.Control.list();
      const frameworkControls = controls.filter(c => c.framework_names?.includes(form.framework_name) || c.framework_names?.includes(framework?.name));
      const prompt = `You are a GRC compliance auditor. Perform a gap analysis on the following:
Framework: ${form.framework_name}
Description: ${form.description || 'No description provided'}
Controls associated with this framework (${frameworkControls.length} total):
${frameworkControls.map(c => `- ${c.control_id}: ${c.title} (Status: ${c.status}, Severity: ${c.severity})`).join('\n')}

Return a JSON with:
{
  "total_gaps": number,
  "critical_gaps": number,
  "high_gaps": number,
  "medium_gaps": number,
  "low_gaps": number,
  "findings": "Detailed findings summary with each gap explained",
  "remediation_plan": "Prioritized remediation plan"
}`;
      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { total_gaps: { type: "number" }, critical_gaps: { type: "number" }, high_gaps: { type: "number" }, medium_gaps: { type: "number" }, low_gaps: { type: "number" }, findings: { type: "string" }, remediation_plan: { type: "string" } }, required: ["total_gaps"] } });
      setAiResult(result);
      setForm({ ...form, ...result });
      toast({ title: "AI Gap Analysis complete" });
    } catch (e) { toast({ title: "Analysis failed", description: e.message, variant: "destructive" }); }
    setRunning(false);
  };

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.GapAnalysis.update(editId, form);
      else await base44.entities.GapAnalysis.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); setAiResult(null); load();
      toast({ title: editId ? "Gap analysis updated" : "Gap analysis created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title || "", framework_name: item.framework_name || "", description: item.description || "", status: item.status || "draft", total_gaps: item.total_gaps || 0, critical_gaps: item.critical_gaps || 0, high_gaps: item.high_gaps || 0, medium_gaps: item.medium_gaps || 0, low_gaps: item.low_gaps || 0, remediation_plan: item.remediation_plan || "", assigned_to: item.assigned_to || "", target_date: item.target_date || "", findings: item.findings || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.GapAnalysis.delete(id); load(); toast({ title: "Deleted" }); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Gap Analysis" subtitle="AI-powered gap analysis against compliance frameworks" actions={<Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setAiResult(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Analysis</Button>} />
      {items.length === 0 ? (
        <EmptyState icon={FileSearch} title="No gap analyses yet" description="Run AI-powered gap analysis to identify compliance gaps." actionLabel="Run Gap Analysis" onAction={() => { setForm(defaultForm); setEditId(null); setAiResult(null); setOpen(true); }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((ga) => (
            <div key={ga.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{ga.title}</h3>
                  <p className="text-xs text-muted-foreground">{ga.framework_name}</p>
                </div>
                <StatusBadge status={ga.status} />
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 rounded-lg bg-red-50"><p className="text-lg font-bold text-red-600">{ga.critical_gaps || 0}</p><p className="text-[10px] text-red-500 font-medium">Critical</p></div>
                <div className="text-center p-2 rounded-lg bg-orange-50"><p className="text-lg font-bold text-orange-600">{ga.high_gaps || 0}</p><p className="text-[10px] text-orange-500 font-medium">High</p></div>
                <div className="text-center p-2 rounded-lg bg-amber-50"><p className="text-lg font-bold text-amber-600">{ga.medium_gaps || 0}</p><p className="text-[10px] text-amber-500 font-medium">Medium</p></div>
                <div className="text-center p-2 rounded-lg bg-emerald-50"><p className="text-lg font-bold text-emerald-600">{ga.low_gaps || 0}</p><p className="text-[10px] text-emerald-500 font-medium">Low</p></div>
                <div className="text-center p-2 rounded-lg bg-blue-50"><p className="text-lg font-bold text-blue-600">{ga.total_gaps || 0}</p><p className="text-[10px] text-blue-500 font-medium">Total</p></div>
              </div>
              {ga.findings && <p className="text-xs text-muted-foreground line-clamp-3">{ga.findings}</p>}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span>{ga.assigned_to || "Unassigned"}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(ga)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(ga.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit Gap Analysis" : "New Gap Analysis"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. SOC 2 Gap Analysis Q1" /></div>
              <div><Label>Framework</Label>
                <Select value={form.framework_name} onValueChange={(v) => setForm({ ...form, framework_name: v })}>
                  <SelectTrigger><SelectValue placeholder="Select framework" /></SelectTrigger>
                  <SelectContent>{frameworks.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assign To</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
              <div><Label>Target Date</Label><Input type="date" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
            </div>
            <div><Label>Scope / Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            {!editId && (
              <Button variant="outline" className="w-full" onClick={runAIGapAnalysis} disabled={running || !form.framework_name}>
                {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : <><Brain className="w-4 h-4 mr-2" /> Run AI Gap Analysis</>}
              </Button>
            )}
            {aiResult && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600"><BarChart3 className="w-4 h-4" /> AI Results</div>
                <div className="grid grid-cols-5 gap-2 text-center text-sm">
                  <div><span className="text-red-600 font-bold">{aiResult.critical_gaps || 0}</span><p className="text-[10px] text-muted-foreground">Critical</p></div>
                  <div><span className="text-orange-600 font-bold">{aiResult.high_gaps || 0}</span><p className="text-[10px] text-muted-foreground">High</p></div>
                  <div><span className="text-amber-600 font-bold">{aiResult.medium_gaps || 0}</span><p className="text-[10px] text-muted-foreground">Medium</p></div>
                  <div><span className="text-emerald-600 font-bold">{aiResult.low_gaps || 0}</span><p className="text-[10px] text-muted-foreground">Low</p></div>
                  <div><span className="text-blue-600 font-bold">{aiResult.total_gaps || 0}</span><p className="text-[10px] text-muted-foreground">Total</p></div>
                </div>
                {aiResult.findings && <div><Label className="text-xs text-muted-foreground">Findings</Label><p className="text-sm whitespace-pre-wrap">{aiResult.findings}</p></div>}
                {aiResult.remediation_plan && <div><Label className="text-xs text-muted-foreground">Remediation Plan</Label><p className="text-sm whitespace-pre-wrap">{aiResult.remediation_plan}</p></div>}
              </div>
            )}
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Findings Summary</Label><Textarea value={form.findings} onChange={(e) => setForm({ ...form, findings: e.target.value })} rows={4} /></div>
            <div><Label>Remediation Plan</Label><Textarea value={form.remediation_plan} onChange={(e) => setForm({ ...form, remediation_plan: e.target.value })} rows={4} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Save Analysis"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}