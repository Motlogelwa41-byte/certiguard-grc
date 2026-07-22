import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const empty = { finding_id: "", title: "", description: "", severity: "medium", finding_type: "observation", linked_control_id: "", linked_control_name: "", corrective_action: "", due_date: "" };

export default function AuditorFindingDialog({ open, onOpenChange, controls, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? { ...empty, ...editing } : empty);
  }, [editing, open]);

  const submit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const ctrl = controls.find((c) => c.id === form.linked_control_id);
      const payload = {
        ...form,
        finding_id: form.finding_id || `FND-${Date.now().toString().slice(-5)}`,
        linked_control_name: ctrl?.title || form.linked_control_name,
      };
      if (editing) await base44.entities.AuditFinding.update(editing.id, payload);
      else await base44.entities.AuditFinding.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit finding" : "Raise audit finding"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low", "informational"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.finding_type} onValueChange={(v) => setForm({ ...form, finding_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["non_conformance", "observation", "opportunity", "major_nc", "minor_nc"].map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Linked control</Label>
            <Select value={form.linked_control_id} onValueChange={(v) => setForm({ ...form, linked_control_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {controls.map((c) => <SelectItem key={c.id} value={c.id}>{c.control_id ? `${c.control_id} — ` : ""}{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div>
            <Label>Corrective action</Label>
            <Textarea value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Finding ID</Label>
              <Input value={form.finding_id} onChange={(e) => setForm({ ...form, finding_id: e.target.value })} placeholder="auto" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title}>{saving ? "Saving…" : "Save finding"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}