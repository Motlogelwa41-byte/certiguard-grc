import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import moment from "moment";

export default function AuditTrailPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    base44.entities.AuditTrail.list("-created_date", 500).then((d) => { setLogs(d); setLoading(false); });
  }, []);

  const filtered = logs.filter((l) => {
    if (search && !l.entity_name?.toLowerCase().includes(search.toLowerCase()) && !l.performed_by_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (actionFilter !== "all" && l.action !== actionFilter) return false;
    return true;
  });

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

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Audit Trail" subtitle="Complete activity log — who changed what and when" />
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by entity or user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Entity Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}