import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DLP_RULES, DLP_CATEGORIES } from "@/lib/dlpRules";
import { Eye, AlertTriangle, ShieldAlert, Loader2, Activity, MapPin, KeyRound, Monitor, Globe, Database, ShieldX } from "lucide-react";

const ruleIcons = {
  off_hours_access: Activity, no_mfa_access: KeyRound, new_device: Monitor,
  geo_mismatch: MapPin, high_risk_score: ShieldAlert, unusual_ip: Globe,
  bulk_data_access: Database, privileged_after_hours: ShieldX,
};

const severityColors = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function DlpMonitor() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [findings, setFindings] = useState([]);
  const { toast } = useToast();

  const loadFindings = useCallback(async () => {
    try {
      const data = await base44.entities.SecurityFinding.filter({ notes: "DLP" }, "-detected_date", 50);
      setFindings(data || []);
    } catch (e) { setFindings([]); }
  }, []);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("monitorDlpPatterns", {});
      const data = res?.data || res;
      setResult(data);
      if (data.status === "completed") {
        toast({ title: `DLP scan complete — ${data.incidents_detected} incidents, ${data.findings_created} findings created` });
        loadFindings();
      }
    } catch (e) {
      toast({ title: "DLP scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="DLP Pattern Monitor"
        subtitle="Data Loss Prevention — behavioral analytics on access patterns for exfiltration indicators"
        actions={<Button onClick={runScan} disabled={scanning} variant="default">
          {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing patterns...</> : <><Eye className="h-4 w-4 mr-2" /> Run DLP Scan</>}
        </Button>}
      />

      {/* DLP Rules */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Active DLP Detection Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {DLP_RULES.map((rule) => {
            const Icon = ruleIcons[rule.id] || AlertTriangle;
            return (
              <Card key={rule.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{rule.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                    <Badge className={`text-xs ${severityColors[rule.severity] || severityColors.medium}`}>{rule.severity}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Scan results */}
      {result && result.status === "completed" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Attestations Analyzed" value={result.attestations_analyzed} icon={Activity} color="text-blue-500" />
            <StatCard label="Incidents Detected" value={result.incidents_detected} icon={AlertTriangle} color="text-amber-500" />
            <StatCard label="Findings Created" value={result.findings_created} icon={ShieldAlert} color="text-red-500" />
            <StatCard label="Critical Incidents" value={result.by_severity?.critical || 0} icon={ShieldAlert} color="text-red-600" />
          </div>

          {/* Incidents by type */}
          {result.incidents.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Detected DLP Incidents ({result.incidents.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.incidents.slice(0, 30).map((inc, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-md border">
                      <AlertTriangle className={`h-4 w-4 ${inc.severity === "critical" ? "text-red-500" : inc.severity === "high" ? "text-orange-500" : "text-amber-500"}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{inc.type.replace(/_/g, " ")}</div>
                        <div className="text-xs text-muted-foreground">{inc.description}</div>
                      </div>
                      <Badge className={`text-xs ${severityColors[inc.severity] || severityColors.medium}`}>{inc.severity}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Existing DLP findings */}
      <Card>
        <CardHeader><CardTitle>DLP Findings History ({findings.length})</CardTitle></CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No DLP findings. Run a scan to analyze access patterns.</p>
          ) : (
            <div className="space-y-2">
              {findings.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-md border">
                  <AlertTriangle className={`h-4 w-4 ${f.severity === "critical" ? "text-red-500" : f.severity === "high" ? "text-orange-500" : "text-amber-500"}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground">{f.description}</div>
                  </div>
                  <Badge variant={f.severity === "critical" || f.severity === "high" ? "destructive" : "secondary"} className="text-xs">{f.severity}</Badge>
                  <Badge variant="outline" className="text-xs">{f.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}