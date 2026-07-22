import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { CONTROL_TEST_REGISTRY } from "@/lib/controlTestRegistry";

const emptyForm = {
  test_id: "",
  title: "",
  description: "",
  test_key: "",
  frequency: "daily",
  severity_on_fail: "high",
  auto_update_control: true,
  auto_create_evidence: false,
  enabled: true,
  owner_name: "",
  linked_control_ids: [],
  notes: "",
};

export default function ControlTestForm({ open, onOpenChange, editing, controls, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({ ...emptyForm, ...editing });
    } else {
      setForm(emptyForm);
    }
  }, [editing, open]);

  const selectedTest = CONTROL_TEST_REGISTRY.find((t) => t.key === form.test_key);

  const toggleControl = (id) => {
    setForm((f) => ({
      ...f,
      linked_control_ids: f.linked_control_ids.includes(id)
        ? f.linked_control_ids.filter((x) => x !== id)
        : [...f.linked_control_ids, id],
    }));
  };

  const submit = async () => {
    if (!form.title || !form.test_key) return;
    setSaving(true);
    try {
      const linkedNames = (form.linked_control_ids || [])
        .map((id) => controls.find((c) => c.id === id)?.title)
        .filter(Boolean);
      const payload = {
        ...form,
        test_id: form.test_id || `CT-${Date.now().toString().slice(-6)}`,
        linked_control_names: linkedNames,
        service: selectedTest?.service || "internal",
        severity_on_fail: form.severity_on_fail,
      };
      if (editing) {
        await base44.entities.ControlTest.update(editing.id, payload);
      } else {
        await base44.entities.ControlTest.create(payload);
      }
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Control Test" : "New Automated Control Test"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Test ID</Label>
              <Input value={form.test_id} onChange={(e) => setForm({ ...form, test_id: e.target.value })} placeholder="auto-generated" />
            </div>
            <div>
              <Label>Owner</Label>
              <Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Admins enforce MFA" />
          </div>
          <div>
            <Label>Automated test</Label>
            <Select value={form.test_key} onValueChange={(v) => {
              const reg = CONTROL_TEST_REGISTRY.find((t) => t.key === v);
              setForm({ ...form, test_key: v, severity_on_fail: reg?.defaultSeverity || form.severity_on_fail });
            }}>
              <SelectTrigger><SelectValue placeholder="Select a test" /></SelectTrigger>
              <SelectContent>
                {CONTROL_TEST_REGISTRY.map((t) => (
                  <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTest && <p className="text-xs text-muted-foreground mt-1">{selectedTest.description}</p>}
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity on fail</Label>
              <Select value={form.severity_on_fail} onValueChange={(v) => setForm({ ...form, severity_on_fail: v })}>
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
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.auto_update_control} onCheckedChange={(v) => setForm({ ...form, auto_update_control: v })} />
              Auto-update control status
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.auto_create_evidence} onCheckedChange={(v) => setForm({ ...form, auto_create_evidence: v })} />
              Auto-attach evidence
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              Enabled
            </label>
          </div>
          <div>
            <Label>Linked controls ({form.linked_control_ids.length})</Label>
            <div className="border border-border rounded-md max-h-44 overflow-y-auto p-2 space-y-1">
              {controls.length === 0 && <p className="text-xs text-muted-foreground p-2">No controls available.</p>}
              {controls.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer hover:bg-accent/40 px-1 rounded">
                  <input type="checkbox" checked={form.linked_control_ids.includes(c.id)} onChange={() => toggleControl(c.id)} />
                  <span className="truncate">{c.control_id ? `${c.control_id} — ` : ""}{c.title}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.title || !form.test_key}>{saving ? "Saving…" : "Save test"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}