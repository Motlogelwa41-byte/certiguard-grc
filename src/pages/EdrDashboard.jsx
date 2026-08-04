import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Radar, Loader2, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";

const SEVERITY_COLOR = {
  critical: "text-red-600 dark:text-red-400",
  high: "text-orange-600 dark:text-orange-400",
  medium: "text-amber-600 dark:text-amber-400",
  low: "text-blue-600 dark:text-blue-400",
  info: "text-muted-foreground",
};
const STATUS_COLOR = {
  open: "bg-red-500/15 text-red-600 dark:text-red-400",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  remediated: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  accepted: "bg-muted text-muted-foreground",
  false_positive: "bg-muted text-muted-foreground",
};

export default function EdrDashboard() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.SecurityFinding.filter({ source: { $in: ["crowdstrike", "defender"] } }, "-detected_date")
      .then((d) => setFindings(d || []))
      .catch(() => toast({ title: "Failed to load EDR findings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/base44/functions/syncEdrFindings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok) {
        toast({ title: `EDR sync complete — ${data.totalSynced || 0} new findings` });
        load();
      } else {
        toast({ title: "EDR sync failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync request failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const crowdstrike = findings.filter((f) => f.source === "crowdstrike");
  const defender = findings.filter((f) => f.source === "defender");
  const open = findings.filter((f) => f.status === "open");
  const critical = findings.filter((f) => f.severity === "critical" || f.severity === "high");

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
        title="EDR / XDR Integration"
        subtitle="Endpoint detection and response findings from CrowdStrike Falcon and Microsoft Defender for Endpoint"
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
          <Radar className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground text-sm">Provider Configuration</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Set <code className="text-xs bg-muted px-1 rounded">EDR_PROVIDER</code> (crowdstrike, defender, or all) and the corresponding credentials in app secrets to activate automated daily sync.
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
          <div className="flex items-center gap-2 text-muted-foreground"><Radar className="w-4 h-4" /><span className="text-xs font-medium uppercase">Total Findings</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{findings.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400"><ShieldAlert className="w-4 h-4" /><span className="text-xs font-medium uppercase">Open</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{open.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400"><ShieldAlert className="w-4 h-4" /><span className="text-xs font-medium uppercase">Critical/High</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{critical.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span className="text-xs font-medium uppercase">Remediated</span></div>
          <p className="text-2xl font-bold text-foreground mt-1">{findings.filter((f) => f.status === "remediated").length}</p>
        </div>
      </div>

      {/* Provider breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">CrowdStrike Falcon</h3>
          <p className="text-2xl font-bold text-foreground">{crowdstrike.length}</p>
          <p className="text-xs text-muted-foreground">findings ingested</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="font-heading font-semibold text-foreground text-sm mb-1">Microsoft Defender</h3>
          <p className="text-2xl font-bold text-foreground">{defender.length}</p>
          <p className="text-xs text-muted-foreground">findings ingested</p>
        </div>
      </div>

      {/* Findings table */}
      {findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Radar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No EDR findings yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Configure EDR credentials in app secrets and run a sync, or wait for the daily automated sync to pull detections.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Finding</th>
                <th className="text-left font-medium px-4 py-3">Source</th>
                <th className="text-left font-medium px-4 py-3">Severity</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Asset</th>
                <th className="text-left font-medium px-4 py-3">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.slice(0, 50).map((f) => (
                <tr key={f.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{f.title}</p>
                    {f.finding_id && <p className="text-xs text-muted-foreground">{f.finding_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{f.source}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold capitalize ${SEVERITY_COLOR[f.severity] || ""}`}>{f.severity}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[f.status] || ""}`}>{(f.status || "").replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.asset || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.detected_date || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}