import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Loader2, CheckCircle, ArrowRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RemediationDialog({ open, onOpenChange, control, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "done"
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    assignee_name: "",
    assignee_email: "",
    due_date: "",
    priority: "high",
    notes: "",
    retest_date: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setStep("form");
      // Default due date: 14 days from now, retest 30 days
      const now = new Date();
      const due = new Date(now); due.setDate(due.getDate() + 14);
      const retest = new Date(now); retest.setDate(retest.getDate() + 30);
      setForm(f => ({
        ...f,
        due_date: due.toISOString().split("T")[0],
        retest_date: retest.toISOString().split("T")[0],
      }));
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!control) return;
    setSaving(true);
    try {
      // 1. Create a ComplianceTask for remediation
      const task = await base44.entities.ComplianceTask.create({
        title: `Remediate: ${control.title}`,
        description: `Control ${control.control_id || control.id} is FAILING and requires remediation.\n\n${form.notes || "Investigate root cause and implement corrective action."}`,
        type: "remediation",
        status: "todo",
        priority: form.priority,
        assignee_name: form.assignee_name,
        assignee_email: form.assignee_email,
        due_date: form.due_date,
        related_control_id: control.id,
      });

      // 2. Create a follow-up retest task
      if (form.retest_date) {
        await base44.entities.ComplianceTask.create({
          title: `Retest: ${control.title}`,
          description: `Retest control ${control.control_id || control.id} after remediation is complete. Verify the control is now PASSING.`,
          type: "control_implementation",
          status: "todo",
          priority: "medium",
          assignee_name: form.assignee_name,
          assignee_email: form.assignee_email,
          due_date: form.retest_date,
          related_control_id: control.id,
        });
      }

      // 3. Mark control as "in remediation" (not_tested signals it's being worked)
      await base44.entities.Control.update(control.id, { status: "not_tested" });

      // 4. Send email notification if assignee email provided
      if (form.assignee_email) {
        try {
          await base44.integrations.Core.SendEmail({
            to: form.assignee_email,
            subject: `Action Required: Control Remediation — ${control.title}`,
            body: `Hi ${form.assignee_name || "Team"},\n\nA compliance control has been flagged as FAILING and requires your attention:\n\n` +
              `Control: ${control.title} (${control.control_id || ""})\n` +
              `Severity: ${control.severity || "Unknown"}\n` +
              `Category: ${(control.category || "").replace(/_/g, " ")}\n\n` +
              `Remediation Due: ${form.due_date}\n` +
              `Retest Scheduled: ${form.retest_date}\n\n` +
              (form.notes ? `Notes: ${form.notes}\n\n` : "") +
              `Please log in to CertiGuard GRC to view the full details and update your progress.\n\nCompliance Team`,
          });
        } catch {} // Don't fail the whole flow if email fails
      }

      setStep("done");
      toast({ title: "Remediation loop created", description: "Task assigned, retest scheduled, and email sent." });
      onSuccess?.();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (!control) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Closed-Loop Remediation
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-800 mb-0.5">Failing Control</p>
              <p className="text-sm font-medium text-red-900">{control.title}</p>
              {control.control_id && <p className="text-xs text-red-600 font-mono">{control.control_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assignee Name</Label><Input value={form.assignee_name} onChange={e => setForm(f => ({ ...f, assignee_name: e.target.value }))} placeholder="Jane Dube" /></div>
              <div><Label>Assignee Email</Label><Input type="email" value={form.assignee_email} onChange={e => setForm(f => ({ ...f, assignee_email: e.target.value }))} placeholder="jane@co.com" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Remediation Due</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              <div><Label>Retest Date</Label><Input type="date" value={form.retest_date} onChange={e => setForm(f => ({ ...f, retest_date: e.target.value }))} /></div>
            </div>

            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div><Label>Remediation Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Root cause, remediation steps, or context..."
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">This will automatically:</p>
              <p>→ Create a remediation task assigned to the team member</p>
              <p>→ Schedule a retest task after remediation</p>
              <p>→ Send an email notification to the assignee</p>
              <p>→ Mark the control as pending retest</p>
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={saving}>
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating loop…</>
                : <><Zap className="w-4 h-4 mr-2" />Launch Remediation Loop</>
              }
            </Button>
          </div>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">Remediation Loop Launched</h3>
              <p className="text-sm text-muted-foreground mt-1">The closed-loop remediation cycle is now active.</p>
            </div>
            <div className="text-left bg-muted/50 rounded-xl p-4 space-y-2">
              {[
                `✅ Remediation task created (due ${form.due_date})`,
                `✅ Retest task scheduled (due ${form.retest_date})`,
                form.assignee_email ? `✅ Email sent to ${form.assignee_email}` : `⚠ No email (no assignee email provided)`,
                `✅ Control marked as pending retest`,
              ].map((item, i) => (
                <p key={i} className="text-xs text-foreground">{item}</p>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
              <Button className="flex-1" onClick={() => { onOpenChange(false); window.location.href = "/tasks"; }}>
                View Tasks <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}