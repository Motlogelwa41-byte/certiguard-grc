import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Building, Plus, Search, Trash2, Pencil, ShieldCheck, AlertTriangle, Clock, Camera, KeyRound, Users, DoorOpen } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CONTROL_TYPES = ["badge_access", "visitor_management", "cctv_surveillance", "data_center_access", "perimeter_security", "key_management", "environmental_control", "clean_desk_clear_screen", "physical_inventory", "secure_disposal"];
const STATUSES = ["active", "inactive", "non_compliant", "under_review", "remediation_required"];
const BADGE_SYSTEMS = ["hid_prox", "smart_card", "biometric", "mobile_credential", "pin_pad", "mixed", "not_applicable"];
const VISITOR_SIGNIN = ["paper_logbook", "digital_kiosk", "biometric", "qr_code", "security_desk", "not_applicable"];
const CCTV_MONITORING = ["live_monitoring", "recorded_only", "both", "not_applicable"];
const DC_ACCESS = ["biometric", "mantrap", "card_reader", "security_guard", "multi_factor", "not_applicable"];
const PERIMETER_TYPES = ["fencing", "security_guard", "intrusion_detection", "cctv_perimeter", "barrier", "not_applicable"];
const KEY_MGMT = ["electronic_key_system", "physical_lockbox", "key_card", "combination_lock", "not_applicable"];

const TYPE_ICONS = {
  badge_access: KeyRound, visitor_management: Users, cctv_surveillance: Camera,
  data_center_access: DoorOpen, perimeter_security: Building, key_management: KeyRound,
  environmental_control: AlertTriangle, clean_desk_clear_screen: ShieldCheck,
  physical_inventory: Building, secure_disposal: ShieldCheck,
};

