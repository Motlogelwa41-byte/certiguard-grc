import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Layers, Plus, Search, Trash2, Pencil, ShieldCheck, AlertTriangle, Clock, Lock, Globe, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CLASSIFICATION_LEVELS = ["public", "internal", "confidential", "restricted", "secret"];
const ASSET_TYPES = ["database", "file_share", "api", "saas_app", "email_system", "backup", "document_repository", "cloud_storage", "other"];
const DATA_CATEGORIES = ["pii", "financial", "health", "biometric", "credentials", "behavioral", "special_category", "government_id", "payment_card"];
const ACCESS_RESTRICTIONS = ["all_employees", "department_only", "named_individuals", "privileged_only", "need_to_know"];
const DISPOSAL_METHODS = ["secure_deletion", "crypto_shredding", "physical_destruction", "anonymization", "overwrite", "not_defined"];
const STATUSES = ["active", "under_review", "deprecated", "unclassified"];

const CLASS_STYLES = {
  public: "bg-blue-100 text-blue-700 border-0",
  internal: "bg-emerald-100 text-emerald-700 border-0",
  confidential: "bg-amber-100 text-amber-700 border-0",
  restricted: "bg-orange-100 text-orange-700 border-0",
  secret: "bg-rose-100 text-rose-700 border-0",
};

