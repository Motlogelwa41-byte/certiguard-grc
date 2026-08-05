import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Search, MessageSquare, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  investigating: "bg-purple-100 text-purple-700",
  resolved: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-slate-100 text-slate-500",
};

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

export default function WhistleblowerCases() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCase, setSelectedCase] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const load = () => base44.entities.WhistleblowerReport.list("-submitted_at").then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => {
    if (search && !p.case_number?.toLowerCase().includes(search.toLowerCase()) && !p.subject?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const openCase = (c) => { setSelectedCase(c); setReplyText(""); };

  const getMessages = (c) => { try { return JSON.parse(c.messages || "[]"); } catch { return []; } };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedCase) return;
    setUpdating(true);
    try {
      const msgs = getMessages(selectedCase);
      msgs.push({ from: "ethics", text: replyText, timestamp: new Date().toISOString(), is_admin: true });
      await base44.entities.WhistleblowerReport.update(selectedCase.id, { messages: JSON.stringify(msgs) });
      setSelectedCase({ ...selectedCase, messages: JSON.stringify(msgs) });
      setReplyText("");
      toast({ title: "Message sent to whistleblower" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setUpdating(false);
  };

  const updateStatus = async (newStatus, newPriority) => {
    if (!selectedCase) return;
    setUpdating(true);
    try {
      const patch = {};
      if (newStatus) patch.status = newStatus;
      if (newPriority) patch.priority = newPriority;
      if (newStatus === "resolved" || newStatus === "dismissed") patch.resolved_at = new Date().toISOString();
      await base44.entities.WhistleblowerReport.update(selectedCase.id, patch);
      setSelectedCase({ ...selectedCase, ...patch });
      load();
      toast({ title: "Case updated" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setUpdating(false);
  };

  const stats = {
    total: items.length,
    open: items.filter((i) => i.status === "submitted" || i.status === "under_review" || i.status === "investigating").length,
    critical: items.filter((i) => i.priority === "critical").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Whistleblower Cases" subtitle="Ethics Committee case management — anonymous reports and two-way communication" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><Shield className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Cases</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Eye className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.open}</p><p className="text-xs text-muted-foreground">Open</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Shield className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.critical}</p><p className="text-xs text-muted-foreground">Critical Priority</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Shield className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.resolved}</p><p className="text-xs text-muted-foreground">Resolved</p></div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by case number or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Shield} title="No whistleblower cases" description="Anonymous ethics reports submitted through the whistleblower portal will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card rounded-xl border border-border p-4 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openCase(c)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{c.case_number}</span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_STYLES[c.priority] || PRIORITY_STYLES.medium}`}>{c.priority}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm mt-1">{c.subject || "Untitled Report"}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{(c.category || "").replace(/_/g, " ")} · {new Date(c.submitted_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[c.status] || STATUS_STYLES.submitted}`}>{(c.status || "").replace(/_/g, " ")}</span>
                  <Button size="sm" variant="ghost"><Eye className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Case Detail Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={(v) => !v && setSelectedCase(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> {selectedCase.case_number}</DialogTitle>
                <p className="text-xs text-muted-foreground">{selectedCase.subject} · {(selectedCase.category || "").replace(/_/g, " ")} · Submitted {new Date(selectedCase.submitted_at).toLocaleString()}</p>
              </DialogHeader>

              <div className="space-y-4">
                {/* Status Controls */}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Status</Label>
                    <Select value={selectedCase.status} onValueChange={(v) => updateStatus(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="submitted">Submitted</SelectItem><SelectItem value="under_review">Under Review</SelectItem><SelectItem value="investigating">Investigating</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Priority</Label>
                    <Select value={selectedCase.priority} onValueChange={(v) => updateStatus(null, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Original Report */}
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Original Report</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedCase.description}</p>
                </div>

                {/* Communication Log */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> Communication Log</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getMessages(selectedCase).map((msg, i) => (
                      <div key={i} className={`p-3 rounded-lg ${msg.is_admin ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" : "bg-muted/40"}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-semibold text-muted-foreground">{msg.is_admin ? "ETHICS COMMITTEE" : "WHISTLEBLOWER"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(msg.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply */}
                <div>
                  <Label>Reply to Whistleblower</Label>
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Send a message to the anonymous whistleblower..." />
                  <Button size="sm" className="mt-2" onClick={sendReply} disabled={!replyText.trim() || updating}><Send className="w-3.5 h-3.5 mr-1" /> Send Reply</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}