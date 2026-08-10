import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, RefreshCw, CheckCircle2, Eye, Loader2, Sparkles, Activity, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

const TYPE_LABELS = {
  control_failure_spike: "Control Failure Spike",
  risk_score_drift: "Risk Score Drift",
  evidence_gap: "Evidence Collection Gap",
  access_anomaly: "Access Anomaly",
  compliance_regression: "Compliance Regression",
  test_failure_burst: "Test Failure Burst",
  vendor_risk_shift: "Vendor Risk Shift",
};

const TYPE_ICONS = {
  control_failure_spike: AlertTriangle,
  risk_score_drift: TrendingUp,
  evidence_gap: AlertCircle,
  access_anomaly: Activity,
  compliance_regression: AlertTriangle,
  test_failure_burst: Activity,
  vendor_risk_shift: TrendingDown,
};

export default function AnomalyDetection() {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    try {
      const items = await base44.entities.AnomalyAlert.list("-detected_at", 50);
      setAlerts(items);
    } catch (e) { toast({ title: "Failed to load anomalies", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  const runDetection = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("detectComplianceAnomalies", {});
      const data = res.data || res;
      toast({
        title: `Detection complete — ${data.detected || 0} anomalies found`,
        description: data.created > 0 ? `${data.created} new alerts created` : "No new anomalies detected",
      });
      loadAlerts();
    } catch (e) {
      toast({ title: "Detection failed", description: e.message, variant: "destructive" });
    }
    setScanning(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const update = { status };
      if (status === "acknowledged" || status === "investigating") {
        update.acknowledged_at = new Date().toISOString();
      } else if (status === "resolved" || status === "false_positive") {
        update.resolved_at = new Date().toISOString();
      }
      await base44.entities.AnomalyAlert.update(id, update);
      toast({ title: `Marked as ${status.replace(/_/g, " ")}` });
      loadAlerts();
    } catch (e) { toast({ title: "Update failed", description: e.message, variant: "destructive" }); }
  };

  const filtered = alerts.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: alerts.length,
    open: alerts.filter((a) => a.status === "open").length,
    critical: alerts.filter((a) => a.severity === "critical" && a.status === "open").length,
    resolved: alerts.filter((a) => a.status === "resolved" || a.status === "false_positive").length,
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Anomaly Detection Engine" subtitle="AI-powered detection of unusual compliance patterns — control failure spikes, risk drift, evidence gaps, and more" />
      
      {/* Stats + Action */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Activity className="w-3.5 h-3.5" /> Total Anomalies</div>
          <p className="text-2xl font-heading font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="bg-card rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 text-xs text-red-600 mb-1"><AlertTriangle className="w-3.5 h-3.5" /> Open Alerts</div>
          <p className="text-2xl font-heading font-bold text-red-700">{stats.open}</p>
        </div>
        <div className="bg-card rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 text-xs text-red-600 mb-1"><AlertCircle className="w-3.5 h-3.5" /> Critical Open</div>
          <p className="text-2xl font-heading font-bold text-red-700">{stats.critical}</p>
        </div>
        <div className="bg-card rounded-xl border border-emerald-200 p-4">
          <div className="flex items-center gap-2 text-xs text-emerald-600 mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</div>
          <p className="text-2xl font-heading font-bold text-emerald-700">{stats.resolved}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <Button onClick={runDetection} disabled={scanning}>
          {scanning ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Scanning...</> : <><Sparkles className="w-4 h-4 mr-1.5" /> Run Anomaly Detection</>}
        </Button>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="false_positive">False Positive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="No anomalies detected" description="Run the anomaly detection engine to scan for unusual patterns in your compliance data." actionLabel="Run Detection" onAction={runDetection} />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const Icon = TYPE_ICONS[a.anomaly_type] || AlertTriangle;
            return (
              <div key={a.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${SEVERITY_COLORS[a.severity] || "bg-muted"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-heading font-semibold text-foreground">{a.title}</h3>
                      <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[a.severity]}`}>{a.severity}</Badge>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[a.anomaly_type] || a.anomaly_type}</Badge>
                      {a.confidence_score > 0 && (
                        <span className="text-[10px] text-muted-foreground">Confidence: {a.confidence_score}%</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{a.description}</p>
                    {a.recommended_action && (
                      <div className="bg-muted/50 rounded-lg p-2.5 mb-2">
                        <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Recommended: </span>{a.recommended_action}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Detected: {a.detected_at ? new Date(a.detected_at).toLocaleString() : "—"}</span>
                      {a.entity_name && <span>· {a.entity_type}: {a.entity_name}</span>}
                      {a.status !== "open" && <span>· Status: <span className="font-medium capitalize">{a.status.replace(/_/g, " ")}</span></span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    {a.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "acknowledged")}>Acknowledge</Button>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "false_positive")}>False Positive</Button>
                      </>
                    )}
                    {(a.status === "acknowledged" || a.status === "investigating") && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "resolved")}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}