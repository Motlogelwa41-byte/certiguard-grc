import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { CalendarCheck as CalIcon, RefreshCw, CheckCircle2, AlertCircle, LogIn, Link2, Link2Off, ListChecks } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const CONNECTOR_ID = "6a5e216ec55111d5b32a0870";

export default function CalendarSync() {
  const { toast } = useToast();
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const popupRef = useRef(null);

  // Rule 2: reusable fetch doubles as connection check + status loader (check_only = no writes).
  const fetchStatus = async () => {
    try {
      const res = await base44.functions.invoke("syncMyCalendarTasks", { check_only: true });
      const data = res.data || res;
      setConnected(true);
      setSummary(data);
    } catch (e) {
      setConnected(false);
      setSummary(null);
    }
  };

  // Rule 1: auth gate first, then fetch connection status.
  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      setAuthed(ok);
      if (ok) {
        try { setUser(await base44.auth.me()); } catch (e) { /* ignore */ }
        await fetchStatus();
      }
      setLoading(false);
    });
  }, []);

  // Rule 3: open OAuth popup, poll for close, then re-fetch.
  const handleConnect = async () => {
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      popupRef.current = popup;
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchStatus();
        }
      }, 600);
    } catch (e) {
      toast({ title: "Could not start Google connection", description: e.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(CONNECTOR_ID);
      setConnected(false);
      setSummary(null);
      setResult(null);
      toast({ title: "Google Calendar disconnected" });
    } catch (e) {
      toast({ title: "Disconnect failed", description: e.message, variant: "destructive" });
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncMyCalendarTasks", {});
      const data = res.data || res;
      if (data.connected === false) {
        setConnected(false);
        toast({ title: "Connect your Google Calendar first", variant: "destructive" });
      } else {
        setResult(data);
        toast({
          title: `Synced ${data.synced} task${data.synced !== 1 ? "s" : ""}`,
          description: `${data.created} new · ${data.updated} updated · ${data.removed} removed`,
        });
      }
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <LogIn className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Sign in to sync your tasks to Google Calendar.</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar Sync"
        subtitle="Push your assigned compliance training tasks and due dates straight to your Google Calendar."
      />

      {/* Connection card */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${connected ? "bg-emerald-100" : "bg-muted"}`}>
              <CalIcon className={`w-6 h-6 ${connected ? "text-emerald-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground">Google Calendar</h3>
              {connected ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Connected{user?.email ? ` · ${user.email}` : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Not connected — connect your Google account to enable sync.
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connected ? (
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <Link2Off className="w-4 h-4 mr-1" /> Disconnect
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <Link2 className="w-4 h-4 mr-1" /> Connect Google Calendar
              </Button>
            )}
            <Button size="sm" onClick={handleSync} disabled={!connected || syncing}>
              {syncing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        </div>

        {/* Status summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Assigned tasks with due dates</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">{summary.pending}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Not yet completed</p>
              <p className="text-2xl font-heading font-bold text-foreground mt-1">{summary.dueSoon}</p>
            </div>
            <div className="rounded-lg bg-muted/50 px-4 py-3">
              <p className="text-xs text-muted-foreground">Last sync</p>
              <p className="text-sm font-medium text-foreground mt-1">{result?.lastSync ? new Date(result.lastSync).toLocaleString() : "—"}</p>
            </div>
          </div>
        )}

        {/* Sync result */}
        {result && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs text-emerald-700">Created</p>
              <p className="font-bold text-emerald-800">{result.created}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs text-blue-700">Updated</p>
              <p className="font-bold text-blue-800">{result.updated}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs text-slate-700">Removed</p>
              <p className="font-bold text-slate-800">{result.removed}</p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${result.failed > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/40"}`}>
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="font-bold text-foreground">{result.failed}</p>
            </div>
          </div>
        )}

        {summary?.tasks?.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Tasks that will sync
            </p>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {summary.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-foreground truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    {t.due_date} · {t.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Sync runs in your account context — only your own assigned tasks are pushed to your calendar. Each open the page and hit <strong>Sync now</strong> to refresh; events are kept up to date (new, updated, or removed) on each sync.
      </p>
    </div>
  );
}