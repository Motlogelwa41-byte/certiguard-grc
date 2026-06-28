import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Plus, Pencil, Trash2, AlertTriangle, CheckCircle2, Clock, Link2, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { logAuditTrail } from "@/lib/auditLogger";

const SEVERITY_CONFIG = {
  critical: { color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  high: { color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  low: { color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  informational: { color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
};

const STATUS_STEPS = ["open", "in_remediation", "resolved", "closed"];

const defaultForm = {
  finding_id: "", audit_id: "", audit_title: "", title: "", description: "",
  severity: "medium", status: "open", finding_type: "observation",
  linked_control_id: "", linked_control_name: "", corrective_action: "",
  root_cause: "", assignee_name: "", due_date: "", resolved_date: "",
  evidence_url: "", framework_name: "", notes: ""
};

function ProgressSteps({ status }) {
  const idx = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= idx;
        const active = i === idx;
        return (
          <React.Fragment key={step}>
            <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-colors ${done ? (active ? "bg-primary text-primary-foreground" : "bg-primary/70 text-primary-foreground") : "bg-muted text-muted-foreground"}`}>
              {i + 1}
            </div>
            {i < STATUS_STEPS.length - 1 && <div className={`flex-1 h-0.5 w-6 ${i < idx ? "bg-primary/70" : "bg-muted"}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function FindingCard({ finding, controls, onEdit, onDelete, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.medium;
  const linkedControl = controls.find(c => c.id === finding.linked_control_id);
  const isOverdue = finding.due_date && new Date(finding.due_date) < new Date() && finding.status !== "closed" && finding.status !== "resolved";

  const nextStatus = STATUS_STEPS[STATUS_STEPS.indexOf(finding.status) + 1];

  return (
    <div className={`bg-card rounded-xl border p-4 flex flex-col gap-3 ${isOverdue ? "border-red-300 dark:border-red-800" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {finding.finding_id && <span className="font-mono text-xs text-muted-foreground">{finding.finding_id}</span>}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sev.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
              {finding.severity?.charAt(0).toUpperCase() + finding.severity?.slice(1)}
            </span>
            {isOverdue && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200"><AlertTriangle className="w-3 h-3" />Overdue</span>}
          </div>
          <h3 className="font-heading font-semibold text-foreground text-sm leading-snug">{finding.title}</h3>
          {finding.audit_title && <p className="text-xs text-muted-foreground mt-0.5">Audit: {finding.audit_title}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(finding)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
          <button onClick={() => onDelete(finding.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Progress tracker */}
      <div className="flex items-center justify-between">
        <ProgressSteps status={finding.status} />
        <span className="text-xs text-muted-foreground capitalize ml-2">{finding.status?.replace(/_/g, " ")}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {finding.assignee_name && <div><span className="text-muted-foreground">Assignee: </span><span className="font-medium">{finding.assignee_name}</span></div>}
        {finding.due_date && <div><span className="text-muted-foreground">Due: </span><span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>{finding.due_date}</span></div>}
        {finding.finding_type && <div><span className="text-muted-foreground">Type: </span><span className="font-medium capitalize">{finding.finding_type.replace(/_/g, " ")}</span></div>}
        {finding.framework_name && <div><span className="text-muted-foreground">Framework: </span><span className="font-medium">{finding.framework_name}</span></div>}
      </div>

      {linkedControl && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/5 border border-primary/20 rounded-lg text-xs">
          <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-primary font-medium truncate">{linkedControl.control_id ? `${linkedControl.control_id} — ` : ""}{linkedControl.title}</span>
          <StatusBadge status={linkedControl.status} />
        </div>
      )}

      {/* Expand for details */}
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border pt-2">
          {finding.description && <div><p className="text-xs font-medium text-muted-foreground">Description</p><p className="text-xs mt-0.5">{finding.description}</p></div>}
          {finding.root_cause && <div><p className="text-xs font-medium text-muted-foreground">Root Cause</p><p className="text-xs mt-0.5">{finding.root_cause}</p></div>}
          {finding.corrective_action && <div><p className="text-xs font-medium text-muted-foreground">Corrective Action</p><p className="text-xs mt-0.5">{finding.corrective_action}</p></div>}
          {finding.evidence_url && <div><p className="text-xs font-medium text-muted-foreground">Evidence</p><a href={finding.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{finding.evidence_url}</a></div>}
          {finding.notes && <div><p className="text-xs font-medium text-muted-foreground">Notes</p><p className="text-xs mt-0.5">{finding.notes}</p></div>}
        </div>
      )}

      {/* Quick advance status */}
      {nextStatus && (
        <div className="pt-1 border-t border-border">
          <Button variant="outline" size="sm" className="w-full text-xs h-7" onClick={() => onStatusChange(finding.id, nextStatus)}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Advance to "{nextStatus.replace(/_/g, " ")}"
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AuditFindings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [findings, setFindings] = useState([]);
  const [audits, setAudits] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const load = async () => {
    const [f, a, c] = await Promise.all([
      base44.entities.AuditFinding.list(),
      base44.entities.Audit.list(),
      base44.entities.Control.list(),
    ]);
    setFindings(f); setAudits(a); setControls(c); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const linkedControl = controls.find(c => c.id === form.linked_control_id);
      const data = { ...form, linked_control_name: linkedControl?.title || form.linked_control_name };
      if (editId) {
        const before = findings.find(f => f.id === editId);
        await base44.entities.AuditFinding.update(editId, data);
        await logAuditTrail({ action: "update", entity_type: "AuditFinding", entity_id: editId, entity_name: form.title, before, after: data, user, severity: "info" });
      } else {
        const created = await base44.entities.AuditFinding.create(data);
        await logAuditTrail({ action: "create", entity_type: "AuditFinding", entity_id: created?.id, entity_name: form.title, after: data, user, severity: "info" });
      }
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Finding updated" : "Finding created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ ...defaultForm, ...item });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => {
    const item = findings.find(f => f.id === id);
    await base44.entities.AuditFinding.delete(id);
    await logAuditTrail({ action: "delete", entity_type: "AuditFinding", entity_id: id, entity_name: item?.title, before: item, user, severity: "warning" });
    load(); toast({ title: "Finding deleted" });
  };

  const handleStatusChange = async (id, newStatus) => {
    await base44.entities.AuditFinding.update(id, { status: newStatus, ...(newStatus === "resolved" ? { resolved_date: new Date().toISOString().split("T")[0] } : {}) });
    load(); toast({ title: `Finding moved to "${newStatus.replace(/_/g, " ")}"` });
  };

  const filtered = findings.filter(f => {
    const matchSearch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.finding_id?.toLowerCase().includes(search.toLowerCase());
    const matchSev = filterSeverity === "all" || f.severity === filterSeverity;
    const matchStatus = filterStatus === "all" || f.status === filterStatus;
    return matchSearch && matchSev && matchStatus;
  });

  // Summary stats
  const open_count = findings.filter(f => f.status === "open").length;
  const in_remediation = findings.filter(f => f.status === "in_remediation").length;
  const overdue = findings.filter(f => f.due_date && new Date(f.due_date) < new Date() && !["closed", "resolved"].includes(f.status)).length;
  const closed = findings.filter(f => ["closed", "resolved"].includes(f.status)).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Audit Finding Tracker"
        subtitle="Manage findings and drive corrective actions to closure"
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Finding
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Open", value: open_count, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
          { label: "In Remediation", value: in_remediation, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800" },
          { label: "Overdue", value: overdue, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800" },
          { label: "Closed / Resolved", value: closed, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg} ${s.border}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search findings..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="informational">Informational</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_remediation">In Remediation</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        {(search || filterSeverity !== "all" || filterStatus !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilterSeverity("all"); setFilterStatus("all"); }}>
            <X className="w-3.5 h-3.5 mr-1" />Clear
          </Button>
        )}
      </div>

      {findings.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No findings recorded" description="Add audit findings to track corrective actions against your control library." actionLabel="Add Finding" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No findings match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(f => (
            <FindingCard key={f.id} finding={f} controls={controls} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Finding" : "Add Audit Finding"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Finding ID</Label><Input value={form.finding_id} onChange={e => setForm({ ...form, finding_id: e.target.value })} placeholder="FND-001" /></div>
              <div><Label>Assignee</Label><Input value={form.assignee_name} onChange={e => setForm({ ...form, assignee_name: e.target.value })} placeholder="Name" /></div>
            </div>
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="informational">Informational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Finding Type</Label>
                <Select value={form.finding_type} onValueChange={v => setForm({ ...form, finding_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_conformance">Non-Conformance</SelectItem>
                    <SelectItem value="major_nc">Major NC</SelectItem>
                    <SelectItem value="minor_nc">Minor NC</SelectItem>
                    <SelectItem value="observation">Observation</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_remediation">In Remediation</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>

            {/* Linked Audit */}
            <div><Label>Linked Audit</Label>
              <Select value={form.audit_id || "__none"} onValueChange={v => {
                const audit = audits.find(a => a.id === v);
                setForm({ ...form, audit_id: v === "__none" ? "" : v, audit_title: audit?.title || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select audit (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {audits.map(a => <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Linked Control */}
            <div><Label>Linked Control</Label>
              <Select value={form.linked_control_id || "__none"} onValueChange={v => {
                const ctl = controls.find(c => c.id === v);
                setForm({ ...form, linked_control_id: v === "__none" ? "" : v, linked_control_name: ctl?.title || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Link to a control (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {controls.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.control_id ? `${c.control_id} — ` : ""}{c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div><Label>Framework</Label><Input value={form.framework_name} onChange={e => setForm({ ...form, framework_name: e.target.value })} placeholder="e.g. SOC 2, ISO 27001" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Root Cause</Label><Textarea value={form.root_cause} onChange={e => setForm({ ...form, root_cause: e.target.value })} rows={2} /></div>
            <div><Label>Corrective Action Plan</Label><Textarea value={form.corrective_action} onChange={e => setForm({ ...form, corrective_action: e.target.value })} rows={3} placeholder="Describe the steps to remediate this finding..." /></div>
            <div><Label>Evidence URL (closure)</Label><Input value={form.evidence_url} onChange={e => setForm({ ...form, evidence_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update Finding" : "Create Finding"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}