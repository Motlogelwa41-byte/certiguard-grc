import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileBadge, Plus, Search, Trash2, Pencil, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const REGULATORS = ["SARB", "FSCA", "information_regulator", "SARS", "ICASA", "COMPAC", "FIC", "NCR", "other"];
const FILING_TYPES = ["annual_return", "prudential_report", "compliance_certificate", "data_breach_notification", "audit_report", "financial_statement", "regulatory_return", "aml_report", "tax_return", "other"];
const STATUSES = ["not_started", "in_progress", "submitted", "acknowledged", "rejected", "overdue"];

export default function RegulatoryFilingTracker() {
  const { toast } = useToast();
  const [filings, setFilings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ filing_id: "", filing_name: "", regulator: "SARB", filing_type: "regulatory_return", jurisdiction: "South Africa", due_date: "", submitted_date: "", receipt_number: "", acknowledged_date: "", status: "not_started", submitted_by_name: "", filing_method: "online_portal", confirmation_reference: "", document_url: "", owner_name: "", notes: "" });

  const load = () => {
    base44.entities.RegulatoryFiling.list("-due_date", 200)
      .then((d) => setFilings(d || []))
      .catch(() => toast({ title: "Failed to load filings", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filings.filter((f) => {
    const q = search.toLowerCase();
    return !q || f.filing_name?.toLowerCase().includes(q) || f.regulator?.toLowerCase().includes(q) || f.receipt_number?.toLowerCase().includes(q);
  });

  const stats = {
    total: filings.length,
    submitted: filings.filter((f) => f.status === "submitted" || f.status === "acknowledged").length,
    pending: filings.filter((f) => f.status === "not_started" || f.status === "in_progress").length,
    overdue: filings.filter((f) => f.status === "overdue" || (f.due_date && new Date(f.due_date) < new Date() && f.status !== "submitted" && f.status !== "acknowledged")).length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ filing_id: `RF-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, filing_name: "", regulator: "SARB", filing_type: "regulatory_return", jurisdiction: "South Africa", due_date: "", submitted_date: "", receipt_number: "", acknowledged_date: "", status: "not_started", submitted_by_name: "", filing_method: "online_portal", confirmation_reference: "", document_url: "", owner_name: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (f) => { setEditing(f); setForm({ ...f }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.RegulatoryFiling.update(editing.id, form);
        toast({ title: "Filing updated" });
      } else {
        await base44.entities.RegulatoryFiling.create(form);
        toast({ title: "Filing created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (f) => {
    if (!confirm("Delete this filing record?")) return;
    try {
      await base44.entities.RegulatoryFiling.delete(f.id);
      toast({ title: "Filing deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Regulatory Filing Tracker" subtitle="Track submissions to regulators — status, receipt numbers, and acknowledgements"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Filing</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Filings" value={stats.total} />
        <StatBox label="Submitted" value={stats.submitted} color="text-emerald-600" icon={CheckCircle2} />
        <StatBox label="Pending" value={stats.pending} color="text-amber-600" icon={Clock} />
        <StatBox label="Overdue" value={stats.overdue} color="text-rose-600" icon={AlertCircle} />
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search filings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Filing</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Regulator</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3">Due Date</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Receipt #</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No filings found.</td></tr>}
              {filtered.map((f) => {
                const isOverdue = f.due_date && new Date(f.due_date) < new Date() && f.status !== "submitted" && f.status !== "acknowledged";
                return (
                  <tr key={f.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{f.filing_name}</p>
                      <p className="text-xs text-muted-foreground">{f.filing_id}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">{f.regulator_display || f.regulator}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{f.filing_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={isOverdue ? "text-rose-600 font-medium" : "text-muted-foreground"}>{f.due_date || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden lg:table-cell">{f.receipt_number || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        f.status === "acknowledged" ? "bg-emerald-100 text-emerald-700 border-0" :
                        f.status === "submitted" ? "bg-blue-100 text-blue-700 border-0" :
                        f.status === "rejected" || f.status === "overdue" || isOverdue ? "bg-rose-100 text-rose-700 border-0" :
                        f.status === "in_progress" ? "bg-amber-100 text-amber-700 border-0" :
                        "bg-muted text-muted-foreground border-0"
                      }>
                        {isOverdue && f.status === "not_started" ? "overdue" : f.status?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(f)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Filing" : "New Regulatory Filing"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Filing ID</Label><Input value={form.filing_id} onChange={(e) => setForm({ ...form, filing_id: e.target.value })} /></div>
              <div>
                <Label>Regulator</Label>
                <Select value={form.regulator} onValueChange={(v) => setForm({ ...form, regulator: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGULATORS.map((r) => <SelectItem key={r} value={r}>{r === "other" ? "Other" : r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Filing Name</Label><Input value={form.filing_name} onChange={(e) => setForm({ ...form, filing_name: e.target.value })} placeholder="e.g. SARB Prudential Report Q3 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Filing Type</Label>
                <Select value={form.filing_type} onValueChange={(v) => setForm({ ...form, filing_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FILING_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Jurisdiction</Label><Input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Due Date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Submitted Date</Label><Input type="date" value={form.submitted_date || ""} onChange={(e) => setForm({ ...form, submitted_date: e.target.value })} /></div>
              <div><Label>Acknowledged Date</Label><Input type="date" value={form.acknowledged_date || ""} onChange={(e) => setForm({ ...form, acknowledged_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Receipt Number</Label><Input value={form.receipt_number} onChange={(e) => setForm({ ...form, receipt_number: e.target.value })} /></div>
              <div><Label>Confirmation Reference</Label><Input value={form.confirmation_reference} onChange={(e) => setForm({ ...form, confirmation_reference: e.target.value })} /></div>
            </div>
            <div><Label>Submitted By</Label><Input value={form.submitted_by_name} onChange={(e) => setForm({ ...form, submitted_by_name: e.target.value })} /></div>
            <div><Label>Document URL</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} /></div>
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

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}