import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Send, Loader2, Clock, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

export default function Notifications() {
  const [tasks, setTasks] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.ComplianceTask.list(),
      base44.entities.Evidence.list()
    ]).then(([t, e]) => {
      setTasks(t); setEvidence(e); setLoading(false);
    });
  }, []);

  const overdueTasks = tasks.filter(t => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed"));
  const upcomingTasks = tasks.filter(t => t.due_date && new Date(t.due_date) >= new Date() && new Date(t.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && t.status !== "completed");
  const expiringEvidence = evidence.filter(e => e.expiry_date && new Date(e.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && e.status === "approved");

  const sendNotification = async (type, item) => {
    setSending(item.id);
    try {
      const subject = type === "overdue_task"
        ? `⚠ Overdue Task: ${item.title}`
        : type === "upcoming_task"
        ? `📋 Upcoming Task Due: ${item.title} (${item.due_date})`
        : `📎 Evidence Expiring: ${item.title} (Expires ${item.expiry_date})`;

      const body = type === "overdue_task"
        ? `Task "${item.title}" is overdue.\nPriority: ${item.priority}\nAssigned to: ${item.assignee_name || "Unassigned"}\nDue date: ${item.due_date}\n\nPlease take action immediately.`
        : type === "upcoming_task"
        ? `Task "${item.title}" is due on ${item.due_date}.\nPriority: ${item.priority}\nAssigned to: ${item.assignee_name || "Unassigned"}\n\nPlease ensure this is completed on time.`
        : `Evidence "${item.title}" expires on ${item.expiry_date}.\nControl: ${item.control_title || "N/A"}\nType: ${item.type}\n\nPlease collect updated evidence before expiry.`;

      const me = await base44.auth.me().catch(() => ({ email: "" }));
      if (me.email) {
        await base44.integrations.Core.SendEmail({
          to: me.email, subject, body
        });
      }
      toast({ title: `Notification sent for "${item.title}"` });
    } catch (e) {
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    }
    setSending(null);
  };

  const sendDigest = async () => {
    setSending("digest");
    try {
      const me = await base44.auth.me().catch(() => ({ email: "" }));
      if (!me.email) { toast({ title: "No email available", variant: "destructive" }); setSending(null); return; }

      const body = `ComplianceOS — Daily Digest
${"=" .repeat(40)}

🔴 OVERDUE TASKS (${overdueTasks.length}):
${overdueTasks.map(t => `  • ${t.title} — Due: ${t.due_date} — ${t.priority.toUpperCase()}`).join("\n") || "  None"}

🟡 UPCOMING THIS WEEK (${upcomingTasks.length}):
${upcomingTasks.map(t => `  • ${t.title} — Due: ${t.due_date} — ${t.priority.toUpperCase()}`).join("\n") || "  None"}

📎 EXPIRING EVIDENCE (${expiringEvidence.length}):
${expiringEvidence.map(e => `  • ${e.title} — Expires: ${e.expiry_date} — ${e.control_title || "N/A"}`).join("\n") || "  None"}

Please log in to ComplianceOS to address these items.`;

      await base44.integrations.Core.SendEmail({ to: me.email, subject: "ComplianceOS Daily Digest", body });
      toast({ title: "Digest email sent" });
    } catch (e) {
      toast({ title: "Failed to send digest", description: e.message, variant: "destructive" });
    }
    setSending(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Email Notifications" subtitle="Manual and automated alerts for overdue tasks, upcoming deadlines, and expiring evidence" actions={
        <Button size="sm" onClick={sendDigest} disabled={sending === "digest"}>
          {sending === "digest" ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-1" /> Send Daily Digest</>}
        </Button>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Tasks */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Overdue Tasks ({overdueTasks.length})
          </h3>
          {overdueTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No overdue tasks 🎉</p>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {t.due_date || "N/A"} · {t.assignee_name || "Unassigned"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => sendNotification("overdue_task", t)} disabled={sending === t.id}>
                    {sending === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Send</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming This Week */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            Due This Week ({upcomingTasks.length})
          </h3>
          {upcomingTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nothing due this week</p>
          ) : (
            <div className="space-y-2">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {t.due_date} · <StatusBadge status={t.priority} /></p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => sendNotification("upcoming_task", t)} disabled={sending === t.id}>
                    {sending === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Bell className="w-3.5 h-3.5 mr-1" /> Remind</>}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expiring Evidence */}
      <div className="mt-6 bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-500" />
          Expiring Evidence (Next 30 Days — {expiringEvidence.length})
        </h3>
        {expiringEvidence.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No evidence expiring soon</p>
        ) : (
          <div className="space-y-2">
            {expiringEvidence.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-xs text-muted-foreground">Expires: {e.expiry_date} · Control: {e.control_title || "N/A"}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => sendNotification("expiring_evidence", e)} disabled={sending === e.id}>
                  {sending === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1" /> Alert</>}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}