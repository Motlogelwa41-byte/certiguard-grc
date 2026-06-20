import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Plus, Pencil, Trash2, Search, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { incident_id: "", title: "", description: "", type: "security_breach", severity: "medium", status: "detected", reported_by: "", reported_date: "", detected_date: "", contained_date: "", resolved_date: "", affected_systems: "", affected_data: "", root_cause: "", response_summary: "", lessons_learned: "", notify_regulator: false, regulator_notified_date: "", assigned_to: "", related_control_ids: [] };

const incidentTypes = ["security_breach", "data_leak", "phishing", "malware", "unauthorized_access", "denial_of_service", "insider_threat", "physical_security", "policy_violation", "third_party", "other"];

export default function Incidents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const { toast } = useToast();

  const load = () => base44.entities.Incident.list("-created_date").then((d) => { setItems(d); setLoading(false); });

  useEffect(() => {
    load();
    // Auto-generate incident ID for new forms
    setForm(prev => ({ ...prev, incident_id: `INC-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, "0")}` }));
  }, []);

  const handleSave = async () => {
    try {
      const data = { ...form, related_control_ids: form.related_control_ids || [] };
      if (editId) await base44.entities.Incident.update(editId, data);
      else await base44.entities.Incident.create(data);

      // Log to audit trail
      try {
        const me = await base44.auth.me().catch(() => ({}));
        await base44.entities.AuditTrail.create({
          action: editId ? "update" : "create", entity_type: "Incident",
          entity_id: editId || "", entity_name: form.title,
          performed_by_name: me.full_name || "User", performed_by_id: me.id || ""
        });
      } catch {}

      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Incident updated" : "Incident reported" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({
      incident_id: item.incident_id || "", title: item.title || "", description: item.description || "",
      type: item.type || "security_breach", severity: item.severity || "medium", status: item.status || "detected",
      reported_by: item.reported_by || "", reported_date: item.reported_date || "",
      detected_date: item.detected_date || "", contained_date: item.contained_date || "",
      resolved_date: item.resolved_date || "", affected_systems: item.affected_systems || "",
      affected_data: item.affected_data || "", root_cause: item.root_cause || "",
      response_summary: item.response_summary || "", lessons_learned: item.lessons_learned || "",
      notify_regulator: !!item.notify_regulator, regulator_notified_date: item.regulator_notified_date || "",
      assigned_to: item.assigned_to || "", related_control_ids: item.related_control_ids || []
    });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Incident.delete(id);
    try { await base44.entities.AuditTrail.create({ action: "delete", entity_type: "Incident", entity_id: id, entity_name: "Deleted Incident" }); } catch {}
    load(); toast({ title: "Incident deleted" });
  };

  const filtered = items.filter((i) => {
    if (search && !i.title?.toLowerCase().includes(search.toLowerCase()) && !i.incident_id?.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    return true;
  });

  const severityColors = { critical: "text-red-600 bg-red-50 border-red-200", high: "text-orange-600 bg-orange-50 border-orange-200", medium: "text-amber-600 bg-amber-50 border-amber-200", low: "text-emerald-600 bg-emerald-50 border-emerald-200" };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Incident Management" subtitle="Track, investigate, and resolve security incidents" actions={<Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); const newId = `INC-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, "0")}`; setForm({ ...defaultForm, incident_id: newId }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Report Incident</Button>} />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No incidents reported" description="Report a security incident to start tracking the response workflow." actionLabel="Report Incident" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((inc) => (
            <div key={inc.id} className={`bg-card rounded-xl border-2 p-5 ${severityColors[inc.severity]?.split(" ")[2] || "border-border"}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{inc.incident_id}</span>
                    <StatusBadge status={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{inc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{inc.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
                </div>
              </div>
              {inc.affected_systems && <p className="text-xs text-muted-foreground mb-2"><strong>Affected:</strong> {inc.affected_systems}</p>}
              {inc.response_summary && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{inc.response_summary}</p>}
              <div className="flex items-center justify-between text-xs pt-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{inc.reported_date || "—"}</span>
                  <span>{inc.assigned_to || "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(inc)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(inc.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit Incident" : "Report New Incident"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Incident ID</Label><Input value={form.incident_id} onChange={(e) => setForm({ ...form, incident_id: e.target.value })} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{incidentTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reported By</Label><Input value={form.reported_by} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} /></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reported Date</Label><Input type="date" value={form.reported_date} onChange={(e) => setForm({ ...form, reported_date: e.target.value })} /></div>
              <div><Label>Detected Date</Label><Input type="date" value={form.detected_date} onChange={(e) => setForm({ ...form, detected_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contained Date</Label><Input type="date" value={form.contained_date} onChange={(e) => setForm({ ...form, contained_date: e.target.value })} /></div>
              <div><Label>Resolved Date</Label><Input type="date" value={form.resolved_date} onChange={(e) => setForm({ ...form, resolved_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Affected Systems</Label><Input value={form.affected_systems} onChange={(e) => setForm({ ...form, affected_systems: e.target.value })} /></div>
              <div><Label>Affected Data</Label><Input value={form.affected_data} onChange={(e) => setForm({ ...form, affected_data: e.target.value })} /></div>
            </div>
            <div><Label>Root Cause</Label><Textarea value={form.root_cause} onChange={(e) => setForm({ ...form, root_cause: e.target.value })} rows={2} /></div>
            <div><Label>Response Summary</Label><Textarea value={form.response_summary} onChange={(e) => setForm({ ...form, response_summary: e.target.value })} rows={2} /></div>
            <div><Label>Lessons Learned</Label><Textarea value={form.lessons_learned} onChange={(e) => setForm({ ...form, lessons_learned: e.target.value })} rows={2} /></div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.notify_regulator} onCheckedChange={(v) => setForm({ ...form, notify_regulator: v })} /><Label>Notify Regulator</Label></div>
              {form.notify_regulator && <div><Input type="date" value={form.regulator_notified_date} onChange={(e) => setForm({ ...form, regulator_notified_date: e.target.value })} /></div>}
            </div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="detected">Detected</SelectItem><SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem><SelectItem value="remediated">Remediated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem><SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update Incident" : "Report Incident"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}