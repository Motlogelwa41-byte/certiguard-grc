import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const TYPES = ["security_review", "due_diligence", "rfp", "vendor_assessment", "regulatory", "other"];
const STATUSES = ["received", "drafting", "in_review", "submitted", "closed"];

const empty = { title: "", client_name: "", client_email: "", request_type: "security_review", status: "received", due_date: "", received_date: new Date().toISOString().slice(0, 10), owner_name: "", notes: "" };

export default function QuestionnaireForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.title || !form.client_name) return;
    setSaving(true);
    try {
      const payload = { ...form, questionnaire_id: form.questionnaire_id || `Q-${Date.now().toString().slice(-5)}` };
      if (editing) await (await import("@/api/base44Client")).base44.entities.SecurityQuestionnaire.update(editing.id, payload);
      else await (await import("@/api/base44Client")).base44.entities.SecurityQuestionnaire.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit questionnaire" : "New questionnaire"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Acme Corp Security Review 2026" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Client name</Label><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
            <div><Label>Client email</Label><Input value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Request type</Label><Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Received</Label><Input type="date" value={form.received_date || ""} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
            <div><Label>Due</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Owner</Label><Input value={form.owner_name || ""} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title || !form.client_name}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}