export default function PhysicalSecurity() {
  const { toast } = useToast();
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    base44.entities.PhysicalSecurityControl.list("-updated_date", 200)
      .then((d) => setControls(d || []))
      .catch(() => toast({ title: "Failed to load controls", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = controls;
    if (filterType !== "all") list = list.filter((c) => c.control_type === filterType);
    const q = search.toLowerCase();
    if (q) list = list.filter((c) =>
      c.control_name?.toLowerCase().includes(q) ||
      c.control_id?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.control_owner_name?.toLowerCase().includes(q)
    );
    return list;
  }, [controls, search, filterType]);

  const stats = useMemo(() => ({
    total: controls.length,
    active: controls.filter((c) => c.status === "active").length,
    nonCompliant: controls.filter((c) => c.status === "non_compliant" || c.status === "remediation_required").length,
    overdueAudit: controls.filter((c) => c.next_audit_date && new Date(c.next_audit_date) < new Date()).length,
  }), [controls]);

  const openCreate = () => {
    setEditing(null);
    setForm({ control_id: `PHY-${Date.now().toString().slice(-4)}`, control_name: "", control_type: "badge_access", location: "", description: "", status: "active", control_owner_name: "", last_audit_date: "", next_audit_date: "", audit_frequency_months: 12, badge_system_type: "not_applicable", badge_access_log_retention_days: 365, active_badge_count: 0, revoked_badge_count: 0, visitor_log_required: true, visitor_sign_in_method: "digital_kiosk", visitor_escort_required: true, visitor_log_retention_days: 365, monthly_visitor_count: 0, cctv_camera_count: 0, cctv_retention_days: 90, cctv_monitoring_type: "both", cctv_offsite_backup: false, data_center_access_control: "not_applicable", perimeter_security_type: "not_applicable", key_management_method: "not_applicable", evidence_url: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.PhysicalSecurityControl.update(editing.id, form);
        toast({ title: "Control updated" });
      } else {
        await base44.entities.PhysicalSecurityControl.create(form);
        toast({ title: "Control created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (c) => {
    if (!confirm("Delete this physical security control?")) return;
    try {
      await base44.entities.PhysicalSecurityControl.delete(c.id);
      toast({ title: "Control deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Physical Security" subtitle="Badge access, visitor management, CCTV, data center physical controls — SOC 2 CC6.4 compliance"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Control</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Controls" value={stats.total} icon={Building} />
        <StatBox label="Active" value={stats.active} color="text-emerald-600" icon={ShieldCheck} />
        <StatBox label="Non-Compliant" value={stats.nonCompliant} color="text-rose-600" icon={AlertTriangle} />
        <StatBox label="Overdue Audit" value={stats.overdueAudit} color="text-amber-600" icon={Clock} />
      </div>

      {stats.nonCompliant > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{stats.nonCompliant} physical security control(s) are non-compliant</p>
            <p className="text-xs text-rose-600">SOC 2 CC6.4 and banking standards require all physical controls to be active and compliant.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search controls..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs bg-muted border-0 outline-none px-3 py-2 rounded-lg cursor-pointer">
          <option value="all">All Types</option>
          {CONTROL_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Control</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Last Audit</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Next Audit</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No physical security controls found.</td></tr>}
              {filtered.map((c) => {
                const Icon = TYPE_ICONS[c.control_type] || Building;
                const overdue = c.next_audit_date && new Date(c.next_audit_date) < new Date();
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{c.control_name}</p>
                          <p className="text-xs text-muted-foreground">{c.control_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary">{c.control_type?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{c.location || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={
                        c.status === "active" ? "bg-emerald-100 text-emerald-700 border-0" :
                        c.status === "non_compliant" || c.status === "remediation_required" ? "bg-rose-100 text-rose-700 border-0" :
                        c.status === "under_review" ? "bg-amber-100 text-amber-700 border-0" :
                        "bg-muted text-muted-foreground border-0"
                      }>{c.status?.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{c.last_audit_date || "—"}</td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">
                      <span className={overdue ? "text-rose-600 font-medium" : "text-muted-foreground"}>{c.next_audit_date || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Physical Security Control" : "New Physical Security Control"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Control ID</Label><Input value={form.control_id || ""} onChange={(e) => setForm({ ...form, control_id: e.target.value })} /></div>
              <div><Label>Control Name</Label><Input value={form.control_name || ""} onChange={(e) => setForm({ ...form, control_name: e.target.value })} placeholder="e.g. Data Center Biometric Access" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Control Type</Label>
                <Select value={form.control_type} onValueChange={(v) => setForm({ ...form, control_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTROL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
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
            <div><Label>Location</Label><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. HQ Building, Floor 3, Server Room A" /></div>
            <div><Label>Description</Label><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Control Owner</Label><Input value={form.control_owner_name || ""} onChange={(e) => setForm({ ...form, control_owner_name: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Last Audit</Label><Input type="date" value={form.last_audit_date || ""} onChange={(e) => setForm({ ...form, last_audit_date: e.target.value })} /></div>
              <div><Label>Next Audit</Label><Input type="date" value={form.next_audit_date || ""} onChange={(e) => setForm({ ...form, next_audit_date: e.target.value })} /></div>
              <div><Label>Audit Freq (months)</Label><Input type="number" value={form.audit_frequency_months || 12} onChange={(e) => setForm({ ...form, audit_frequency_months: +e.target.value })} /></div>
            </div>

            {form.control_type === "badge_access" && (
              <>
                <div className="border-t pt-3 mt-3 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Badge Access Settings</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Badge System Type</Label>
                      <Select value={form.badge_system_type} onValueChange={(v) => setForm({ ...form, badge_system_type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{BADGE_SYSTEMS.map((b) => <SelectItem key={b} value={b}>{b.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Access Log Retention (days)</Label><Input type="number" value={form.badge_access_log_retention_days || 365} onChange={(e) => setForm({ ...form, badge_access_log_retention_days: +e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Active Badges</Label><Input type="number" value={form.active_badge_count || 0} onChange={(e) => setForm({ ...form, active_badge_count: +e.target.value })} /></div>
                    <div><Label>Revoked Badges</Label><Input type="number" value={form.revoked_badge_count || 0} onChange={(e) => setForm({ ...form, revoked_badge_count: +e.target.value })} /></div>
                  </div>
                </div>
              </>
            )}

            {form.control_type === "visitor_management" && (
              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Visitor Management Settings</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="visitor_log_req" checked={form.visitor_log_required} onChange={(e) => setForm({ ...form, visitor_log_required: e.target.checked })} className="rounded" />
                  <Label htmlFor="visitor_log_req" className="text-sm cursor-pointer">Visitor log required</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Sign-In Method</Label>
                    <Select value={form.visitor_sign_in_method} onValueChange={(v) => setForm({ ...form, visitor_sign_in_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{VISITOR_SIGNIN.map((v) => <SelectItem key={v} value={v}>{v.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Visitor Log Retention (days)</Label><Input type="number" value={form.visitor_log_retention_days || 365} onChange={(e) => setForm({ ...form, visitor_log_retention_days: +e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="visitor_escort" checked={form.visitor_escort_required} onChange={(e) => setForm({ ...form, visitor_escort_required: e.target.checked })} className="rounded" />
                  <Label htmlFor="visitor_escort" className="text-sm cursor-pointer">Escort required for visitors</Label>
                </div>
                <div><Label>Monthly Visitor Count</Label><Input type="number" value={form.monthly_visitor_count || 0} onChange={(e) => setForm({ ...form, monthly_visitor_count: +e.target.value })} /></div>
              </div>
            )}

            {form.control_type === "cctv_surveillance" && (
              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">CCTV Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Camera Count</Label><Input type="number" value={form.cctv_camera_count || 0} onChange={(e) => setForm({ ...form, cctv_camera_count: +e.target.value })} /></div>
                  <div><Label>Retention (days)</Label><Input type="number" value={form.cctv_retention_days || 90} onChange={(e) => setForm({ ...form, cctv_retention_days: +e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Monitoring Type</Label>
                    <Select value={form.cctv_monitoring_type} onValueChange={(v) => setForm({ ...form, cctv_monitoring_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CCTV_MONITORING.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end pb-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="cctv_backup" checked={form.cctv_offsite_backup} onChange={(e) => setForm({ ...form, cctv_offsite_backup: e.target.checked })} className="rounded" />
                      <Label htmlFor="cctv_backup" className="text-sm cursor-pointer">Offsite backup</Label>
                    </div>
                  </div>
                </div>
                <div><Label>Coverage Areas</Label><Input value={form.cctv_coverage_areas || ""} onChange={(e) => setForm({ ...form, cctv_coverage_areas: e.target.value })} placeholder="e.g. entrance, server room, parking, reception" /></div>
              </div>
            )}

            {form.control_type === "data_center_access" && (
              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Data Center Access</p>
                <div>
                  <Label>Access Control Method</Label>
                  <Select value={form.data_center_access_control} onValueChange={(v) => setForm({ ...form, data_center_access_control: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DC_ACCESS.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Environmental Controls</Label><Input value={form.environmental_controls || ""} onChange={(e) => setForm({ ...form, environmental_controls: e.target.value })} placeholder="e.g. fire_suppression, hvac_monitoring, water_leak_detection, ups_backup" /></div>
              </div>
            )}

            {form.control_type === "perimeter_security" && (
              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Perimeter Security</p>
                <div>
                  <Label>Perimeter Type</Label>
                  <Select value={form.perimeter_security_type} onValueChange={(v) => setForm({ ...form, perimeter_security_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIMETER_TYPES.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {form.control_type === "key_management" && (
              <div className="border-t pt-3 mt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Key Management</p>
                <div>
                  <Label>Key Management Method</Label>
                  <Select value={form.key_management_method} onValueChange={(v) => setForm({ ...form, key_management_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{KEY_MGMT.map((k) => <SelectItem key={k} value={k}>{k.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div><Label>Evidence URL</Label><Input value={form.evidence_url || ""} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} placeholder="Link to audit report, photo, or log sample" /></div>
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