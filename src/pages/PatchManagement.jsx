import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Bandage, Plus, Search, Trash2, Pencil, Clock, ShieldCheck, AlertOctagon, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["detected", "patch_available", "in_testing", "verified", "deployed", "failed", "rolled_back"];
const SCANNER_SOURCES = ["nessus", "qualys", "openvas", "defender", "crowdstrike", "rapid7", "tenable", "snipe", "manual", "other"];
const CRYPTO_VERIFICATIONS = ["pending", "verified", "failed", "not_required"];
const REGRESSION_STATUSES = ["pending", "in_progress", "passed", "failed", "not_required"];
const DEPLOYMENT_METHODS = ["auto", "manual", "maintenance_window", "canary", "blue_green"];

const SLA_HOURS = { critical: 72, high: 168, medium: 720, low: 1440 };

export default function PatchManagement() {
  const { toast } = useToast();
  const [patches, setPatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterSla, setFilterSla] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    base44.entities.PatchRecord.list("-updated_date", 500)
      .then((d) => setPatches(d || []))
      .catch(() => toast({ title: "Failed to load patches", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = patches;
    if (filterSeverity !== "all") list = list.filter((p) => p.severity === filterSeverity);
    if (filterSla === "breached") list = list.filter((p) => p.sla_breached);
    else if (filterSla === "pending") list = list.filter((p) => p.status !== "deployed" && p.status !== "rolled_back" && !p.sla_breached);
    const q = search.toLowerCase();
    if (q) list = list.filter((p) =>
      p.patch_id?.toLowerCase().includes(q) ||
      p.patch_name?.toLowerCase().includes(q) ||
      p.cve?.toLowerCase().includes(q) ||
      p.asset_name?.toLowerCase().includes(q)
    );
    return list;
  }, [patches, search, filterSeverity, filterSla]);

  const stats = useMemo(() => ({
    total: patches.length,
    deployed: patches.filter((p) => p.status === "deployed").length,
    pending: patches.filter((p) => p.status !== "deployed" && p.status !== "rolled_back").length,
    slaBreached: patches.filter((p) => p.sla_breached).length,
  }), [patches]);

  const openCreate = () => {
    setEditing(null);
    setForm({ patch_id: `PATCH-${Date.now().toString().slice(-6)}`, patch_name: "", cve: "", asset_name: "", scanner_source: "manual", severity: "medium", status: "detected", detection_date: new Date().toISOString().slice(0, 10), patch_url: "", patch_checksum: "", cryptographic_verification: "pending", verification_method: "sha256", regression_test_status: "pending", deployment_method: "manual", deployment_status: "pending", owner_name: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const slaHours = SLA_HOURS[form.severity] || 0;
      const slaBreached = form.status !== "deployed" && form.detection_date && slaHours > 0 &&
        (Date.now() - new Date(form.detection_date).getTime()) / (1000 * 60 * 60) > slaHours;
      const payload = { ...form, sla_hours: slaHours, sla_breached: slaBreached };
      if (editing) {
        await base44.entities.PatchRecord.update(editing.id, payload);
        toast({ title: "Patch updated" });
      } else {
        await base44.entities.PatchRecord.create(payload);
        toast({ title: "Patch created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (p) => {
    if (!confirm("Delete this patch record?")) return;
    try {
      await base44.entities.PatchRecord.delete(p.id);
      toast({ title: "Patch deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Patch Management" subtitle="Patch lifecycle tracking with SLA compliance, cryptographic verification, and regression testing"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Patch</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Patches" value={stats.total} icon={Bandage} />
        <StatBox label="Deployed" value={stats.deployed} color="text-emerald-600" icon={ShieldCheck} />
        <StatBox label="Pending Deployment" value={stats.pending} color="text-amber-600" icon={Clock} />
        <StatBox label="SLA Breached" value={stats.slaBreached} color="text-rose-600" icon={AlertOctagon} />
      </div>

      {stats.slaBreached > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{stats.slaBreached} patch(es) have breached their SLA deadline</p>
            <p className="text-xs text-rose-600">Critical patches must be deployed within 72h, high within 7 days, medium within 30 days.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search patches..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterSla} onChange={(e) => setFilterSla(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All SLA</option>
            <option value="breached">SLA Breached</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Patch</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Asset</th>
                <th className="text-left px-4 py-3">Severity</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Crypto Verify</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Regression</th>
                <th className="text-left px-4 py-3">SLA</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No patches found.</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.patch_name || p.patch_id}</p>
                    {p.cve && <p className="text-xs text-muted-foreground font-mono">{p.cve}</p>}
                    <p className="text-xs text-muted-foreground">{p.patch_id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{p.asset_name || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge className={
                      p.severity === "critical" ? "bg-rose-100 text-rose-700 border-0" :
                      p.severity === "high" ? "bg-orange-100 text-orange-700 border-0" :
                      p.severity === "medium" ? "bg-amber-100 text-amber-700 border-0" :
                      "bg-blue-100 text-blue-700 border-0"
                    }>{p.severity}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={
                      p.status === "deployed" ? "bg-emerald-100 text-emerald-700 border-0" :
                      p.status === "failed" || p.status === "rolled_back" ? "bg-rose-100 text-rose-700 border-0" :
                      p.status === "verified" || p.status === "in_testing" ? "bg-blue-100 text-blue-700 border-0" :
                      "bg-muted text-muted-foreground border-0"
                    }>{p.status?.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {p.cryptographic_verification === "verified" ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">✓ Verified</Badge>
                      : p.cryptographic_verification === "failed" ? <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Failed</Badge>
                      : <span className="text-xs text-muted-foreground">{p.cryptographic_verification}</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`text-xs ${p.regression_test_status === "passed" ? "text-emerald-600" : p.regression_test_status === "failed" ? "text-rose-600" : "text-muted-foreground"}`}>
                      {p.regression_test_status?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.sla_breached ? <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Breached</Badge>
                      : p.status === "deployed" ? <span className="text-xs text-emerald-600">Met</span>
                      : <span className="text-xs text-muted-foreground">{p.sla_hours}h SLA</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Patch Record" : "New Patch Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patch ID</Label><Input value={form.patch_id || ""} onChange={(e) => setForm({ ...form, patch_id: e.target.value })} /></div>
              <div><Label>Patch Name / KB</Label><Input value={form.patch_name || ""} onChange={(e) => setForm({ ...form, patch_name: e.target.value })} placeholder="e.g. KB5034123" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>CVE</Label><Input value={form.cve || ""} onChange={(e) => setForm({ ...form, cve: e.target.value })} placeholder="e.g. CVE-2026-1234" /></div>
              <div><Label>Asset Name</Label><Input value={form.asset_name || ""} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Scanner Source</Label>
                <Select value={form.scanner_source} onValueChange={(v) => setForm({ ...form, scanner_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCANNER_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Detection Date</Label><Input type="date" value={form.detection_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, detection_date: e.target.value })} /></div>
              <div><Label>Patch URL</Label><Input value={form.patch_url || ""} onChange={(e) => setForm({ ...form, patch_url: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Patch Checksum (SHA-256)</Label><Input value={form.patch_checksum || ""} onChange={(e) => setForm({ ...form, patch_checksum: e.target.value })} className="font-mono text-xs" /></div>
              <div>
                <Label>Crypto Verification</Label>
                <Select value={form.cryptographic_verification} onValueChange={(v) => setForm({ ...form, cryptographic_verification: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CRYPTO_VERIFICATIONS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Regression Test</Label>
                <Select value={form.regression_test_status} onValueChange={(v) => setForm({ ...form, regression_test_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{REGRESSION_STATUSES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Deployment Method</Label>
                <Select value={form.deployment_method} onValueChange={(v) => setForm({ ...form, deployment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPLOYMENT_METHODS.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name || ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
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