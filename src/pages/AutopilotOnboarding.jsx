import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Zap, Eye, Rocket, CheckCircle2, Loader2, Plug } from "lucide-react";

const SERVICE_INFO = {
  aws: { label: "AWS", icon: "☁️", categories: ["Access Control", "Data Protection", "Network Security", "Security Ops", "Asset Mgmt"] },
  gcp: { label: "Google Cloud", icon: "☁️", categories: ["Access Control", "Data Protection", "Network Security", "Security Ops"] },
  azure: { label: "Azure", icon: "☁️", categories: ["Access Control", "Data Protection", "Network Security", "Security Ops"] },
  github: { label: "GitHub", icon: "🐙", categories: ["Change Mgmt", "Access Control"] },
  okta: { label: "Okta", icon: "🔑", categories: ["Access Control", "HR"] },
  google_workspace: { label: "Google Workspace", icon: "📧", categories: ["Access Control"] },
  microsoft_365: { label: "Microsoft 365", icon: "📧", categories: ["Access Control", "HR"] },
  slack: { label: "Slack", icon: "💬", categories: ["Access Control"] },
  jamf: { label: "Jamf", icon: "📱", categories: ["Asset Mgmt", "Access Control"] },
  crowdstrike: { label: "CrowdStrike", icon: "🛡️", categories: ["Security Ops", "Incident Response"] },
  defender: { label: "MS Defender", icon: "🛡️", categories: ["Security Ops", "Incident Response"] },
  knowbe4: { label: "KnowBe4", icon: "🎓", categories: ["HR", "Compliance"] },
  bamboohr: { label: "BambooHR", icon: "👥", categories: ["HR"] },
  jira: { label: "Jira", icon: "📋", categories: ["Change Mgmt", "Incident Response"] },
};

export default function AutopilotOnboarding() {
  const { toast } = useToast();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState({});
  const [previews, setPreviews] = useState({});
  const [results, setResults] = useState({});

  const load = async () => {
    try {
      const conns = await base44.entities.Connection.list("-updated_date", 50);
      setConnections(conns);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const preview = async (service, connId) => {
    setLoading(l => ({ ...l, [service]: "preview" }));
    try {
      const res = await base44.functions.invoke("runAutopilotOnboarding", { service, connection_id: connId, dry_run: true });
      setPreviews(p => ({ ...p, [service]: res.data }));
    } catch (e) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    }
    setLoading(l => ({ ...l, [service]: null }));
  };

  const runAutopilot = async (service, connId) => {
    setLoading(l => ({ ...l, [service]: "run" }));
    try {
      const res = await base44.functions.invoke("runAutopilotOnboarding", { service, connection_id: connId });
      setResults(r => ({ ...r, [service]: res.data }));
      toast({ title: "Autopilot complete", description: `${res.data?.controls_automated} controls auto-enabled` });
      load();
    } catch (e) {
      toast({ title: "Autopilot failed", description: e.message, variant: "destructive" });
    }
    setLoading(l => ({ ...l, [service]: null }));
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Autopilot Onboarding" subtitle="Connect an integration → controls auto-enable → evidence starts flowing" />

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Rocket className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">How Autopilot Works</p>
              <p className="text-sm text-muted-foreground mt-1">When you connect an integration, CertiGuard automatically identifies which controls it can collect evidence for and marks them as automated — no manual mapping required. Preview first to see exactly which controls will be enabled.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {connections.length === 0 ? (
        <Card><CardContent className="pt-6 text-center">
          <Plug className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No integrations connected yet. Go to Connections to set up your first integration, then come back here to run Autopilot.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {connections.map(conn => {
            const info = SERVICE_INFO[conn.service] || { label: conn.service, icon: "🔌", categories: [] };
            const isLoading = loading[conn.service];
            const previewData = previews[conn.service];
            const resultData = results[conn.service];
            return (
              <Card key={conn.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2"><span className="text-xl">{info.icon}</span> {info.label}</span>
                    <Badge variant={conn.status === "connected" ? "default" : "secondary"}>{conn.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {info.categories.map(c => <span key={c} className="px-2 py-0.5 rounded text-xs bg-muted">{c}</span>)}
                  </div>
                  <p className="text-sm text-muted-foreground">Controls monitored: {conn.control_count || 0} · Evidence collected: {conn.evidence_collected_count || 0}</p>

                  {previewData && (
                    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <p className="text-sm font-medium">Preview: {previewData.controls_eligible} controls eligible</p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {previewData.controls?.slice(0, 10).map(c => (
                          <div key={c.id} className="text-xs flex justify-between">
                            <span className="truncate">{c.control_id} — {c.title}</span>
                            <span className="text-muted-foreground ml-2 shrink-0">{c.current_automation}</span>
                          </div>
                        ))}
                        {previewData.controls?.length > 10 && <p className="text-xs text-muted-foreground">+ {previewData.controls.length - 10} more</p>}
                      </div>
                    </div>
                  )}

                  {resultData && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm font-medium">{resultData.controls_automated} controls auto-enabled</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => preview(conn.service, conn.id)} disabled={!!isLoading}>
                      {isLoading === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      Preview
                    </Button>
                    <Button size="sm" onClick={() => runAutopilot(conn.service, conn.id)} disabled={!!isLoading}>
                      {isLoading === "run" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      Run Autopilot
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}