import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { History, ChevronDown, ChevronUp, RotateCcw, UserCheck, Clock, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";

export default function PolicyVersionHistory({ policy, open, onOpenChange, onUpdated }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(null);
  const [tab, setTab] = useState("versions");
  const [saveForm, setSaveForm] = useState({ change_notes: "", changed_by: "" });
  const [saving, setSaving] = useState(false);

  const history = (() => { try { return JSON.parse(policy?.version_history || "[]"); } catch { return []; } })();
  const acknowledgments = (() => { try { return JSON.parse(policy?.acknowledged_by || "[]"); } catch { return []; } })();

  const acksByVersion = {};
  acknowledgments.forEach((a) => {
    const v = a.version || "—";
    if (!acksByVersion[v]) acksByVersion[v] = [];
    acksByVersion[v].push(a);
  });

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

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" /> Audit History
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{policy?.title} · Current: v{policy?.version || "1.0"}</p>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg">
          <button
            onClick={() => setTab("versions")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "versions" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <FileText className="w-3.5 h-3.5" /> Version Changes ({history.length})
          </button>
          <button
            onClick={() => setTab("acks")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === "acks" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <UserCheck className="w-3.5 h-3.5" /> Acknowledgments ({acknowledgments.length})
          </button>
        </div>

        {tab === "versions" && (
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
                {history.map((entry, i) => {
                  const ackCount = (acksByVersion[entry.version] || []).length;
                  return (
                    <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                        onClick={() => setExpanded(expanded === i ? null : i)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">v{entry.version}</span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{entry.changed_by}</p>
                            <p className="text-xs text-muted-foreground">{fmtDate(entry.changed_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ackCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">
                              <UserCheck className="w-3 h-3" /> {ackCount} acked
                            </span>
                          )}
                          {entry.change_notes && <span className="text-xs text-muted-foreground hidden sm:block max-w-32 truncate">{entry.change_notes}</span>}
                          {expanded === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {expanded === i && (
                        <div className="px-4 pb-3 border-t border-border space-y-3">
                          {entry.change_notes && <p className="text-xs text-muted-foreground italic pt-2">"{entry.change_notes}"</p>}
                          {entry.content && (
                            <div className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                              {entry.content.slice(0, 800)}{entry.content.length > 800 ? "…" : ""}
                            </div>
                          )}
                          {/* Acknowledgments for this version */}
                          {(acksByVersion[entry.version] || []).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acknowledged by ({acksByVersion[entry.version].length})</p>
                              {acksByVersion[entry.version].map((a, j) => (
                                <div key={j} className="flex items-center gap-2 text-xs">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="font-medium text-foreground">{a.user_name}</span>
                                  <span className="text-muted-foreground">· {fmtDate(a.acknowledged_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <Button size="sm" variant="outline" onClick={() => restoreVersion(entry)}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Restore this version
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "acks" && (
          <div className="space-y-3">
            {acknowledgments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No acknowledgments recorded yet.</p>
            ) : (
              <>
                {/* Summary by version */}
                {Object.keys(acksByVersion).length > 0 && (
                  <div className="space-y-2">
                    {Object.entries(acksByVersion).sort((a, b) => b[0].localeCompare(a[0])).map(([ver, acks]) => (
                      <div key={ver} className="rounded-lg border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">v{ver}</span>
                            <span className="text-sm font-medium text-foreground">{acks.length} acknowledgment{acks.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                        <div className="divide-y divide-border">
                          {acks.map((a, j) => (
                            <div key={j} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                                {(a.user_name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground truncate">{a.user_name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {fmtDate(a.acknowledged_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}