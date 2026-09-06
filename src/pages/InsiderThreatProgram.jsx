import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Eye, Plus, Search, Trash2, Pencil, ShieldAlert, UserX, Activity } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const RISK_LEVELS = ["low", "medium", "high", "critical"];
const CASE_STATUSES = ["monitoring", "investigating", "escalated", "contained", "closed", "false_positive"];
const DETECTION_SOURCES = ["siem_alert", "hr_referral", "behavioral_analytics", "peer_report", "access_anomaly", "dlp_alert", "data_exfiltration", "after_hours_activity", "policy_violation", "other"];
const ENROLLMENT_REASONS = ["privileged_access", "sensitive_data_access", "departure_watch", "behavioral_concern", "hr_referral", "access_anomaly", "proactive_monitoring", "incident_triggered"];

export default function InsiderThreatProgram() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ case_id: "", case_name: "", subject_name: "", subject_department: "", subject_role: "", subject_employment_type: "employee", enrollment_date: "", enrollment_reason: "proactive_monitoring", risk_level: "low", case_status: "monitoring", detection_source: "behavioral_analytics", indicators_observed: "", investigation_notes: "", assigned_to_name: "", notes: "" });

  const load = () => {
    base44.entities.InsiderThreatCase.list("-updated_date", 200)
      .then((d) => setCases(d || []))
      .catch(() => toast({ title: "Failed to load cases", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = cases.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.case_name?.toLowerCase().includes(q) || c.subject_name?.toLowerCase().includes(q) || c.subject_department?.toLowerCase().includes(q);
  });

  const stats = {
    total: cases.length,
    active: cases.filter((c) => c.case_status === "monitoring" || c.case_status === "investigating").length,
    escalated: cases.filter((c) => c.case_status === "escalated" || c.risk_level === "critical").length,
    closed: cases.filter((c) => c.case_status === "closed" || c.case_status === "false_positive").length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ case_id: `IT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, case_name: "", subject_name: "", subject_department: "", subject_role: "", subject_employment_type: "employee", enrollment_date: new Date().toISOString().slice(0, 10), enrollment_reason: "proactive_monitoring", risk_level: "low", case_status: "monitoring", detection_source: "behavioral_analytics", indicators_observed: "", investigation_notes: "", assigned_to_name: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.InsiderThreatCase.update(editing.id, form);
        toast({ title: "Case updated" });
      } else {
        await base44.entities.InsiderThreatCase.create(form);
        toast({ title: "Case created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (c) => {
    if (!confirm("Delete this insider threat case?")) return;
    try {
      await base44.entities.InsiderThreatCase.delete(c.id);
      toast({ title: "Case deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Insider Threat Program" subtitle="Monitor, investigate, and resolve insider threat cases"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> New Case</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Cases" value={stats.total} icon={Eye} />
        <StatBox label="Active" value={stats.active} color="text-amber-600" icon={Activity} />
        <StatBox label="Escalated / Critical" value={stats.escalated} color="text-rose-600" icon={ShieldAlert} />
        <StatBox label="Closed" value={stats.closed} color="text-emerald-600" icon={UserX} />
      </div>

      {stats.escalated > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{stats.escalated} escalated or critical insider threat case(s)</p>
            <p className="text-xs text-rose-600">Immediate review required — coordinate with HR, Legal, and Security teams.</p>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search cases..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Case</th>
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Detection</th>
                <th className="text-left px-4 py-3">Risk</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Assigned To</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No insider threat cases found.</td></tr>}
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{c.case_name}</p>
                    <p className="text-xs text-muted-foreground">{c.case_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{c.subject_name}</p>
                    <p className="text-xs text-muted-foreground">{c.subject_department} · {c.subject_role}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{c.detection_source?.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge className={
                      c.risk_level === "critical" ? "bg-rose-100 text-rose-700 border-0" :
                      c.risk_level === "high" ? "bg-orange-100 text-orange-700 border-0" :
                      c.risk_level === "medium" ? "bg-amber-100 text-amber-700 border-0" :
                      "bg-emerald-100 text-emerald-700 border-0"
                    }>{c.risk_level}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{c.case_status?.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{c.assigned_to_name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Insider Threat Case" : "New Insider Threat Case"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Case ID</Label><Input value={form.case_id} onChange={(e) => setForm({ ...form, case_id: e.target.value })} /></div>
              <div><Label>Case Name</Label><Input value={form.case_name} onChange={(e) => setForm({ ...form, case_name: e.target.value })} placeholder="e.g. Suspicious data exfiltration — J. Smith" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Subject Name</Label><Input value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.subject_department} onChange={(e) => setForm({ ...form, subject_department: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Role / Title</Label><Input value={form.subject_role} onChange={(e) => setForm({ ...form, subject_role: e.target.value })} /></div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.subject_employment_type} onValueChange={(v) => setForm({ ...form, subject_employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["employee", "contractor", "vendor", "intern", "departing", "former"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Enrollment Date</Label><Input type="date" value={form.enrollment_date || ""} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} /></div>
              <div>
                <Label>Enrollment Reason</Label>
                <Select value={form.enrollment_reason} onValueChange={(v) => setForm({ ...form, enrollment_reason: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ENROLLMENT_REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISK_LEVELS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Case Status</Label>
                <Select value={form.case_status} onValueChange={(v) => setForm({ ...form, case_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Detection Source</Label>
                <Select value={form.detection_source} onValueChange={(v) => setForm({ ...form, detection_source: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DETECTION_SOURCES.map((d) => <SelectItem key={d} value={d}>{d.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Indicators Observed</Label><Textarea value={form.indicators_observed} onChange={(e) => setForm({ ...form, indicators_observed: e.target.value })} placeholder="e.g. Mass file download at 2am, access to systems outside job scope, repeated policy violations" /></div>
            <div><Label>Investigation Notes</Label><Textarea value={form.investigation_notes} onChange={(e) => setForm({ ...form, investigation_notes: e.target.value })} /></div>
            <div><Label>Assigned To</Label><Input value={form.assigned_to_name} onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })} /></div>
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