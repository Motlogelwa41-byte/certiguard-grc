import React, { useState } from "react";
import { ArrowUp, CheckCircle2, Clock, Plus, Trash2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const ESCALATION_LEVELS = [
  { level: 1, label: "Team Lead", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  { level: 2, label: "Manager", color: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  { level: 3, label: "Executive", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
];

const AUTO_ESCALATION_RULES = {
  critical: { hours: 1, message: "Critical incidents auto-escalate after 1 hour" },
  high: { hours: 4, message: "High severity incidents auto-escalate after 4 hours" },
  medium: { hours: 24, message: "Medium severity incidents auto-escalate after 24 hours" },
  low: { hours: 72, message: "Low severity incidents auto-escalate after 72 hours" },
};

export default function EscalationChain({ incident, onUpdated }) {
  const { toast } = useToast();
  const [newContact, setNewContact] = useState({ name: "", email: "", role: "" });
  const [saving, setSaving] = useState(false);

  const chain = (() => { try { return JSON.parse(incident?.escalation_chain || "[]"); } catch { return []; } })();
  const currentLevel = incident?.escalation_level || 0;
  const rule = AUTO_ESCALATION_RULES[incident?.severity] || AUTO_ESCALATION_RULES.medium;

  // Calculate time since detection for auto-escalation hint
  const detectedAt = incident?.detected_date ? new Date(incident.detected_date) : new Date(incident?.created_date);
  const hoursSinceDetection = (Date.now() - detectedAt.getTime()) / 3600000;
  const shouldAutoEscalate = hoursSinceDetection >= rule.hours && incident?.status !== "closed" && incident?.status !== "remediated";

  const addContact = () => {
    if (!newContact.name.trim()) return;
    const level = chain.length + 1;
    const updated = [...chain, { level, name: newContact.name, email: newContact.email, role: newContact.role, notified_at: null, acknowledged_at: null }];
    setNewContact({ name: "", email: "", role: "" });
    saveChain(updated);
  };

  const removeContact = (i) => {
    const updated = chain.filter((_, idx) => idx !== i).map((c, idx) => ({ ...c, level: idx + 1 }));
    saveChain(updated);
  };

  const notifyLevel = async (contactIdx) => {
    setSaving(true);
    const updated = chain.map((c, i) => i === contactIdx ? { ...c, notified_at: new Date().toISOString() } : c);
    const newLevel = Math.max(currentLevel, chain[contactIdx]?.level || 1);

    // Add timeline event for escalation
    const events = (() => { try { return JSON.parse(incident?.timeline_events || "[]"); } catch { return []; } })();
    const escalationEvent = {
      timestamp: new Date().toISOString(),
      event: `Escalated to ${chain[contactIdx]?.name} (${chain[contactIdx]?.role || "Level " + (contactIdx + 1)})`,
      actor: "System / Manual",
      type: "escalated",
      notes: chain[contactIdx]?.email ? `Notified: ${chain[contactIdx].email}` : ""
    };

    await base44.entities.Incident.update(incident.id, {
      escalation_chain: JSON.stringify(updated),
      escalation_level: newLevel,
      timeline_events: JSON.stringify([...events, escalationEvent])
    });
    toast({ title: `Escalated to ${chain[contactIdx]?.name}`, description: chain[contactIdx]?.email ? `Notification sent to ${chain[contactIdx].email}` : undefined });
    setSaving(false);
    onUpdated?.();
  };

  const acknowledgeLevel = async (contactIdx) => {
    setSaving(true);
    const updated = chain.map((c, i) => i === contactIdx ? { ...c, acknowledged_at: new Date().toISOString() } : c);
    await base44.entities.Incident.update(incident.id, { escalation_chain: JSON.stringify(updated) });
    toast({ title: "Acknowledged" });
    setSaving(false);
    onUpdated?.();
  };

  const saveChain = async (updated) => {
    setSaving(true);
    await base44.entities.Incident.update(incident.id, { escalation_chain: JSON.stringify(updated) });
    setSaving(false);
    onUpdated?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Escalation Chain</h4>
        {currentLevel > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200 font-medium">
            Level {currentLevel} Active
          </span>
        )}
      </div>

      {/* Auto-escalation rule */}
      <div className={`text-xs px-3 py-2 rounded-lg border ${shouldAutoEscalate ? "bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800" : "bg-muted/40 border-border text-muted-foreground"}`}>
        {shouldAutoEscalate ? (
          <span className="font-semibold">⚠️ Auto-escalation triggered — {rule.message}. {Math.round(hoursSinceDetection)}h elapsed.</span>
        ) : (
          <span>Auto-escalation rule: {rule.message} ({Math.round(hoursSinceDetection)}h / {rule.hours}h elapsed)</span>
        )}
      </div>

      {/* Chain contacts */}
      {chain.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No escalation contacts defined. Add contacts below.</p>
      ) : (
        <div className="space-y-2">
          {chain.map((contact, i) => {
            const levelCfg = ESCALATION_LEVELS[Math.min(i, 2)];
            const isNotified = !!contact.notified_at;
            const isAcknowledged = !!contact.acknowledged_at;
            return (
              <div key={i} className={`rounded-lg border p-3 ${isAcknowledged ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200" : isNotified ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200" : "bg-card border-border"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold border ${levelCfg?.color}`}>L{contact.level}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role}{contact.email ? ` · ${contact.email}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAcknowledged ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />ACK'd</span>
                    ) : isNotified ? (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acknowledgeLevel(i)} disabled={saving}>
                        <CheckCircle2 className="w-3 h-3 mr-1" />ACK
                      </Button>
                    ) : (
                      <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600" onClick={() => notifyLevel(i)} disabled={saving}>
                        <Bell className="w-3 h-3 mr-1" />Escalate
                      </Button>
                    )}
                    {!isNotified && (
                      <button onClick={() => removeContact(i)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                {isNotified && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Notified: {new Date(contact.notified_at).toLocaleString()}
                    {isAcknowledged && ` · Acknowledged: ${new Date(contact.acknowledged_at).toLocaleString()}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add contact */}
      <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Escalation Contact</p>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Name *</Label>
            <Input className="h-8 text-sm mt-1" placeholder="Full name" value={newContact.name} onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <Input className="h-8 text-sm mt-1" placeholder="e.g. CISO" value={newContact.role} onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input className="h-8 text-sm mt-1" type="email" placeholder="email@company.com" value={newContact.email} onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={addContact} disabled={!newContact.name.trim() || saving}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add to Chain
        </Button>
      </div>
    </div>
  );
}