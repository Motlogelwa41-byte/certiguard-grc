import React, { useState } from "react";
import { Clock, Plus, ShieldAlert, User, ArrowUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const EVENT_ICONS = {
  detected: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-100 dark:bg-red-900/30" },
  investigating: { icon: Clock, color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  contained: { icon: ShieldAlert, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  remediated: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  closed: { icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-200 dark:bg-emerald-800/30" },
  escalated: { icon: ArrowUp, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  update: { icon: User, color: "text-primary", bg: "bg-primary/10" },
};

export default function IncidentTimeline({ incident, onUpdated }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ event: "", actor: "", notes: "", type: "update" });
  const [saving, setSaving] = useState(false);

  const events = (() => { try { return JSON.parse(incident?.timeline_events || "[]"); } catch { return []; } })();
  // Build synthetic events from status dates
  const syntheticEvents = [];
  const dateFields = [
    { field: "detected_date", label: "Incident Detected", type: "detected" },
    { field: "reported_date", label: "Incident Reported", type: "investigating" },
    { field: "contained_date", label: "Incident Contained", type: "contained" },
    { field: "remediated_date", label: "Remediation Completed", type: "remediated" },
    { field: "resolved_date", label: "Incident Closed", type: "closed" },
  ];
  dateFields.forEach(({ field, label, type }) => {
    if (incident?.[field]) {
      syntheticEvents.push({ timestamp: incident[field] + "T00:00:00.000Z", event: label, actor: "System", type, synthetic: true });
    }
  });

  const allEvents = [...syntheticEvents, ...events].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const addEvent = async () => {
    if (!form.event.trim()) return;
    setSaving(true);
    const newEvent = { timestamp: new Date().toISOString(), event: form.event, actor: form.actor || "User", type: form.type, notes: form.notes };
    const updatedEvents = [...events, newEvent];
    await base44.entities.Incident.update(incident.id, { timeline_events: JSON.stringify(updatedEvents) });
    toast({ title: "Timeline event added" });
    setForm({ event: "", actor: "", notes: "", type: "update" });
    setAdding(false);
    setSaving(false);
    onUpdated?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Incident Timeline</h4>
        <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Event
        </Button>
      </div>

      {adding && (
        <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Event Description *</Label>
              <Input className="h-8 text-sm mt-1" placeholder="What happened?" value={form.event} onChange={e => setForm(p => ({ ...p, event: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Actor / Source</Label>
              <Input className="h-8 text-sm mt-1" placeholder="Who / what system" value={form.actor} onChange={e => setForm(p => ({ ...p, actor: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Event Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger className="h-8 text-sm mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="escalated">Escalation</SelectItem>
                  <SelectItem value="detected">Detection</SelectItem>
                  <SelectItem value="contained">Containment</SelectItem>
                  <SelectItem value="remediated">Remediation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="h-8 text-sm mt-1" placeholder="Optional notes..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addEvent} disabled={!form.event.trim() || saving}>Save Event</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {allEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No timeline events yet. Add incident dates or manual events above.</p>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="space-y-3 pl-10">
            {allEvents.map((ev, i) => {
              const cfg = EVENT_ICONS[ev.type] || EVENT_ICONS.update;
              const Icon = cfg.icon;
              return (
                <div key={i} className="relative">
                  <div className={`absolute -left-6 w-7 h-7 rounded-full flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{ev.event}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                        {new Date(ev.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {ev.actor && <p className="text-xs text-muted-foreground mt-0.5">By: {ev.actor}</p>}
                    {ev.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{ev.notes}"</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}