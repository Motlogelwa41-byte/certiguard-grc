import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Circle, UserMinus } from "lucide-react";

const checklist = [
  { key: "access_revoked_confirmed", label: "System access revoked" },
  { key: "credentials_revoked_confirmed", label: "API keys / credentials revoked" },
  { key: "data_returned_confirmed", label: "Data returned / securely destroyed" },
];

// Formal vendor offboarding checklist — each item writes through to the Vendor
// record so the offboarding trail is auditable.
export default function OffboardingChecklist({ vendor, onChanged }) {
  const { toast } = useToast();
  const [owner, setOwner] = useState(vendor.offboarding_owner_name || "");
  const [date, setDate] = useState(vendor.offboarding_date || "");
  const [notes, setNotes] = useState(vendor.offboarding_notes || "");
  const [saving, setSaving] = useState(false);

  const status = vendor.offboarding_status || "not_started";
  const allDone = checklist.every((c) => vendor[c.key]);

  const patch = async (p, msg) => {
    try {
      await base44.entities.Vendor.update(vendor.id, p);
      toast({ title: msg });
      onChanged?.();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const saveDetails = async () => {
    setSaving(true);
    try {
      await base44.entities.Vendor.update(vendor.id, {
        offboarding_owner_name: owner,
        offboarding_date: date,
        offboarding_notes: notes,
      });
      toast({ title: "Offboarding details saved" });
      onChanged?.();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const complete = async () => {
    await patch(
      { offboarding_status: "completed", offboarding_date: date || new Date().toISOString().slice(0, 10) },
      "Offboarding completed"
    );
  };

  return (
    <div className="rounded-lg border border-border p-3 bg-background">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <UserMinus className="w-3.5 h-3.5 text-primary" /> Vendor Offboarding
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            status === "completed"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : status === "in_progress"
              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="space-y-2">
        {checklist.map((c) => {
          const ok = !!vendor[c.key];
          return (
            <label key={c.key} className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="flex items-center gap-2 text-xs">
                {ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-muted-foreground" />}
                {c.label}
              </span>
              <Switch checked={ok} onCheckedChange={() => patch({ [c.key]: !ok }, "Checklist updated")} disabled={status === "completed"} />
            </label>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div>
          <Label className="text-xs">Offboarding owner</Label>
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="e.g. Procurement" className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Offboarding date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <Textarea
        className="mt-2 text-xs"
        rows={2}
        placeholder="Offboarding notes & evidence…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="outline" onClick={saveDetails} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </Button>
        {status !== "completed" && (
          <Button size="sm" className="flex-1" disabled={!allDone} onClick={complete}>
            Mark offboarding complete
          </Button>
        )}
      </div>
    </div>
  );
}