import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, Play, Pencil, Trash2, Clock, Users, FileText, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import Can from "@/components/shared/Can";
import { useToast } from "@/components/ui/use-toast";

const SCENARIO_TYPES = [
  { value: "ransomware", label: "Ransomware Attack" },
  { value: "data_center_outage", label: "Data Center Outage" },
  { value: "supply_chain", label: "Supply Chain Disruption" },
  { value: "phishing", label: "Phishing / Social Engineering" },
  { value: "insider_breach", label: "Insider Data Breach" },
  { value: "natural_disaster", label: "Natural Disaster" },
  { value: "regulatory_enforcement", label: "Regulatory Enforcement Action" },
  { value: "other", label: "Other" },
];

const defaultForm = { scenario_name: "", description: "", scenario_type: "ransomware", severity: 3, facilitator_name: "", status: "draft", notes: "" };

export default function TabletopSimulator() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [generating, setGenerating] = useState(null);
  const { toast } = useToast();

  const load = () => base44.entities.TabletopScenario.list("-created_date").then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.TabletopScenario.update(editId, form);
      else await base44.entities.TabletopScenario.create({ ...form, participants: "[]", milestones: "[]", improvement_actions: "[]" });
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Scenario updated" : "Scenario created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (s) => { setForm({ scenario_name: s.scenario_name, description: s.description, scenario_type: s.scenario_type, severity: s.severity, facilitator_name: s.facilitator_name, status: s.status, notes: s.notes }); setEditId(s.id); setOpen(true); };
  const handleDelete = async (id) => { await base44.entities.TabletopScenario.delete(id); load(); };
  const openDetail = (s) => setDetail(s);

  const generateReport = async (scenario) => {
    setGenerating(scenario.id);
    try {
      const milestones = JSON.parse(scenario.milestones || "[]");
      const participants = JSON.parse(scenario.participants || "[]");
      const prompt = `Generate a post-action compliance improvement report for a tabletop exercise. Scenario: ${scenario.scenario_name} (${scenario.scenario_type}). Description: ${scenario.description}. Participants: ${participants.map(p => p.name).join(", ") || "N/A"}. Milestones recorded: ${JSON.stringify(milestones)}. Generate a structured report with: 1) Executive Summary, 2) Response Effectiveness Assessment, 3) Gaps Identified, 4) Recommended Improvement Actions (with owners and priority). Keep it concise and actionable.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      await base44.entities.TabletopScenario.update(scenario.id, { after_action_report: res, status: "completed" });
      load();
      setDetail({ ...scenario, after_action_report: res, status: "completed" });
      toast({ title: "After-action report generated" });
    } catch (e) { toast({ title: "Generation failed", description: e.message, variant: "destructive" }); }
    setGenerating(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Tabletop Exercise Simulator" subtitle="Disaster recovery and crisis management scenario simulation with post-action reporting"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Scenario</Button></Can>} />

      {items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No tabletop scenarios" description="Create disaster recovery scenarios with timed response milestones and generate AI-powered after-action reports." actionLabel="New Scenario" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {items.map((s) => (
            <div key={s.id} className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openDetail(s)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700">{SCENARIO_TYPES.find((t) => t.value === s.scenario_type)?.label || s.scenario_type}</span>
                    <h3 className="font-heading font-semibold text-foreground text-sm">{s.scenario_name}</h3>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {s.facilitator_name && <span><Users className="w-3 h-3 inline mr-0.5" />{s.facilitator_name}</span>}
                    <span>Severity: {s.severity}/5</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <StatusBadge status={s.status} />
                  <Can permission="policies:write"><button onClick={() => handleEdit(s)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                  <Can permission="admin:users"><button onClick={() => handleDelete(s.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> {detail.scenario_name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div><span className="text-xs text-muted-foreground">Type:</span><p className="font-semibold">{SCENARIO_TYPES.find((t) => t.value === detail.scenario_type)?.label}</p></div>
                  <div><span className="text-xs text-muted-foreground">Severity:</span><p className="font-semibold">{detail.severity}/5</p></div>
                  <div><span className="text-xs text-muted-foreground">Facilitator:</span><p className="font-semibold">{detail.facilitator_name || "—"}</p></div>
                </div>
                {detail.description && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Scenario Description</p><p className="text-sm text-foreground">{detail.description}</p></div>}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Response Milestones</p>
                  {JSON.parse(detail.milestones || "[]").length === 0 ? <p className="text-sm text-muted-foreground">No milestones recorded yet.</p> : (
                    <div className="space-y-2">{JSON.parse(detail.milestones || "[]").map((m, i) => (
                      <div key={i} className="bg-muted/40 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between"><span className="font-semibold text-foreground">T+{m.time_offset_min}min</span><StatusBadge status={m.status || "pending"} /></div>
                        <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                        {m.actual_action && <p className="text-xs mt-1"><span className="text-muted-foreground">Action taken:</span> {m.actual_action}</p>}
                      </div>
                    ))}</div>
                  )}
                </div>
                {detail.after_action_report ? (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> After-Action Report</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{detail.after_action_report}</p>
                  </div>
                ) : (
                  <Can permission="policies:write"><Button size="sm" onClick={() => generateReport(detail)} disabled={generating === detail.id} className="w-full"><Sparkles className="w-4 h-4 mr-1" /> {generating === detail.id ? "Generating..." : "Generate AI After-Action Report"}</Button></Can>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Scenario" : "New Tabletop Scenario"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Scenario Name</Label><Input value={form.scenario_name} onChange={(e) => setForm({ ...form, scenario_name: e.target.value })} placeholder="e.g. Q3 Ransomware Tabletop" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the crisis scenario and objectives..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Scenario Type</Label>
                <Select value={form.scenario_type} onValueChange={(v) => setForm({ ...form, scenario_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCENARIO_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity (1-5)</Label><Input type="number" min="1" max="5" value={form.severity} onChange={(e) => setForm({ ...form, severity: Number(e.target.value) })} /></div>
            </div>
            <div><Label>Facilitator</Label><Input value={form.facilitator_name} onChange={(e) => setForm({ ...form, facilitator_name: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.scenario_name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}