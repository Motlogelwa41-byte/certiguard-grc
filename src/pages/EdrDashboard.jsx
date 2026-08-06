import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Radar, Loader2, RefreshCw, ShieldAlert, CheckCircle2, XCircle, Cloud, Plus, Trash2 } from "lucide-react";
import ManualFindingDialog from "@/components/edr/ManualFindingDialog";
import { Github } from "lucide-react";

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
  const [showManual, setShowManual] = useState(false);
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [syncingCrowd, setSyncingCrowd] = useState(false);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    base44.entities.SecurityFinding.filter({ source: { $in: ["security_hub", "other", "crowdstrike", "defender"] } }, "-detected_date")
      .then((d) => setFindings(d || []))
      .catch(() => toast({ title: "Failed to load security findings", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const runSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/base44/functions/syncAwsSecurityHub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setSyncResult(data);
      if (data.ok) {
        toast({ title: `Security Hub sync complete — ${data.count || 0} new findings` });
        load();
      } else {
        toast({ title: "Security Hub sync failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync request failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const runGithubSync = async () => {
    setSyncingGithub(true);
    try {
      const res = await base44.functions.invoke("syncGithubSecurity", {});
      const data = res?.data || res;
      if (data?.ok) {
        toast({ title: `GitHub sync complete — ${data.findings_created || 0} new findings`, description: `${data.repos_checked || 0} repos checked, ${data.repos_protected || 0} with branch protection` });
        load();
      } else {
        toast({ title: "GitHub sync failed", description: data?.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync request failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncingGithub(false);
    }
  };

  const runCrowdSync = async () => {
    setSyncingCrowd(true);
    try {
      const res = await base44.functions.invoke("syncEdrFindings", { provider: "crowdstrike" });
      const data = res?.data || res;
      if (data?.ok) {
        const det = data.results?.[0]?.detections?.synced || 0;
        const vuln = data.results?.[0]?.vulnerabilities?.synced || 0;
        toast({ title: `CrowdStrike sync complete — ${det} detections, ${vuln} vulnerabilities` });
        load();
      } else {
        toast({ title: "CrowdStrike sync failed", description: data?.error || data?.results?.[0]?.reason, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Sync request failed", description: e.message, variant: "destructive" });
    } finally {
      setSyncingCrowd(false);
    }
  };

  const removeFinding = async (id) => {
    if (!window.confirm("Delete this finding?")) return;
    try {
      await base44.entities.SecurityFinding.delete(id);
      setFindings((p) => p.filter((f) => f.id !== id));
      toast({ title: "Finding deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const open = findings.filter((f) => f.status === "open");
  const critical = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const remediated = findings.filter((f) => f.status === "remediated");
  const postureCounts = findings.reduce((acc, f) => {
    const pc = f.posture_check || "Configuration";
    acc[pc] = (acc[pc] || 0) + 1;
    return acc;
  }, {});

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
        subtitle="Endpoint, cloud, and code security findings from AWS Security Hub and GitHub repository posture checks"
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowManual(true)} variant="default" size="sm">
              <Plus className="w-4 h-4 mr-1" /> Log Finding
            </Button>
            <Button onClick={runCrowdSync} disabled={syncingCrowd} variant="default" size="sm">
              {syncingCrowd ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Radar className="w-4 h-4 mr-1" />}
              {syncingCrowd ? "Syncing…" : "Sync CrowdStrike"}
            </Button>
            <Button onClick={runGithubSync} disabled={syncingGithub} variant="outline" size="sm">
              {syncingGithub ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Github className="w-4 h-4 mr-1" />}
              {syncingGithub ? "Syncing…" : "Sync GitHub"}
            </Button>
            <Button onClick={runSync} disabled={syncing} variant="outline" size="sm">
              {syncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              {syncing ? "Syncing…" : "Sync AWS"}
            </Button>
          </div>
        }
      />

      {/* Config status banner */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-start gap-3">
          <Cloud className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground text-sm">CrowdStrike + AWS Security Hub + GitHub — Active Providers</h3>
            <p className="text-xs text-muted-foreground mt-1">
              CrowdStrike Falcon detections and Spotlight vulnerabilities are pulled via the Falcon API using your OAuth2 credentials. Cloud findings come from AWS Security Hub. GitHub repository posture (branch protection, PR review enforcement, org 2FA) is checked via the live OAuth connector. All three run on daily automated syncs.
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
          <p className="text-2xl font-bold text-foreground mt-1">{remediated.length}</p>
        </div>
      </div>

      {/* Posture breakdown */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <h3 className="font-heading font-semibold text-foreground text-sm mb-3">Posture Check Categories</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Object.entries(postureCounts).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
            <div key={cat} className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cat}</p>
            </div>
          ))}
          {Object.keys(postureCounts).length === 0 && (
            <p className="text-xs text-muted-foreground col-span-full text-center py-2">No posture data yet — run a sync to populate.</p>
          )}
        </div>
      </div>

      {/* Findings table */}
      {findings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <Cloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No security findings yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Click <strong>Log Finding</strong> to manually record a security finding, <strong>Sync GitHub</strong> to check repository posture, or <strong>Sync AWS</strong> to pull from AWS Security Hub.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Finding</th>
                <th className="text-left font-medium px-4 py-3">Posture Check</th>
                <th className="text-left font-medium px-4 py-3">Severity</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Resource</th>
                <th className="text-left font-medium px-4 py-3">Detected</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {findings.slice(0, 50).map((f) => (
                <tr key={f.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{f.title}</p>
                    {f.finding_id && <p className="text-xs text-muted-foreground">{f.finding_id}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.posture_check || "—"}</td>
                  <td className="px-4 py-3"><span className={`text-xs font-semibold capitalize ${SEVERITY_COLOR[f.severity] || ""}`}>{f.severity}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${STATUS_COLOR[f.status] || ""}`}>{(f.status || "").replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{f.resource_id || f.asset || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.detected_date || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFinding(f.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ManualFindingDialog open={showManual} onOpenChange={setShowManual} onCreated={load} />
    </div>
  );
}