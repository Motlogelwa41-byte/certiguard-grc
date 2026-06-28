import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Plus, Trash2, PenLine, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

const STEP_STATUS = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-600", icon: Clock },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle },
};

function WorkflowStep({ step, index, onSign, currentUser, isActive }) {
  const [sigName, setSigName] = useState("");
  const [comments, setComments] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejReason, setRejReason] = useState("");
  const [signing, setSigning] = useState(false);

  const Cfg = STEP_STATUS[step.status] || STEP_STATUS.pending;
  const Icon = Cfg.icon;

  const handleApprove = async () => {
    if (!sigName.trim()) return;
    setSigning(true);
    await onSign(index, "approved", sigName, comments, "");
    setSigning(false);
  };

  const handleReject = async () => {
    if (!rejReason.trim()) return;
    setSigning(true);
    await onSign(index, "rejected", sigName, comments, rejReason);
    setSigning(false);
  };

  return (
    <div className={`rounded-lg border p-4 ${isActive && step.status === "pending" ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">{index + 1}</span>
          <div>
            <p className="text-sm font-semibold text-foreground">{step.approver_name || `Approver ${index + 1}`}</p>
            {step.approver_email && <p className="text-xs text-muted-foreground">{step.approver_email}</p>}
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${Cfg.color}`}>
          <Icon className="w-3 h-3" /> {Cfg.label}
        </span>
      </div>

      {step.status === "approved" && (
        <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            ✍️ <span className="font-semibold">Signed by:</span> {step.signature} — {new Date(step.signed_at).toLocaleString()}
          </p>
          {step.comments && <p className="text-xs text-muted-foreground mt-1">"{step.comments}"</p>}
        </div>
      )}

      {step.status === "rejected" && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-700">✗ Rejected by {step.signature} — {step.rejection_reason}</p>
        </div>
      )}

      {isActive && step.status === "pending" && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <div>
            <Label className="text-xs">Your Full Name (e-signature)</Label>
            <Input className="h-8 text-sm mt-1" placeholder="Type your full name to sign..." value={sigName} onChange={e => setSigName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Comments (optional)</Label>
            <Textarea className="text-sm mt-1" rows={2} placeholder="Add approval notes..." value={comments} onChange={e => setComments(e.target.value)} />
          </div>
          {!rejecting ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={!sigName.trim() || signing}>
                <PenLine className="w-3.5 h-3.5 mr-1" /> Sign & Approve
              </Button>
              <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50" onClick={() => setRejecting(true)}>
                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea className="text-sm" rows={2} placeholder="Rejection reason (required)..." value={rejReason} onChange={e => setRejReason(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" className="flex-1" onClick={handleReject} disabled={!rejReason.trim() || !sigName.trim() || signing}>Confirm Rejection</Button>
                <Button size="sm" variant="outline" onClick={() => setRejecting(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PolicyApprovalDialog({ policy, open, onOpenChange, onUpdated }) {
  const { toast } = useToast();
  const [steps, setSteps] = useState(() => {
    try { return JSON.parse(policy?.approval_workflow || "[]"); } catch { return []; }
  });
  const [newApprover, setNewApprover] = useState({ name: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeIndex = steps.findIndex(s => s.status === "pending");
  const allApproved = steps.length > 0 && steps.every(s => s.status === "approved");
  const anyRejected = steps.some(s => s.status === "rejected");

  const addApprover = () => {
    if (!newApprover.name.trim()) return;
    setSteps(prev => [...prev, { approver_name: newApprover.name, approver_email: newApprover.email, status: "pending", signed_at: null, signature: null, comments: null, rejection_reason: null }]);
    setNewApprover({ name: "", email: "" });
  };

  const removeStep = (i) => setSteps(prev => prev.filter((_, idx) => idx !== i));

  const saveWorkflow = async () => {
    setSaving(true);
    await base44.entities.Policy.update(policy.id, { approval_workflow: JSON.stringify(steps) });
    toast({ title: "Workflow saved" });
    setSaving(false);
    onUpdated?.();
  };

  const submitForApproval = async () => {
    if (steps.length === 0) { toast({ title: "Add at least one approver first", variant: "destructive" }); return; }
    setSubmitting(true);
    const now = new Date().toISOString();
    await base44.entities.Policy.update(policy.id, {
      status: "pending_approval",
      approval_workflow: JSON.stringify(steps),
      submitted_for_review_at: now,
    });
    toast({ title: "Submitted for approval", description: `${steps.length} approver(s) in the queue.` });
    setSubmitting(false);
    onUpdated?.();
  };

  const onSign = async (index, action, sigName, comments, rejReason) => {
    const now = new Date().toISOString();
    const updated = steps.map((s, i) => i === index
      ? { ...s, status: action, signature: sigName, signed_at: now, comments, rejection_reason: rejReason || undefined }
      : s
    );
    setSteps(updated);

    const allDone = updated.every(s => s.status === "approved");
    const rejected = updated.some(s => s.status === "rejected");

    const patch = { approval_workflow: JSON.stringify(updated) };
    if (allDone) { patch.status = "approved"; patch.approved_by = sigName; patch.approved_date = now.slice(0, 10); }
    if (rejected) { patch.status = "rejected"; patch.rejection_reason = rejReason; }

    await base44.entities.Policy.update(policy.id, patch);
    toast({ title: action === "approved" ? "Step approved ✓" : "Step rejected" });
    onUpdated?.();
  };

  const canSubmit = policy?.status === "draft" || policy?.status === "in_review";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-4 h-4 text-primary" /> Approval Workflow
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">{policy?.title} · v{policy?.version || "1.0"}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Banner */}
          {allApproved && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Policy fully approved by all signatories.
            </div>
          )}
          {anyRejected && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 text-red-700 text-sm">
              <XCircle className="w-4 h-4" /> Approval chain blocked — policy rejected.
            </div>
          )}

          {/* Approval Steps */}
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No approvers added yet. Add approvers below to set up the workflow.</p>
          ) : (
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  <WorkflowStep step={step} index={i} isActive={i === activeIndex} onSign={onSign} />
                  {step.status === "pending" && policy?.status !== "pending_approval" && (
                    <button onClick={() => removeStep(i)} className="absolute top-3 right-3 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Approver */}
          {policy?.status !== "pending_approval" && !allApproved && (
            <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Approver</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input className="h-8 text-sm mt-1" placeholder="Jane Smith" value={newApprover.name} onChange={e => setNewApprover(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Email (optional)</Label>
                  <Input className="h-8 text-sm mt-1" type="email" placeholder="jane@company.com" value={newApprover.email} onChange={e => setNewApprover(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={addApprover} disabled={!newApprover.name.trim()}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add to Chain
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1 border-t border-border">
            {canSubmit && steps.length > 0 && (
              <Button size="sm" className="flex-1" onClick={submitForApproval} disabled={submitting}>
                <Send className="w-3.5 h-3.5 mr-1" /> Submit for Approval
              </Button>
            )}
            {policy?.status !== "pending_approval" && (
              <Button size="sm" variant="outline" onClick={saveWorkflow} disabled={saving}>
                Save Draft
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}