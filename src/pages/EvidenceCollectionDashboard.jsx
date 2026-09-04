import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { RefreshCw, Activity, CheckCircle2, AlertTriangle, Clock, XCircle, Plug } from "lucide-react";

const STATUS_CONFIG = {
  flowing: { label: "Flowing", color: "green", icon: CheckCircle2, badge: "default" },
  stale: { label: "Stale", color: "amber", icon: Clock, badge: "secondary" },
  manual: { label: "Manual", color: "blue", icon: Activity, badge: "outline" },
  none: { label: "No Evidence", color: "red", icon: XCircle, badge: "destructive" },
};

export default function EvidenceCollectionDashboard() {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getEvidenceCollectionHealth", {});
      setData(res.data);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filteredControls = data?.controls?.filter(c => filter === "all" || c.evidence_status === filter) || [];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Evidence Collection Dashboard"
        subtitle="Real-time view of which controls have automated evidence flowing"
        actions={<Button onClick={load} variant="outline" disabled={loading}>{loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Refresh</Button>}
      />

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Flowing" value={data.summary.flowing} icon={CheckCircle2} color="green" trendLabel="Evidence < 30 days old" />
            <StatCard label="Stale" value={data.summary.stale} icon={Clock} color="amber" trendLabel="Evidence > 30 days old" />
            <StatCard label="Manual" value={data.summary.manual} icon={Activity} color="blue" trendLabel="Manually collected" />
            <StatCard label="No Evidence" value={data.summary.none} icon={XCircle} color="red" trendLabel="Never collected" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Automation Coverage</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">{data.summary.automation_pct}%</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${data.summary.automation_pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{data.summary.total_controls - data.summary.manual} of {data.summary.total_controls} controls automated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Evidence Coverage</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold">{data.summary.evidence_coverage_pct}%</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-emerald-500 transition-all" style={{ width: `${data.summary.evidence_coverage_pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{data.summary.total_controls - data.summary.none} of {data.summary.total_controls} controls have evidence</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.connections?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="w-5 h-5" /> Integration Health</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.connections.map(conn => (
                    <div key={conn.id} className="p-3 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{conn.name}</p>
                        <p className="text-xs text-muted-foreground">{conn.control_count} controls · {conn.evidence_collected_count} evidence</p>
                      </div>
                      <Badge variant={conn.health === "healthy" ? "default" : conn.health === "error" ? "destructive" : "secondary"}>{conn.health}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Control Evidence Status</CardTitle>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)}>{cfg.label}</Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredControls.map(c => {
                  const cfg = STATUS_CONFIG[c.evidence_status] || STATUS_CONFIG.none;
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <StatusIcon className={`w-4 h-4 shrink-0 ${c.evidence_status === "flowing" ? "text-emerald-500" : c.evidence_status === "stale" ? "text-amber-500" : c.evidence_status === "none" ? "text-rose-500" : "text-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.control_id} — {c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.category} · {c.automation_status}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={cfg.badge}>{cfg.label}</Badge>
                        {c.days_since_evidence !== null && <p className="text-xs text-muted-foreground mt-0.5">{c.days_since_evidence}d ago</p>}
                      </div>
                    </div>
                  );
                })}
                {filteredControls.length === 0 && <p className="text-center text-muted-foreground py-8">No controls match this filter</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}