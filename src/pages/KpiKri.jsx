import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Target, Plus, Pencil, Trash2, Search, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import Can from "@/components/shared/Can";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { name: "", description: "", indicator_type: "kpi", category: "operational", target_value: "", actual_value: "", unit: "%", threshold_warning: "", threshold_critical: "", better_direction: "higher", measurement_frequency: "monthly", business_unit_id: "", business_unit_name: "", owner_name: "", last_measured_date: "", next_review_date: "", notes: "" };

const STATUS_STYLES = {
  on_track: { color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2, label: "On Track" },
  warning: { color: "bg-amber-100 text-amber-700", icon: AlertTriangle, label: "Warning" },
  critical: { color: "bg-red-100 text-red-700", icon: AlertTriangle, label: "Critical" },
  exceeded: { color: "bg-blue-100 text-blue-700", icon: Target, label: "Exceeded" },
};

const TREND_ICONS = { improving: TrendingUp, stable: Minus, declining: TrendingDown };

function computeStatus(metric) {
  const { actual_value, threshold_warning, threshold_critical, better_direction } = metric;
  if (actual_value == null || actual_value === "") return "on_track";
  const av = Number(actual_value);
  const tw = Number(threshold_warning);
  const tc = Number(threshold_critical);
  if (!isNaN(tw) && !isNaN(tc)) {
    if (better_direction === "higher") {
      if (av < tc) return "critical";
      if (av < tw) return "warning";
      return "on_track";
    } else {
      if (av > tc) return "critical";
      if (av > tw) return "warning";
      return "on_track";
    }
  }
  return "on_track";
}

