import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { HandHeart, Plus, Search, Trash2, Pencil, CheckCircle2, XCircle, Clock, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CONSENT_STATUSES = ["given", "pending", "withdrawn", "expired", "refused"];
const CONSENT_TYPES = ["explicit", "implicit", "opt_in", "opt_out", "legitimate_interest"];
const SUBJECT_TYPES = ["customer", "employee", "prospect", "patient", "minor", "website_visitor", "other"];
const COLLECTION_METHODS = ["web_form", "email", "phone", "in_person", "api", "other"];

export default function ConsentManagement() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    base44.entities.ConsentRecord.list("-updated_date", 500)
      .then((d) => setRecords(d || []))
      .catch(() => toast({ title: "Failed to load consent records", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (filterStatus !== "all") list = list.filter((r) => r.status === filterStatus);
    const q = search.toLowerCase();
    if (q) list = list.filter((r) =>
      r.consent_id?.toLowerCase().includes(q) ||
      r.data_subject_name?.toLowerCase().includes(q) ||
      r.data_subject_email?.toLowerCase().includes(q) ||
      r.processing_activity?.toLowerCase().includes(q)
    );
    return list;
  }, [records, search, filterStatus]);

  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      total: records.length,
      given: records.filter((r) => r.status === "given").length,
      withdrawn: records.filter((r) => r.status === "withdrawn").length,
      expiringSoon: records.filter((r) => r.expiry_date && new Date(r.expiry_date) <= in30Days && r.status === "given").length,
    };
  }, [records]);

  const openCreate = () => {
    setEditing(null);
    setForm({ consent_id: `CON-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, data_subject_name: "", data_subject_email: "", data_subject_type: "customer", processing_activity: "", consent_type: "explicit", status: "given", privacy_notice_version: "", privacy_notice_url: "", consent_given_at: new Date().toISOString().slice(0, 10), expiry_date: "", collection_method: "web_form", collection_point: "", proof_of_consent_url: "", jurisdiction: "za", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (r) => { setEditing(r); setForm({ ...r }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.ConsentRecord.update(editing.id, form);
        toast({ title: "Consent record updated" });
      } else {
        await base44.entities.ConsentRecord.create(form);
        toast({ title: "Consent record created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleWithdraw = async (r) => {
    if (!confirm("Withdraw this consent? This will update the record status to 'withdrawn'.")) return;
    try {
      await base44.entities.ConsentRecord.update(r.id, { status: "withdrawn", consent_withdrawn_at: new Date().toISOString() });
      toast({ title: "Consent withdrawn", description: `${r.data_subject_name}'s consent has been withdrawn.` });
      load();
    } catch (e) {
      toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (r) => {
    if (!confirm("Delete this consent record?")) return;
    try {
      await base44.entities.ConsentRecord.delete(r.id);
      toast({ title: "Record deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Consent Management" subtitle="Track consent preferences, withdrawals, and consent history per data subject — POPIA §11 compliance"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Consent</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Records" value={stats.total} icon={HandHeart} />
        <StatBox label="Given" value={stats.given} color="text-emerald-600" icon={CheckCircle2} />
        <StatBox label="Withdrawn" value={stats.withdrawn} color="text-rose-600" icon={XCircle} />
        <StatBox label="Expiring Soon" value={stats.expiringSoon} color="text-amber-600" icon={Clock} />
      </div>

      {stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{stats.expiringSoon} consent(s) expiring within 30 days</p>
            <p className="text-xs text-amber-600">POPIA requires renewed consent before expiry. Contact data subjects to re-consent.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search consent records..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs bg-muted border-0 outline-none px-3 py-2 rounded-lg cursor-pointer">
          <option value="all">All Statuses</option>
          {CONSENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Data Subject</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Processing Activity</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Given At</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Expiry</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No consent records found.</td></tr>}
              {filtered.map((r) => {
                const expiringSoon = r.expiry_date && r.status === "given" && new Date(r.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{r.data_subject_name || r.data_subject_email}</p>
                      <p className="text-xs text-muted-foreground">{r.data_subject_email}</p>
                      <p className="text-xs text-muted-foreground">{r.consent_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell max-w-xs truncate">{r.processing_activity || "—"}</td>
                    <td className="px-4 py-3 hidden sm:table-cell"><Badge variant="secondary">{r.consent_type?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={
                        r.status === "given" ? "bg-emerald-100 text-emerald-700 border-0" :
                        r.status === "withdrawn" ? "bg-rose-100 text-rose-700 border-0" :
                        r.status === "refused" ? "bg-rose-100 text-rose-700 border-0" :
                        r.status === "expired" ? "bg-amber-100 text-amber-700 border-0" :
                        "bg-muted text-muted-foreground border-0"
                      }>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{r.consent_given_at?.slice(0, 10) || "—"}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">
                      <span className={expiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}>{r.expiry_date || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {r.status === "given" && <Button size="sm" variant="outline" onClick={() => handleWithdraw(r)} className="text-xs h-7 text-rose-600 border-rose-300">Withdraw</Button>}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Consent Record" : "New Consent Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Consent ID</Label><Input value={form.consent_id || ""} onChange={(e) => setForm({ ...form, consent_id: e.target.value })} /></div>
              <div>
                <Label>Data Subject Type</Label>
                <Select value={form.data_subject_type} onValueChange={(v) => setForm({ ...form, data_subject_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SUBJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Subject Name</Label><Input value={form.data_subject_name || ""} onChange={(e) => setForm({ ...form, data_subject_name: e.target.value })} /></div>
              <div><Label>Data Subject Email</Label><Input type="email" value={form.data_subject_email || ""} onChange={(e) => setForm({ ...form, data_subject_email: e.target.value })} /></div>
            </div>
            <div><Label>Processing Activity</Label><Textarea value={form.processing_activity || ""} onChange={(e) => setForm({ ...form, processing_activity: e.target.value })} placeholder="e.g. Marketing communications, customer data processing, employee monitoring" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Consent Type</Label>
                <Select value={form.consent_type} onValueChange={(v) => setForm({ ...form, consent_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONSENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONSENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Privacy Notice Version</Label><Input value={form.privacy_notice_version || ""} onChange={(e) => setForm({ ...form, privacy_notice_version: e.target.value })} placeholder="e.g. v2.1" /></div>
              <div><Label>Jurisdiction</Label><Input value={form.jurisdiction || ""} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} placeholder="e.g. za, eu, bw" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Consent Given At</Label><Input type="date" value={form.consent_given_at?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, consent_given_at: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Collection Method</Label>
                <Select value={form.collection_method} onValueChange={(v) => setForm({ ...form, collection_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{COLLECTION_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Collection Point</Label><Input value={form.collection_point || ""} onChange={(e) => setForm({ ...form, collection_point: e.target.value })} placeholder="e.g. website_signup, checkout" /></div>
            </div>
            <div><Label>Proof of Consent URL</Label><Input value={form.proof_of_consent_url || ""} onChange={(e) => setForm({ ...form, proof_of_consent_url: e.target.value })} placeholder="Link to evidence (screenshot, signed form)" /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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