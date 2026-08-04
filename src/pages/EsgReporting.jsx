import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Leaf, Trash2, Pencil, TrendingUp, Users, ShieldCheck, BookOpen } from "lucide-react";
import { ESG_FRAMEWORKS, ESG_STARTER_METRICS } from "@/lib/esgLibrary";

const CATEGORY_META = {
  environmental: { label: "Environmental", icon: Leaf, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", bar: "bg-emerald-500" },
  social: { label: "Social", icon: Users, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", bar: "bg-blue-500" },
  governance: { label: "Governance", icon: ShieldCheck, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10", bar: "bg-purple-500" },
};
const STATUS_COLOR = {
  on_track: "text-emerald-600 dark:text-emerald-400",
  at_risk: "text-amber-600 dark:text-amber-400",
  off_track: "text-red-600 dark:text-red-400",
  exceeded: "text-emerald-600 dark:text-emerald-400",
  not_started: "text-muted-foreground",
};

const emptyForm = {
  framework: "GRI", category: "environmental", metric_id: "", metric_name: "", description: "",
  value: 0, unit: "", period: "", target: 0, target_unit: "", status: "not_started", owner_name: "", notes: "",
};

export default function EsgReporting() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.EsgMetric.list("-created_date")
      .then((d) => setMetrics(d || []))
      .catch(() => toast({ title: "Failed to load ESG metrics", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ ...emptyForm, ...m }); setDialogOpen(true); };

  const save = async () => {
    if (!form.metric_name || !form.category) {
      toast({ title: "Metric name and category are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.EsgMetric.update(editing.id, form);
        toast({ title: "ESG metric updated" });
      } else {
        await base44.entities.EsgMetric.create(form);
        toast({ title: "ESG metric added" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    if (!confirm(`Delete "${m.metric_name}"?`)) return;
    try {
      await base44.entities.EsgMetric.delete(m.id);
      toast({ title: "Metric deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const importStarter = async (s) => {
    try {
      await base44.entities.EsgMetric.create({
        framework: s.framework, category: s.category, metric_id: s.metric_id,
        metric_name: s.metric_name, description: s.description, unit: s.unit,
        value: 0, period: new Date().getFullYear().toString(), status: "not_started",
      });
      toast({ title: "Metric added", description: s.metric_name });
      load();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
  };

  const byCategory = (cat) => metrics.filter((m) => m.category === cat);
  const onTrack = (cat) => byCategory(cat).filter((m) => m.status === "on_track" || m.status === "exceeded").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="ESG & Sustainability Reporting"
        subtitle="Track environmental, social, and governance metrics against GRI, SASB, TCFD, CSRD, and SDG frameworks"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowLibrary(true)} variant="outline" size="sm">
              <BookOpen className="w-4 h-4 mr-1" /> Framework Library
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Add Metric
            </Button>
          </div>
        }
      />

      {/* Category summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Object.entries(CATEGORY_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const items = byCategory(key);
          return (
            <div key={key} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground">{items.length} metrics · {onTrack(key)} on track</p>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${meta.bar}`} style={{ width: `${items.length > 0 ? (onTrack(key) / items.length) * 100 : 0}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics by category */}
      {["environmental", "social", "governance"].map((cat) => {
        const items = byCategory(cat);
        const meta = CATEGORY_META[cat];
        const Icon = meta.icon;
        return (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${meta.color}`} />
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">{meta.label}</h2>
              <span className="text-xs text-muted-foreground">({items.length})</span>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 pl-6">No metrics tracked yet.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Metric</th>
                      <th className="text-left font-medium px-4 py-3">Framework</th>
                      <th className="text-left font-medium px-4 py-3">Period</th>
                      <th className="text-right font-medium px-4 py-3">Value</th>
                      <th className="text-right font-medium px-4 py-3">Target</th>
                      <th className="text-left font-medium px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{m.metric_name}</p>
                          {m.metric_id && <p className="text-xs text-muted-foreground">{m.metric_id}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{m.framework}</td>
                        <td className="px-4 py-3 text-muted-foreground">{m.period || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium text-foreground">{m.value} {m.unit}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{m.target || "—"} {m.target_unit || m.unit}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium capitalize ${STATUS_COLOR[m.status] || "text-muted-foreground"}`}>
                            {(m.status || "not_started").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => openEdit(m)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => remove(m)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {metrics.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No ESG metrics yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Browse the framework library to import starter metrics, or add your own to begin tracking sustainability performance.
          </p>
        </div>
      )}

      {/* Framework library dialog */}
      <Dialog open={showLibrary} onOpenChange={setShowLibrary}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ESG Framework Library</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {ESG_FRAMEWORKS.map((f) => (
              <div key={f.code} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-heading font-semibold text-foreground">{f.name}</h4>
                  {f.mandatory && <span className="text-[10px] font-semibold uppercase bg-red-500/15 text-red-600 px-1.5 py-0.5 rounded">Mandatory</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.disclosures} disclosures · {f.region}</p>
              </div>
            ))}
            <div>
              <h4 className="font-heading font-semibold text-foreground mb-2">Starter metrics — one-click import</h4>
              <div className="grid grid-cols-1 gap-2">
                {ESG_STARTER_METRICS.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.metric_name}</p>
                      <p className="text-xs text-muted-foreground">{s.framework} · {s.metric_id} · {s.category}</p>
                    </div>
                    <Button onClick={() => importStarter(s)} variant="outline" size="sm">Import</Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit ESG Metric" : "Add ESG Metric"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_META).map(([k, m]) => <SelectItem key={k} value={k}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Framework</Label>
                <Select value={form.framework} onValueChange={(v) => setForm({ ...form, framework: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ESG_FRAMEWORKS.map((f) => <SelectItem key={f.code} value={f.code}>{f.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Metric name</Label>
              <Input value={form.metric_name} onChange={(e) => setForm({ ...form, metric_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disclosure ID</Label>
                <Input value={form.metric_id} onChange={(e) => setForm({ ...form, metric_id: e.target.value })} placeholder="e.g. GRI 305-1" />
              </div>
              <div>
                <Label>Period</Label>
                <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="e.g. 2025, Q1 2026" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Value</Label>
                <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="tCO2e, %, count" />
              </div>
              <div>
                <Label>Target</Label>
                <Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["not_started", "on_track", "at_risk", "off_track", "exceeded"].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Owner</Label>
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}