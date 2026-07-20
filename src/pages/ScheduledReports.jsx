import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plus, Send, Trash2, Edit2, CheckCircle, AlertCircle,
  Calendar, Mail, Users, Clock, RefreshCw, Play, Power
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { sendReportToStakeholders } from "@/lib/reportEmailer";
import { useAuth } from "@/lib/AuthContext";

const defaultForm = {
  name: "",
  recipients: "",
  frequency: "monthly",
  day_of_month: 1,
  subject_prefix: "Compliance Posture Report",
  custom_message: "",
  is_active: true,
};

export default function ScheduledReports() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [sending, setSending] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast, dismiss } = useToast();
  const { user } = useAuth();

  // Auto-dismiss action toasts quickly so they clear right after the action completes
  const flash = (opts, ms = 2500) => {
    const t = toast(opts);
    setTimeout(() => dismiss(t.id), ms);
    return t;
  };

  const load = async () => {
    const data = await base44.entities.ReportSchedule.list("-created_date", 100);
    setSchedules(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(defaultForm); setEditId(null); setOpen(true); };
  const openEdit = (s) => {
    setForm({
      name: s.name || "",
      recipients: s.recipients || "",
      frequency: s.frequency || "monthly",
      day_of_month: s.day_of_month || 1,
      subject_prefix: s.subject_prefix || "Compliance Posture Report",
      custom_message: s.custom_message || "",
      is_active: s.is_active !== false,
    });
    setEditId(s.id);
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.recipients) return;
    setSaving(true);
    try {
      const payload = { ...form, created_by_name: user?.full_name || user?.email || "Admin" };
      if (editId) await base44.entities.ReportSchedule.update(editId, payload);
      else await base44.entities.ReportSchedule.create(payload);
      setOpen(false);
      await load();
      flash({ title: editId ? "Schedule updated" : "Schedule created" });
    } catch (e) {
      toast({ title: "Error saving schedule", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ReportSchedule.delete(id);
    await load();
    flash({ title: "Schedule deleted" });
  };

  const toggleActive = async (s) => {
    await base44.entities.ReportSchedule.update(s.id, { is_active: !s.is_active });
    await load();
  };

  const sendNow = async (schedule) => {
    setSending(prev => ({ ...prev, [schedule.id]: true }));
    try {
      const { successCount, failCount, emails } = await sendReportToStakeholders({ base44, schedule });
      await base44.entities.ReportSchedule.update(schedule.id, {
        last_sent_at: new Date().toISOString().slice(0, 10),
        last_sent_status: failCount === emails.length ? "failed" : "sent",
        total_sent: (schedule.total_sent || 0) + successCount,
      });
      await load();
      flash({
        title: `Report sent to ${successCount} recipient${successCount !== 1 ? "s" : ""}`,
        description: failCount > 0 ? `${failCount} failed to deliver.` : "All deliveries successful.",
      });
    } catch (e) {
      await base44.entities.ReportSchedule.update(schedule.id, { last_sent_status: "failed" });
      await load();
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    }
    setSending(prev => ({ ...prev, [schedule.id]: false }));
  };

  const recipientCount = (s) => (s.recipients || "").split(",").filter(e => e.trim().includes("@")).length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduled Reports"
        subtitle="Automatically email compliance posture snapshots to leadership and stakeholders — no login required"
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> New Schedule
          </Button>
        }
      />

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Mail className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-800">
          <strong>How it works:</strong> Each schedule defines a recipient list and frequency. Click <strong>Send Now</strong> to dispatch an HTML compliance report immediately. The report includes compliance score, open risks, failing controls, framework readiness, and improvement recommendations — all viewable without any login.
        </div>
      </div>

      {schedules.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
          <Calendar className="w-12 h-12 text-muted-foreground/30" />
          <p className="font-semibold text-foreground">No schedules yet</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Create your first report schedule to start emailing compliance updates to your leadership team.
          </p>
          <Button size="sm" onClick={openNew} className="mt-2">
            <Plus className="w-4 h-4 mr-1" /> Create Schedule
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {schedules.map(s => (
            <div key={s.id} className={`bg-card rounded-xl border ${s.is_active ? "border-border" : "border-border/50 opacity-60"} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.is_active ? "bg-blue-100" : "bg-muted"}`}>
                    <Mail className={`w-5 h-5 ${s.is_active ? "text-blue-600" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{s.name}</h3>
                      {!s.is_active && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Paused</span>
                      )}
                      {s.last_sent_status === "sent" && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Last sent OK
                        </span>
                      )}
                      {s.last_sent_status === "failed" && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Last send failed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {recipientCount(s)} recipient{recipientCount(s) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.frequency === "monthly" ? `Monthly (day ${s.day_of_month})` : s.frequency === "weekly" ? "Weekly" : "Manual only"}
                      </span>
                      {s.last_sent_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Last sent: {s.last_sent_at}
                        </span>
                      )}
                      {s.total_sent > 0 && (
                        <span>{s.total_sent} total sent</span>
                      )}
                    </div>

                    {/* Recipient preview */}
                    <p className="text-xs text-muted-foreground mt-1.5 truncate max-w-lg">
                      <Mail className="w-3 h-3 inline mr-1" />
                      {s.recipients}
                    </p>

                    {s.custom_message && (
                      <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-lg">"{s.custom_message}"</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(s)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                    title={s.is_active ? "Pause schedule" : "Activate schedule"}
                  >
                    <Power className={`w-4 h-4 ${s.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                  <Button
                    size="sm"
                    onClick={() => sendNow(s)}
                    disabled={sending[s.id]}
                    className="ml-1"
                  >
                    {sending[s.id]
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />
                      : <Play className="w-3.5 h-3.5 mr-1" />}
                    {sending[s.id] ? "Sending..." : "Send Now"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Schedule" : "New Report Schedule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div>
              <Label>Schedule Name</Label>
              <Input
                placeholder="e.g. Monthly Board Report"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <Label>Recipients (comma-separated emails)</Label>
              <Textarea
                placeholder="ceo@company.com, board@company.com, ciso@company.com"
                value={form.recipients}
                onChange={e => setForm({ ...form, recipients: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(form.recipients || "").split(",").filter(e => e.trim().includes("@")).length} valid email{(form.recipients || "").split(",").filter(e => e.trim().includes("@")).length !== 1 ? "s" : ""} detected
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm({ ...form, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual only</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.frequency === "monthly" && (
                <div>
                  <Label>Send on Day of Month</Label>
                  <Input
                    type="number"
                    min={1} max={28}
                    value={form.day_of_month}
                    onChange={e => setForm({ ...form, day_of_month: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Email Subject Prefix</Label>
              <Input
                placeholder="Compliance Posture Report"
                value={form.subject_prefix}
                onChange={e => setForm({ ...form, subject_prefix: e.target.value })}
              />
            </div>

            <div>
              <Label>Custom Message (optional)</Label>
              <Textarea
                placeholder="Please review the attached compliance summary for this period."
                value={form.custom_message}
                onChange={e => setForm({ ...form, custom_message: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active (enable this schedule)</Label>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={saving || !form.name || !form.recipients}
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : null}
              {editId ? "Update Schedule" : "Create Schedule"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}