import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, ShieldCheck, AlertTriangle, Bug, TrendingUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import PostureScoreGauge from "@/components/cspm/PostureScoreGauge";
import CloudProviderCard from "@/components/cspm/CloudProviderCard";
import { useToast } from "@/components/ui/use-toast";

const SEV_WEIGHT = { critical: 10, high: 5, medium: 3, low: 1, info: 0 };
const SEV_COLOR = {
  critical: "#ef4444", high: "#f59e0b", medium: "#eab308", low: "#3b82f6", info: "#94a3b8",
};

export default function CloudPosture() {
  const [findings, setFindings] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const [f, c] = await Promise.all([
      base44.entities.SecurityFinding.list("-created_date", 500),
      base44.entities.Connection.list(),
    ]);
    setFindings(f || []);
    setConnections(c || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const connByProvider = (provider) => (connections || []).find((c) => c.service === provider && c.status !== "disconnected");

  const handleSync = async (provider) => {
    setSyncing(true);
    try {
      const conn = connByProvider(provider);
      const res = await base44.functions.invoke("syncAwsSecurityHub", conn ? { connection_id: conn.id } : {});
      if (res?.skipped) {
        toast({ title: "Sync skipped", description: res.reason || "Connection disabled" });
      } else {
        toast({ title: "Sync complete", description: `${res?.count || 0} new findings ingested` });
        await load();
      }
    } catch (err) {
      toast({ title: "Sync failed", description: err.message || "Unable to sync findings", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Posture score: weighted by severity, penalised for open findings
  const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_progress");
  const totalWeight = findings.reduce((sum, f) => sum + (SEV_WEIGHT[f.severity] || 0), 0) || 1;
  const openWeight = openFindings.reduce((sum, f) => sum + (SEV_WEIGHT[f.severity] || 0), 0);
  const postureScore = Math.max(0, Math.round(100 - (openWeight / totalWeight) * 100));

  const bySeverity = ["critical", "high", "medium", "low", "info"].map((sev) => ({
    name: sev, value: findings.filter((f) => f.severity === sev).length,
  })).filter((d) => d.value > 0);

  const byCategory = Object.entries(
    findings.reduce((acc, f) => {
      const cat = f.posture_check || "Other";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const byProvider = (provider) => findings.filter((f) => f.cloud_provider === provider);
  const topOpen = [...openFindings]
    .sort((a, b) => (SEV_WEIGHT[b.severity] || 0) - (SEV_WEIGHT[a.severity] || 0))
    .slice(0, 8);

  const remediated = findings.filter((f) => f.status === "remediated").length;
  const remediationRate = findings.length > 0 ? Math.round((remediated / findings.length) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="Cloud Security Posture Management"
        subtitle="Continuous posture assessment across AWS, Azure, and GCP"
        actions={
          <button
            onClick={() => handleSync("aws")}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-3.5 py-2 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> Sync all
          </button>
        }
      />

      {/* Posture summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Overall Posture Score</h3>
          <PostureScoreGauge score={postureScore} />
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Based on {findings.length} findings weighted by severity
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Total findings</span>
            <span className="text-2xl font-heading font-bold text-foreground">{findings.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Open</span>
            <span className="text-2xl font-heading font-bold text-amber-600 dark:text-amber-400">{openFindings.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Remediated</span>
            <span className="text-2xl font-heading font-bold text-emerald-600 dark:text-emerald-400">{remediated}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Remediation rate</span>
            <span className="text-2xl font-heading font-bold text-foreground">{remediationRate}%</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Severity breakdown</h3>
          {bySeverity.length > 0 ? (
            <div className="space-y-2.5">
              {bySeverity.map((s) => {
                const pct = findings.length > 0 ? Math.round((s.value / findings.length) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground capitalize">{s.name}</span>
                      <span className="text-muted-foreground">{s.value} · {pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SEV_COLOR[s.name] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No findings yet</p>
          )}
        </div>
      </div>

      {/* Cloud provider cards */}
      <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Cloud Providers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {["aws", "azure", "gcp"].map((p) => {
          const connected = !!connByProvider(p);
          const pf = byProvider(p);
          return (
            <CloudProviderCard
              key={p}
              provider={p}
              connected={connected}
              findingsCount={pf.filter((f) => f.status === "open" || f.status === "in_progress").length}
              criticalCount={pf.filter((f) => f.severity === "critical" && f.status !== "remediated").length}
              onSync={connected ? () => handleSync(p) : null}
              syncing={syncing}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Posture category breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Findings by Posture Category</h3>
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          </div>
          {byCategory.length > 0 ? (
            <div className="space-y-3">
              {byCategory.map((c) => {
                const max = byCategory[0].value || 1;
                const pct = Math.round((c.value / max) * 100);
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-28 truncate">{c.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-8 text-right">{c.value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No findings categorised yet</p>
          )}
        </div>

        {/* Top open findings */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Top Open Findings</h3>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          {topOpen.length > 0 ? (
            <div className="space-y-2">
              {topOpen.map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(f.cloud_provider || "other").toUpperCase()} · {f.posture_check || "—"} · {f.asset || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white"
                      style={{ backgroundColor: SEV_COLOR[f.severity] || "#94a3b8" }}
                    >
                      {f.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bug className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-sm text-muted-foreground">No open findings — posture is healthy</p>
            </div>
          )}
        </div>
      </div>

      {/* Full findings table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground">All Cloud Findings</h3>
          <span className="text-xs text-muted-foreground">{findings.length} total</span>
        </div>
        {findings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-6 py-3">Finding</th>
                  <th className="text-left font-medium px-4 py-3">Cloud</th>
                  <th className="text-left font-medium px-4 py-3">Category</th>
                  <th className="text-left font-medium px-4 py-3">Severity</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {findings.slice(0, 50).map((f) => (
                  <tr key={f.id} className="hover:bg-muted/30">
                    <td className="px-6 py-3">
                      <p className="font-medium text-foreground truncate max-w-xs">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{f.resource_id || f.asset || "—"}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{f.cloud_provider || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.posture_check || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: SEV_COLOR[f.severity] || "#94a3b8" }}>
                        {f.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{f.detected_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No cloud findings ingested yet. Sync a connected provider to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}