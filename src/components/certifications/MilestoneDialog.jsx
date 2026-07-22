import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const TYPES = ["gap_assessment", "remediation", "evidence_collection", "internal_audit", "external_audit", "remediation_close", "certification_decision", "surveillance_audit", "other"];
const STATUSES = ["not_started", "in_progress", "completed", "overdue"];

const empty = { title: "", description: "", milestone_type: "other", due_date: "", assignee_name: "", status: "not_started", notes: "" };

export default function MilestoneDialog({ open, onOpenChange, certification, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = { ...form, certification_id: certification?.id, certification_name: certification?.name };
      if (editing) await base44.entities.CertificationMilestone.update(editing.id, payload);
      else await base44.entities.CertificationMilestone.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit milestone" : "Add milestone"} — {certification?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.milestone_type} onValueChange={(v) => setForm({ ...form, milestone_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <Label>Assignee</Label>
              <Input value={form.assignee_name} onChange={(e) => setForm({ ...form, assignee_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title}>{saving ? "Saving…" : "Save milestone"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}