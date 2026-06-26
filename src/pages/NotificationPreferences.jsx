import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Mail, Clock, AlertTriangle, FileText, Shield, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const PREF_KEY = "grc_notification_prefs";

const DEFAULT_PREFS = {
  overdue_tasks: true,
  upcoming_tasks_days: 7,
  upcoming_tasks_enabled: true,
  expiring_evidence_days: 30,
  expiring_evidence_enabled: true,
  policy_review_enabled: true,
  risk_critical_enabled: true,
  risk_high_enabled: true,
  risk_medium_enabled: false,
  risk_low_enabled: false,
  digest_frequency: "daily",
  digest_enabled: true,
  incident_alerts: true,
  vendor_assessment_due: true,
  framework_cert_expiry: true,
};

const SECTION_CONFIG = [
  {
    id: "tasks",
    icon: CheckCircle,
    color: "text-blue-500",
    title: "Task Deadlines",
    items: [
      { key: "overdue_tasks", label: "Overdue task alerts", description: "Get notified immediately when a task becomes overdue" },
      { key: "upcoming_tasks_enabled", label: "Upcoming deadlines", description: "Warn before tasks are due", sub: { key: "upcoming_tasks_days", label: "Days before due", type: "select", options: [{ v: 3, l: "3 days" }, { v: 7, l: "7 days" }, { v: 14, l: "14 days" }] } },
    ]
  },
  {
    id: "evidence",
    icon: FileText,
    color: "text-purple-500",
    title: "Evidence & Documents",
    items: [
      { key: "expiring_evidence_enabled", label: "Evidence expiry alerts", description: "Notify before approved evidence expires", sub: { key: "expiring_evidence_days", label: "Days before expiry", type: "select", options: [{ v: 14, l: "14 days" }, { v: 30, l: "30 days" }, { v: 60, l: "60 days" }] } },
      { key: "policy_review_enabled", label: "Policy review reminders", description: "Alert when policies are due for their scheduled review" },
    ]
  },
  {
    id: "risks",
    icon: AlertTriangle,
    color: "text-red-500",
    title: "Risk Alerts",
    description: "Choose which risk severity levels trigger notifications",
    items: [
      { key: "risk_critical_enabled", label: "Critical risks", description: "Always recommended" },
      { key: "risk_high_enabled", label: "High risks" },
      { key: "risk_medium_enabled", label: "Medium risks", description: "Consider batching into digest to reduce noise" },
      { key: "risk_low_enabled", label: "Low risks", description: "Usually not needed — use weekly digest instead" },
    ]
  },
  {
    id: "compliance",
    icon: Shield,
    color: "text-emerald-500",
    title: "Compliance & Vendors",
    items: [
      { key: "incident_alerts", label: "New incident notifications" },
      { key: "vendor_assessment_due", label: "Vendor assessment due dates" },
      { key: "framework_cert_expiry", label: "Framework certification expiry" },
    ]
  },
];

