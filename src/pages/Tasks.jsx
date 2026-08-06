import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckSquare, Plus, Pencil, Trash2, Search, Calendar, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";
import Can from "@/components/shared/Can";
import TaskFeedbackModal from "@/components/tasks/TaskFeedbackModal";

const taskTypes = ["control_implementation","evidence_collection","policy_review","risk_assessment","audit_preparation","remediation","training","vendor_review","other"];
const defaultForm = { title: "", description: "", type: "other", status: "todo", priority: "medium", assignee_name: "", assignee_email: "", due_date: "", notes: "" };

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [feedbackTask, setFeedbackTask] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const { toast } = useToast();

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const toggleSelectAll = () => {
    const filteredIds = filtered.map(t => t.id);
    const next = new Set(selected);
    if (filteredIds.length > 0 && filteredIds.every(id => selected.has(id))) {
      filteredIds.forEach(id => next.delete(id));
    } else {
      filteredIds.forEach(id => next.add(id));
    }
    setSelected(next);
  };
  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, status: bulkStatus }));
    await base44.entities.ComplianceTask.bulkUpdate(updates);
    setSelected(new Set()); setBulkStatus(""); load();
    toast({ title: `${updates.length} tasks updated` });
  };
  const applyBulkAssignee = async () => {
    if (!bulkAssignee.trim() || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, assignee_name: bulkAssignee.trim() }));
    await base44.entities.ComplianceTask.bulkUpdate(updates);
    setSelected(new Set()); setBulkAssignee(""); load();
    toast({ title: `${updates.length} tasks reassigned` });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected tasks? This cannot be undone.`)) return;
    const count = selected.size;
    await base44.entities.ComplianceTask.deleteMany({ id: { $in: [...selected] } });
    setSelected(new Set()); load();
    toast({ title: `${count} tasks deleted` });
  };

  const load = () => base44.entities.ComplianceTask.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const sendAssignmentEmail = async (task) => {
    if (!task.assignee_email && !task.assignee_name) return;
    // Only send if there's an email — assignee_email may not be on the entity, so we use a stored value
    const email = task.assignee_email;
    if (!email) return;
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `📋 New Compliance Task Assigned: "${task.title}"`,
      body: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 8px;">
  <div style="background: #1e293b; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px;">📋 New Task Assigned to You</h2>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p>Hi ${task.assignee_name || "Team Member"},</p>
    <p>A new compliance task has been assigned to you:</p>
    <div style="background: #f1f5f9; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 8px 0; color: #1e293b;">${task.title}</h3>
      ${task.due_date ? `<p style="margin: 4px 0; color: #64748b;"><strong>Due Date:</strong> ${task.due_date}</p>` : ""}
      <p style="margin: 4px 0; color: #64748b;"><strong>Priority:</strong> ${(task.priority || "medium").toUpperCase()}</p>
      <p style="margin: 4px 0; color: #64748b;"><strong>Type:</strong> ${(task.type || "").replace(/_/g, " ")}</p>
      ${task.description ? `<p style="margin: 8px 0 0 0; color: #475569;">${task.description}</p>` : ""}
    </div>
    <p>Please log in to CertiGuard to view and update this task.</p>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      This notification was sent by CertiGuard. Do not reply to this email.
    </p>
  </div>
</div>`,
    });
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await base44.entities.ComplianceTask.update(editId, form);
        toast({ title: "Task updated" });
      } else {
        const created = await base44.entities.ComplianceTask.create(form);
        toast({ title: "Task created" });
        // Send assignment notification email if assignee email is provided
        if (form.assignee_email) {
          sendAssignmentEmail({ ...form }).catch(() => {});
        }
      }
      setOpen(false); setForm(defaultForm); setEditId(null); load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title || "", description: item.description || "", type: item.type || "other", status: item.status || "todo", priority: item.priority || "medium", assignee_name: item.assignee_name || "", assignee_email: item.assignee_email || "", due_date: item.due_date || "", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.ComplianceTask.delete(id); load(); toast({ title: "Task deleted" }); };

  const filtered = items.filter((t) => {
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const columns = [
    { key: "todo", label: "To Do", color: "border-slate-300" },
    { key: "in_progress", label: "In Progress", color: "border-blue-400" },
    { key: "in_review", label: "In Review", color: "border-amber-400" },
    { key: "completed", label: "Completed", color: "border-emerald-400" },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Compliance Tasks" subtitle="Track and manage compliance activities" actions={<Can permission="tasks:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Task</Button></Can>} />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer ml-auto">
            <input type="checkbox" checked={filtered.length > 0 && filtered.every(t => selected.has(t.id))} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
            Select all ({filtered.length})
          </label>
        )}
      </div>

      <BulkActionBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkStatus} disabled={!bulkStatus}>Apply Status</Button>
        <Input value={bulkAssignee} onChange={(e) => setBulkAssignee(e.target.value)} placeholder="Assign to" className="w-[160px] h-8" />
        <Button size="sm" variant="secondary" onClick={applyBulkAssignee} disabled={!bulkAssignee.trim()}>Assign Owner</Button>
        <Can permission="tasks:delete"><Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Delete</Button></Can>
      </BulkActionBar>

      {items.length === 0 ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Create tasks to track compliance work." actionLabel="Add Task" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colTasks = filtered.filter((t) => t.status === col.key);
            return (
              <div key={col.key}>
                <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.color}`}>
                  <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map((t) => (
                    <div key={t.id} className={`bg-card rounded-lg border p-3 space-y-2 ${selected.has(t.id) ? "border-primary ring-1 ring-primary/40" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} className="w-4 h-4 mt-0.5 rounded shrink-0" aria-label={`Select ${t.title}`} />
                          <h4 className="text-sm font-medium text-foreground leading-tight">{t.title}</h4>
                        </div>
                        <StatusBadge status={t.priority} />
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{(t.type || "").replace(/_/g, " ")}</p>
                      {t.due_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" /> {t.due_date}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">{t.assignee_name || "Unassigned"}</span>
                        <div className="flex items-center gap-0.5">
                          <Can permission="tasks:write"><button onClick={() => handleEdit(t)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3 h-3 text-muted-foreground" /></button></Can>
                          <Can permission="tasks:write"><button onClick={() => handleDelete(t.id)} className="p-1 rounded hover:bg-muted"><Trash2 className="w-3 h-3 text-destructive" /></button></Can>
                          {t.status === "completed" && <button onClick={() => setFeedbackTask(t)} className="p-1 rounded hover:bg-muted" title="Submit feedback"><MessageSquare className="w-3 h-3 text-success" /></button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{taskTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
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
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assignee Name</Label><Input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Assignee Email <span className="text-muted-foreground text-xs">(for notifications)</span></Label><Input type="email" placeholder="assignee@company.com" value={form.assignee_email} onChange={(e) => setForm({ ...form, assignee_email: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <TaskFeedbackModal taskId={feedbackTask?.id} taskTitle={feedbackTask?.title} open={!!feedbackTask} onOpenChange={(o) => !o && setFeedbackTask(null)} />
    </div>
  );
}