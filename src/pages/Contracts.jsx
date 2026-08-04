import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Plus, FileText, Pencil, Trash2, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";

const TYPE_LABELS = { msa: "MSA", saas: "SaaS", services: "Services", nda: "NDA", dpa: "DPA", sla: "SLA", license: "License", consulting: "Consulting", other: "Other" };
const STATUS_META = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  under_review: { label: "Under Review", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  active: { label: "Active", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  expiring: { label: "Expiring", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  expired: { label: "Expired", cls: "bg-red-500/15 text-red-600 dark:text-red-400" },
  terminated: { label: "Terminated", cls: "bg-muted text-muted-foreground" },
};

const emptyForm = {
  title: "", contract_id: "", counterparty: "", contract_type: "services", status: "draft",
  effective_date: "", end_date: "", renewal_notice_days: 60, auto_renew: false,
  contract_value: 0, currency: "ZAR", linked_vendor_name: "", obligations: "",
  owner_name: "", document_url: "", notes: "",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.Contract.list("-end_date")
      .then((d) => setContracts(d || []))
      .catch(() => toast({ title: "Failed to load contracts", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ ...emptyForm, ...c }); setDialogOpen(true); };

  const save = async () => {
    if (!form.title || !form.counterparty) {
      toast({ title: "Title and counterparty are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Contract.update(editing.id, form);
        toast({ title: "Contract updated" });
      } else {
        await base44.entities.Contract.create(form);
        toast({ title: "Contract added" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete "${c.title}"?`)) return;
    try {
      await base44.entities.Contract.delete(c.id);
      toast({ title: "Contract deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = contracts.filter((c) => statusFilter === "all" || c.status === statusFilter);

  const kpis = {
    total: contracts.length,
    active: contracts.filter((c) => c.status === "active").length,
    expiring: contracts.filter((c) => {
      const d = daysUntil(c.end_date);
      return d !== null && d >= 0 && d <= (c.renewal_notice_days || 60);
    }).length,
    expired: contracts.filter((c) => c.status === "expired" || (daysUntil(c.end_date) !== null && daysUntil(c.end_date) < 0)).length,
  };

  const renewalStatus = (c) => {
    const d = daysUntil(c.end_date);
    if (d === null) return null;
    if (d < 0) return { icon: XCircle, cls: "text-red-500", text: `Expired ${Math.abs(d)}d ago` };
    if (d <= (c.renewal_notice_days || 60)) return { icon: AlertCircle, cls: "text-amber-500", text: `Renew in ${d}d` };
    return { icon: Clock, cls: "text-muted-foreground", text: `${d}d remaining` };
  };

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
        title="Contract Lifecycle Management"
        subtitle="Track contracts, renewal deadlines, obligations, and vendor commitments"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Contract
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><FileText className="w-4 h-4" /><span className="text-xs font-medium uppercase">Total</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{kpis.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-medium uppercase">Active</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{kpis.active}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><AlertCircle className="w-4 h-4" /><span className="text-xs font-medium uppercase">Expiring Soon</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{kpis.expiring}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><XCircle className="w-4 h-4" /><span className="text-xs font-medium uppercase">Expired</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{kpis.expired}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No contracts yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add contracts to track renewal deadlines, obligations, and vendor commitments in one place.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Contract</th>
                <th className="text-left font-medium px-4 py-3">Counterparty</th>
                <th className="text-left font-medium px-4 py-3">Type</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">End Date</th>
                <th className="text-left font-medium px-4 py-3">Renewal</th>
                <th className="text-right font-medium px-4 py-3">Value</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => {
                const rs = renewalStatus(c);
                const RsIcon = rs?.icon;
                return (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.title}</p>
                      {c.contract_id && <p className="text-xs text-muted-foreground">{c.contract_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.counterparty}</td>
                    <td className="px-4 py-3 text-muted-foreground">{TYPE_LABELS[c.contract_type] || c.contract_type}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_META[c.status]?.cls || ""}`}>{STATUS_META[c.status]?.label || c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.end_date || "—"}</td>
                    <td className="px-4 py-3">
                      {rs ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${rs.cls}`}>
                          {RsIcon && <RsIcon className="w-3.5 h-3.5" />} {rs.text}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {c.contract_value ? `${c.contract_value.toLocaleString()} ${c.currency || ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(c)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(c)} className="p-1 text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Contract" : "Add Contract"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Contract title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contract ID</Label>
                <Input value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })} placeholder="CTR-2026-001" />
              </div>
              <div>
                <Label>Counterparty</Label>
                <Input value={form.counterparty} onChange={(e) => setForm({ ...form, counterparty: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.contract_type} onValueChange={(v) => setForm({ ...form, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Effective date</Label>
                <Input type="date" value={form.effective_date} onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Renewal notice (days)</Label>
                <Input type="number" value={form.renewal_notice_days} onChange={(e) => setForm({ ...form, renewal_notice_days: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Value</Label>
                <Input type="number" value={form.contract_value} onChange={(e) => setForm({ ...form, contract_value: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Linked vendor</Label>
                <Input value={form.linked_vendor_name} onChange={(e) => setForm({ ...form, linked_vendor_name: e.target.value })} />
              </div>
              <div>
                <Label>Owner</Label>
                <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Document URL</Label>
              <Input value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <Label>Obligations</Label>
              <Textarea value={form.obligations} onChange={(e) => setForm({ ...form, obligations: e.target.value })} rows={2} placeholder="Key SLAs, compliance commitments, data processing terms…" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-renew">Auto-renew</Label>
              <Switch id="auto-renew" checked={form.auto_renew} onCheckedChange={(v) => setForm({ ...form, auto_renew: v })} />
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