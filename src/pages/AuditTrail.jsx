import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Search, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { exportEvidencePack } from "@/lib/exportEvidencePack";
import moment from "moment";

const ENTITY_FILTERS = [
  { value: "all", label: "All Entities" },
  { value: "Risk", label: "Risks" },
  { value: "Control", label: "Controls" },
  { value: "ComplianceTask", label: "Tasks" },
  { value: "other", label: "Other" },
];

const actionColors = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-purple-100 text-purple-700",
  logout: "bg-slate-100 text-slate-600",
  export: "bg-amber-100 text-amber-700",
  approve: "bg-emerald-100 text-emerald-700",
  reject: "bg-red-100 text-red-700",
  view: "bg-slate-100 text-slate-600",
};

function parseChanges(raw) {
  if (!raw) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEvidencePack({ auditLogs: logs });
    } catch (e) {
      // best-effort export
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    base44.entities.AuditTrail.list("-created_date", 500).then((d) => { setLogs(d); setLoading(false); });
  }, []);

  const filtered = logs.filter((l) => {
    if (search && !l.entity_name?.toLowerCase().includes(search.toLowerCase()) && !l.performed_by_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (entityFilter !== "all") {
      if (entityFilter === "other") {
        if (["Risk", "Control", "ComplianceTask"].includes(l.entity_type)) return false;
      } else if (l.entity_type !== entityFilter) return false;
    }
    return true;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        subtitle="Complete activity log — every change to risks, controls, and tasks with timestamp and user"
        actions={
          <Button size="sm" onClick={handleExport} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-1" /> {exporting ? "Generating…" : "Export Evidence Pack"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by entity or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Entities" /></SelectTrigger>
          <SelectContent>
            {ENTITY_FILTERS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="export">Export</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={History} title="No audit trail entries" description="Activity will appear here as users interact with the platform." />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const changes = parseChanges(log.changes);
                  const isOpen = expanded === log.id;
                  const hasDetail = changes || log.ip_address || log.performed_by_id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          {hasDetail ? (
                            <button onClick={() => setExpanded(isOpen ? null : log.id)} className="text-muted-foreground hover:text-foreground">
                              {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{moment(log.created_date).format("MMM DD, YYYY HH:mm:ss")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] || "bg-slate-100 text-slate-600"}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.entity_type || "—"}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{log.entity_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{log.performed_by_name || "System"}</td>
                      </tr>
                      {isOpen && hasDetail && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="rounded-lg border border-border bg-card p-3 text-xs space-y-2">
                              {log.performed_by_id && (
                                <div className="flex gap-2"><span className="font-semibold text-muted-foreground w-24">User ID:</span><span className="font-mono">{log.performed_by_id}</span></div>
                              )}
                              {log.ip_address && (
                                <div className="flex gap-2"><span className="font-semibold text-muted-foreground w-24">IP Address:</span><span className="font-mono">{log.ip_address}</span></div>
                              )}
                              {log.audit_hash && (
                                <div className="flex gap-2"><span className="font-semibold text-muted-foreground w-24">Chain Hash:</span><span className="font-mono break-all">{log.audit_hash}</span></div>
                              )}
                              {changes ? (
                                <div>
                                  <p className="font-semibold text-muted-foreground mb-1">Changes:</p>
                                  <div className="rounded border border-border overflow-hidden">
                                    {Object.keys(changes).length === 0 ? (
                                      <div className="px-3 py-2 text-muted-foreground italic">No field-level changes recorded</div>
                                    ) : (
                                      Object.entries(changes).map(([field, value]) => (
                                        <div key={field} className="flex border-b border-border last:border-0">
                                          <span className="px-3 py-1.5 font-mono font-medium text-foreground bg-muted/40 w-40 shrink-0">{field}</span>
                                          <span className="px-3 py-1.5 font-mono text-muted-foreground break-all">
                                            {typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                                          </span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <p className="italic text-muted-foreground">No change details recorded for this action.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}