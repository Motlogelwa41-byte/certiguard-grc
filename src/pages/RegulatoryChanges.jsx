import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus, Search, ScrollText, AlertTriangle, Clock, MapPin, Building2,
  TrendingUp, CheckCircle2, ExternalLink, Calendar, Filter, ChevronRight, Eye, Pencil, Trash2, Loader2, Sparkles,
} from "lucide-react";

const STATUS_FLOW = ["identified", "assessing", "in_progress", "implemented", "monitoring"];
const STATUS_META = {
  identified: { label: "Identified", color: "#64748b", bg: "#f1f5f9" },
  assessing: { label: "Assessing", color: "#f59e0b", bg: "#fffbeb" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "#eff6ff" },
  implemented: { label: "Implemented", color: "#10b981", bg: "#ecfdf5" },
  monitoring: { label: "Monitoring", color: "#8b5cf6", bg: "#f5f3ff" },
  no_action: { label: "No Action", color: "#94a3b8", bg: "#f8fafc" },
};
const PRIORITY_META = {
  critical: { label: "Critical", color: "#dc2626", bg: "#fef2f2" },
  high: { label: "High", color: "#ea580c", bg: "#fff7ed" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb" },
  low: { label: "Low", color: "#64748b", bg: "#f1f5f9" },
};
const IMPACT_META = {
  high: { label: "High Impact", color: "#dc2626" },
  medium: { label: "Medium Impact", color: "#f59e0b" },
  low: { label: "Low Impact", color: "#3b82f6" },
  none: { label: "No Impact", color: "#94a3b8" },
};
const CHANGE_TYPE_META = {
  new_regulation: "New Regulation",
  amendment: "Amendment",
  repeal: "Repeal",
  guidance: "Guidance",
  consultation: "Consultation",
  enforcement: "Enforcement",
};
const REGION_META = {
  south_africa: "South Africa",
  sadc: "SADC",
  african_union: "African Union",
  european_union: "European Union",
  united_kingdom: "United Kingdom",
  united_states: "United States",
  global: "Global",
  other: "Other",
};
const AREA_OPTIONS = ["policies", "controls", "vendors", "data_processing", "contracts", "training", "systems", "reporting"];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try { return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return dateStr; }
}

const emptyForm = {
  title: "", regulator: "", region: "sadc", regulation_name: "", change_type: "amendment",
  change_summary: "", priority: "medium", status: "identified", impact_level: "medium",
  impact_summary: "", affected_areas: [], effective_date: "", compliance_deadline: "",
  source_url: "", owner_name: "", assigned_to: "", action_plan: "", risk_if_not_addressed: "", notes: "",
};