export default function DataClassificationRegister() {
  const { toast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    base44.entities.DataClassificationRegister.list("-updated_date", 500)
      .then((d) => setRecords(d || []))
      .catch(() => toast({ title: "Failed to load classification register", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (filterLevel !== "all") list = list.filter((r) => r.classification_level === filterLevel);
    const q = search.toLowerCase();
    if (q) list = list.filter((r) =>
      r.register_id?.toLowerCase().includes(q) ||
      r.asset_name?.toLowerCase().includes(q) ||
      r.data_owner_name?.toLowerCase().includes(q) ||
      r.storage_location?.toLowerCase().includes(q)
    );
    return list;
  }, [records, search, filterLevel]);

  const stats = useMemo(() => ({
    total: records.length,
    classified: records.filter((r) => r.status === "active").length,
    unclassified: records.filter((r) => r.status === "unclassified" || !r.classification_level).length,
    secret: records.filter((r) => r.classification_level === "secret" || r.classification_level === "restricted").length,
  }), [records]);

  const openCreate = () => {
    setEditing(null);
    setForm({ register_id: `DCR-${Date.now().toString().slice(-4)}`, asset_name: "", asset_type: "database", data_categories: [], classification_level: "internal", description: "", data_owner_name: "", data_custodian_name: "", storage_location: "", handling_rules: "", encryption_at_rest: true, encryption_in_transit: true, access_restriction: "need_to_know", allowed_countries: [], retention_period_days: 0, disposal_method: "secure_deletion", sharing_allowed: false, sharing_approved_with: "", backup_required: true, backup_location: "", dpia_required: false, dpia_completed: false, last_classified_date: new Date().toISOString().slice(0, 10), next_review_date: "", classification_review_frequency_months: 12, status: "active", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (r) => { setEditing(r); setForm({ ...r, data_categories: r.data_categories || [], allowed_countries: r.allowed_countries || [] }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.DataClassificationRegister.update(editing.id, form);
        toast({ title: "Classification record updated" });
      } else {
        await base44.entities.DataClassificationRegister.create(form);
        toast({ title: "Classification record created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (r) => {
    if (!confirm("Delete this classification record?")) return;
    try {
      await base44.entities.DataClassificationRegister.delete(r.id);
      toast({ title: "Record deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleCategory = (cat) => {
    const cats = form.data_categories || [];
    setForm({ ...form, data_categories: cats.includes(cat) ? cats.filter((c) => c !== cat) : [...cats, cat] });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Data Classification Register" subtitle="Unified register mapping data assets to classification levels (Public → Secret) with handling rules"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Asset</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Assets" value={stats.total} icon={Layers} />
        <StatBox label="Classified" value={stats.classified} color="text-emerald-600" icon={ShieldCheck} />
        <StatBox label="Unclassified" value={stats.unclassified} color="text-amber-600" icon={AlertTriangle} />
        <StatBox label="Restricted/Secret" value={stats.secret} color="text-rose-600" icon={Lock} />
      </div>

      {stats.unclassified > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{stats.unclassified} data asset(s) are unclassified</p>
            <p className="text-xs text-amber-600">POPIA/GDPR requires all data assets to have a defined classification level and handling rules.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} className="text-xs bg-muted border-0 outline-none px-3 py-2 rounded-lg cursor-pointer">
          <option value="all">All Classifications</option>
          {CLASSIFICATION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Asset</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3">Classification</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Data Categories</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Owner</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Storage</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Encryption</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No data assets found.</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{r.asset_name}</p>
                    <p className="text-xs text-muted-foreground">{r.register_id}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary">{r.asset_type?.replace(/_/g, " ")}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge className={CLASS_STYLES[r.classification_level] || "bg-muted text-muted-foreground border-0"}>
                      {r.classification_level}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(r.data_categories || []).slice(0, 3).map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                      {(r.data_categories || []).length > 3 && <span className="text-xs text-muted-foreground">+{(r.data_categories || []).length - 3}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{r.data_owner_name || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">{r.storage_location || "—"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <div className="flex gap-1">
                      {r.encryption_at_rest && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Rest</Badge>}
                      {r.encryption_in_transit && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Transit</Badge>}
                      {!r.encryption_at_rest && !r.encryption_in_transit && <span className="text-xs text-rose-600">None</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Data Classification" : "New Data Classification"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Register ID</Label><Input value={form.register_id || ""} onChange={(e) => setForm({ ...form, register_id: e.target.value })} /></div>
              <div>
                <Label>Asset Type</Label>
                <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ASSET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Asset Name</Label><Input value={form.asset_name || ""} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} placeholder="e.g. Customer Database, Employee HR Records" /></div>
            <div>
              <Label>Classification Level</Label>
              <Select value={form.classification_level} onValueChange={(v) => setForm({ ...form, classification_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CLASSIFICATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Categories</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DATA_CATEGORIES.map((cat) => (
                  <button key={cat} type="button" onClick={() => toggleCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${(form.data_categories || []).includes(cat) ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border text-muted-foreground hover:bg-muted"}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data Owner</Label><Input value={form.data_owner_name || ""} onChange={(e) => setForm({ ...form, data_owner_name: e.target.value })} /></div>
              <div><Label>Data Custodian</Label><Input value={form.data_custodian_name || ""} onChange={(e) => setForm({ ...form, data_custodian_name: e.target.value })} /></div>
            </div>
            <div><Label>Storage Location</Label><Input value={form.storage_location || ""} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} placeholder="e.g. AWS eu-west-1, on-prem Johannesburg" /></div>
            <div><Label>Handling Rules</Label><Textarea value={form.handling_rules || ""} onChange={(e) => setForm({ ...form, handling_rules: e.target.value })} placeholder="e.g. Encrypt at rest with AES-256, access restricted to named individuals, no external sharing" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Access Restriction</Label>
                <Select value={form.access_restriction} onValueChange={(v) => setForm({ ...form, access_restriction: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCESS_RESTRICTIONS.map((a) => <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Disposal Method</Label>
                <Select value={form.disposal_method} onValueChange={(v) => setForm({ ...form, disposal_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DISPOSAL_METHODS.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Retention Period (days)</Label><Input type="number" value={form.retention_period_days || 0} onChange={(e) => setForm({ ...form, retention_period_days: +e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="enc_rest" checked={form.encryption_at_rest} onChange={(e) => setForm({ ...form, encryption_at_rest: e.target.checked })} className="rounded" />
                <Label htmlFor="enc_rest" className="text-sm cursor-pointer">Encrypt at rest</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="enc_transit" checked={form.encryption_in_transit} onChange={(e) => setForm({ ...form, encryption_in_transit: e.target.checked })} className="rounded" />
                <Label htmlFor="enc_transit" className="text-sm cursor-pointer">Encrypt in transit</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="share" checked={form.sharing_allowed} onChange={(e) => setForm({ ...form, sharing_allowed: e.target.checked })} className="rounded" />
                <Label htmlFor="share" className="text-sm cursor-pointer">Sharing allowed</Label>
              </div>
            </div>
            {form.sharing_allowed && <div><Label>Sharing Approved With</Label><Input value={form.sharing_approved_with || ""} onChange={(e) => setForm({ ...form, sharing_approved_with: e.target.value })} /></div>}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="backup_req" checked={form.backup_required} onChange={(e) => setForm({ ...form, backup_required: e.target.checked })} className="rounded" />
                <Label htmlFor="backup_req" className="text-sm cursor-pointer">Backup required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dpia_req" checked={form.dpia_required} onChange={(e) => setForm({ ...form, dpia_required: e.target.checked })} className="rounded" />
                <Label htmlFor="dpia_req" className="text-sm cursor-pointer">DPIA required</Label>
              </div>
              {form.dpia_required && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="dpia_done" checked={form.dpia_completed} onChange={(e) => setForm({ ...form, dpia_completed: e.target.checked })} className="rounded" />
                  <Label htmlFor="dpia_done" className="text-sm cursor-pointer">DPIA completed</Label>
                </div>
              )}
            </div>
            {form.backup_required && <div><Label>Backup Location</Label><Input value={form.backup_location || ""} onChange={(e) => setForm({ ...form, backup_location: e.target.value })} /></div>}
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Last Classified</Label><Input type="date" value={form.last_classified_date || ""} onChange={(e) => setForm({ ...form, last_classified_date: e.target.value })} /></div>
              <div><Label>Next Review</Label><Input type="date" value={form.next_review_date || ""} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></div>
              <div><Label>Review Freq (months)</Label><Input type="number" value={form.classification_review_frequency_months || 12} onChange={(e) => setForm({ ...form, classification_review_frequency_months: +e.target.value })} /></div>
            </div>
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