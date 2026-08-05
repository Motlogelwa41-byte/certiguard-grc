import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const STATUSES = ["open", "in_progress", "remediated", "accepted", "false_positive"];
const POSTURE_CHECKS = [
  "IAM",
  "Encryption",
  "Network",
  "Logging",
  "Configuration",
  "Compliance",
  "Malware",
  "Vulnerability",
  "Endpoint Protection",
  "Other",
];

const EMPTY = {
  title: "",
  description: "",
  severity: "medium",
  status: "open",
  posture_check: "Configuration",
  resource_id: "",
  asset: "",
  detected_date: new Date().toISOString().slice(0, 10),
};

export default function ManualFindingDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const finding_id = `SF-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      await base44.entities.SecurityFinding.create({
        ...form,
        finding_id,
        source: "security_hub",
        cloud_provider: "other",
      });
      toast({ title: "Finding logged successfully" });
      setForm(EMPTY);
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      toast({
        title: "Failed to log finding",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Security Finding (Manual)</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="f-title">Title *</Label>
            <Input
              id="f-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. S3 bucket allows public read access"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-desc">Description</Label>
            <Textarea
              id="f-desc"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe the finding, affected resource, and remediation context"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => update("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Posture Check</Label>
              <Select value={form.posture_check} onValueChange={(v) => update("posture_check", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSTURE_CHECKS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-date">Detected Date</Label>
              <Input
                id="f-date"
                type="date"
                value={form.detected_date}
                onChange={(e) => update("detected_date", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-rid">Resource ID</Label>
              <Input
                id="f-rid"
                value={form.resource_id}
                onChange={(e) => update("resource_id", e.target.value)}
                placeholder="e.g. arn:aws:s3:::my-bucket"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-asset">Asset / Host</Label>
              <Input
                id="f-asset"
                value={form.asset}
                onChange={(e) => update("asset", e.target.value)}
                placeholder="e.g. prod-web-server-01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
              Log Finding
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}