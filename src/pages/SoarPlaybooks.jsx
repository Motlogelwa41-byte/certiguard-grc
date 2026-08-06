import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOAR_PLAYBOOKS } from "@/lib/soarPlaybooks";
import { Zap, AlertTriangle, CheckCircle2, XCircle, Loader2, Siren } from "lucide-react";

const severityColors = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
};

export default function SoarPlaybooks() {
  const [selected, setSelected] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const loadIncidents = useCallback(async () => {
    try {
      const data = await base44.entities.Incident.list("-created_date", 20);
      setIncidents(data || []);
    } catch (e) { setIncidents([]); }
  }, []);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  const execute = async () => {
    if (!selected) return;
    setExecuting(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("executeSoarPlaybook", {
        playbook_type: selected.type,
        incident_id: selectedIncident || undefined,
        actions: selected.actions,
      });
      const data = res?.data || res;
      setResult(data);
      if (data.actions_failed === 0) {
        toast({ title: `SOAR playbook executed — ${data.actions_succeeded} actions completed` });
      } else {
        toast({ title: `SOAR executed with ${data.actions_failed} failure(s)`, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "SOAR execution failed", description: e.message, variant: "destructive" });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="SOAR Playbooks"
        subtitle="Security Orchestration, Automation & Response — automated threat response chains"
      />

      {/* Playbook Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SOAR_PLAYBOOKS.map((pb) => (
          <Card
            key={pb.type}
            className={`cursor-pointer transition-all hover:shadow-md ${selected?.type === pb.type ? "ring-2 ring-primary" : ""}`}
            onClick={() => { setSelected(pb); setResult(null); }}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Siren className={`h-5 w-5 ${pb.severity === "critical" ? "text-red-500" : "text-orange-500"}`} />
                  <CardTitle className="text-base">{pb.name}</CardTitle>
                </div>
              </div>
              <Badge className={severityColors[pb.severity] || severityColors.medium}>{pb.severity}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">{pb.description}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>{pb.actions.length} automated actions</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Execution Panel */}
      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Siren className="h-5 w-5" /> Execute: {selected.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Action list */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Actions to execute:</h4>
              {selected.actions.map((action, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{action.title || action.message || action.type}</div>
                    <div className="text-xs text-muted-foreground">{action.description || action.type}</div>
                  </div>
                  <Badge variant="outline" className="text-xs">{action.type}</Badge>
                </div>
              ))}
            </div>

            {/* Incident link */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium whitespace-nowrap">Link to incident (optional):</label>
              <Select value={selectedIncident} onValueChange={setSelectedIncident}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select an incident..." /></SelectTrigger>
                <SelectContent>
                  {incidents.map((inc) => (
                    <SelectItem key={inc.id} value={inc.id}>{inc.title || inc.incident_id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={execute} disabled={executing} variant="destructive" className="w-full">
              {executing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executing SOAR playbook...</> : <><Zap className="h-4 w-4 mr-2" /> Execute Playbook</>}
            </Button>

            {/* Results */}
            {result && (
              <div className="mt-4 p-4 rounded-lg border space-y-3">
                <div className="flex items-center gap-2">
                  {result.actions_failed === 0 ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium">Execution Result</span>
                  <Badge variant="outline">{result.actions_succeeded}/{result.actions_total} succeeded</Badge>
                </div>
                <div className="space-y-1">
                  {result.results.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {r.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                       r.status === "error" ? <XCircle className="h-4 w-4 text-red-500" /> :
                       <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      <span className="font-mono text-xs">{r.action}</span>
                      <span className="text-muted-foreground">{r.status}</span>
                      {r.error && <span className="text-red-500 text-xs">— {r.error}</span>}
                      {r.task_id && <span className="text-xs text-blue-500">task: {r.task_id.slice(-8)}</span>}
                      {r.finding_id && <span className="text-xs text-blue-500">finding: {r.finding_id.slice(-8)}</span>}
                      {r.evidence_id && <span className="text-xs text-blue-500">evidence: {r.evidence_id.slice(-8)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}