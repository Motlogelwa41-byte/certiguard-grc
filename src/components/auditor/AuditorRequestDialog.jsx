import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const empty = { title: "", question: "", related_control_id: "", related_control_name: "" };

export default function AuditorRequestDialog({ open, onOpenChange, controls, auditor, scopeId, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(empty); }, [open]);

  const submit = async () => {
    if (!form.title || !form.question) return;
    setSaving(true);
    try {
      const ctrl = controls.find((c) => c.id === form.related_control_id);
      await base44.entities.AuditorRequest.create({
        ...form,
        scope_id: scopeId,
        auditor_id: auditor?.id,
        auditor_name: auditor?.full_name || auditor?.email,
        related_control_name: ctrl?.title || "",
      });
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
          <DialogTitle>Request clarification / additional evidence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Need MFA enforcement evidence" />
          </div>
          <div>
            <Label>Related control</Label>
            <Select value={form.related_control_id} onValueChange={(v) => setForm({ ...form, related_control_id: v })}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {controls.map((c) => <SelectItem key={c.id} value={c.id}>{c.control_id ? `${c.control_id} — ` : ""}{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Question / request</Label>
            <Textarea value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title || !form.question}>{saving ? "Sending…" : "Submit request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}