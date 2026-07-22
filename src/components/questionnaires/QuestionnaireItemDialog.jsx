import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const STATUSES = ["pending", "drafted", "verified", "answered"];

const empty = { section: "", question: "", answer: "", suggested_answer: "", status: "pending", notes: "" };

export default function QuestionnaireItemDialog({ open, onOpenChange, questionnaire, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.question) return;
    setSaving(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const payload = { ...form, questionnaire_id: questionnaire?.id, questionnaire_title: questionnaire?.title, answered_by: form.answer ? "compliance" : "" };
      if (editing) await base44.entities.QuestionnaireItem.update(editing.id, payload);
      else await base44.entities.QuestionnaireItem.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit question" : "Add question"} — {questionnaire?.title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Section</Label><Input value={form.section || ""} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. Access Control" /></div>
          <div><Label>Question</Label><Textarea value={form.question || ""} onChange={(e) => setForm({ ...form, question: e.target.value })} rows={2} /></div>
          <div><Label>AI suggested answer</Label><Textarea value={form.suggested_answer || ""} onChange={(e) => setForm({ ...form, suggested_answer: e.target.value })} rows={3} className="bg-muted/40" /></div>
          <div><Label>Final answer</Label><Textarea value={form.answer || ""} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={3} /></div>
          <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.question}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}