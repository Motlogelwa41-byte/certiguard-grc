import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Webhook, Plus, Pencil, Trash2, Power, Send, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { logAuditTrail } from "@/lib/auditLogger";

const EVENT_TYPES = [
  "control_failed", "control_status_change", "evidence_approved", "evidence_rejected",
  "risk_exceeded_tolerance", "certification_expiring", "finding_opened", "finding_remediated",
  "task_overdue", "policy_approved", "vendor_high_risk", "regulatory_change", "incident_created", "all",
];

const EVENT_LABELS = {
  control_failed: "Control Failed", control_status_change: "Control Status Change",
  evidence_approved: "Evidence Approved", evidence_rejected: "Evidence Rejected",
  risk_exceeded_tolerance: "Risk Exceeded Tolerance", certification_expiring: "Certification Expiring",
  finding_opened: "Finding Opened", finding_remediated: "Finding Remediated",
  task_overdue: "Task Overdue", policy_approved: "Policy Approved",
  vendor_high_risk: "Vendor High Risk", regulatory_change: "Regulatory Change",
  incident_created: "Incident Created", all: "All Events",
};

const defaultForm = { name: "", url: "", event_types: ["all"], secret_token: "", is_active: true };

export default function WebhookManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [testing, setTesting] = useState(null);

  const load = async () => {
    try {
      const data = await base44.entities.WebhookEndpoint.list("-created_date");
      setItems(data);
    } catch (e) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.url) {
      toast({ title: "Required fields missing", description: "Name and URL are required.", variant: "destructive" });
      return;
    }
    try {
      if (editId) {
        await base44.entities.WebhookEndpoint.update(editId, form);
        await logAuditTrail({ action: "update", entity_type: "WebhookEndpoint", entity_id: editId, entity_name: form.name, user, severity: "info" });
      } else {
        const created = await base44.entities.WebhookEndpoint.create({ ...form, created_by_name: user?.full_name || user?.email });
        await logAuditTrail({ action: "create", entity_type: "WebhookEndpoint", entity_id: created.id, entity_name: form.name, user, severity: "info" });
      }
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Webhook updated" : "Webhook created" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || "",
      url: item.url || "",
      event_types: item.event_types || ["all"],
      secret_token: item.secret_token || "",
      is_active: item.is_active !== false,
    });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm("Delete this webhook endpoint?")) return;
    await base44.entities.WebhookEndpoint.delete(id);
    await logAuditTrail({ action: "delete", entity_type: "WebhookEndpoint", entity_id: id, entity_name: name, user, severity: "warning" });
    load(); toast({ title: "Webhook deleted" });
  };

  const toggleActive = async (item) => {
    await base44.entities.WebhookEndpoint.update(item.id, { is_active: !item.is_active });
    load();
  };

  const toggleEvent = (ev) => {
    const current = form.event_types || [];
    if (current.includes(ev)) {
      setForm({ ...form, event_types: current.filter((e) => e !== ev) });
    } else {
      setForm({ ...form, event_types: [...current, ev] });
    }
  };

  const sendTest = async (item) => {
    setTesting(item.id);
    try {
      await base44.functions.invoke("forwardComplianceEvent", {
        event_type: "test",
        endpoint_id: item.id,
        payload: { message: "Test webhook delivery from CertiGuard", timestamp: new Date().toISOString() },
      });
      toast({ title: "Test event sent", description: "Check the endpoint's delivery log for the result." });
      load();
    } catch (e) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    }
    setTesting(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Webhook Management"
        subtitle="Configure outbound webhook endpoints to forward compliance events to SIEM, SOAR, and notification systems"
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Webhook
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints configured"
          description="Create a webhook endpoint to forward compliance events to external systems like Splunk, Datadog, or Microsoft Teams."
          actionLabel="Add Webhook"
          onAction={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Webhook className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{item.name}</span>
                    {item.is_active ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <span className="truncate">{item.url}</span>
                    <button onClick={() => { navigator.clipboard.writeText(item.url); toast({ title: "URL copied" }); }} className="p-0.5 hover:text-foreground">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(item.event_types || []).map((ev) => (
                      <span key={ev} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        {EVENT_LABELS[ev] || ev}
                      </span>
                    ))}
                  </div>
                  {(item.delivery_count > 0 || item.last_triggered) && (
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {item.delivery_count > 0 && <span>Deliveries: {item.delivery_count}</span>}
                      {item.last_triggered && <span>Last: {new Date(item.last_triggered).toLocaleString()}</span>}
                      {item.last_status && (
                        <span className={item.last_status === "success" ? "text-emerald-600" : item.last_status === "failed" ? "text-red-500" : "text-muted-foreground"}>
                          Status: {item.last_status}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => sendTest(item)} disabled={testing === item.id} title="Send test event" className="p-1.5 rounded hover:bg-muted text-primary">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(item)} title={item.is_active ? "Disable" : "Enable"} className="p-1.5 rounded hover:bg-muted">
                    <Power className={`w-3.5 h-3.5 ${item.is_active ? "text-emerald-600" : "text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-muted">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.name)} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Webhook Endpoint" : "Add Webhook Endpoint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Splunk SIEM Forwarder" className="mt-1" />
            </div>
            <div>
              <Label>Destination URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://hooks.example.com/certguard" className="mt-1" />
            </div>
            <div>
              <Label>Shared Secret (for HMAC signing)</Label>
              <Input value={form.secret_token} onChange={(e) => setForm({ ...form, secret_token: e.target.value })} placeholder="Optional — used to sign payloads in X-CertiGuard-Signature header" className="mt-1" />
            </div>
            <div>
              <Label>Event Subscriptions</Label>
              <p className="text-xs text-muted-foreground mb-2">Select which compliance events trigger this webhook.</p>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map((ev) => (
                  <button
                    key={ev}
                    onClick={() => toggleEvent(ev)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                      (form.event_types || []).includes(ev)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded border ${ (form.event_types || []).includes(ev) ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
                    {EVENT_LABELS[ev]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label className="cursor-pointer" onClick={() => setForm({ ...form, is_active: !form.is_active })}>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.url}>{editId ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}