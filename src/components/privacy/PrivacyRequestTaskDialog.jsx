import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const STATUSES = ["pending", "in_progress", "completed", "blocked"];
const empty = { system_or_owner: "", task: "", assignee_name: "", due_date: "", status: "pending", notes: "" };

export default function PrivacyRequestTaskDialog({ open, onOpenChange, request, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.task) return;
    setSaving(true);
    try {
      const payload = { ...form, request_id: request?.id, request_title: `${request?.requester_name} — ${request?.request_type}` };
      if (editing) await base44.entities.PrivacyRequestTask.update(editing.id, payload);
      else await base44.entities.PrivacyRequestTask.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit task" : "Add gathering task"} — {request?.request_id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>System / owner</Label><Input value={form.system_or_owner || ""} onChange={(e) => setForm({ ...form, system_or_owner: e.target.value })} placeholder="e.g. HRIS — People Ops" /></div>
          <div><Label>Task</Label><Textarea value={form.task || ""} onChange={(e) => setForm({ ...form, task: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assignee</Label><Input value={form.assignee_name || ""} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
          </div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.task}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}