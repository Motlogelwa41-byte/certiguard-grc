import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const STANDARDS = ["SOC 2", "ISO 27001", "ISO 27017", "ISO 27018", "PCI DSS", "HIPAA", "GDPR", "NIST CSF", "CMMC", "FedRAMP", "ISAE 3402", "Other"];
const STATUSES = ["planned", "gap_assessment", "implementation", "audit_in_progress", "remediation", "certified", "suspended", "expired", "lapsed"];
const AUDIT_TYPES = ["type1", "type2", "certification", "surveillance", "recertification"];

const empty = {
  cert_id: "", name: "", standard: "SOC 2", framework_id: "", framework_name: "",
  status: "planned", audit_type: "type2", certifying_body: "", auditor_lead: "",
  scope_description: "", start_date: "", audit_start_date: "", audit_end_date: "",
  certification_date: "", expiry_date: "", next_surveillance_date: "", cost: "",
  owner_name: "", notes: "",
};

export default function CertificationForm({ open, onOpenChange, editing, frameworks, controls, onSaved }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(editing ? { ...empty, ...editing } : empty); }, [editing, open]);

  const submit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const fw = frameworks.find((f) => f.id === form.framework_id);
      const payload = { ...form, cost: form.cost ? Number(form.cost) : null, framework_name: fw?.name || "" };
      if (editing) await base44.entities.Certification.update(editing.id, payload);
      else await base44.entities.Certification.create({ ...payload, cert_id: payload.cert_id || `CERT-${Date.now().toString().slice(-5)}` });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, type = "text") => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit certification" : "New certification"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SOC 2 Type II 2026" />
            </div>
            {field("cert_id", "Cert ID")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Standard</Label>
              <Select value={form.standard} onValueChange={(v) => setForm({ ...form, standard: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STANDARDS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Linked framework</Label>
              <Select value={form.framework_id} onValueChange={(v) => setForm({ ...form, framework_id: v })}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{frameworks.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lifecycle status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Audit type</Label>
              <Select value={form.audit_type} onValueChange={(v) => setForm({ ...form, audit_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIT_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("certifying_body", "Certifying body / registrar")}
            {field("auditor_lead", "Lead auditor")}
          </div>
          <div>
            <Label>Scope description</Label>
            <Textarea value={form.scope_description} onChange={(e) => setForm({ ...form, scope_description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field("start_date", "Start", "date")}
            {field("audit_start_date", "Audit start", "date")}
            {field("audit_end_date", "Audit end", "date")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {field("certification_date", "Certified", "date")}
            {field("expiry_date", "Expiry", "date")}
            {field("next_surveillance_date", "Next surveillance", "date")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("cost", "Cost (ZAR)", "number")}
            {field("owner_name", "Owner")}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !form.name}>{saving ? "Saving…" : "Save certification"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}