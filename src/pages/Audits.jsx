import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ClipboardList, Plus, Pencil, Trash2, Search } from "lucide-react";
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

const defaultForm = { title: "", description: "", framework_name: "", type: "internal", status: "planned", auditor_name: "", auditor_firm: "", start_date: "", end_date: "", findings_count: 0, critical_findings: 0, result: "pending", notes: "" };

export default function Audits() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.Audit.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Audit.update(editId, form);
      else await base44.entities.Audit.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Audit updated" : "Audit created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title || "", description: item.description || "", framework_name: item.framework_name || "", type: item.type || "internal", status: item.status || "planned", auditor_name: item.auditor_name || "", auditor_firm: item.auditor_firm || "", start_date: item.start_date || "", end_date: item.end_date || "", findings_count: item.findings_count || 0, critical_findings: item.critical_findings || 0, result: item.result || "pending", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.Audit.delete(id); load(); toast({ title: "Audit deleted" }); };

  const filtered = items.filter((a) => !search || a.title?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Audits" subtitle="Track and manage internal and external audits" actions={<Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Audit</Button>} />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search audits..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audits yet" description="Add an audit to start tracking audit activities." actionLabel="Add Audit" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                  {a.framework_name && <p className="text-xs text-muted-foreground mt-0.5">{a.framework_name}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.type} />
                  <StatusBadge status={a.status} />
                </div>
              </div>
              {a.description && <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Auditor: </span><span className="font-semibold">{a.auditor_name || "—"}</span></div>
                <div><span className="text-muted-foreground">Firm: </span><span className="font-semibold">{a.auditor_firm || "—"}</span></div>
                <div><span className="text-muted-foreground">Findings: </span><span className="font-semibold">{a.findings_count || 0} ({a.critical_findings || 0} critical)</span></div>
                <div><span className="text-muted-foreground">Result: </span><StatusBadge status={a.result} /></div>
              </div>
              {(a.start_date || a.end_date) && (
                <div className="text-xs text-muted-foreground">{a.start_date || "?"} → {a.end_date || "?"}</div>
              )}
              <div className="flex items-center justify-end gap-1 pt-2 border-t border-border">
                <button onClick={() => handleEdit(a)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Audit" : "Add Audit"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="regulatory">Regulatory</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Framework</Label><Input value={form.framework_name} onChange={(e) => setForm({ ...form, framework_name: e.target.value })} placeholder="e.g. SOC 2" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Auditor</Label><Input value={form.auditor_name} onChange={(e) => setForm({ ...form, auditor_name: e.target.value })} /></div>
              <div><Label>Firm</Label><Input value={form.auditor_firm} onChange={(e) => setForm({ ...form, auditor_firm: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div><Label>Result</Label>
              <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="pass">Pass</SelectItem>
                  <SelectItem value="pass_with_exceptions">Pass with Exceptions</SelectItem>
                  <SelectItem value="fail">Fail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Findings</Label><Input type="number" value={form.findings_count} onChange={(e) => setForm({ ...form, findings_count: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Critical Findings</Label><Input type="number" value={form.critical_findings} onChange={(e) => setForm({ ...form, critical_findings: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}