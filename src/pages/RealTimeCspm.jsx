import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Cloud, Radar, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Shield, Zap,
} from "lucide-react";

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function RealTimeCspm() {
  const [findings, setFindings] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(null);
  const [lastScan, setLastScan] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [f, c] = await Promise.all([
      base44.entities.SecurityFinding.list("-detected_date", 200).catch(() => []),
      base44.entities.Connection.list().catch(() => []),
    ]);
    setFindings(f || []);
    setConnections(c || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cspmFindings = useMemo(() => findings.filter(f => f.posture_check || f.cloud_provider !== "other"), [findings]);
  const cloudConns = useMemo(() => connections.filter(c => ["aws", "azure", "gcp"].includes(c.service)), [connections]);

  const stats = useMemo(() => {
    const open = cspmFindings.filter(f => f.status === "open").length;
    const critical = cspmFindings.filter(f => f.severity === "critical" && f.status === "open").length;
    const high = cspmFindings.filter(f => f.severity === "high" && f.status === "open").length;
    const remediated = cspmFindings.filter(f => f.status === "remediated").length;
    const byProvider = {
      aws: cspmFindings.filter(f => f.cloud_provider === "aws" && f.status === "open").length,
      azure: cspmFindings.filter(f => f.cloud_provider === "azure" && f.status === "open").length,
      gcp: cspmFindings.filter(f => f.cloud_provider === "gcp" && f.status === "open").length,
    };
    return { open, critical, high, remediated, byProvider };
  }, [cspmFindings]);

  const runScan = async (provider) => {
    setScanning(provider);
    try {
      const res = await base44.functions.invoke("runCspmScan", { provider });
      setLastScan(res.data);
      toast({
        title: `CSPM Scan ${res.data.status === "completed" ? "Completed" : "Skipped"}`,
        description: res.data.message || `${res.data.findingsCreated} findings created from ${res.data.scannedConnections} connection(s).`,
      });
      load();
    } catch (e) {
      toast({ title: "CSPM scan failed", description: e.message, variant: "destructive" });
    }
    setScanning(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Real-Time Cloud Security Posture (CSPM)"
        subtitle="Live CIS Benchmark scanning across AWS, Azure & GCP — drift detection and auto-remediation findings"
        actions={
          <Button onClick={() => runScan("all")} disabled={scanning !== null}>
            {scanning === "all" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Radar className="w-3.5 h-3.5 mr-1" />}
            Scan All Providers
          </Button>
        }
      />

      {/* Provider scan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {["aws", "azure", "gcp"].map((prov) => {
          const conn = cloudConns.find(c => c.service === prov);
          const openCount = stats.byProvider[prov];
          const isScanning = scanning === prov || scanning === "all";
          return (
            <div key={prov} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-bold text-foreground uppercase">{prov}</h3>
                </div>
                <Badge className={conn?.status === "connected" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}>
                  {conn?.status === "connected" ? "Connected" : "Not Connected"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div>
                  <p className="text-3xl font-bold text-foreground">{openCount}</p>
                  <p className="text-xs text-muted-foreground">Open Findings</p>
                </div>
                {openCount > 0 && (
                  <div className="flex gap-1">
                    {openCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                )}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => runScan(prov)} disabled={isScanning || !conn}>
                {isScanning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Radar className="w-3 h-3 mr-1" />}
                Scan {prov.toUpperCase()}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={AlertTriangle} label="Open Findings" value={stats.open} color="text-amber-500" />
        <StatCard icon={XCircle} label="Critical Open" value={stats.critical} color="text-red-500" />
        <StatCard icon={Shield} label="High Open" value={stats.high} color="text-orange-500" />
        <StatCard icon={CheckCircle2} label="Remediated" value={stats.remediated} color="text-emerald-500" />
      </div>

      {lastScan && (
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Last Scan Result</span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-500">
            {lastScan.scannedConnections} connection(s) scanned · {lastScan.findingsCreated} new finding(s) created · {lastScan.checksRun} CIS checks evaluated
          </p>
        </div>
      )}

      {/* Findings table */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-foreground">CSPM Findings (CIS Benchmark)</h3>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
        {cspmFindings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Cloud className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No CSPM findings. Run a scan to check your cloud posture against CIS benchmarks.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Finding</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Provider</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Posture</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-2 py-2 text-xs font-semibold text-muted-foreground">Detected</th>
                </tr>
              </thead>
              <tbody>
                {cspmFindings.slice(0, 50).map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-2 py-2">
                      <p className="font-medium text-foreground text-xs">{f.title}</p>
                      <p className="text-[10px] text-muted-foreground">{f.resource_id}</p>
                    </td>
                    <td className="px-2 py-2"><span className="text-xs uppercase font-medium">{f.cloud_provider}</span></td>
                    <td className="px-2 py-2"><span className="text-xs text-muted-foreground">{f.posture_check}</span></td>
                    <td className="px-2 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${SEVERITY_COLORS[f.severity] || ""}`}>{f.severity}</span></td>
                    <td className="px-2 py-2"><span className="text-xs">{f.status}</span></td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">{f.detected_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <Icon className={`w-4 h-4 ${color} mb-1.5`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}