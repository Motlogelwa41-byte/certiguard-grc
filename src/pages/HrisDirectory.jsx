import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Users, Loader2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const STATUS_COLOR = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  suspended: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  deprovisioned: "bg-muted text-muted-foreground",
};

export default function HrisDirectory() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.DirectoryUser.list("-last_synced_at")
      .then((d) => setUsers(d || []))
      .catch(() => toast({ title: "Failed to load directory", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/base44/functions/syncHrisDirectory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok && !data.skipped) {
        toast({ title: `HRIS sync complete — ${data.synced || 0} new, ${data.updated || 0} updated` });
        load();
      } else if (data.skipped) {
        toast({ title: "HRIS not configured", description: data.reason, variant: "destructive" });
      } else {
        toast({ title: "HRIS sync failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync request failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const active = users.filter((u) => u.status === "active");
  const suspended = users.filter((u) => u.status === "suspended");
  const deprovisioned = users.filter((u) => u.status === "deprovisioned");

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
        title="HRIS Directory Sync"
        subtitle="Employee directory synced from BambooHR, Workday, or a generic HRIS API for access reviews and people compliance"
        actions={
          <Button onClick={runSync} disabled={syncing} size="sm">
            {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            {syncing ? "Syncing…" : "Sync Now"}
          </Button>
        }
      />

      {/* Config status banner */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground text-sm">Provider Configuration</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Set <code className="text-xs bg-muted px-1 rounded">HRIS_PROVIDER</code> (bamboohr, workday, or generic), <code className="text-xs bg-muted px-1 rounded">HRIS_API_URL</code>, and <code className="text-xs bg-muted px-1 rounded">HRIS_API_TOKEN</code> in app secrets to activate automated daily sync.
            </p>
          </div>
        </div>
      </div>

      {/* Sync result */}
      {syncResult && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            {syncResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
            <h3 className="font-heading font-semibold text-foreground text-sm">Sync Result</h3>
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(syncResult, null, 2)}</pre>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" /><span className="text-xs font-medium uppercase">Total</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{users.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-medium uppercase">Active</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{active.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400"><Users className="w-4 h-4" /><span className="text-xs font-medium uppercase">Suspended</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{suspended.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Users className="w-4 h-4" /><span className="text-xs font-medium uppercase">Deprovisioned</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{deprovisioned.length}</p>
        </div>
      </div>

      {/* Directory table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No directory users yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Configure HRIS credentials in app secrets and run a sync, or wait for the daily automated sync to populate the directory.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Department</th>
                <th className="text-left font-medium px-4 py-3">Title</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Last Synced</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.slice(0, 100).map((u) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.full_name || "—"}</p>
                    {u.external_id && <p className="text-xs text-muted-foreground">{u.external_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.department || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.title || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[u.status] || ""}`}>{u.status || "active"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.last_synced_at ? new Date(u.last_synced_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}