export default function KpiKri() {
  const [items, setItems] = useState([]);
  const [businessUnits, setBusinessUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterBU, setFilterBU] = useState("all");
  const { toast } = useToast();

  const load = () => Promise.all([
    base44.entities.KpiKri.list(),
    base44.entities.BusinessUnit.list().catch(() => []),
  ]).then(([d, bus]) => { setItems(d); setBusinessUnits(bus); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (form.business_unit_id) {
        const bu = businessUnits.find((b) => b.id === form.business_unit_id);
        payload.business_unit_name = bu?.name || "";
      } else {
        payload.business_unit_id = "";
        payload.business_unit_name = "";
      }
      payload.status = computeStatus(payload);
      if (editId) await base44.entities.KpiKri.update(editId, payload);
      else await base44.entities.KpiKri.create(payload);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Indicator updated" : "Indicator created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name || "", description: item.description || "", indicator_type: item.indicator_type || "kpi", category: item.category || "operational", target_value: item.target_value ?? "", actual_value: item.actual_value ?? "", unit: item.unit || "%", threshold_warning: item.threshold_warning ?? "", threshold_critical: item.threshold_critical ?? "", better_direction: item.better_direction || "higher", measurement_frequency: item.measurement_frequency || "monthly", business_unit_id: item.business_unit_id || "", business_unit_name: item.business_unit_name || "", owner_name: item.owner_name || "", last_measured_date: item.last_measured_date || "", next_review_date: item.next_review_date || "", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.KpiKri.delete(id); load(); toast({ title: "Indicator deleted" }); };

  const filtered = useMemo(() => items.filter((p) => {
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "all" && p.indicator_type !== filterType) return false;
    if (filterBU !== "all" && p.business_unit_id !== filterBU) return false;
    return true;
  }), [items, search, filterType, filterBU]);

  const stats = useMemo(() => {
    const kpis = items.filter((i) => i.indicator_type === "kpi");
    const kris = items.filter((i) => i.indicator_type === "kri");
    const onTrack = items.filter((i) => (i.status || "on_track") === "on_track");
    const atRisk = items.filter((i) => ["warning", "critical"].includes(i.status));
    return { kpis: kpis.length, kris: kris.length, onTrack: onTrack.length, atRisk: atRisk.length };
  }, [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="KPI / KRI Tracker"
        subtitle="Key Performance & Risk Indicators with threshold-based status tracking"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Indicator</Button></Can>}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <Target className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.kpis}</p>
          <p className="text-xs text-muted-foreground">KPIs Tracked</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.kris}</p>
          <p className="text-xs text-muted-foreground">KRIs Tracked</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.onTrack}</p>
          <p className="text-xs text-muted-foreground">On Track</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{stats.atRisk}</p>
          <p className="text-xs text-muted-foreground">At Risk</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search indicators..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="kpi">KPIs</SelectItem>
            <SelectItem value="kri">KRIs</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterBU} onValueChange={setFilterBU}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Units</SelectItem>
            {businessUnits.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} title="No indicators yet" description="Create KPIs and KRIs to track performance and risk against thresholds, filtered by business unit." actionLabel="Add Indicator" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const Cfg = STATUS_STYLES[m.status || "on_track"] || STATUS_STYLES.on_track;
            const StatusIcon = Cfg.icon;
            const TrendIcon = TREND_ICONS[m.trend || "stable"] || Minus;
            const pct = m.target_value != null && m.actual_value != null && Number(m.target_value) !== 0
              ? Math.min(100, Math.round((Number(m.actual_value) / Number(m.target_value)) * 100))
              : 0;
            return (
              <div key={m.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${m.indicator_type === "kpi" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {m.indicator_type?.toUpperCase()}
                      </span>
                      <h3 className="font-heading font-semibold text-foreground text-sm truncate">{m.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{(m.category || "").replace(/_/g, " ")}{m.business_unit_name ? ` · ${m.business_unit_name}` : ""}{m.owner_name ? ` · ${m.owner_name}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${Cfg.color}`}>
                      <StatusIcon className="w-3 h-3" /> {Cfg.label}
                    </span>
                    <TrendIcon className={`w-4 h-4 ${m.trend === "improving" ? "text-emerald-500" : m.trend === "declining" ? "text-red-500" : "text-muted-foreground"}`} />
                    <Can permission="policies:write"><button onClick={() => handleEdit(m)} className="p-1 rounded hover:bg-muted" title="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                    <Can permission="admin:users"><button onClick={() => handleDelete(m.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                  </div>
                </div>
                {/* Value + Progress */}
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual</p>
                    <p className="text-lg font-bold text-foreground">{m.actual_value ?? "—"}<span className="text-xs text-muted-foreground ml-1">{m.unit}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Target</p>
                    <p className="text-lg font-bold text-foreground">{m.target_value ?? "—"}<span className="text-xs text-muted-foreground ml-1">{m.unit}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${Cfg.color.split(" ")[0]}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{pct}%</span>
                    </div>
                  </div>
                </div>
                {m.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{m.description}</p>}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Indicator" : "Add Indicator"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mean Time to Remediate" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.indicator_type} onValueChange={(v) => setForm({ ...form, indicator_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="kpi">KPI (Performance)</SelectItem><SelectItem value="kri">KRI (Risk)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["operational","financial","compliance","security","strategic","vendor","incident"].map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g," ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Target</Label><Input type="number" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: e.target.value })} /></div>
              <div><Label>Actual</Label><Input type="number" value={form.actual_value} onChange={(e) => setForm({ ...form, actual_value: e.target.value })} /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, days, $" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Warn Threshold</Label><Input type="number" value={form.threshold_warning} onChange={(e) => setForm({ ...form, threshold_warning: e.target.value })} /></div>
              <div><Label>Critical Threshold</Label><Input type="number" value={form.threshold_critical} onChange={(e) => setForm({ ...form, threshold_critical: e.target.value })} /></div>
              <div><Label>Better Direction</Label>
                <Select value={form.better_direction} onValueChange={(v) => setForm({ ...form, better_direction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="higher">Higher is better</SelectItem><SelectItem value="lower">Lower is better</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Business Unit</Label>
                <Select value={form.business_unit_id || "none"} onValueChange={(v) => setForm({ ...form, business_unit_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {businessUnits.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Frequency</Label>
                <Select value={form.measurement_frequency} onValueChange={(v) => setForm({ ...form, measurement_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["daily","weekly","monthly","quarterly","annually"].map((f) => <SelectItem key={f} value={f}>{f.replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
              <div><Label>Last Measured</Label><Input type="date" value={form.last_measured_date} onChange={(e) => setForm({ ...form, last_measured_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}