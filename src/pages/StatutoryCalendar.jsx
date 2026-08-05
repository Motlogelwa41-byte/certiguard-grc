import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { FileBadge, Plus, Pencil, Trash2, Search, Clock, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
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

const LICENSE_TYPES = [
  { value: "tax_clearance", label: "Tax Clearance" },
  { value: "annual_return", label: "Annual Return (CIPA)" },
  { value: "environmental_permit", label: "Environmental Permit" },
  { value: "operating_license", label: "Operating License" },
  { value: "industry_certification", label: "Industry Certification" },
  { value: "data_protection_registration", label: "Data Protection Registration" },
  { value: "import_export_permit", label: "Import/Export Permit" },
  { value: "health_safety", label: "Health & Safety" },
  { value: "other", label: "Other" },
];

const defaultForm = { license_name: "", license_type: "operating_license", issuing_authority: "", license_number: "", jurisdiction: "", issue_date: "", expiry_date: "", renewal_notice_days: 90, owner_name: "", document_url: "", notes: "" };

export default function StatutoryCalendar() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.StatutoryLicense.list("expiry_date").then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const computeStatus = (expiryDate) => {
    if (!expiryDate) return "active";
    const days = Math.ceil((new Date(expiryDate) - new Date()) / 86400000);
    if (days < 0) return "expired";
    if (days <= 90) return "expiring_soon";
    return "active";
  };

  const handleSave = async () => {
    try {
      const status = computeStatus(form.expiry_date);
      if (editId) await base44.entities.StatutoryLicense.update(editId, { ...form, status });
      else await base44.entities.StatutoryLicense.create({ ...form, status, renewal_checklist: "[]" });
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "License updated" : "License created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (l) => { setForm({ license_name: l.license_name, license_type: l.license_type, issuing_authority: l.issuing_authority, license_number: l.license_number, jurisdiction: l.jurisdiction, issue_date: l.issue_date, expiry_date: l.expiry_date, renewal_notice_days: l.renewal_notice_days, owner_name: l.owner_name, document_url: l.document_url, notes: l.notes }); setEditId(l.id); setOpen(true); };
  const handleDelete = async (id) => { await base44.entities.StatutoryLicense.delete(id); load(); };

  const filtered = items.filter((l) => !search || l.license_name?.toLowerCase().includes(search.toLowerCase()) || l.license_number?.toLowerCase().includes(search.toLowerCase()));
  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter((l) => computeStatus(l.expiry_date) === "active").length,
    expiring: items.filter((l) => computeStatus(l.expiry_date) === "expiring_soon").length,
    expired: items.filter((l) => computeStatus(l.expiry_date) === "expired").length,
  }), [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="License, Permit & Statutory Compliance Calendar" subtitle="Track corporate legal requirements with automated renewal countdowns and alerts"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add License</Button></Can>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><FileBadge className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Licenses</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><AlertTriangle className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.expiring}</p><p className="text-xs text-muted-foreground">Expiring (≤90 days)</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Clock className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.expired}</p><p className="text-xs text-muted-foreground">Expired</p></div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search licenses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileBadge} title="No statutory licenses" description="Track corporate legal requirements, permits, and operating licenses with automated renewal alerts." actionLabel="Add License" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((l) => {
            const status = computeStatus(l.expiry_date);
            const daysLeft = l.expiry_date ? Math.ceil((new Date(l.expiry_date) - new Date()) / 86400000) : null;
            return (
              <div key={l.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{LICENSE_TYPES.find((t) => t.value === l.license_type)?.label}</span>
                      {daysLeft != null && daysLeft <= 90 && daysLeft >= 0 && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{daysLeft} days left</span>}
                      {daysLeft != null && daysLeft < 0 && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-100 text-red-700">EXPIRED {-daysLeft}d ago</span>}
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-sm mt-1">{l.license_name}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {l.license_number && <span>No: {l.license_number}</span>}
                      {l.issuing_authority && <span>Authority: {l.issuing_authority}</span>}
                      {l.jurisdiction && <span>📍 {l.jurisdiction}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {l.issue_date && <span>Issued: {l.issue_date}</span>}
                      {l.expiry_date && <span className={status === "expired" ? "text-red-600 font-semibold" : status === "expiring_soon" ? "text-amber-600 font-semibold" : ""}>Expires: {l.expiry_date}</span>}
                      {l.owner_name && <span>Owner: {l.owner_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={status} />
                    <Can permission="policies:write"><button onClick={() => handleEdit(l)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                    <Can permission="admin:users"><button onClick={() => handleDelete(l.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit License" : "Add Statutory License"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>License Name</Label><Input value={form.license_name} onChange={(e) => setForm({ ...form, license_name: e.target.value })} placeholder="e.g. CIPA Annual Return 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.license_type} onValueChange={(v) => setForm({ ...form, license_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LICENSE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Jurisdiction</Label><Input value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} placeholder="e.g. South Africa, Botswana" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issuing Authority</Label><Input value={form.issuing_authority} onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })} /></div>
              <div><Label>License Number</Label><Input value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Issue Date</Label><Input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Renewal Notice (days)</Label><Input type="number" value={form.renewal_notice_days} onChange={(e) => setForm({ ...form, renewal_notice_days: Number(e.target.value) })} /></div>
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            </div>
            <div><Label>Document URL</Label><Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="Link to license document" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.license_name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}