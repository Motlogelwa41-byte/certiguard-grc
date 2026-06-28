import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Plus, Pencil, Trash2, Search, Clock, ChevronDown, ChevronUp, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import IncidentTimeline from "@/components/incidents/IncidentTimeline";
import EscalationChain from "@/components/incidents/EscalationChain";
import MTTRAnalytics from "@/components/incidents/MTTRAnalytics";

const defaultForm = {
  incident_id: "", title: "", description: "", type: "security_breach", severity: "medium",
  status: "detected", reported_by: "", reported_date: "", detected_date: "", contained_date: "",
  remediated_date: "", resolved_date: "", affected_systems: "", affected_data: "", root_cause: "",
  response_summary: "", lessons_learned: "", notify_regulator: false, regulator_notified_date: "",
  assigned_to: "", related_control_ids: []
};

const incidentTypes = ["security_breach","data_leak","phishing","malware","unauthorized_access","denial_of_service","insider_threat","physical_security","policy_violation","third_party","other"];

const SEV_BORDER = { critical: "border-red-400 dark:border-red-700", high: "border-orange-400 dark:border-orange-700", medium: "border-amber-400 dark:border-amber-700", low: "border-emerald-400 dark:border-emerald-700" };
const SEV_DOT = { critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-500", low: "bg-emerald-500" };

function IncidentCard({ incident, onEdit, onDelete, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const escalationLevel = incident.escalation_level || 0;
  const isOverdue = incident.status !== "closed" && incident.status !== "remediated" && incident.status !== "false_positive";

  return (
    <div className={`bg-card rounded-xl border-l-4 border border-border p-0 overflow-hidden ${SEV_BORDER[incident.severity] || "border-l-border"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {incident.incident_id && <span className="font-mono text-xs text-muted-foreground">{incident.incident_id}</span>}
              <span className="flex items-center gap-1 text-xs font-semibold">
                <span className={`w-2 h-2 rounded-full ${SEV_DOT[incident.severity]}`} />
                {incident.severity?.charAt(0).toUpperCase() + incident.severity?.slice(1)}
              </span>
              <StatusBadge status={incident.status} />
              {escalationLevel > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-semibold">
                  <ArrowUp className="w-3 h-3" />ESC L{escalationLevel}
                </span>
              )}
            </div>
            <h3 className="font-heading font-semibold text-foreground text-sm">{incident.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{incident.type?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(incident)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
            <button onClick={() => onDelete(incident.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2">
          {incident.assigned_to && <div><span className="text-muted-foreground">Assigned: </span><span className="font-medium">{incident.assigned_to}</span></div>}
          {incident.detected_date && <div><span className="text-muted-foreground">Detected: </span><span className="font-medium">{incident.detected_date}</span></div>}
          {incident.affected_systems && <div className="col-span-2"><span className="text-muted-foreground">Affected: </span><span className="font-medium">{incident.affected_systems}</span></div>}
        </div>

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Timeline, escalation & details"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="w-full rounded-none border-b border-border bg-muted/30 h-9 px-4 justify-start gap-1">
              <TabsTrigger value="timeline" className="text-xs h-7">Timeline</TabsTrigger>
              <TabsTrigger value="escalation" className="text-xs h-7">Escalation</TabsTrigger>
              <TabsTrigger value="details" className="text-xs h-7">Details</TabsTrigger>
            </TabsList>
            <div className="p-4">
              <TabsContent value="timeline" className="mt-0">
                <IncidentTimeline incident={incident} onUpdated={onUpdated} />
              </TabsContent>
              <TabsContent value="escalation" className="mt-0">
                <EscalationChain incident={incident} onUpdated={onUpdated} />
              </TabsContent>
              <TabsContent value="details" className="mt-0 space-y-2 text-xs">
                {incident.description && <div><p className="font-medium text-muted-foreground">Description</p><p>{incident.description}</p></div>}
                {incident.root_cause && <div><p className="font-medium text-muted-foreground">Root Cause</p><p>{incident.root_cause}</p></div>}
                {incident.response_summary && <div><p className="font-medium text-muted-foreground">Response Summary</p><p>{incident.response_summary}</p></div>}
                {incident.lessons_learned && <div><p className="font-medium text-muted-foreground">Lessons Learned</p><p>{incident.lessons_learned}</p></div>}
                {incident.notify_regulator && (
                  <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 text-amber-700">
                    Regulator notification required{incident.regulator_notified_date ? ` — notified ${incident.regulator_notified_date}` : " — not yet notified"}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}

export default function Incidents() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  const load = () => base44.entities.Incident.list("-created_date").then(d => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const data = { ...form, related_control_ids: form.related_control_ids || [] };
      if (editId) {
        await base44.entities.Incident.update(editId, data);
      } else {
        const newId = `INC-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, "0")}`;
        await base44.entities.Incident.create({ ...data, incident_id: data.incident_id || newId });
      }
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
      remediated_date: item.remediated_date || "", resolved_date: item.resolved_date || "",
      affected_systems: item.affected_systems || "", affected_data: item.affected_data || "",
      root_cause: item.root_cause || "", response_summary: item.response_summary || "",
      lessons_learned: item.lessons_learned || "", notify_regulator: !!item.notify_regulator,
      regulator_notified_date: item.regulator_notified_date || "", assigned_to: item.assigned_to || "",
      related_control_ids: item.related_control_ids || []
    });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Incident.delete(id);
    load(); toast({ title: "Incident deleted" });
  };

  const filtered = items.filter(i => {
    const matchSearch = !search || i.title?.toLowerCase().includes(search.toLowerCase()) || i.incident_id?.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === "all" || i.severity === severityFilter;
    const matchStatus = statusFilter === "all" || i.status === statusFilter;
    return matchSearch && matchSev && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Incident Management"
        subtitle="Track, investigate, and resolve security incidents with full timeline and escalation"
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Report Incident
          </Button>
        }
      />

      {/* MTTR Analytics */}
      {items.length > 0 && (
        <div className="mb-6">
          <MTTRAnalytics incidents={items} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search incidents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="detected">Detected</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="contained">Contained</SelectItem>
            <SelectItem value="remediated">Remediated</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
            <SelectItem value="false_positive">False Positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No incidents reported" description="Report a security incident to start tracking the response workflow." actionLabel="Report Incident" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No incidents match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map(inc => (
            <IncidentCard key={inc.id} incident={inc} onEdit={handleEdit} onDelete={handleDelete} onUpdated={load} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editId ? "Edit Incident" : "Report New Incident"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Incident ID</Label><Input value={form.incident_id} onChange={e => setForm({ ...form, incident_id: e.target.value })} placeholder="INC-2026-001" /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{incidentTypes.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Reported By</Label><Input value={form.reported_by} onChange={e => setForm({ ...form, reported_by: e.target.value })} /></div>
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Detected Date</Label><Input type="date" value={form.detected_date} onChange={e => setForm({ ...form, detected_date: e.target.value })} /></div>
              <div><Label>Reported Date</Label><Input type="date" value={form.reported_date} onChange={e => setForm({ ...form, reported_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contained Date</Label><Input type="date" value={form.contained_date} onChange={e => setForm({ ...form, contained_date: e.target.value })} /></div>
              <div><Label>Remediated Date</Label><Input type="date" value={form.remediated_date} onChange={e => setForm({ ...form, remediated_date: e.target.value })} /></div>
              <div><Label>Resolved Date</Label><Input type="date" value={form.resolved_date} onChange={e => setForm({ ...form, resolved_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Affected Systems</Label><Input value={form.affected_systems} onChange={e => setForm({ ...form, affected_systems: e.target.value })} /></div>
              <div><Label>Affected Data</Label><Input value={form.affected_data} onChange={e => setForm({ ...form, affected_data: e.target.value })} /></div>
            </div>
            <div><Label>Root Cause</Label><Textarea value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} rows={2} /></div>
            <div><Label>Response Summary</Label><Textarea value={form.response_summary} onChange={e => setForm({ ...form, response_summary: e.target.value })} rows={2} /></div>
            <div><Label>Lessons Learned</Label><Textarea value={form.lessons_learned} onChange={e => setForm({ ...form, lessons_learned: e.target.value })} rows={2} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="detected">Detected</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="contained">Contained</SelectItem>
                  <SelectItem value="remediated">Remediated</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.notify_regulator} onCheckedChange={v => setForm({ ...form, notify_regulator: v })} />
              <Label>Notify Regulator</Label>
              {form.notify_regulator && <Input type="date" value={form.regulator_notified_date} onChange={e => setForm({ ...form, regulator_notified_date: e.target.value })} className="max-w-40" />}
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update Incident" : "Report Incident"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}