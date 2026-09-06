import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Fingerprint, Plus, Search, Trash2, Pencil, ShieldCheck, ShieldX, Eye } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const RESOURCE_TYPES = ["control", "risk", "evidence", "vendor", "policy", "incident", "audit", "asset", "remediation", "privacy_request", "cybersecurity_risk", "all"];
const ACTIONS = ["read", "write", "delete", "approve", "export", "assign", "all"];
const EFFECTS = ["allow", "deny"];
const CONDITIONS = ["user_and_resource", "user_only", "resource_only", "user_or_resource", "environment_only"];
const ENFORCEMENT_MODES = ["enforce", "monitor", "audit_only"];

export default function AbacPolicyManager() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ policy_id: "", name: "", description: "", resource_type: "all", action: "read", effect: "deny", priority: 100, user_attribute: "role", user_attribute_value: "", resource_attribute: "", resource_attribute_value: "", condition_logic: "user_and_resource", status: "active", enforcement_mode: "enforce", notes: "" });

  const load = () => {
    base44.entities.AbacPolicy.list("-priority", 200)
      .then((d) => setPolicies(d || []))
      .catch(() => toast({ title: "Failed to load policies", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = policies.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.name?.toLowerCase().includes(q) || p.policy_id?.toLowerCase().includes(q) || p.resource_type?.includes(q);
  });

  const stats = {
    total: policies.length,
    active: policies.filter((p) => p.status === "active").length,
    deny: policies.filter((p) => p.effect === "deny").length,
    monitor: policies.filter((p) => p.enforcement_mode === "monitor" || p.enforcement_mode === "audit_only").length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ policy_id: `ABAC-${Date.now().toString().slice(-4)}`, name: "", description: "", resource_type: "all", action: "read", effect: "deny", priority: 100, user_attribute: "role", user_attribute_value: "", resource_attribute: "", resource_attribute_value: "", condition_logic: "user_and_resource", status: "active", enforcement_mode: "enforce", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (p) => { setEditing(p); setForm({ ...p }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.AbacPolicy.update(editing.id, form);
        toast({ title: "Policy updated" });
      } else {
        await base44.entities.AbacPolicy.create(form);
        toast({ title: "Policy created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (p) => {
    if (!confirm("Delete this ABAC policy?")) return;
    try {
      await base44.entities.AbacPolicy.delete(p.id);
      toast({ title: "Policy deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="ABAC Policy Manager" subtitle="Attribute-Based Access Control policies for fine-grained authorization"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> New Policy</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Policies" value={stats.total} icon={Fingerprint} />
        <StatBox label="Active" value={stats.active} color="text-emerald-600" icon={ShieldCheck} />
        <StatBox label="Deny Policies" value={stats.deny} color="text-rose-600" icon={ShieldX} />
        <StatBox label="Monitor / Audit" value={stats.monitor} color="text-amber-600" icon={Eye} />
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Policy</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Resource</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Effect</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Priority</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Condition</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No ABAC policies found.</td></tr>}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.policy_id}</p>
                    {p.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary">{p.resource_type}</Badge></td>
                  <td className="px-4 py-3 text-xs">{p.action}</td>
                  <td className="px-4 py-3">
                    <Badge className={p.effect === "deny" ? "bg-rose-100 text-rose-700 border-0" : "bg-emerald-100 text-emerald-700 border-0"}>
                      {p.effect === "deny" ? <ShieldX className="w-3 h-3 mr-1" /> : <ShieldCheck className="w-3 h-3 mr-1" />}
                      {p.effect}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs hidden sm:table-cell">{p.priority}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{p.condition_logic?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge className={p.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-muted text-muted-foreground border-0"}>
                      {p.status}
                    </Badge>
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
          <DialogHeader><DialogTitle>{editing ? "Edit ABAC Policy" : "New ABAC Policy"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Policy ID</Label><Input value={form.policy_id} onChange={(e) => setForm({ ...form, policy_id: e.target.value })} /></div>
              <div><Label>Policy Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deny non-compliance users from exporting evidence" /></div>
            </div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Resource Type</Label>
                <Select value={form.resource_type} onValueChange={(v) => setForm({ ...form, resource_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESOURCE_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Action</Label>
                <Select value={form.action} onValueChange={(v) => setForm({ ...form, action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Effect</Label>
                <Select value={form.effect} onValueChange={(v) => setForm({ ...form, effect: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EFFECTS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority (higher = overrides)</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: +e.target.value })} /></div>
              <div>
                <Label>Enforcement Mode</Label>
                <Select value={form.enforcement_mode} onValueChange={(v) => setForm({ ...form, enforcement_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENFORCEMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>User Attribute</Label><Input value={form.user_attribute} onChange={(e) => setForm({ ...form, user_attribute: e.target.value })} placeholder="e.g. role, department, clearance_level" /></div>
              <div><Label>User Attribute Value</Label><Input value={form.user_attribute_value} onChange={(e) => setForm({ ...form, user_attribute_value: e.target.value })} placeholder="e.g. admin, finance, top_secret" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Resource Attribute</Label><Input value={form.resource_attribute} onChange={(e) => setForm({ ...form, resource_attribute: e.target.value })} placeholder="e.g. classification, severity, category" /></div>
              <div><Label>Resource Attribute Value</Label><Input value={form.resource_attribute_value} onChange={(e) => setForm({ ...form, resource_attribute_value: e.target.value })} placeholder="e.g. restricted, critical" /></div>
            </div>
            <div>
              <Label>Condition Logic</Label>
              <Select value={form.condition_logic} onValueChange={(v) => setForm({ ...form, condition_logic: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["active", "draft", "disabled"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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