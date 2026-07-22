import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const empty = { auditor_id: "", framework_ids: [], scope_notes: "", status: "active", expires_at: "" };

export default function ScopeForm({ open, onOpenChange, auditors, frameworks, editing, assignedBy, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(editing ? { ...empty, ...editing, framework_ids: editing.framework_ids || [] } : empty);
  }, [editing, open]);

  const toggleFw = (id) => {
    setForm((f) => ({
      ...f,
      framework_ids: f.framework_ids.includes(id) ? f.framework_ids.filter((x) => x !== id) : [...f.framework_ids, id],
    }));
  };

  const submit = async () => {
    if (!form.auditor_id && !editing) return;
    setSaving(true);
    try {
      const auditor = auditors.find((a) => a.id === form.auditor_id);
      const fwNames = (form.framework_ids || []).map((id) => frameworks.find((f) => f.id === id)?.name).filter(Boolean);
      const payload = {
        ...form,
        auditor_name: auditor?.full_name || auditor?.email || form.auditor_name,
        auditor_email: auditor?.email || form.auditor_email,
        framework_names: fwNames,
        assigned_by_name: assignedBy,
      };
      if (editing) await base44.entities.AuditorScope.update(editing.id, payload);
      else await base44.entities.AuditorScope.create(payload);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit scope" : "Assign auditor scope"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>External auditor</Label>
            <Select value={form.auditor_id} onValueChange={(v) => setForm({ ...form, auditor_id: v })} disabled={!!editing}>
              <SelectTrigger><SelectValue placeholder="Select invited auditor" /></SelectTrigger>
              <SelectContent>
                {auditors.length === 0 && <SelectItem value="_none" disabled>No external auditors — invite one first</SelectItem>}
                {auditors.map((a) => <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Scoped frameworks ({form.framework_ids.length}) — empty = all</Label>
            <div className="border border-border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
              {frameworks.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer hover:bg-accent/40 px-1 rounded">
                  <input type="checkbox" checked={form.framework_ids.includes(f.id)} onChange={() => toggleFw(f.id)} />
                  <span className="truncate">{f.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Expires at</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Scope notes</Label>
            <Textarea value={form.scope_notes} onChange={(e) => setForm({ ...form, scope_notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || (!editing && !form.auditor_id)}>{saving ? "Saving…" : "Save scope"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}