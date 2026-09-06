import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileArchive, Plus, Search, Trash2, Pencil, Clock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const DATA_TYPES = ["pii", "financial", "health", "biometric", "credentials", "behavioral", "special_category", "government_id", "payment_card", "system_logs", "email", "backup", "audit_trail", "other"];
const DISPOSAL_METHODS = ["secure_deletion", "crypto_shredding", "physical_destruction", "degaussing", "anonymization", "overwrite", "data_wiping"];
const BASIS_OPTIONS = ["legal", "regulatory", "contractual", "operational", "tax"];

export default function DataRetentionSchedule() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ schedule_id: "", data_type: "pii", data_category_description: "", retention_period_days: 365, retention_basis: "regulatory", legal_reference: "", disposal_method: "secure_deletion", next_review_date: "", owner_name: "", notes: "" });

  const load = () => {
    base44.entities.DataRetentionSchedule.list("-updated_date", 200)
      .then((d) => setSchedules(d || []))
      .catch(() => toast({ title: "Failed to load schedules", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = schedules.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.data_category_description?.toLowerCase().includes(q) || s.data_type?.includes(q) || s.legal_reference?.toLowerCase().includes(q);
  });

  const stats = {
    total: schedules.length,
    active: schedules.filter((s) => s.status === "active").length,
    underReview: schedules.filter((s) => s.status === "under_review").length,
    overdueReview: schedules.filter((s) => s.next_review_date && new Date(s.next_review_date) < new Date()).length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ schedule_id: `DRS-${Date.now().toString().slice(-6)}`, data_type: "pii", data_category_description: "", retention_period_days: 365, retention_basis: "regulatory", legal_reference: "", disposal_method: "secure_deletion", next_review_date: "", owner_name: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (s) => { setEditing(s); setForm({ ...s }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.DataRetentionSchedule.update(editing.id, form);
        toast({ title: "Schedule updated" });
      } else {
        await base44.entities.DataRetentionSchedule.create(form);
        toast({ title: "Schedule created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (s) => {
    if (!confirm("Delete this retention schedule?")) return;
    try {
      await base44.entities.DataRetentionSchedule.delete(s.id);
      toast({ title: "Schedule deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Data Retention Schedule" subtitle="Retention policies per data type with disposal evidence and legal basis"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Schedule</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Schedules" value={stats.total} />
        <StatBox label="Active" value={stats.active} color="text-emerald-600" />
        <StatBox label="Under Review" value={stats.underReview} color="text-amber-600" />
        <StatBox label="Overdue Review" value={stats.overdueReview} color="text-rose-600" />
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search schedules..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Data Type</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Retention</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Legal Basis</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Disposal</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Next Review</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No retention schedules found.</td></tr>}
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-4 py-3"><Badge variant="secondary">{s.data_type}</Badge></td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{s.data_category_description || "—"}</p>
                    {s.legal_reference && <p className="text-xs text-muted-foreground">{s.legal_reference}</p>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{s.retention_period_days} days</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{s.retention_basis}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{s.disposal_method?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs hidden lg:table-cell">
                    {s.next_review_date ? (
                      <span className={new Date(s.next_review_date) < new Date() ? "text-rose-600 font-medium" : "text-muted-foreground"}>
                        <Clock className="w-3 h-3 inline mr-1" />{s.next_review_date}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={s.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" : s.status === "under_review" ? "bg-amber-100 text-amber-700 border-0" : "bg-muted text-muted-foreground border-0"}>
                      {s.status?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Retention Schedule" : "New Retention Schedule"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Schedule ID</Label><Input value={form.schedule_id} onChange={(e) => setForm({ ...form, schedule_id: e.target.value })} /></div>
              <div>
                <Label>Data Type</Label>
                <Select value={form.data_type} onValueChange={(v) => setForm({ ...form, data_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DATA_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Input value={form.data_category_description} onChange={(e) => setForm({ ...form, data_category_description: e.target.value })} placeholder="e.g. Customer PII — account opening records" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Retention (days)</Label><Input type="number" value={form.retention_period_days} onChange={(e) => setForm({ ...form, retention_period_days: +e.target.value })} /></div>
              <div>
                <Label>Basis</Label>
                <Select value={form.retention_basis} onValueChange={(v) => setForm({ ...form, retention_basis: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BASIS_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Legal Reference</Label><Input value={form.legal_reference} onChange={(e) => setForm({ ...form, legal_reference: e.target.value })} placeholder="e.g. POPIA Section 14, Companies Act s24" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Disposal Method</Label>
                <Select value={form.disposal_method} onValueChange={(v) => setForm({ ...form, disposal_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DISPOSAL_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Next Review Date</Label><Input type="date" value={form.next_review_date || ""} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></div>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}