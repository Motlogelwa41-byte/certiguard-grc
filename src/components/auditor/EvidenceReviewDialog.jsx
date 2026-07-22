import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

export default function EvidenceReviewDialog({ evidence, open, onOpenChange, reviewerName, onDone }) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setNotes(evidence?.review_notes || ""); }, [evidence, open]);

  const decide = async (status) => {
    if (!evidence) return;
    setSaving(true);
    try {
      await base44.entities.Evidence.update(evidence.id, {
        status,
        reviewer_name: reviewerName || "External Auditor",
        reviewed_at: new Date().toISOString().slice(0, 10),
        review_notes: notes,
      });
      onDone?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review evidence — {evidence?.title}</DialogTitle>
        </DialogHeader>
        {evidence?.file_url && (
          <a href={evidence.file_url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Open evidence file
          </a>
        )}
        <div>
          <Label>Control</Label>
          <Input value={evidence?.control_title || "—"} readOnly />
        </div>
        <div>
          <Label>Review notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Record your review decision rationale…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => decide("rejected")} disabled={saving}>Reject</Button>
          <Button onClick={() => decide("approved")} disabled={saving}>{saving ? "Saving…" : "Approve"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}