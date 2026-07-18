import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Search, ShieldAlert, FileSearch, Link2, AlertTriangle, CheckCircle2,
  Scale, Eye, Pencil, Trash2, Loader2, Gavel, Calendar, User, ChevronRight, FileText,
} from "lucide-react";

const STATUS_FLOW = ["required", "in_progress", "completed"];
const STATUS_META = {
  required: { label: "Required", color: "#f59e0b", bg: "#fffbeb" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff" },
  completed: { label: "Completed", color: "#10b981", bg: "#ecfdf5" },
  not_required: { label: "Not Required", color: "#94a3b8", bg: "#f8fafc" },
  review_due: { label: "Review Due", color: "#8b5cf6", bg: "#f5f3ff" },
};
const RISK_META = {
  high: { label: "High", color: "#dc2626", bg: "#fef2f2" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb" },
  low: { label: "Low", color: "#3b82f6", bg: "#eff6ff" },
  none: { label: "None", color: "#10b981", bg: "#ecfdf5" },
};
const DPIA_TYPE_META = {
  initial: "Initial Assessment",
  review: "Review",
  renewal: "Renewal",
  screening: "Screening",
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return dateStr; }
}

function parseRisks(str) {
  try { const a = JSON.parse(str); return Array.isArray(a) ? a : []; } catch { return []; }
}

const emptyForm = {
  title: "", linked_ropa_id: "", processing_activity: "", description: "",
  data_subjects: "", data_categories: "", purpose: "", necessity_proportionality: "",
  risk_level: "medium", residual_risk_level: "medium", identified_risks: [],
  mitigations: "", status: "required", dpia_type: "initial", controller_name: "",
  dpo_name: "", consultation_required: false, regulator_consulted: false,
  consultation_date: "", decision_outcome: "", review_date: "", completed_date: "",
  assessor_name: "", notes: "",
};

export default function DPIA() {
  const [dpias, setDpias] = useState([]);
  const [ropaRecords, setRopaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.DPIA.list("-created_date"),
      base44.entities.ROPA.list(),
    ]).then(([d, r]) => {
      setDpias(d || []);
      setRopaRecords(r || []);
    }).catch(() => toast({ title: "Failed to load DPIAs", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return dpias.filter((c) => {
      const matchSearch = !q ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.processing_activity || "").toLowerCase().includes(q) ||
        (c.dpo_name || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [dpias, search, statusFilter]);

  const kpis = useMemo(() => {
    const inProgress = dpias.filter((c) => c.status === "in_progress").length;
    const completed = dpias.filter((c) => c.status === "completed").length;
    const highResidual = dpias.filter((c) => c.residual_risk_level === "high").length;
    const consultations = dpias.filter((c) => c.consultation_required && !c.regulator_consulted).length;
    return { total: dpias.length, inProgress, completed, highResidual, consultations };
  }, [dpias]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({ ...emptyForm, ...c, identified_risks: parseRisks(c.identified_risks) });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      identified_risks: JSON.stringify(form.identified_risks || []),
      assessment_id: form.assessment_id || editing?.assessment_id || `DPIA-${new Date().getFullYear()}-${String(dpias.length + 1).padStart(3, "0")}`,
    };
    try {
      if (editing) {
        await base44.entities.DPIA.update(editing.id, payload);
        toast({ title: "DPIA updated" });
      } else {
        await base44.entities.DPIA.create(payload);
        toast({ title: "DPIA created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const advanceStatus = async (c) => {
    const idx = STATUS_FLOW.indexOf(c.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const next = STATUS_FLOW[idx + 1];
    const patch = { status: next };
    if (next === "completed") patch.completed_date = new Date().toISOString().slice(0, 10);
    try {
      await base44.entities.DPIA.update(c.id, patch);
      toast({ title: `Moved to ${STATUS_META[next].label}` });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await base44.entities.DPIA.delete(c.id);
      toast({ title: "DPIA deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addRisk = () => setForm((f) => ({ ...f, identified_risks: [...(f.identified_risks || []), { risk: "", likelihood: 3, impact: 3 }] }));
  const updateRisk = (i, key, val) => setForm((f) => {
    const arr = [...(f.identified_risks || [])];
    arr[i] = { ...arr[i], [key]: val };
    return { ...f, identified_risks: arr };
  });
  const removeRisk = (i) => setForm((f) => ({ ...f, identified_risks: (f.identified_risks || []).filter((_, idx) => idx !== i) }));

  const riskBadge = (level) => {
    const m = RISK_META[level] || RISK_META.medium;
    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: m.color, backgroundColor: m.bg }}>{m.label}</span>;
  };

  return (
    <>
      <PageHeader
        title="Data Protection Impact Assessments"
        subtitle="Privacy risk assessments for high-risk processing, linked to your ROPA records"
        actions={
          <Button onClick={openCreate} size="sm"><Plus className="w-4 h-4 mr-1" /> New DPIA</Button>
        }
      />

      {/* KPI hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5 text-indigo-300" />
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Privacy Risk Posture</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div><p className="text-4xl font-black text-indigo-200">{kpis.total}</p><p className="text-xs text-slate-400 mt-1">Total DPIAs</p></div>
          <div><p className="text-4xl font-black text-blue-400">{kpis.inProgress}</p><p className="text-xs text-slate-400 mt-1">In Progress</p></div>
          <div><p className="text-4xl font-black text-emerald-400">{kpis.completed}</p><p className="text-xs text-slate-400 mt-1">Completed</p></div>
          <div><p className="text-4xl font-black text-red-400">{kpis.highResidual}</p><p className="text-xs text-slate-400 mt-1">High Residual Risk</p></div>
          <div><p className="text-4xl font-black text-amber-400">{kpis.consultations}</p><p className="text-xs text-slate-400 mt-1">Regulator Consults Due</p></div>
        </div>
        {kpis.highResidual > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-200 font-medium">{kpis.highResidual} DPIA(s) with high residual risk — prior consultation with the regulator is required</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by title, processing activity, or DPO..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <FileSearch className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No DPIAs match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const sMeta = STATUS_META[c.status] || STATUS_META.required;
            const risks = parseRisks(c.identified_risks);
            const flowIdx = STATUS_FLOW.indexOf(c.status);
            const canAdvance = flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1;
            const linkedRopa = ropaRecords.find((r) => r.id === c.linked_ropa_id);
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: sMeta.color, backgroundColor: sMeta.bg }}>{sMeta.label}</span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{DPIA_TYPE_META[c.dpia_type] || c.dpia_type}</span>
                      {c.assessment_id && <span className="text-[10px] font-mono text-muted-foreground">{c.assessment_id}</span>}
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug">{c.title}</h3>
                    {c.processing_activity && <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> {c.processing_activity}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Inherent:</span>
                        {riskBadge(c.risk_level)}
                      </div>
                      <span className="text-muted-foreground/40 text-xs">→</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Residual:</span>
                        {riskBadge(c.residual_risk_level)}
                      </div>
                      {risks.length > 0 && <span className="text-xs text-muted-foreground">{risks.length} risk(s) identified</span>}
                      {c.dpo_name && <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {c.dpo_name}</span>}
                      {c.review_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Review {formatDate(c.review_date)}</span>}
                      {c.consultation_required && <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Gavel className="w-3 h-3" /> Regulator consult{c.regulator_consulted ? "ed" : " required"}</span>}
                    </div>
                  </div>
                  <div className="flex lg:flex-col items-center gap-2 lg:ml-2">
                    {canAdvance && (
                      <Button size="sm" variant="outline" onClick={() => advanceStatus(c)} className="whitespace-nowrap">
                        Advance <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setDetailOpen(true); }}><Eye className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit DPIA" : "New DPIA"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. DPIA — Customer Behavioural Analytics" />
            </div>
            <div>
              <Label>Link to ROPA Activity</Label>
              <Select value={form.linked_ropa_id || "none"} onValueChange={(v) => {
                const ropa = ropaRecords.find((r) => r.id === v);
                setForm((f) => ({ ...f, linked_ropa_id: v === "none" ? "" : v, processing_activity: v === "none" ? f.processing_activity : (ropa?.processing_activity || f.processing_activity), data_subjects: v === "none" ? f.data_subjects : (ropa?.data_subjects || f.data_subjects), data_categories: v === "none" ? f.data_categories : (ropa?.data_categories || f.data_categories), purpose: v === "none" ? f.purpose : (ropa?.purpose || f.purpose) }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select ROPA record" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No link</SelectItem>
                  {ropaRecords.map((r) => <SelectItem key={r.id} value={r.id}>{r.processing_activity || "Unnamed activity"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Processing Activity</Label>
              <Input value={form.processing_activity} onChange={(e) => setField("processing_activity", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description of Processing</Label>
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} placeholder="Nature, scope, context and purposes of the processing" />
            </div>
            <div>
              <Label>Data Subjects</Label>
              <Input value={form.data_subjects} onChange={(e) => setField("data_subjects", e.target.value)} placeholder="e.g. Customers, Employees" />
            </div>
            <div>
              <Label>Data Categories</Label>
              <Input value={form.data_categories} onChange={(e) => setField("data_categories", e.target.value)} placeholder="e.g. Identity, Financial, Biometric" />
            </div>
            <div className="sm:col-span-2">
              <Label>Purpose</Label>
              <Input value={form.purpose} onChange={(e) => setField("purpose", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Necessity & Proportionality Assessment</Label>
              <Textarea value={form.necessity_proportionality} onChange={(e) => setField("necessity_proportionality", e.target.value)} rows={2} placeholder="Is the processing necessary and proportionate to the purpose?" />
            </div>
            <div>
              <Label>Inherent Risk Level</Label>
              <Select value={form.risk_level} onValueChange={(v) => setField("risk_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RISK_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Residual Risk Level</Label>
              <Select value={form.residual_risk_level} onValueChange={(v) => setField("residual_risk_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(RISK_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assessment Type</Label>
              <Select value={form.dpia_type} onValueChange={(v) => setField("dpia_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(DPIA_TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Identified risks */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <Label>Identified Risks</Label>
                <Button type="button" size="sm" variant="outline" onClick={addRisk}><Plus className="w-3 h-3 mr-1" /> Add Risk</Button>
              </div>
              <div className="space-y-2">
                {(form.identified_risks || []).map((r, i) => (
                  <div key={i} className="flex gap-2 items-start bg-muted/40 rounded-lg p-2">
                    <Input value={r.risk} onChange={(e) => updateRisk(i, "risk", e.target.value)} placeholder="Risk description" className="flex-1" />
                    <Select value={String(r.likelihood)} onValueChange={(v) => updateRisk(i, "likelihood", Number(v))}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>L{n}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={String(r.impact)} onValueChange={(v) => updateRisk(i, "impact", Number(v))}>
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>I{n}</SelectItem>)}</SelectContent>
                    </Select>
                    <span className="text-xs font-bold text-muted-foreground w-8 text-center pt-2">{r.likelihood * r.impact}</span>
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeRisk(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                ))}
                {(!form.identified_risks || form.identified_risks.length === 0) && <p className="text-xs text-muted-foreground">No risks added yet.</p>}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label>Mitigation Measures</Label>
              <Textarea value={form.mitigations} onChange={(e) => setField("mitigations", e.target.value)} rows={2} placeholder="Measures to address identified risks" />
            </div>
            <div>
              <Label>Data Controller</Label>
              <Input value={form.controller_name} onChange={(e) => setField("controller_name", e.target.value)} />
            </div>
            <div>
              <Label>DPO Name</Label>
              <Input value={form.dpo_name} onChange={(e) => setField("dpo_name", e.target.value)} />
            </div>
            <div>
              <Label>Assessor</Label>
              <Input value={form.assessor_name} onChange={(e) => setField("assessor_name", e.target.value)} />
            </div>
            <div>
              <Label>Next Review Date</Label>
              <Input type="date" value={form.review_date || ""} onChange={(e) => setField("review_date", e.target.value)} />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.consultation_required} onChange={(e) => setField("consultation_required", e.target.checked)} className="w-4 h-4" />
                Regulator consultation required
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={!!form.regulator_consulted} onChange={(e) => setField("regulator_consulted", e.target.checked)} className="w-4 h-4" />
                Regulator consulted
              </label>
            </div>
            {form.consultation_required && (
              <div>
                <Label>Consultation Date</Label>
                <Input type="date" value={form.consultation_date || ""} onChange={(e) => setField("consultation_date", e.target.value)} />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Decision Outcome</Label>
              <Input value={form.decision_outcome} onChange={(e) => setField("decision_outcome", e.target.value)} placeholder="Proceed / Proceed with conditions / Do not proceed" />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}{editing ? "Save Changes" : "Create DPIA"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader><DialogTitle>{editing.title}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="flex flex-wrap gap-2">
                  {riskBadge(editing.risk_level) && <span className="text-xs text-muted-foreground">Inherent</span>}
                  {riskBadge(editing.risk_level)}
                  <span className="text-muted-foreground/40">→</span>
                  <span className="text-xs text-muted-foreground">Residual</span>
                  {riskBadge(editing.residual_risk_level)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-xs text-muted-foreground">Processing Activity</span><p className="font-medium">{editing.processing_activity || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">DPO</span><p className="font-medium">{editing.dpo_name || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Assessor</span><p className="font-medium">{editing.assessor_name || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Next Review</span><p className="font-medium">{formatDate(editing.review_date)}</p></div>
                </div>
                {editing.description && <div><span className="text-xs text-muted-foreground">Description</span><p className="mt-1">{editing.description}</p></div>}
                {editing.necessity_proportionality && <div><span className="text-xs text-muted-foreground flex items-center gap-1"><Scale className="w-3 h-3" /> Necessity & Proportionality</span><p className="mt-1">{editing.necessity_proportionality}</p></div>}
                {parseRisks(editing.identified_risks).length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Identified Risks</span>
                    <div className="space-y-1 mt-1">
                      {parseRisks(editing.identified_risks).map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-muted/40 rounded px-2 py-1">
                          <span>{r.risk}</span>
                          <span className="text-xs font-mono text-muted-foreground">L{r.likelihood}×I{r.impact}={r.likelihood * r.impact}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {editing.mitigations && <div><span className="text-xs text-muted-foreground">Mitigations</span><p className="mt-1 whitespace-pre-wrap">{editing.mitigations}</p></div>}
                {editing.decision_outcome && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span className="text-emerald-700 font-medium text-sm">{editing.decision_outcome}</span></div>}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                <Button onClick={() => { setDetailOpen(false); openEdit(editing); }}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}