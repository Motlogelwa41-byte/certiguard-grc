import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { RefreshCw, Cloud, CheckCircle2, AlertCircle, Clock, Zap, FileCheck, Plug, Shield } from "lucide-react";

const SERVICE_ICONS = {
  aws: Cloud, azure: Cloud, gcp: Cloud,
  github: Plug, defender: Shield, crowdstrike: Shield,
  slack: Plug, google_drive: Cloud, jira: Plug,
  knowbe4: Plug, bamboohr: Plug, datadog: Plug, splunk: Plug,
};

const SERVICE_LABELS = {
  aws: "AWS", azure: "Azure", gcp: "GCP",
  github: "GitHub", defender: "Microsoft Defender", crowdstrike: "CrowdStrike",
  slack: "Slack", google_drive: "Google Drive", google_workspace: "Google Workspace",
  jira: "Jira", knowbe4: "KnowBe4", bamboohr: "BambooHR",
  datadog: "Datadog", splunk: "Splunk", jamf: "Jamf", kandji: "Kandji",
};

export default function CloudEvidenceCollector() {
  const { toast } = useToast();
  const [connections, setConnections] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [conns, ev] = await Promise.all([
        base44.entities.Connection.list().catch(() => []),
        base44.entities.Evidence.list("-collected_date", 50).catch(() => []),
      ]);
      setConnections(conns || []);
      setEvidence((ev || []).filter((e) => e.title?.startsWith("[Auto]")));
    } catch (e) {
      toast({ title: "Error loading data", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await base44.functions.invoke("collectCloudEvidence", {});
      setLastResult(res.data);
      toast({
        title: res.data.collected > 0
          ? `Collected ${res.data.collected} evidence items`
          : "No evidence collected",
        description: res.data.connections
          ? `From ${res.data.connections} integration(s)`
          : "No active integrations — connect integrations first",
      });
      await load();
    } catch (e) {
      toast({ title: "Collection failed", description: e.message, variant: "destructive" });
    }
    setCollecting(false);
  };

  const activeConnections = connections.filter((c) => c.status === "connected");
  const autoCollectConnections = activeConnections.filter((c) => c.auto_collect !== false);
  const totalEvidenceCollected = connections.reduce((sum, c) => sum + (c.evidence_collected_count || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Cloud Evidence Collector"
        subtitle="Automated evidence collection from your connected cloud and security integrations — auto-attached to the right controls"
        actions={
          <Button onClick={handleCollect} disabled={collecting}>
            {collecting ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Collecting...</> : <><Zap className="w-4 h-4 mr-1" /> Collect Now</>}
          </Button>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Connected Integrations" value={activeConnections.length} icon={Plug} color="blue" trendLabel="Active connections" />
        <StatCard label="Auto-Collect Enabled" value={autoCollectConnections.length} icon={Zap} color="green" trendLabel="Scheduled daily at 6 AM" />
        <StatCard label="Evidence Collected" value={totalEvidenceCollected} icon={FileCheck} color="purple" trendLabel="Total from integrations" />
        <StatCard label="Auto Evidence (Recent)" value={evidence.length} icon={Cloud} color="amber" trendLabel="Last 50 auto-collected" />
      </div>

      {/* Last collection result */}
      {lastResult && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Last Collection Result</h3>
              <span className="text-xs text-muted-foreground">{new Date(lastResult.run_at).toLocaleString()}</span>
            </div>
            {lastResult.results?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {lastResult.results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-card border border-border">
                    <div>
                      <p className="text-sm font-medium">{SERVICE_LABELS[r.service] || r.service}</p>
                      <p className="text-xs text-muted-foreground">{r.collected} evidence · {r.controls} controls</p>
                    </div>
                    {r.collected > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No integrations with auto-collect enabled. Connect integrations in the Connections page.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration status grid */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Integration Status</CardTitle></CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="text-center py-8">
              <Plug className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No integrations connected yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.href = "/connections"}>
                Connect Integrations
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {connections.map((conn) => {
                const Icon = SERVICE_ICONS[conn.service] || Plug;
                const isActive = conn.status === "connected";
                return (
                  <div key={conn.id} className={`p-3 rounded-xl border ${isActive ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {SERVICE_LABELS[conn.service] || conn.service}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{conn.name}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant={isActive ? "default" : conn.status === "error" ? "destructive" : "secondary"}>
                            {conn.status}
                          </Badge>
                          {conn.auto_collect !== false && isActive && (
                            <span className="inline-flex items-center gap-1 text-xs text-success">
                              <Zap className="w-3 h-3" /> Auto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {conn.evidence_collected_count > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <FileCheck className="w-3 h-3" /> {conn.evidence_collected_count} evidence collected
                        {conn.last_sync_at && <><Clock className="w-3 h-3 ml-2" /> {new Date(conn.last_sync_at).toLocaleDateString()}</>}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent auto-collected evidence */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5" /> Recently Auto-Collected Evidence</CardTitle></CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No auto-collected evidence yet. Click "Collect Now" to pull evidence from your connected integrations.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {evidence.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <div className="p-1.5 rounded bg-primary/10 text-primary shrink-0">
                    <FileCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {ev.control_title || "No control"} · {ev.type} · {ev.collected_date}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">{ev.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}