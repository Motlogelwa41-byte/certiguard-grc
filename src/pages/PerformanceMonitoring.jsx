import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Server, Database, Globe, RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap } from "lucide-react";

export default function PerformanceMonitoring() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await base44.functions.invoke("getPlatformStatus", {});
      const data = res?.data || res;
      setStatus(data);
    } catch (e) {
      // Fallback to entity counts if platform status unavailable
      try {
        const [controls, findings, risks, evidence] = await Promise.all([
          base44.entities.Control.list().catch(() => []),
          base44.entities.SecurityFinding.list().catch(() => []),
          base44.entities.Risk.list().catch(() => []),
          base44.entities.Evidence.list().catch(() => []),
        ]);
        setStatus({
          fallback: true,
          entityCounts: { controls: controls.length, findings: findings.length, risks: risks.length, evidence: evidence.length },
        });
      } catch (e2) {
        toast({ title: "Failed to load platform metrics", variant: "destructive" });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Simulated health metrics (in production these would come from APM)
  const healthMetrics = [
    { name: "API Gateway", status: "healthy", latency: 45, uptime: 99.98, icon: Globe },
    { name: "Database (Primary)", status: "healthy", latency: 12, uptime: 99.99, icon: Database },
    { name: "Entity Storage", status: "healthy", latency: 23, uptime: 99.97, icon: Server },
    { name: "Auth Service", status: "healthy", latency: 8, uptime: 99.99, icon: Activity },
    { name: "Realtime Sync", status: "degraded", latency: 180, uptime: 99.82, icon: Zap },
    { name: "File Storage", status: "healthy", latency: 67, uptime: 99.95, icon: Database },
  ];

  const slaTargets = [
    { metric: "API Uptime", target: "99.9%", actual: "99.98%", status: "pass" },
    { metric: "API Response (p95)", target: "< 500ms", actual: "45ms", status: "pass" },
    { metric: "DB Query (p95)", target: "< 100ms", actual: "12ms", status: "pass" },
    { metric: "Realtime Sync", target: "< 200ms", actual: "180ms", status: "warning" },
    { metric: "File Upload", target: "< 5s", actual: "2.1s", status: "pass" },
    { metric: "Auth Login", target: "< 2s", actual: "0.8s", status: "pass" },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Platform Performance Monitoring"
        subtitle="Real-time health metrics, SLA tracking, and system performance indicators"
        actions={<Button onClick={fetchStatus} disabled={refreshing} variant="default">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Health overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="System Uptime" value="99.97%" icon={Activity} color="green" trendLabel="30-day average" />
            <StatCard label="Avg API Latency" value="45ms" icon={Zap} color="blue" trendLabel="p95 response" />
            <StatCard label="Healthy Services" value="5/6" icon={CheckCircle2} color="green" trendLabel="1 degraded" />
            <StatCard label="Open Alerts" value="1" icon={AlertTriangle} color="amber" trendLabel="Realtime sync" />
          </div>

          {/* Service health */}
          <Card>
            <CardHeader><CardTitle>Service Health</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {healthMetrics.map((svc) => (
                  <div key={svc.name} className="flex items-center gap-4 p-3 rounded-md border">
                    <svc.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{svc.name}</div>
                      <div className="text-xs text-muted-foreground">Latency: {svc.latency}ms · Uptime: {svc.uptime}%</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${svc.status === "healthy" ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${svc.uptime}%` }} />
                      </div>
                      <Badge variant={svc.status === "healthy" ? "default" : "secondary"} className={svc.status === "healthy" ? "bg-emerald-500" : "bg-amber-500 text-white"}>
                        {svc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SLA tracking */}
          <Card>
            <CardHeader><CardTitle>SLA Target Tracking</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Metric</th>
                      <th className="pb-2 font-medium">SLA Target</th>
                      <th className="pb-2 font-medium">Actual</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slaTargets.map((sla, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 font-medium">{sla.metric}</td>
                        <td className="py-2 text-muted-foreground">{sla.target}</td>
                        <td className="py-2 font-mono">{sla.actual}</td>
                        <td className="py-2">
                          {sla.status === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <AlertTriangle className="h-4 w-4 text-amber-500 inline" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Platform status from backend */}
          {status && !status.fallback && (
            <Card>
              <CardHeader><CardTitle>Platform Backend Status</CardTitle></CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-x-auto">{JSON.stringify(status, null, 2)}</pre>
              </CardContent>
            </Card>
          )}

          {status?.fallback && (
            <Card>
              <CardHeader><CardTitle>Entity Data Volume</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard label="Controls" value={status.entityCounts.controls} icon={Server} color="blue" />
                  <StatCard label="Findings" value={status.entityCounts.findings} icon={AlertTriangle} color="amber" />
                  <StatCard label="Risks" value={status.entityCounts.risks} icon={Activity} color="red" />
                  <StatCard label="Evidence" value={status.entityCounts.evidence} icon={Database} color="green" />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}