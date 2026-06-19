import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, Plus, Pencil, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { processing_activity: "", data_subjects: "", data_categories: "", purpose: "", legal_basis: "", data_controller: "", data_processor: "", third_party_recipients: "", cross_border_transfers: "", retention_period: "", security_measures: "", dpia_required: false, dpia_completed: false, status: "active", last_reviewed: "", owner_name: "", notes: "" };

export default function ROPAPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.ROPA.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.ROPA.update(editId, form);
      else await base44.entities.ROPA.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "ROPA record updated" : "ROPA record added" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ processing_activity: item.processing_activity || "", data_subjects: item.data_subjects || "", data_categories: item.data_categories || "", purpose: item.purpose || "", legal_basis: item.legal_basis || "", data_controller: item.data_controller || "", data_processor: item.data_processor || "", third_party_recipients: item.third_party_recipients || "", cross_border_transfers: item.cross_border_transfers || "", retention_period: item.retention_period || "", security_measures: item.security_measures || "", dpia_required: !!item.dpia_required, dpia_completed: !!item.dpia_completed, status: item.status || "active", last_reviewed: item.last_reviewed || "", owner_name: item.owner_name || "", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.ROPA.delete(id); load(); toast({ title: "Deleted" }); };
  const filtered = items.filter((r) => !search || r.processing_activity?.toLowerCase().includes(search.toLowerCase()) || r.data_subjects?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="ROPA — Record of Processing Activities" subtitle="GDPR, POPIA & BDPA compliant processing activity register" actions={<Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Activity</Button>} />
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} title="No processing activities" description="Record your data processing activities to comply with GDPR, POPIA, and BDPA." actionLabel="Add Activity" onAction={() => setOpen(true)} />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Activity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Data Subjects</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Legal Basis</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">DPIA</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{r.processing_activity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.data_subjects || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.legal_basis || "—"}</td>
                    <td className="px-4 py-3">{r.dpia_required ? (r.dpia_completed ? <span className="text-xs text-emerald-600 font-medium">✅ Done</span> : <span className="text-xs text-amber-600 font-medium">⚠ Required</span>) : <span className="text-xs text-muted-foreground">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Activity" : "Add Processing Activity"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Processing Activity</Label><Input value={form.processing_activity} onChange={(e) => setForm({ ...form, processing_activity: e.target.value })} placeholder="e.g. Employee payroll processing" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Subjects</Label><Input value={form.data_subjects} onChange={(e) => setForm({ ...form, data_subjects: e.target.value })} placeholder="e.g. Employees" /></div>
              <div><Label>Data Categories</Label><Input value={form.data_categories} onChange={(e) => setForm({ ...form, data_categories: e.target.value })} placeholder="e.g. Personal, financial" /></div>
            </div>
            <div><Label>Purpose</Label><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Legal Basis</Label><Input value={form.legal_basis} onChange={(e) => setForm({ ...form, legal_basis: e.target.value })} placeholder="e.g. Consent, legitimate interest" /></div>
              <div><Label>Retention Period</Label><Input value={form.retention_period} onChange={(e) => setForm({ ...form, retention_period: e.target.value })} placeholder="e.g. 7 years after termination" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Controller</Label><Input value={form.data_controller} onChange={(e) => setForm({ ...form, data_controller: e.target.value })} /></div>
              <div><Label>Data Processor</Label><Input value={form.data_processor} onChange={(e) => setForm({ ...form, data_processor: e.target.value })} /></div>
            </div>
            <div><Label>Third Party Recipients</Label><Input value={form.third_party_recipients} onChange={(e) => setForm({ ...form, third_party_recipients: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cross-Border Transfers</Label><Input value={form.cross_border_transfers} onChange={(e) => setForm({ ...form, cross_border_transfers: e.target.value })} placeholder="e.g. EU, USA, SADC" /></div>
              <div><Label>Security Measures</Label><Input value={form.security_measures} onChange={(e) => setForm({ ...form, security_measures: e.target.value })} placeholder="e.g. Encryption, access controls" /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.dpia_required} onCheckedChange={(v) => setForm({ ...form, dpia_required: v })} /><Label>DPIA Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.dpia_completed} onCheckedChange={(v) => setForm({ ...form, dpia_completed: v })} /><Label>DPIA Completed</Label></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="under_review">Under Review</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
              <div><Label>Last Reviewed</Label><Input type="date" value={form.last_reviewed} onChange={(e) => setForm({ ...form, last_reviewed: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.processing_activity}>{editId ? "Update" : "Save"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}