export default function RegulatoryChanges() {
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.RegulatoryChange.list("-created_date")
      .then((d) => setChanges(d || []))
      .catch(() => toast({ title: "Failed to load regulatory changes", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return changes.filter((c) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (c.title || "").toLowerCase().includes(q) ||
        (c.regulator || "").toLowerCase().includes(q) ||
        (c.regulation_name || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchRegion = regionFilter === "all" || c.region === regionFilter;
      const matchPriority = priorityFilter === "all" || c.priority === priorityFilter;
      return matchSearch && matchStatus && matchRegion && matchPriority;
    });
  }, [changes, search, statusFilter, regionFilter, priorityFilter]);

  const kpis = useMemo(() => {
    const triage = changes.filter((c) => c.status === "identified" || c.status === "assessing").length;
    const upcoming = changes.filter((c) => {
      if (c.status === "implemented" || c.status === "monitoring" || c.status === "no_action") return false;
      const d = daysUntil(c.compliance_deadline);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    const overdue = changes.filter((c) => {
      if (c.status === "implemented" || c.status === "monitoring" || c.status === "no_action") return false;
      const d = daysUntil(c.compliance_deadline);
      return d !== null && d < 0;
    }).length;
    const implemented = changes.filter((c) => c.status === "implemented" || c.status === "monitoring").length;
    const critical = changes.filter((c) => c.priority === "critical" && c.status !== "implemented" && c.status !== "monitoring").length;
    return { total: changes.length, triage, upcoming, overdue, implemented, critical };
  }, [changes]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c, affected_areas: c.affected_areas || [] }); setDialogOpen(true); };

  const save = async () => {
    if (!form.title || !form.regulator) {
      toast({ title: "Title and regulator are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.RegulatoryChange.update(editing.id, form);
        toast({ title: "Regulatory change updated" });
      } else {
        await base44.entities.RegulatoryChange.create({
          ...form,
          change_id: form.change_id || `RC-${new Date().getFullYear()}-${String(changes.length + 1).padStart(3, "0")}`,
          identified_date: form.identified_date || new Date().toISOString().slice(0, 10),
        });
        toast({ title: "Regulatory change logged" });
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
    try {
      await base44.entities.RegulatoryChange.update(c.id, { status: next, last_reviewed: new Date().toISOString().slice(0, 10) });
      toast({ title: `Moved to ${STATUS_META[next].label}` });
      load();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const generateTasks = async (c) => {
    setGenLoading(c.id);
    try {
      const res = await base44.functions.invoke("generateRegulatoryChangeTasks", { regulatory_change_id: c.id });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);
      toast({
        title: `${data.created || 0} compliance task(s) generated`,
        description: (data.tasks || []).map((t) => "• " + t.title).join("\n") || undefined,
      });
      load();
    } catch (e) {
      toast({ title: "Task generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenLoading(null);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await base44.entities.RegulatoryChange.delete(c.id);
      toast({ title: "Regulatory change deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleArea = (area) => {
    setForm((f) => ({
      ...f,
      affected_areas: f.affected_areas.includes(area)
        ? f.affected_areas.filter((a) => a !== area)
        : [...f.affected_areas, area],
    }));
  };

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title="Regulatory Change Management"
        subtitle="Track regulatory developments, assess organizational impact, and manage compliance triage"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Log Change
          </Button>
        }
      />

      {/* KPI hero */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-blue-300" />
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Regulatory Horizon Scanning</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          <div>
            <p className="text-4xl font-black text-blue-200">{kpis.total}</p>
            <p className="text-xs text-slate-400 mt-1">Total Tracked</p>
          </div>
          <div>
            <p className="text-4xl font-black text-amber-400">{kpis.triage}</p>
            <p className="text-xs text-slate-400 mt-1">Awaiting Triage</p>
          </div>
          <div>
            <p className="text-4xl font-black text-orange-400">{kpis.upcoming}</p>
            <p className="text-xs text-slate-400 mt-1">Deadlines ≤30d</p>
          </div>
          <div>
            <p className="text-4xl font-black text-red-400">{kpis.overdue}</p>
            <p className="text-xs text-slate-400 mt-1">Overdue</p>
          </div>
          <div>
            <p className="text-4xl font-black text-emerald-400">{kpis.implemented}</p>
            <p className="text-xs text-slate-400 mt-1">Implemented</p>
          </div>
        </div>
        {kpis.critical > 0 && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-200 font-medium">{kpis.critical} critical-priority changes still open — immediate attention required</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, regulator, or regulation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={regionFilter} onValueChange={setRegionFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {Object.entries(REGION_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <ScrollText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No regulatory changes match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const sMeta = STATUS_META[c.status] || STATUS_META.identified;
            const pMeta = PRIORITY_META[c.priority] || PRIORITY_META.medium;
            const iMeta = IMPACT_META[c.impact_level] || IMPACT_META.medium;
            const days = daysUntil(c.compliance_deadline);
            const isOverdue = days !== null && days < 0 && c.status !== "implemented" && c.status !== "monitoring" && c.status !== "no_action";
            const flowIdx = STATUS_FLOW.indexOf(c.status);
            const canAdvance = flowIdx >= 0 && flowIdx < STATUS_FLOW.length - 1;
            return (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: pMeta.color, backgroundColor: pMeta.bg }}
                      >
                        {pMeta.label}
                      </span>
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: sMeta.color, backgroundColor: sMeta.bg }}
                      >
                        {sMeta.label}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {CHANGE_TYPE_META[c.change_type] || c.change_type}
                      </span>
                      {c.change_id && <span className="text-[10px] font-mono text-muted-foreground">{c.change_id}</span>}
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug">{c.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {c.regulator}</span>
                      {c.regulation_name && <span className="flex items-center gap-1"><ScrollText className="w-3 h-3" /> {c.regulation_name}</span>}
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {REGION_META[c.region] || c.region}</span>
                    </div>
                    {c.change_summary && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{c.change_summary}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="text-xs font-medium flex items-center gap-1" style={{ color: iMeta.color }}>
                        <TrendingUp className="w-3 h-3" /> {iMeta.label}
                      </span>
                      {c.compliance_deadline && (
                        <span className={`text-xs font-medium flex items-center gap-1 ${isOverdue ? "text-red-600" : days !== null && days <= 30 ? "text-orange-600" : "text-muted-foreground"}`}>
                          <Calendar className="w-3 h-3" />
                          {isOverdue ? `${Math.abs(days)}d overdue` : days !== null ? `${days}d to deadline` : formatDate(c.compliance_deadline)}
                        </span>
                      )}
                      {c.owner_name && <span className="text-xs text-muted-foreground">Owner: {c.owner_name}</span>}
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Source
                        </a>
                      )}
                    </div>
                    {c.affected_areas?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {c.affected_areas.map((a) => (
                          <span key={a} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{a.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex lg:flex-col items-center gap-2 lg:ml-2">
                    {canAdvance && (
                      <Button size="sm" variant="outline" onClick={() => advanceStatus(c)} className="whitespace-nowrap">
                        Advance <ChevronRight className="w-3 h-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => generateTasks(c)} disabled={genLoading === c.id} className="whitespace-nowrap">
                      {genLoading === c.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />} Tasks
                    </Button>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Regulatory Change" : "Log Regulatory Change"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. POPIA Enforcement Guidance Update" />
            </div>
            <div>
              <Label>Regulator *</Label>
              <Input value={form.regulator} onChange={(e) => setField("regulator", e.target.value)} placeholder="e.g. Information Regulator" />
            </div>
            <div>
              <Label>Regulation Name</Label>
              <Input value={form.regulation_name} onChange={(e) => setField("regulation_name", e.target.value)} placeholder="e.g. POPI Act" />
            </div>
            <div>
              <Label>Region</Label>
              <Select value={form.region} onValueChange={(v) => setField("region", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(REGION_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Change Type</Label>
              <Select value={form.change_type} onValueChange={(v) => setField("change_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CHANGE_TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setField("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Impact Level</Label>
              <Select value={form.impact_level} onValueChange={(v) => setField("impact_level", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPACT_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Change Summary</Label>
              <Textarea value={form.change_summary} onChange={(e) => setField("change_summary", e.target.value)} rows={2} placeholder="Plain-language summary of what is changing" />
            </div>
            <div className="sm:col-span-2">
              <Label>Impact Summary</Label>
              <Textarea value={form.impact_summary} onChange={(e) => setField("impact_summary", e.target.value)} rows={2} placeholder="How does this affect your organization?" />
            </div>
            <div>
              <Label>Effective Date</Label>
              <Input type="date" value={form.effective_date || ""} onChange={(e) => setField("effective_date", e.target.value)} />
            </div>
            <div>
              <Label>Compliance Deadline</Label>
              <Input type="date" value={form.compliance_deadline || ""} onChange={(e) => setField("compliance_deadline", e.target.value)} />
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner_name} onChange={(e) => setField("owner_name", e.target.value)} />
            </div>
            <div>
              <Label>Assigned To</Label>
              <Input value={form.assigned_to} onChange={(e) => setField("assigned_to", e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Source URL</Label>
              <Input value={form.source_url} onChange={(e) => setField("source_url", e.target.value)} placeholder="https://..." />
            </div>
            <div className="sm:col-span-2">
              <Label>Affected Areas</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AREA_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleArea(a)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.affected_areas.includes(a)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {a.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Action Plan</Label>
              <Textarea value={form.action_plan} onChange={(e) => setField("action_plan", e.target.value)} rows={2} placeholder="Steps to achieve compliance" />
            </div>
            <div className="sm:col-span-2">
              <Label>Risk If Not Addressed</Label>
              <Textarea value={form.risk_if_not_addressed} onChange={(e) => setField("risk_if_not_addressed", e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editing ? "Save Changes" : "Log Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <>
              <DialogHeader>
                <DialogTitle>{editing.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-xs text-muted-foreground">Regulator</span><p className="font-medium">{editing.regulator}</p></div>
                  <div><span className="text-xs text-muted-foreground">Regulation</span><p className="font-medium">{editing.regulation_name || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Region</span><p className="font-medium">{REGION_META[editing.region] || editing.region}</p></div>
                  <div><span className="text-xs text-muted-foreground">Change Type</span><p className="font-medium">{CHANGE_TYPE_META[editing.change_type] || editing.change_type}</p></div>
                  <div><span className="text-xs text-muted-foreground">Effective Date</span><p className="font-medium">{formatDate(editing.effective_date)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Compliance Deadline</span><p className="font-medium">{formatDate(editing.compliance_deadline)}</p></div>
                  <div><span className="text-xs text-muted-foreground">Owner</span><p className="font-medium">{editing.owner_name || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Assigned To</span><p className="font-medium">{editing.assigned_to || "—"}</p></div>
                </div>
                {editing.change_summary && <div><span className="text-xs text-muted-foreground">Change Summary</span><p className="mt-1">{editing.change_summary}</p></div>}
                {editing.impact_summary && <div><span className="text-xs text-muted-foreground">Impact Summary</span><p className="mt-1">{editing.impact_summary}</p></div>}
                {editing.action_plan && <div><span className="text-xs text-muted-foreground">Action Plan</span><p className="mt-1 whitespace-pre-wrap">{editing.action_plan}</p></div>}
                {editing.risk_if_not_addressed && <div><span className="text-xs text-muted-foreground">Risk If Not Addressed</span><p className="mt-1">{editing.risk_if_not_addressed}</p></div>}
                {editing.affected_areas?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">Affected Areas</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {editing.affected_areas.map((a) => <span key={a} className="text-xs bg-muted px-2 py-0.5 rounded">{a.replace(/_/g, " ")}</span>)}
                    </div>
                  </div>
                )}
                {editing.source_url && <a href={editing.source_url} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline flex items-center gap-1"><ExternalLink className="w-3 h-3" /> View source</a>}
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