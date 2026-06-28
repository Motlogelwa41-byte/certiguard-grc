import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { History, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PolicyVersionHistory({ policy, open, onOpenChange, onUpdated }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(null);
  const [saveForm, setSaveForm] = useState({ change_notes: "", changed_by: "" });
  const [saving, setSaving] = useState(false);

  const history = (() => { try { return JSON.parse(policy?.version_history || "[]"); } catch { return []; } })();

  const bumpVersion = (v) => {
    const parts = (v || "1.0").split(".").map(Number);
    parts[1] = (parts[1] || 0) + 1;
    return parts.join(".");
  };

  const saveVersion = async () => {
    if (!saveForm.changed_by.trim()) { toast({ title: "Enter who made the change", variant: "destructive" }); return; }
    setSaving(true);
    const newVersion = bumpVersion(policy?.version);
    const entry = {
      version: policy?.version || "1.0",
      content: policy?.content || "",
      changed_by: saveForm.changed_by,
      changed_at: new Date().toISOString(),
      change_notes: saveForm.change_notes,
    };
    const updatedHistory = [entry, ...history];
    await base44.entities.Policy.update(policy.id, {
      version: newVersion,
      version_history: JSON.stringify(updatedHistory),
    });
    toast({ title: `Version bumped to ${newVersion}` });
    setSaving(false);
    setSaveForm({ change_notes: "", changed_by: "" });
    onUpdated?.();
  };

  const restoreVersion = async (entry) => {
    const currentEntry = {
      version: policy?.version || "1.0",
      content: policy?.content || "",
      changed_by: "System (restore)",
      changed_at: new Date().toISOString(),
      change_notes: `Restored from v${entry.version}`,
    };
    const updatedHistory = [currentEntry, ...history];
    await base44.entities.Policy.update(policy.id, {
      content: entry.content,
      version: bumpVersion(policy?.version),
      version_history: JSON.stringify(updatedHistory),
    });
    toast({ title: `Restored to v${entry.version} content` });
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Version History
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{policy?.title} · Current: v{policy?.version || "1.0"}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save new version */}
          <div className="p-3 bg-muted/40 rounded-lg border border-dashed border-border space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Snapshot Current Version</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Changed By</Label>
                <Input className="h-8 text-sm mt-1" placeholder="Your name" value={saveForm.changed_by} onChange={e => setSaveForm(p => ({ ...p, changed_by: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Change Notes</Label>
                <Input className="h-8 text-sm mt-1" placeholder="Summary of changes..." value={saveForm.change_notes} onChange={e => setSaveForm(p => ({ ...p, change_notes: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={saveVersion} disabled={saving || !saveForm.changed_by.trim()}>
              Save Snapshot → v{bumpVersion(policy?.version)}
            </Button>
          </div>

          {/* History list */}
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No version history yet. Snapshot the current version above.</p>
          ) : (
            <div className="space-y-2">
              {history.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">v{entry.version}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{entry.changed_by}</p>
                        <p className="text-xs text-muted-foreground">{new Date(entry.changed_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.change_notes && <span className="text-xs text-muted-foreground hidden sm:block max-w-32 truncate">{entry.change_notes}</span>}
                      {expanded === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {expanded === i && (
                    <div className="px-4 pb-3 border-t border-border space-y-2">
                      {entry.change_notes && <p className="text-xs text-muted-foreground italic">"{entry.change_notes}"</p>}
                      {entry.content && (
                        <div className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                          {entry.content.slice(0, 800)}{entry.content.length > 800 ? "…" : ""}
                        </div>
                      )}
                      <Button size="sm" variant="outline" onClick={() => restoreVersion(entry)}>
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore this version
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}