export default function NotificationPreferences() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PREF_KEY);
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch (_) {}
  }, []);

  const update = (key, value) => setPrefs(p => ({ ...p, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
      setSaved(true);
      toast({ title: "Preferences saved" });
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleSendTestDigest = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      const [tasks, evidence] = await Promise.all([
        base44.entities.ComplianceTask.list(),
        base44.entities.Evidence.list(),
      ]);
      const now = new Date();
      const dayMs = 24 * 60 * 60 * 1000;
      const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "completed");
      const upcomingTasks = tasks.filter(t => t.due_date && new Date(t.due_date) >= now && new Date(t.due_date) <= new Date(now.getTime() + prefs.upcoming_tasks_days * dayMs) && t.status !== "completed");
      const expiringEvidence = evidence.filter(e => e.expiry_date && new Date(e.expiry_date) <= new Date(now.getTime() + prefs.expiring_evidence_days * dayMs));

      const body = `ComplianceOS Notification Digest
${"=".repeat(40)}

🔴 OVERDUE TASKS (${overdueTasks.length}):
${overdueTasks.map(t => `  • ${t.title} — Due: ${t.due_date}`).join("\n") || "  None"}

🟡 UPCOMING (Next ${prefs.upcoming_tasks_days} days — ${upcomingTasks.length}):
${upcomingTasks.map(t => `  • ${t.title} — Due: ${t.due_date}`).join("\n") || "  None"}

📎 EXPIRING EVIDENCE (Next ${prefs.expiring_evidence_days} days — ${expiringEvidence.length}):
${expiringEvidence.map(e => `  • ${e.title} — Expires: ${e.expiry_date}`).join("\n") || "  None"}

Your notification preferences: ${prefs.digest_frequency} digest`;

      await base44.integrations.Core.SendEmail({ to: me.email, subject: "ComplianceOS — Test Digest", body });
      toast({ title: "Test digest sent to " + me.email });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        title="Notification Preferences"
        subtitle="Configure what alerts you receive and how often"
        actions={
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saved ? <><CheckCircle className="w-4 h-4 mr-1" /> Saved</> : saving ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Saving…</> : "Save Preferences"}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {SECTION_CONFIG.map(section => {
            const Icon = section.icon;
            return (
              <div key={section.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Icon className={`w-5 h-5 ${section.color}`} />
                  <h3 className="font-heading font-semibold text-foreground">{section.title}</h3>
                </div>
                {section.description && <p className="text-xs text-muted-foreground mb-4">{section.description}</p>}
                <div className="space-y-4">
                  {section.items.map(item => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium cursor-pointer">{item.label}</Label>
                          {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        </div>
                        <Switch
                          checked={!!prefs[item.key]}
                          onCheckedChange={v => update(item.key, v)}
                        />
                      </div>
                      {item.sub && prefs[item.key] && (
                        <div className="mt-2 ml-0 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{item.sub.label}:</span>
                          <Select value={String(prefs[item.sub.key])} onValueChange={v => update(item.sub.key, parseInt(v))}>
                            <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {item.sub.options.map(o => (
                                <SelectItem key={o.v} value={String(o.v)}>{o.l}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Digest Settings */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-5 h-5 text-indigo-500" />
              <h3 className="font-heading font-semibold text-foreground">Email Digest</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Enable digest emails</Label>
                <Switch checked={prefs.digest_enabled} onCheckedChange={v => update("digest_enabled", v)} />
              </div>
              {prefs.digest_enabled && (
                <div>
                  <Label className="text-xs text-muted-foreground">Frequency</Label>
                  <Select value={prefs.digest_frequency} onValueChange={v => update("digest_frequency", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="w-full mt-4" onClick={handleSendTestDigest} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Mail className="w-3.5 h-3.5 mr-1" />} Send Test Digest
            </Button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Reduce Alert Fatigue</p>
                <p className="text-xs text-muted-foreground">Consider disabling medium and low risk alerts and enabling the weekly digest instead. This keeps your inbox clean while ensuring nothing critical is missed.</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs font-semibold text-foreground mb-2">Current Settings Summary</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li className="flex items-center justify-between"><span>Overdue task alerts</span><span className={prefs.overdue_tasks ? "text-emerald-600 font-medium" : "text-red-500"}>{ prefs.overdue_tasks ? "On" : "Off"}</span></li>
              <li className="flex items-center justify-between"><span>Upcoming deadline window</span><span className="font-medium text-foreground">{prefs.upcoming_tasks_enabled ? `${prefs.upcoming_tasks_days} days` : "Off"}</span></li>
              <li className="flex items-center justify-between"><span>Evidence expiry window</span><span className="font-medium text-foreground">{prefs.expiring_evidence_enabled ? `${prefs.expiring_evidence_days} days` : "Off"}</span></li>
              <li className="flex items-center justify-between"><span>Risk alerts</span><span className="font-medium text-foreground">{[prefs.risk_critical_enabled && "Critical", prefs.risk_high_enabled && "High", prefs.risk_medium_enabled && "Med", prefs.risk_low_enabled && "Low"].filter(Boolean).join(", ") || "None"}</span></li>
              <li className="flex items-center justify-between"><span>Digest frequency</span><span className="font-medium text-foreground capitalize">{prefs.digest_enabled ? prefs.digest_frequency : "Off"}</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}