import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, ShieldCheck, Clock, User, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import PrivacyRequestForm from "@/components/privacy/PrivacyRequestForm";
import PrivacyRequestTaskDialog from "@/components/privacy/PrivacyRequestTaskDialog";

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div><p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p><p className="text-sm text-foreground">{value || "—"}</p></div>
    </div>
  );
}

export default function PrivacyRequestDetail() {
  const { id } = useParams();
  const [req, setReq] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.PrivacyRequest.get(id),
      base44.entities.PrivacyRequestTask.filter({ request_id: id }, "created_date", 200),
    ]).then(([r, ts]) => { setReq(r); setTasks(ts || []); })
      .catch(() => toast({ title: "Not found", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const advance = async (newStatus, extra = {}) => {
    try {
      const payload = { status: newStatus, ...extra };
      if (newStatus === "response_sent" || newStatus === "closed") payload.completed_date = new Date().toISOString().slice(0, 10);
      await base44.entities.PrivacyRequest.update(id, payload);
      load();
      toast({ title: `Status → ${newStatus.replace(/_/g, " ")}` });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const deleteTask = async (t) => {
    if (!confirm(`Delete task "${t.task}"?`)) return;
    await base44.entities.PrivacyRequestTask.delete(t.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!req) return <div className="text-center py-20 text-muted-foreground">Request not found. <Link to="/privacy-requests" className="text-primary underline">Back</Link></div>;

  const today = new Date();
  const daysLeft = req.due_date ? Math.ceil((new Date(req.due_date) - today) / 86400000) : null;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div>
      <Link to="/privacy-requests" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="w-4 h-4" /> Privacy requests</Link>
      <PageHeader title={`${req.request_id} — ${req.requester_name}`} subtitle={`${(req.request_type || "").replace(/_/g, " ")} · received ${req.received_date || "—"}`}
        actions={<Button variant="outline" onClick={() => setEditOpen(true)}><Pencil className="w-4 h-4" /> Edit</Button>} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Status</p><div className="mt-1"><StatusBadge status={req.status} /></div></div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Due date</p><p className="text-sm font-medium mt-1">{req.due_date || "—"}</p></div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">SLA</p>{req.sla_breached || daysLeft < 0 ? <span className="text-sm font-bold text-red-600">BREACHED</span> : <span className="text-sm font-medium text-emerald-600">{daysLeft} days left</span>}</div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Subtasks</p><p className="text-sm font-medium mt-1">{completedTasks}/{tasks.length} done</p></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {req.status === "received" && <Button size="sm" onClick={() => advance("identity_verified")}><ShieldCheck className="w-4 h-4" /> Verify identity</Button>}
        {["identity_verified", "received"].includes(req.status) && <Button size="sm" variant="outline" onClick={() => advance("in_progress")}>Start processing</Button>}
        {["in_progress", "identity_verified"].includes(req.status) && <Button size="sm" variant="outline" onClick={() => advance("gathering")}>Mark gathering</Button>}
        {!["response_sent", "closed", "rejected"].includes(req.status) && <Button size="sm" variant="outline" onClick={() => advance("response_sent")}><CheckCircle2 className="w-4 h-4" /> Mark response sent</Button>}
        {!["closed", "rejected"].includes(req.status) && <Button size="sm" variant="outline" onClick={() => advance("closed")}>Close request</Button>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Gathering tasks ({tasks.length})</h3>
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskOpen(true); }}><Plus className="w-4 h-4" /> Add task</Button>
          </div>
          {tasks.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-xl"><p className="text-sm text-muted-foreground">Break the request into subtasks per system/owner to route gathering work.</p></div>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="bg-card rounded-lg border border-border p-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.task}</p>
                    <p className="text-xs text-muted-foreground">{t.system_or_owner} {t.assignee_name ? `· ${t.assignee_name}` : ""} · due {t.due_date || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={t.status} />
                    <Button size="icon" variant="ghost" onClick={() => { setEditingTask(t); setTaskOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteTask(t)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <h3 className="text-sm font-semibold">Request details</h3>
            <Info icon={User} label="Requester" value={`${req.requester_name} ${req.requester_email ? `(${req.requester_email})` : ""}`} />
            <Info icon={Clock} label="Channel" value={req.channel} />
            <Info icon={User} label="Assigned to" value={req.assigned_to} />
            <Info icon={ShieldCheck} label="Verification" value={req.verification_method} />
          </div>
          {req.data_categories?.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground uppercase mb-2">Data categories</p><div className="flex flex-wrap gap-1">{req.data_categories.map((c) => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted">{c}</span>)}</div></div>
          )}
          {req.systems_involved?.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground uppercase mb-2">Systems involved</p><div className="flex flex-wrap gap-1">{req.systems_involved.map((c) => <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-muted">{c}</span>)}</div></div>
          )}
          {req.response_summary && <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground uppercase mb-1">Response summary</p><p className="text-sm whitespace-pre-wrap">{req.response_summary}</p></div>}
          {req.notes && <div className="bg-card rounded-xl border border-border p-5"><p className="text-xs text-muted-foreground uppercase mb-1">Notes</p><p className="text-sm whitespace-pre-wrap">{req.notes}</p></div>}
        </div>
      </div>

      <PrivacyRequestForm open={editOpen} onOpenChange={setEditOpen} editing={req} onSaved={load} />
      <PrivacyRequestTaskDialog open={taskOpen} onOpenChange={setTaskOpen} request={req} editing={editingTask} onSaved={load} />
    </div>
  );
}