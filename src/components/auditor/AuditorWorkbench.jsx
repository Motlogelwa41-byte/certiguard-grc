import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  FileCheck, Download, AlertCircle, Clock, CheckCircle2, MessageSquare,
  Plus, Loader2, FileDown, ChevronRight,
} from "lucide-react";

// === Evidence Pack — grouped by control with download links ===
export function AuditorEvidencePack({ evidence, controls }) {
  const [expanded, setExpanded] = useState(null);

  // Group evidence by control_id
  const byControl = {};
  for (const ev of (evidence || [])) {
    const key = ev.control_id || "_uncategorized";
    (byControl[key] = byControl[key] || []).push(ev);
  }

  const controlMap = {};
  for (const c of (controls || [])) controlMap[c.id] = c;

  if (Object.keys(byControl).length === 0) {
    return (
      <div className="text-center py-8">
        <FileCheck className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No evidence available in the scoped pack.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {evidence.length} evidence items across {Object.keys(byControl).length} controls
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const files = (evidence || []).filter((e) => e.file_url);
            if (files.length === 0) return;
            files.forEach((f) => window.open(f.file_url, "_blank"));
          }}
        >
          <FileDown className="w-4 h-4 mr-1" /> Download All
        </Button>
      </div>
      <div className="space-y-2">
        {Object.entries(byControl).map(([controlId, items]) => {
          const control = controlMap[controlId];
          const isExpanded = expanded === controlId;
          return (
            <Card key={controlId}>
              <button
                className="w-full flex items-center justify-between p-3 text-left"
                onClick={() => setExpanded(isExpanded ? null : controlId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {control?.title || "Uncategorized Evidence"}
                    </p>
                    <p className="text-xs text-muted-foreground">{items.length} item(s)</p>
                  </div>
                </div>
                <Badge variant="outline">{control?.control_id || "—"}</Badge>
              </button>
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-1.5">
                    {items.map((ev) => (
                      <div key={ev.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 border border-border">
                        <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {ev.type?.replace(/_/g, " ") || "document"} · {ev.status?.replace(/_/g, " ") || "pending"} · {ev.collected_date || "—"}
                          </p>
                        </div>
                        {ev.file_url && (
                          <a href={ev.file_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// === Findings — track open audit findings ===
export function AuditorFindings({ findings }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No audit findings recorded yet.</p>
      </div>
    );
  }

  const open = findings.filter((f) => f.status === "open" || f.status === "in_remediation");
  const resolved = findings.filter((f) => f.status === "resolved" || f.status === "closed");

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border p-3 text-center">
          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-rose-600" />
          <p className="text-xl font-heading font-bold text-rose-600">{open.length}</p>
          <p className="text-xs text-muted-foreground">Open</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
          <p className="text-xl font-heading font-bold text-amber-600">{findings.filter((f) => f.status === "in_remediation").length}</p>
          <p className="text-xs text-muted-foreground">In Remediation</p>
        </div>
        <div className="rounded-lg border border-border p-3 text-center">
          <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
          <p className="text-xl font-heading font-bold text-emerald-600">{resolved.length}</p>
          <p className="text-xs text-muted-foreground">Resolved</p>
        </div>
      </div>
      <div className="space-y-2">
        {findings.map((f) => (
          <div key={f.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
            <div className={`p-1.5 rounded shrink-0 ${
              f.severity === "critical" ? "bg-rose-500/10 text-rose-600" :
              f.severity === "high" ? "bg-amber-500/10 text-amber-600" :
              "bg-muted text-muted-foreground"
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{f.title}</p>
              {f.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{f.description}</p>}
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant={f.status === "open" ? "destructive" : f.status === "in_remediation" ? "secondary" : "default"}>
                  {f.status?.replace(/_/g, " ") || "open"}
                </Badge>
                <span className="text-xs text-muted-foreground">{f.severity}</span>
                {f.linked_control_name && <span className="text-xs text-muted-foreground">· {f.linked_control_name}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === Request List — shows existing requests with "New Request" button ===
export function AuditorRequestList({ controls, auditor, onRequestNew }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    base44.entities.AuditorRequest.list("-created_date", 50)
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Request additional evidence or clarifications from the compliance team in-context.
        </p>
        <Button size="sm" onClick={onRequestNew}>
          <Plus className="w-4 h-4 mr-1" /> New Request
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No evidence requests yet. Click "New Request" to ask the compliance team for additional evidence.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((r) => (
            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.question}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge variant={r.status === "open" ? "secondary" : "default"}>{r.status}</Badge>
                  {r.related_control_name && <span className="text-xs text-muted-foreground">· {r.related_control_name}</span>}
                </div>
                {r.response && (
                  <div className="mt-2 p-2 rounded bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground font-medium">Response:</p>
                    <p className="text-xs text-foreground mt-0.5">{r.response}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === Request Dialog — create a new evidence request ===
export function AuditorRequestDialog({ open, onOpenChange, controls, auditor }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [controlId, setControlId] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(""); setQuestion(""); setControlId(""); };

  const handleSubmit = async () => {
    if (!title.trim() || !question.trim()) {
      toast({ title: "Title and question are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const control = controls?.find((c) => c.id === controlId);
      await base44.entities.AuditorRequest.create({
        title: title.trim(),
        question: question.trim(),
        related_control_id: controlId || undefined,
        related_control_name: control?.title || undefined,
        auditor_id: auditor?.id || undefined,
        auditor_name: auditor?.full_name || auditor?.email || undefined,
        status: "open",
      });
      toast({ title: "Evidence request submitted", description: "The compliance team has been notified." });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to submit request", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Additional Evidence</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Request Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Need access review logs for Q3"
            />
          </div>
          <div>
            <Label>Related Control (optional)</Label>
            <Select value={controlId} onValueChange={setControlId}>
              <SelectTrigger><SelectValue placeholder="Select a control" /></SelectTrigger>
              <SelectContent>
                {(controls || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.control_id || ""} — {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Question / Details</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="Describe what additional evidence or clarification you need..."
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-1" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}