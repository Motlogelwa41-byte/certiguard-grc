import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { FileSignature } from "lucide-react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function plusYear() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

// Formal risk acceptance sign-off: records the approver, justification, typed
// signature and expiry on the Risk, and writes an immutable "approve" entry to
// the audit trail for auditor evidence.
export default function RiskAcceptanceDialog({ risk, open, onOpenChange, onAccepted }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [justification, setJustification] = useState("");
  const [signature, setSignature] = useState("");
  const [expiresAt, setExpiresAt] = useState(plusYear());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (risk) {
      setJustification(risk.tolerance_justification || "");
      setSignature("");
      setExpiresAt(plusYear());
    }
  }, [risk]);

  const submit = async () => {
    if (!justification.trim()) {
      toast({ title: "Justification is required to accept this risk", variant: "destructive" });
      return;
    }
    if (!signature.trim()) {
      toast({ title: "Please type your full name to sign", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const acceptedAt = todayISO();
      const payload = {
        treatment: "accept",
        status: "accepted",
        tolerance_justification: justification.trim(),
        accepted_by_name: user?.full_name || user?.email || signature.trim(),
        accepted_by_id: user?.id || "",
        accepted_at: acceptedAt,
        acceptance_expires_at: expiresAt,
        acceptance_signature: signature.trim(),
      };
      await base44.entities.Risk.update(risk.id, payload);
      await base44.functions.invoke("logAudit", {
        action: "approve",
        entity_type: "Risk",
        entity_id: risk.id,
        entity_name: risk.title,
        changes: JSON.stringify({
          accepted: true,
          accepted_by: payload.accepted_by_name,
          accepted_at: acceptedAt,
          expires: expiresAt,
          signature: signature.trim(),
        }),
        severity: "warning",
      });
      toast({ title: "Risk formally accepted", description: "Sign-off recorded to the audit trail." });
      onAccepted?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="w-4 h-4" /> Formal Risk Acceptance
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium text-foreground">{risk?.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Score {(risk?.likelihood || 1) * (risk?.impact || 1)} · Recording a formal, auditable sign-off.
            </p>
          </div>
          <div>
            <Label>Justification for acceptance <span className="text-destructive">*</span></Label>
            <Textarea
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain the business rationale for accepting this risk…"
            />
          </div>
          <div>
            <Label>Acceptance valid until</Label>
            <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
          <div>
            <Label>Type your full name to sign <span className="text-destructive">*</span></Label>
            <Input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder={user?.full_name || "Your full name"}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              By signing you confirm authority to accept this risk. This sign-off is recorded immutably to the audit trail.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "Recording…" : "Accept & Sign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}