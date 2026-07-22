import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, Search, ChevronDown, ChevronRight, User, ShieldCheck, AlertTriangle, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

const ENTITIES = [
  { value: "all", label: "All (Risks · Policies · Controls)" },
  { value: "Risk", label: "Risks" },
  { value: "Policy", label: "Policies" },
  { value: "Control", label: "Controls" },
];
const TRACKED = ["Risk", "Policy", "Control"];

const actionColors = {
  create: "bg-emerald-100 text-emerald-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
};

const entityLabels = { Risk: "Risk", Policy: "Policy", Control: "Control" };

function parseChanges(raw) {
  if (!raw) return null;
  try {
    const p = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (p && typeof p === "object" && !Array.isArray(p)) return p;
    return null;
  } catch {
    return null;
  }
}

function formatVal(v) {
  if (v === null || v === undefined || v === "") return <span className="italic text-muted-foreground">empty</span>;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    base44.entities.AuditTrail.list("-created_date", 1000).then((d) => {
      setLogs((d || []).filter((l) => TRACKED.includes(l.entity_type)));
      setLoading(false);
    });
    base44.functions.invoke("verifyAuditChain", { limit: 500 }).then((r) => setIntegrity(r?.data || null)).catch(() => setIntegrity(null));
  }, []);

  const filtered = logs.filter((l) => {
    if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.entity_name?.toLowerCase().includes(q) && !l.performed_by_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Activity Log"
        subtitle="Every change to risks, policies, and controls — who did what, and exactly what was updated."
      />

      {integrity && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 mb-4 text-sm ${integrity.integrity === "verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {integrity.integrity === "verified" ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span className="font-medium">
            Audit chain integrity: {integrity.integrity === "verified" ? "Verified" : "Compromised"}
          </span>
          <span className="text-xs opacity-80">
            {integrity.verified} entries verified{integrity.broken_count > 0 ? `, ${integrity.broken_count} flagged` : ""}{integrity.legacy > 0 ? `, ${integrity.legacy} legacy` : ""} · append-only · hash-chained
          </span>
          <Lock className="w-3.5 h-3.5 ml-auto shrink-0" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by entity or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No changes recorded yet"
          description="Create, update, or delete a risk, policy, or control to see it logged here with a full before → after diff."
        />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-8"></th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">When</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const changes = parseChanges(log.changes);
                  const isOpen = expanded === log.id;
                  const hasDetail = changes && Object.keys(changes).length > 0;
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
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{moment(log.created_date).format("MMM DD, YYYY HH:mm")}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${actionColors[log.action] || "bg-slate-100 text-slate-600"}`}>{log.action}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-foreground">{entityLabels[log.entity_type] || log.entity_type}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{log.entity_name || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span>{log.performed_by_name || "System"}</span>
                          </div>
                        </td>
                      </tr>
                      {isOpen && hasDetail && (
                        <tr className="bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="rounded-lg border border-border bg-card p-3 text-xs">
                              <p className="font-semibold text-muted-foreground mb-2">What changed:</p>
                              <div className="rounded border border-border overflow-hidden">
                                {Object.entries(changes).map(([field, value]) => {
                                  const isDiff = value && typeof value === "object" && ("from" in value || "to" in value);
                                  return (
                                    <div key={field} className="flex border-b border-border last:border-0">
                                      <span className="px-3 py-1.5 font-mono font-medium text-foreground bg-muted/40 w-44 shrink-0">{field}</span>
                                      {isDiff ? (
                                        <span className="px-3 py-1.5 font-mono break-all flex-1">
                                          <span className="text-red-500 line-through">{formatVal(value.from)}</span>
                                          <span className="mx-1.5 text-foreground">→</span>
                                          <span className="text-emerald-600">{formatVal(value.to)}</span>
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1.5 font-mono text-muted-foreground break-all flex-1">{formatVal(value)}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
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