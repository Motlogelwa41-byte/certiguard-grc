import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bell, Send, CheckCircle, XCircle, Clock, AlertTriangle, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const REMINDER_WINDOWS = [
  { days: 1, label: "1 day before" },
  { days: 3, label: "3 days before" },
  { days: 7, label: "7 days before" },
  { days: 14, label: "14 days before" },
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr); due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

export default function TaskReminders() {
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedDays, setSelectedDays] = useState([7, 3, 1]);
  const [emailField, setEmailField] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const [t, r] = await Promise.all([
      base44.entities.ComplianceTask.list(),
      base44.entities.TaskReminder.list("-sent_at", 100),
    ]);
    setTasks(t);
    setReminders(r);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Tasks that are upcoming and not completed
  const upcomingTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    if (t.status === "completed") return false;
    const days = daysUntil(t.due_date);
    return days !== null && days <= 30;
  }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

  const getRemindersSentFor = (taskId) => reminders.filter((r) => r.task_id === taskId);

  const urgencyColor = (days) => {
    if (days < 0) return "text-red-500";
    if (days <= 1) return "text-red-500";
    if (days <= 3) return "text-orange-400";
    if (days <= 7) return "text-amber-400";
    return "text-blue-400";
  };

  const urgencyBg = (days) => {
    if (days < 0) return "border-red-500/30 bg-red-500/5";
    if (days <= 1) return "border-red-500/20 bg-red-500/5";
    if (days <= 3) return "border-orange-400/20 bg-orange-400/5";
    if (days <= 7) return "border-amber-400/20 bg-amber-400/5";
    return "border-border bg-card";
  };

  const sendReminder = async (task, email) => {
    if (!email) {
      toast({ title: "Email required", description: "Enter the assignee's email address.", variant: "destructive" });
      return;
    }
    setSendingId(task.id);
    const days = daysUntil(task.due_date);
    const urgencyLabel = days < 0 ? `OVERDUE by ${Math.abs(days)} day(s)` : days === 0 ? "due TODAY" : `due in ${days} day(s)`;
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: `⚠️ Compliance Task Reminder: "${task.title}" is ${urgencyLabel}`,
        body: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 8px;">
  <div style="background: #1e293b; color: white; padding: 20px 24px; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 18px;">🔔 Compliance Task Reminder</h2>
  </div>
  <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
    <p>Hi ${task.assignee_name || "Team Member"},</p>
    <p>This is a reminder that the following compliance task is <strong>${urgencyLabel}</strong>:</p>
    <div style="background: #f1f5f9; border-left: 4px solid #6366f1; padding: 16px; margin: 16px 0; border-radius: 4px;">
      <h3 style="margin: 0 0 8px 0; color: #1e293b;">${task.title}</h3>
      <p style="margin: 4px 0; color: #64748b;"><strong>Due Date:</strong> ${task.due_date}</p>
      <p style="margin: 4px 0; color: #64748b;"><strong>Priority:</strong> ${(task.priority || "medium").toUpperCase()}</p>
      <p style="margin: 4px 0; color: #64748b;"><strong>Type:</strong> ${(task.type || "").replace(/_/g, " ")}</p>
      ${task.description ? `<p style="margin: 8px 0 0 0; color: #475569;">${task.description}</p>` : ""}
    </div>
    <p>Please log in to the ComplianceOS platform to update the task status and take action.</p>
    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      This reminder was sent by ComplianceOS. Do not reply to this email.
    </p>
  </div>
</div>`,
      });

      await base44.entities.TaskReminder.create({
        task_id: task.id,
        task_title: task.title,
        assignee_name: task.assignee_name || "",
        assignee_email: email,
        due_date: task.due_date,
        days_before: days,
        sent_at: new Date().toISOString(),
        status: "sent",
        priority: task.priority,
      });

      toast({ title: "Reminder sent", description: `Email sent to ${email}` });
      load();
    } catch (e) {
      await base44.entities.TaskReminder.create({
        task_id: task.id,
        task_title: task.title,
        assignee_email: email,
        due_date: task.due_date,
        days_before: days,
        sent_at: new Date().toISOString(),
        status: "failed",
      });
      toast({ title: "Failed to send", description: e.message, variant: "destructive" });
    }
    setSendingId(null);
  };

  const sendBulkReminders = async () => {
    const targets = upcomingTasks.filter((t) => {
      const days = daysUntil(t.due_date);
      return selectedDays.some((d) => days !== null && days <= d && days >= 0);
    });

    const withEmail = targets.filter((t) => emailField[t.id] || t.assignee_email);
    if (withEmail.length === 0) {
      toast({ title: "No emails set", description: "Enter email addresses for tasks you want to remind.", variant: "destructive" });
      return;
    }

    setSending(true);
    let sent = 0;
    for (const task of withEmail) {
      const email = emailField[task.id] || task.assignee_email;
      const days = daysUntil(task.due_date);
      const urgencyLabel = days < 0 ? `OVERDUE by ${Math.abs(days)} day(s)` : days === 0 ? "due TODAY" : `due in ${days} day(s)`;
      try {
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `⚠️ Compliance Task Reminder: "${task.title}" is ${urgencyLabel}`,
          body: `Hi ${task.assignee_name || "Team"},\n\nThis is a reminder that "${task.title}" is ${urgencyLabel}.\n\nPriority: ${task.priority}\nDue: ${task.due_date}\n\nPlease log in to ComplianceOS to take action.\n\n— ComplianceOS`,
        });
        await base44.entities.TaskReminder.create({
          task_id: task.id, task_title: task.title,
          assignee_name: task.assignee_name || "", assignee_email: email,
          due_date: task.due_date, days_before: days,
          sent_at: new Date().toISOString(), status: "sent", priority: task.priority,
        });
        sent++;
      } catch (_) {}
    }
    setSending(false);
    toast({ title: `${sent} reminder(s) sent`, description: "Check the log below for details." });
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Reminders"
        subtitle="Send email reminders to assignees for upcoming and overdue compliance tasks"
        actions={
          <Button onClick={sendBulkReminders} disabled={sending} size="sm">
            {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
            {sending ? "Sending…" : "Send Bulk Reminders"}
          </Button>
        }
      />

      {/* Reminder window config */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Bulk Reminder Window</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select which tasks to include when sending bulk reminders — tasks due within the selected timeframes will be targeted.</p>
        <div className="flex flex-wrap gap-2">
          {REMINDER_WINDOWS.map(({ days, label }) => (
            <button
              key={days}
              onClick={() => setSelectedDays((prev) => prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${selectedDays.includes(days) ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming tasks list */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Upcoming & Overdue Tasks</h3>
          <span className="ml-auto text-xs text-muted-foreground">{upcomingTasks.length} tasks within 30 days</span>
        </div>

        {upcomingTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            No upcoming tasks in the next 30 days
          </div>
        ) : (
          <div className="divide-y divide-border">
            {upcomingTasks.map((task) => {
              const days = daysUntil(task.due_date);
              const sent = getRemindersSentFor(task.id);
              const lastSent = sent[0];
              return (
                <div key={task.id} className={`p-4 border-l-4 ${urgencyBg(days)}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground">{task.title}</h4>
                        <StatusBadge status={task.priority} />
                        <StatusBadge status={task.status} />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className={`font-semibold ${urgencyColor(days)}`}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                          </span>
                          &nbsp;· Due {task.due_date}
                        </span>
                        {task.assignee_name && <span>👤 {task.assignee_name}</span>}
                        {lastSent && (
                          <span className="flex items-center gap-1 text-emerald-500">
                            <Mail className="w-3 h-3" /> Reminded {new Date(lastSent.sent_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        placeholder="assignee@email.com"
                        className="h-8 text-xs w-48"
                        value={emailField[task.id] ?? (task.assignee_email || "")}
                        onChange={(e) => setEmailField((prev) => ({ ...prev, [task.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={sendingId === task.id}
                        onClick={() => sendReminder(task, emailField[task.id] || task.assignee_email)}
                      >
                        {sendingId === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reminder log */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Reminder Log</h3>
          <span className="ml-auto text-xs text-muted-foreground">{reminders.length} sent</span>
        </div>
        {reminders.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No reminders sent yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Task</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent To</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Due Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sent At</th>
                </tr>
              </thead>
              <tbody>
                {reminders.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                    <td className="px-4 py-2.5">
                      {r.status === "sent"
                        ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                        : <XCircle className="w-4 h-4 text-red-500" />}
                    </td>
                    <td className="px-4 py-2.5 font-medium max-w-xs truncate">{r.task_title}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.assignee_email}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.due_date}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.sent_at ? new Date(r.sent_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}