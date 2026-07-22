import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const TYPES = ["subject_access", "erasure", "rectification", "portability", "objection", "restriction", "marketing_opt_out", "other"];
const CHANNELS = ["web", "email", "phone", "letter", "other"];

const today = new Date().toISOString().slice(0, 10);
const empty = { requester_name: "", requester_email: "", request_type: "subject_access", channel: "web", received_date: today, sla_days: 30, due_date: "", assigned_to: "", data_categories: "", systems_involved: "", verification_method: "", response_summary: "", evidence_url: "", notes: "" };

function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

export default function PrivacyRequestForm({ open, onOpenChange, editing, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, data_categories: (editing.data_categories || []).join(", "), systems_involved: (editing.systems_involved || []).join(", ") } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.requester_name) return;
    setSaving(true);
    try {
      const due = form.due_date || addDays(form.received_date, form.sla_days);
      const payload = {
        ...form,
        sla_days: Number(form.sla_days) || 30,
        due_date: due,
        data_categories: form.data_categories ? form.data_categories.split(",").map((s) => s.trim()).filter(Boolean) : [],
        systems_involved: form.systems_involved ? form.systems_involved.split(",").map((s) => s.trim()).filter(Boolean) : [],
        request_id: form.request_id || `DSR-${Date.now().toString().slice(-5)}`,
      };
      if (editing) await base44.entities.PrivacyRequest.update(editing.id, payload);
      else await base44.entities.PrivacyRequest.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit privacy request" : "New privacy request"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Requester name</Label><Input value={form.requester_name || ""} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} /></div>
            <div><Label>Requester email</Label><Input value={form.requester_email || ""} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Request type</Label><Select value={form.request_type} onValueChange={(v) => setForm({ ...form, request_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Channel</Label><Select value={form.channel} onValueChange={(v) => setForm({ ...form, channel: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CHANNELS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Received</Label><Input type="date" value={form.received_date || ""} onChange={(e) => setForm({ ...form, received_date: e.target.value })} /></div>
            <div><Label>SLA days</Label><Input type="number" value={form.sla_days ?? ""} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} placeholder={addDays(form.received_date, form.sla_days)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Assigned to</Label><Input value={form.assigned_to || ""} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} /></div>
            <div><Label>Identity verification</Label><Input value={form.verification_method || ""} onChange={(e) => setForm({ ...form, verification_method: e.target.value })} placeholder="e.g. ID + email confirmation" /></div>
          </div>
          <div><Label>Data categories (comma separated)</Label><Input value={form.data_categories || ""} onChange={(e) => setForm({ ...form, data_categories: e.target.value })} placeholder="PII, financial, health" /></div>
          <div><Label>Systems involved (comma separated)</Label><Input value={form.systems_involved || ""} onChange={(e) => setForm({ ...form, systems_involved: e.target.value })} placeholder="HRIS, CRM, data warehouse" /></div>
          <div><Label>Response summary</Label><Textarea value={form.response_summary || ""} onChange={(e) => setForm({ ...form, response_summary: e.target.value })} rows={2} /></div>
          <div><Label>Evidence URL</Label><Input value={form.evidence_url || ""} onChange={(e) => setForm({ ...form, evidence_url: e.target.value })} /></div>
          <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.requester_name}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}