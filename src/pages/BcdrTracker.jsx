import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Pencil, Trash2, Search, Clock, Activity, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
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

const defaultForm = { process_name: "", description: "", bia_category: "important", criticality_rating: 3, mtd_hours: "", rto_hours: "", rpo_hours: "", dependencies: "", recovery_strategy: "", alternate_site: "", owner_name: "", last_test_date: "", next_test_date: "", test_type: "tabletop", test_status: "not_tested", after_action_notes: "", status: "draft", notes: "" };

const BIA_STYLES = {
  critical: "bg-red-100 text-red-700",
  important: "bg-amber-100 text-amber-700",
  normal: "bg-slate-100 text-slate-600",
};

export default function BcdrTracker() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.BcdrPlan.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.BcdrPlan.update(editId, form);
      else await base44.entities.BcdrPlan.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "BCDR plan updated" : "BCDR plan created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ process_name: item.process_name || "", description: item.description || "", bia_category: item.bia_category || "important", criticality_rating: item.criticality_rating || 3, mtd_hours: item.mtd_hours ?? "", rto_hours: item.rto_hours ?? "", rpo_hours: item.rpo_hours ?? "", dependencies: item.dependencies || "", recovery_strategy: item.recovery_strategy || "", alternate_site: item.alternate_site || "", owner_name: item.owner_name || "", last_test_date: item.last_test_date || "", next_test_date: item.next_test_date || "", test_type: item.test_type || "tabletop", test_status: item.test_status || "not_tested", after_action_notes: item.after_action_notes || "", status: item.status || "draft", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.BcdrPlan.delete(id); load(); toast({ title: "BCDR plan deleted" }); };

  const filtered = items.filter((p) => !search || p.process_name?.toLowerCase().includes(search.toLowerCase()));

  const stats = useMemo(() => {
    const critical = items.filter((i) => i.bia_category === "critical").length;
    const tested = items.filter((i) => i.test_status === "passed").length;
    const overdue = items.filter((i) => i.next_test_date && new Date(i.next_test_date) < new Date() && i.test_status !== "passed").length;
    return { total: items.length, critical, tested, overdue };
  }, [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="BCDR Tracker"
        subtitle="Business Impact Analysis, RTO/RPO objectives, and disaster recovery exercise scheduling"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add BCDR Plan</Button></Can>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><Shield className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Plans</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><AlertTriangle className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.critical}</p><p className="text-xs text-muted-foreground">Critical Processes</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.tested}</p><p className="text-xs text-muted-foreground">Tests Passed</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Clock className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue Tests</p></div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search processes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No BCDR plans yet" description="Create Business Impact Analysis records with RTO/RPO targets and schedule disaster recovery exercises." actionLabel="Add Plan" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${BIA_STYLES[p.bia_category] || BIA_STYLES.normal}`}>{p.bia_category}</span>
                    <h3 className="font-heading font-semibold text-foreground text-sm">{p.process_name}</h3>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={p.test_status} />
                  <Can permission="policies:write"><button onClick={() => handleEdit(p)} className="p-1 rounded hover:bg-muted" title="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                  <Can permission="admin:users"><button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3 text-xs">
                <div><span className="text-muted-foreground">MTD: </span><span className="font-semibold">{p.mtd_hours != null ? `${p.mtd_hours}h` : "—"}</span></div>
                <div><span className="text-muted-foreground">RTO: </span><span className="font-semibold">{p.rto_hours != null ? `${p.rto_hours}h` : "—"}</span></div>
                <div><span className="text-muted-foreground">RPO: </span><span className="font-semibold">{p.rpo_hours != null ? `${p.rpo_hours}h` : "—"}</span></div>
                <div><span className="text-muted-foreground">Owner: </span><span className="font-semibold">{p.owner_name || "—"}</span></div>
                <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground">Next test: </span><span className="font-semibold">{p.next_test_date || "—"}</span></div>
              </div>
              {p.recovery_strategy && <p className="text-xs text-muted-foreground mt-2"><span className="font-semibold">Strategy:</span> {p.recovery_strategy}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit BCDR Plan" : "Add BCDR Plan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Process Name</Label><Input value={form.process_name} onChange={(e) => setForm({ ...form, process_name: e.target.value })} placeholder="e.g. Payment Processing, Customer Database" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>BIA Category</Label>
                <Select value={form.bia_category} onValueChange={(v) => setForm({ ...form, bia_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="normal">Normal</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Criticality (1-5)</Label><Input type="number" min="1" max="5" value={form.criticality_rating} onChange={(e) => setForm({ ...form, criticality_rating: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>MTD (hours)</Label><Input type="number" value={form.mtd_hours} onChange={(e) => setForm({ ...form, mtd_hours: e.target.value ? Number(e.target.value) : "" })} /></div>
              <div><Label>RTO (hours)</Label><Input type="number" value={form.rto_hours} onChange={(e) => setForm({ ...form, rto_hours: e.target.value ? Number(e.target.value) : "" })} /></div>
              <div><Label>RPO (hours)</Label><Input type="number" value={form.rpo_hours} onChange={(e) => setForm({ ...form, rpo_hours: e.target.value ? Number(e.target.value) : "" })} /></div>
            </div>
            <div><Label>Dependencies</Label><Textarea value={form.dependencies} onChange={(e) => setForm({ ...form, dependencies: e.target.value })} rows={2} placeholder="Systems, vendors, personnel..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Recovery Strategy</Label><Input value={form.recovery_strategy} onChange={(e) => setForm({ ...form, recovery_strategy: e.target.value })} placeholder="Active-passive, manual fallback..." /></div>
              <div><Label>Alternate Site</Label><Input value={form.alternate_site} onChange={(e) => setForm({ ...form, alternate_site: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Last Test Date</Label><Input type="date" value={form.last_test_date} onChange={(e) => setForm({ ...form, last_test_date: e.target.value })} /></div>
              <div><Label>Next Test Date</Label><Input type="date" value={form.next_test_date} onChange={(e) => setForm({ ...form, next_test_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Test Type</Label>
                <Select value={form.test_type} onValueChange={(v) => setForm({ ...form, test_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="tabletop">Tabletop</SelectItem><SelectItem value="simulation">Simulation</SelectItem><SelectItem value="full_failover">Full Failover</SelectItem><SelectItem value="parallel">Parallel</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Test Result</Label>
                <Select value={form.test_status} onValueChange={(v) => setForm({ ...form, test_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="not_tested">Not Tested</SelectItem><SelectItem value="passed">Passed</SelectItem><SelectItem value="partial">Partial</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>After-Action Notes</Label><Textarea value={form.after_action_notes} onChange={(e) => setForm({ ...form, after_action_notes: e.target.value })} rows={3} placeholder="Post-exercise findings and improvements..." /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.process_name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}