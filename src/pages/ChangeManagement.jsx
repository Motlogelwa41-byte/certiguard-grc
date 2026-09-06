import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { GitCommit, Plus, Search, Trash2, Pencil, Check, X, AlertTriangle, Clock, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CHANGE_TYPES = ["config_drift", "planned_change", "emergency_change", "baseline_update", "iac_deploy", "manual_override"];
const APPROVAL_STATUSES = ["pending", "approved", "rejected", "not_required"];
const DRIFT_SEVERITIES = ["critical", "high", "medium", "low"];

export default function ChangeManagement() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailLog, setDetailLog] = useState(null);
  const [form, setForm] = useState({ log_id: "", baseline_id: "", baseline_name: "", asset_name: "", change_type: "planned_change", field_changed: "", previous_value: "", new_value: "", cis_reference: "", changed_by: "", approval_required: true, approval_status: "pending", notes: "" });

  const load = () => {
    base44.entities.ConfigurationChangeLog.list("-changed_at", 500)
      .then((d) => setLogs(d || []))
      .catch(() => toast({ title: "Failed to load change logs", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = logs;
    if (filterType !== "all") list = list.filter((l) => l.change_type === filterType);
    if (filterApproval !== "all") list = list.filter((l) => l.approval_status === filterApproval);
    const q = search.toLowerCase();
    if (q) list = list.filter((l) =>
      l.log_id?.toLowerCase().includes(q) ||
      l.baseline_name?.toLowerCase().includes(q) ||
      l.asset_name?.toLowerCase().includes(q) ||
      l.field_changed?.toLowerCase().includes(q) ||
      l.changed_by?.toLowerCase().includes(q)
    );
    return list;
  }, [logs, search, filterType, filterApproval]);

  const stats = useMemo(() => ({
    total: logs.length,
    pending: logs.filter((l) => l.approval_status === "pending").length,
    drift: logs.filter((l) => l.drift_detected).length,
    emergency: logs.filter((l) => l.change_type === "emergency_change").length,
  }), [logs]);

  const openCreate = () => {
    setForm({ log_id: `CCL-${Date.now().toString().slice(-6)}`, baseline_id: "", baseline_name: "", asset_name: "", change_type: "planned_change", field_changed: "", previous_value: "", new_value: "", cis_reference: "", changed_by: "", approval_required: true, approval_status: "pending", notes: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, changed_at: new Date().toISOString() };
      await base44.entities.ConfigurationChangeLog.create(payload);
      toast({ title: "Change request logged" });
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleApprove = async (log, status) => {
    try {
      await base44.entities.ConfigurationChangeLog.update(log.id, {
        approval_status: status,
        approved_by: status === "approved" ? "CAB" : undefined,
        approved_at: new Date().toISOString(),
      });
      toast({ title: `Change ${status}` });
      load();
    } catch (e) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (log) => {
    if (!confirm("Delete this change log entry?")) return;
    try {
      await base44.entities.ConfigurationChangeLog.delete(log.id);
      toast({ title: "Entry deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Change Management" subtitle="CAB-approved change tracking, configuration drift detection, and change-related evidence"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Log Change</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBox label="Total Changes" value={stats.total} icon={GitCommit} />
        <StatBox label="Pending Approval" value={stats.pending} color="text-amber-600" icon={Clock} />
        <StatBox label="Drift Detected" value={stats.drift} color="text-rose-600" icon={AlertTriangle} />
        <StatBox label="Emergency Changes" value={stats.emergency} color="text-orange-600" icon={AlertTriangle} />
      </div>

      {stats.pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{stats.pending} change(s) awaiting CAB approval</p>
            <p className="text-xs text-amber-600">Review and approve or reject pending changes before they are deployed.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search changes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Types</option>
            {CHANGE_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterApproval} onChange={(e) => setFilterApproval(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Approvals</option>
            {APPROVAL_STATUSES.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Change</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Field Changed</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Drift</th>
                <th className="text-left px-4 py-3">Approval</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Changed By</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No change logs found.</td></tr>}
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border cursor-pointer hover:bg-muted/30" onClick={() => setDetailLog(l)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{l.baseline_name || l.asset_name || l.log_id}</p>
                    <p className="text-xs text-muted-foreground">{l.log_id}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="secondary" className={l.change_type === "emergency_change" ? "bg-orange-100 text-orange-700 border-0" : ""}>
                      {l.change_type?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{l.field_changed || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {l.drift_detected ? <Badge className={`bg-rose-100 text-rose-700 border-0`}>{l.drift_severity || "drift"}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={
                      l.approval_status === "approved" ? "bg-emerald-100 text-emerald-700 border-0" :
                      l.approval_status === "rejected" ? "bg-rose-100 text-rose-700 border-0" :
                      l.approval_status === "pending" ? "bg-amber-100 text-amber-700 border-0" :
                      "bg-muted text-muted-foreground border-0"
                    }>
                      {l.approval_status?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{l.changed_by || "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {l.approval_status === "pending" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleApprove(l, "approved")} className="text-xs h-7 text-emerald-600 border-emerald-300"><Check className="w-3 h-3" /> Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => handleApprove(l, "rejected")} className="text-xs h-7 text-rose-600 border-rose-300"><X className="w-3 h-3" /> Reject</Button>
                      </div>
                    )}
                    {l.approval_status !== "pending" && (
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(l)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Log New Change</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Log ID</Label><Input value={form.log_id} onChange={(e) => setForm({ ...form, log_id: e.target.value })} /></div>
              <div>
                <Label>Change Type</Label>
                <Select value={form.change_type} onValueChange={(v) => setForm({ ...form, change_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHANGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Baseline Name</Label><Input value={form.baseline_name} onChange={(e) => setForm({ ...form, baseline_name: e.target.value })} placeholder="e.g. AWS CIS Benchmark v3" /></div>
              <div><Label>Asset Name</Label><Input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} placeholder="e.g. prod-web-server-01" /></div>
            </div>
            <div><Label>Field Changed</Label><Input value={form.field_changed} onChange={(e) => setForm({ ...form, field_changed: e.target.value })} placeholder="e.g. security group inbound rules" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Previous Value</Label><Textarea value={form.previous_value} onChange={(e) => setForm({ ...form, previous_value: e.target.value })} /></div>
              <div><Label>New Value</Label><Textarea value={form.new_value} onChange={(e) => setForm({ ...form, new_value: e.target.value })} /></div>
            </div>
            <div><Label>CIS Reference</Label><Input value={form.cis_reference} onChange={(e) => setForm({ ...form, cis_reference: e.target.value })} placeholder="e.g. CIS 4.1" /></div>
            <div><Label>Changed By</Label><Input value={form.changed_by} onChange={(e) => setForm({ ...form, changed_by: e.target.value })} placeholder="Name or system/agent" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="approval_req" checked={form.approval_required} onChange={(e) => setForm({ ...form, approval_required: e.target.checked })} className="rounded" />
              <Label htmlFor="approval_req" className="text-sm cursor-pointer">CAB approval required</Label>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Log Change</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Change Detail — {detailLog?.log_id}</DialogTitle></DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Baseline" value={detailLog.baseline_name} />
              <DetailRow label="Asset" value={detailLog.asset_name} />
              <DetailRow label="Change Type" value={detailLog.change_type?.replace(/_/g, " ")} />
              <DetailRow label="Field Changed" value={detailLog.field_changed} />
              <DetailRow label="CIS Reference" value={detailLog.cis_reference} />
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-medium text-muted-foreground mb-1">Previous Value</p><div className="bg-rose-50 border border-rose-200 rounded-md p-2 text-xs font-mono">{detailLog.previous_value || "—"}</div></div>
                <div><p className="text-xs font-medium text-muted-foreground mb-1">New Value</p><div className="bg-emerald-50 border border-emerald-200 rounded-md p-2 text-xs font-mono">{detailLog.new_value || "—"}</div></div>
              </div>
              <DetailRow label="Changed By" value={detailLog.changed_by} />
              <DetailRow label="Changed At" value={detailLog.changed_at ? new Date(detailLog.changed_at).toLocaleString() : "—"} />
              <DetailRow label="Drift Detected" value={detailLog.drift_detected ? `Yes (${detailLog.drift_severity})` : "No"} />
              <DetailRow label="Approval Status" value={detailLog.approval_status?.replace(/_/g, " ")} />
              <DetailRow label="Approved By" value={detailLog.approved_by} />
              {detailLog.notes && <DetailRow label="Notes" value={detailLog.notes} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value || "—"}</span>
    </div>
  );
}