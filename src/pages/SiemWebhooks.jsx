import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { Plus, Webhook, Trash2, Pencil, Send, CheckCircle2, XCircle, Clock } from "lucide-react";

const EVENT_OPTIONS = [
  "control_failed", "control_status_change", "evidence_approved", "evidence_rejected",
  "risk_exceeded_tolerance", "certification_expiring", "finding_opened", "finding_remediated",
  "task_overdue", "policy_approved", "vendor_high_risk", "regulatory_change", "incident_created", "all",
];

const emptyForm = { name: "", url: "", secret_token: "", event_types: ["all"], is_active: true };

export default function SiemWebhooks() {
  const [endpoints, setEndpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.WebhookEndpoint.list("-created_date")
      .then((d) => setEndpoints(d || []))
      .catch(() => toast({ title: "Failed to load webhooks", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ ...emptyForm, ...e, event_types: e.event_types || [] }); setDialogOpen(true); };

  const save = async () => {
    if (!form.name || !form.url) {
      toast({ title: "Name and URL are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.WebhookEndpoint.update(editing.id, form);
        toast({ title: "Webhook updated" });
      } else {
        await base44.entities.WebhookEndpoint.create(form);
        toast({ title: "Webhook endpoint created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (e) => {
    if (!confirm(`Delete "${e.name}"?`)) return;
    try {
      await base44.entities.WebhookEndpoint.delete(e.id);
      toast({ title: "Webhook deleted" });
      load();
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const testEndpoint = async (e) => {
    setTesting(e.id);
    try {
      const res = await base44.functions.invoke("forwardComplianceEvent", {
        event_type: "all",
        event_data: { test: true, message: `Test delivery to ${e.name}`, triggered_manually: true },
      });
      const data = res.data || res || {};
      if (data.forwarded > 0) {
        toast({ title: "Test event delivered", description: `${data.forwarded} endpoint(s) received the event` });
      } else {
        toast({ title: "No delivery", description: data.reason || "Endpoint may be inactive or not subscribed to 'all'" });
      }
      load();
    } catch (err) {
      toast({ title: "Test failed", description: err.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const toggleEvent = (ev) => {
    setForm((f) => ({
      ...f,
      event_types: f.event_types.includes(ev)
        ? f.event_types.filter((x) => x !== ev)
        : [...f.event_types, ev],
    }));
  };

  const statusIcon = (s) => {
    if (s === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    if (s === "failed") return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="SIEM & Outbound Webhooks"
        subtitle="Forward compliance events to your SIEM, Datadog, Splunk, or any HTTP endpoint"
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Endpoint
          </Button>
        }
      />

      {endpoints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Webhook className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No webhook endpoints configured</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Add an endpoint to stream compliance events (control failures, risk breaches, evidence approvals) to your SIEM or monitoring stack.
          </p>
          <Button onClick={openCreate} className="mt-4" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add your first endpoint
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {endpoints.map((e) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                    <Webhook className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{e.name}</h3>
                    <p className="text-xs text-muted-foreground truncate max-w-[260px]">{e.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusIcon(e.last_status)}
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${e.is_active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    {e.is_active ? "Active" : "Paused"}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {(e.event_types || []).map((ev) => (
                  <span key={ev} className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {ev.replace(/_/g, " ")}
                  </span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Deliveries: </span>
                  <span className="font-medium text-foreground">{e.delivery_count || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Last: </span>
                  <span className="font-medium text-foreground">{e.last_triggered ? new Date(e.last_triggered).toLocaleString() : "—"}</span>
                </div>
              </div>
              {e.last_error && (
                <p className="mt-2 text-xs text-red-500 truncate" title={e.last_error}>⚠ {e.last_error}</p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Button onClick={() => testEndpoint(e)} variant="outline" size="sm" disabled={testing === e.id}>
                  <Send className="w-3.5 h-3.5 mr-1" /> {testing === e.id ? "Sending…" : "Test"}
                </Button>
                <Button onClick={() => openEdit(e)} variant="ghost" size="sm">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button onClick={() => remove(e)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Webhook Endpoint" : "Add Webhook Endpoint"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Splunk SIEM Forwarder" />
            </div>
            <div>
              <Label>Webhook URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://your-siem.example.com/ingest" />
            </div>
            <div>
              <Label>Signing secret (optional)</Label>
              <Input value={form.secret_token} onChange={(e) => setForm({ ...form, secret_token: e.target.value })} placeholder="Used to sign payloads (HMAC-SHA256)" />
            </div>
            <div>
              <Label>Subscribed events</Label>
              <div className="grid grid-cols-2 gap-2 mt-1 max-h-40 overflow-y-auto p-1">
                {EVENT_OPTIONS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.event_types.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded border-input"
                    />
                    <span className="capitalize">{ev.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wh-active">Active</Label>
              <Switch id="wh-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}