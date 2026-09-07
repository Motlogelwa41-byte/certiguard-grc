import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { UserCog, Plus, Search, Trash2, Pencil, ShieldCheck, AlertTriangle, Clock, KeyRound, Video, Zap, Lock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const ACCOUNT_TYPES = ["break_glass", "service_account", "admin_account", "root_account", "database_admin", "cloud_admin", "network_admin", "domain_admin", "application_admin"];
const TARGET_TYPES = ["aws", "azure", "gcp", "linux", "windows", "database", "network_device", "saas_app", "hypervisor", "active_directory", "other"];
const ELEVATION_TYPES = ["standing", "just_in_time", "break_glass"];
const STATUSES = ["active", "disabled", "expired", "locked", "compromised"];
const USAGE_FREQUENCIES = ["frequent", "occasional", "rare", "emergency_only"];

const ELEVATION_ICONS = {
  standing: KeyRound, just_in_time: Zap, break_glass: AlertTriangle,
};

export default function PrivilegedAccessManagement() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterElevation, setFilterElevation] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [jitDialogOpen, setJitDialogOpen] = useState(false);
  const [jitAccount, setJitAccount] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [jitForm, setJitForm] = useState({ reason: "", duration_minutes: 60 });

  const load = () => {
    base44.entities.PrivilegedAccessAccount.list("-updated_date", 500)
      .then((d) => setAccounts(d || []))
      .catch(() => toast({ title: "Failed to load PAM accounts", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = accounts;
    if (filterType !== "all") list = list.filter((a) => a.account_type === filterType);
    if (filterElevation !== "all") list = list.filter((a) => a.elevation_type === filterElevation);
    const q = search.toLowerCase();
    if (q) list = list.filter((a) =>
      a.account_id?.toLowerCase().includes(q) ||
      a.account_name?.toLowerCase().includes(q) ||
      a.target_system?.toLowerCase().includes(q) ||
      a.assigned_to_name?.toLowerCase().includes(q)
    );
    return list;
  }, [accounts, search, filterType, filterElevation]);

  const stats = useMemo(() => ({
    total: accounts.length,
    active: accounts.filter((a) => a.status === "active").length,
    breakGlass: accounts.filter((a) => a.account_type === "break_glass").length,
    jitActive: accounts.filter((a) => a.elevation_type === "just_in_time" && a.jit_expires_at && new Date(a.jit_expires_at) > new Date()).length,
    noMfa: accounts.filter((a) => a.status === "active" && a.mfa_required && !a.mfa_enrolled).length,
    overdueReview: accounts.filter((a) => a.next_review_date && new Date(a.next_review_date) < new Date()).length,
  }), [accounts]);

  const openCreate = () => {
    setEditing(null);
    setForm({ account_id: `PAM-${Date.now().toString().slice(-4)}`, account_name: "", account_type: "admin_account", target_system: "", target_system_type: "linux", assigned_to_name: "", status: "active", elevation_type: "just_in_time", jit_approval_required: true, jit_max_duration_minutes: 60, session_recording_enabled: true, mfa_required: true, mfa_enrolled: false, password_vaulted: true, password_last_rotated: "", password_rotation_frequency_days: 90, credential_checkout_required: true, access_justification: "", usage_frequency: "occasional", monitoring_enabled: true, alert_on_anomalous_use: true, review_frequency_months: 6, last_reviewed_date: "", next_review_date: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (a) => { setEditing(a); setForm({ ...a }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.PrivilegedAccessAccount.update(editing.id, form);
        toast({ title: "PAM account updated" });
      } else {
        await base44.entities.PrivilegedAccessAccount.create(form);
        toast({ title: "PAM account created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (a) => {
    if (!confirm("Delete this privileged access account?")) return;
    try {
      await base44.entities.PrivilegedAccessAccount.delete(a.id);
      toast({ title: "Account deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const openJit = (a) => {
    setJitAccount(a);
    setJitForm({ reason: "", duration_minutes: a.jit_max_duration_minutes || 60 });
    setJitDialogOpen(true);
  };

  const handleJitRequest = async () => {
    if (!jitForm.reason.trim()) {
      toast({ title: "Reason required for JIT elevation", variant: "destructive" });
      return;
    }
    try {
      const now = new Date();
      const expires = new Date(now.getTime() + (jitForm.duration_minutes || 60) * 60 * 1000);
      await base44.entities.PrivilegedAccessAccount.update(jitAccount.id, {
        jit_request_reason: jitForm.reason,
        jit_requested_at: now.toISOString(),
        jit_approved_by: "self_approved",
        jit_approved_at: now.toISOString(),
        jit_expires_at: expires.toISOString(),
        last_used_at: now.toISOString(),
      });
      toast({ title: "JIT elevation granted", description: `Access expires at ${expires.toLocaleString()}` });
      setJitDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "JIT request failed", description: e.message, variant: "destructive" });
    }
  };

  const handleRevokeJit = async (a) => {
    try {
      await base44.entities.PrivilegedAccessAccount.update(a.id, { jit_expires_at: new Date().toISOString() });
      toast({ title: "JIT access revoked" });
      load();
    } catch (e) {
      toast({ title: "Revoke failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Privileged Access Management" subtitle="Break-glass accounts, just-in-time elevation, privileged session recording — banking-grade PAM"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Account</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox label="Total Accounts" value={stats.total} icon={UserCog} />
        <StatBox label="Active" value={stats.active} color="text-emerald-600" icon={ShieldCheck} />
        <StatBox label="Break-Glass" value={stats.breakGlass} color="text-orange-600" icon={AlertTriangle} />
        <StatBox label="JIT Active" value={stats.jitActive} color="text-blue-600" icon={Zap} />
        <StatBox label="Overdue Review" value={stats.overdueReview} color="text-rose-600" icon={Clock} />
      </div>

      {(stats.noMfa > 0 || stats.overdueReview > 0) && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">
              {stats.noMfa > 0 && `${stats.noMfa} account(s) missing MFA enrollment`}
              {stats.noMfa > 0 && stats.overdueReview > 0 && " · "}
              {stats.overdueReview > 0 && `${stats.overdueReview} account(s) overdue for review`}
            </p>
            <p className="text-xs text-rose-600">Banking standards require MFA on all privileged accounts and periodic access reviews.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Types</option>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterElevation} onChange={(e) => setFilterElevation(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Elevation</option>
            {ELEVATION_TYPES.map((e) => <option key={e} value={e}>{e.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Account</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Target System</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Elevation</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">MFA</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Session Rec</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">JIT Expiry</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">No privileged accounts found.</td></tr>}
              {filtered.map((a) => {
                const ElevIcon = ELEVATION_ICONS[a.elevation_type] || KeyRound;
                const jitActive = a.jit_expires_at && new Date(a.jit_expires_at) > new Date();
                const jitExpired = a.jit_expires_at && new Date(a.jit_expires_at) <= new Date();
                return (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{a.account_name}</p>
                      <p className="text-xs text-muted-foreground">{a.assigned_to_name || "Unassigned"} · {a.account_id}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{a.target_system || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="secondary">{a.account_type?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ElevIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs">{a.elevation_type?.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={
                        a.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" :
                        a.status === "compromised" ? "bg-rose-100 text-rose-700 border-0" :
                        a.status === "locked" ? "bg-amber-100 text-amber-700 border-0" :
                        "bg-muted text-muted-foreground border-0"
                      }>{a.status}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.mfa_required ? (a.mfa_enrolled ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Enrolled</Badge> : <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Missing</Badge>)
                        : <span className="text-xs text-muted-foreground">Not req.</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.session_recording_enabled ? <Video className="w-4 h-4 text-emerald-600" /> : <span className="text-xs text-muted-foreground">Off</span>}
                    </td>
                    <td className="px-4 py-3 text-xs hidden xl:table-cell">
                      {jitActive ? <span className="text-emerald-600 font-medium">{new Date(a.jit_expires_at).toLocaleString()}</span>
                        : jitExpired ? <span className="text-rose-600">Expired</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {a.elevation_type === "just_in_time" && !jitActive && a.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => openJit(a)} className="text-xs h-7"><Zap className="w-3 h-3" /> Elevate</Button>
                        )}
                        {jitActive && <Button size="sm" variant="outline" onClick={() => handleRevokeJit(a)} className="text-xs h-7 text-rose-600 border-rose-300">Revoke</Button>}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(a)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Privileged Account" : "New Privileged Account"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Account ID</Label><Input value={form.account_id || ""} onChange={(e) => setForm({ ...form, account_id: e.target.value })} /></div>
              <div><Label>Account Name</Label><Input value={form.account_name || ""} onChange={(e) => setForm({ ...form, account_name: e.target.value })} placeholder="e.g. AWS Root, prod-db-admin" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Account Type</Label>
                <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target System Type</Label>
                <Select value={form.target_system_type} onValueChange={(v) => setForm({ ...form, target_system_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TARGET_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Target System</Label><Input value={form.target_system || ""} onChange={(e) => setForm({ ...form, target_system: e.target.value })} placeholder="e.g. prod-database-cluster-01" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assigned To</Label><Input value={form.assigned_to_name || ""} onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })} /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Elevation Type</Label>
                <Select value={form.elevation_type} onValueChange={(v) => setForm({ ...form, elevation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ELEVATION_TYPES.map((e) => <SelectItem key={e} value={e}>{e.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>JIT Max Duration (min)</Label><Input type="number" value={form.jit_max_duration_minutes || 60} onChange={(e) => setForm({ ...form, jit_max_duration_minutes: +e.target.value })} /></div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="jit_app" checked={form.jit_approval_required} onChange={(e) => setForm({ ...form, jit_approval_required: e.target.checked })} className="rounded" />
                <Label htmlFor="jit_app" className="text-sm cursor-pointer">JIT approval required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sess_rec" checked={form.session_recording_enabled} onChange={(e) => setForm({ ...form, session_recording_enabled: e.target.checked })} className="rounded" />
                <Label htmlFor="sess_rec" className="text-sm cursor-pointer">Session recording</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mfa_req" checked={form.mfa_required} onChange={(e) => setForm({ ...form, mfa_required: e.target.checked })} className="rounded" />
                <Label htmlFor="mfa_req" className="text-sm cursor-pointer">MFA required</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="mfa_enr" checked={form.mfa_enrolled} onChange={(e) => setForm({ ...form, mfa_enrolled: e.target.checked })} className="rounded" />
                <Label htmlFor="mfa_enr" className="text-sm cursor-pointer">MFA enrolled</Label>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vaulted" checked={form.password_vaulted} onChange={(e) => setForm({ ...form, password_vaulted: e.target.checked })} className="rounded" />
                <Label htmlFor="vaulted" className="text-sm cursor-pointer">Password vaulted</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="checkout" checked={form.credential_checkout_required} onChange={(e) => setForm({ ...form, credential_checkout_required: e.target.checked })} className="rounded" />
                <Label htmlFor="checkout" className="text-sm cursor-pointer">Checkout required</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Password Last Rotated</Label><Input type="date" value={form.password_last_rotated || ""} onChange={(e) => setForm({ ...form, password_last_rotated: e.target.value })} /></div>
              <div><Label>Rotation Freq (days)</Label><Input type="number" value={form.password_rotation_frequency_days || 90} onChange={(e) => setForm({ ...form, password_rotation_frequency_days: +e.target.value })} /></div>
            </div>
            <div><Label>Access Justification</Label><Textarea value={form.access_justification || ""} onChange={(e) => setForm({ ...form, access_justification: e.target.value })} placeholder="Why does this person need privileged access?" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Usage Frequency</Label>
                <Select value={form.usage_frequency} onValueChange={(v) => setForm({ ...form, usage_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{USAGE_FREQUENCIES.map((u) => <SelectItem key={u} value={u}>{u.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Last Reviewed</Label><Input type="date" value={form.last_reviewed_date || ""} onChange={(e) => setForm({ ...form, last_reviewed_date: e.target.value })} /></div>
              <div><Label>Next Review</Label><Input type="date" value={form.next_review_date || ""} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JIT Elevation Dialog */}
      <Dialog open={jitDialogOpen} onOpenChange={setJitDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Just-In-Time Elevation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p><span className="text-muted-foreground">Account:</span> <span className="font-medium">{jitAccount?.account_name}</span></p>
              <p><span className="text-muted-foreground">Target:</span> <span className="font-medium">{jitAccount?.target_system}</span></p>
              <p><span className="text-muted-foreground">Max duration:</span> <span className="font-medium">{jitAccount?.jit_max_duration_minutes || 60} min</span></p>
            </div>
            <div>
              <Label>Reason for Elevation</Label>
              <Textarea value={jitForm.reason} onChange={(e) => setJitForm({ ...jitForm, reason: e.target.value })} placeholder="e.g. Emergency database restore for prod-cluster-01" />
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" value={jitForm.duration_minutes} onChange={(e) => setJitForm({ ...jitForm, duration_minutes: +e.target.value })} max={jitAccount?.jit_max_duration_minutes || 60} />
              <p className="text-xs text-muted-foreground mt-1">Maximum allowed: {jitAccount?.jit_max_duration_minutes || 60} minutes</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2">
              <Video className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">Session recording is {jitAccount?.session_recording_enabled ? "enabled" : "disabled"} for this account.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJitDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleJitRequest}><Zap className="w-4 h-4" /> Grant Access</Button>
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