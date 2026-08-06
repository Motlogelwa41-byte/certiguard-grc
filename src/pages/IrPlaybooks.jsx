import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { IR_PLAYBOOKS, playbookByType } from "@/lib/irPlaybooks";
import {
  Shield, Play, Clock, CheckCircle2, Loader2, AlertTriangle,
  Activity, Zap, ArrowRight, FileText,
} from "lucide-react";

const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const PHASE_COLORS = {
  "Detection & Analysis": "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400",
  "Containment": "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400",
  "Notification": "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400",
  "Eradication": "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400",
  "Recovery": "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
  "Post-Incident": "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400",
};

export default function IrPlaybooks() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlaybook, setSelectedPlaybook] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState("");
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const inc = await base44.entities.Incident.list("-created_date", 50).catch(() => []);
    setIncidents(inc || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const activeIncidents = incidents.filter(i => i.status !== "closed" && i.status !== "false_positive");

  const executePlaybook = async () => {
    if (!selectedPlaybook || !selectedIncident) {
      toast({ title: "Select a playbook and an incident first", variant: "destructive" });
      return;
    }
    setExecuting(true);
    try {
      const res = await base44.functions.invoke("executeIrPlaybook", {
        incident_id: selectedIncident,
        playbook_type: selectedPlaybook,
      });
      setLastResult(res.data);
      toast({
        title: "Playbook Executed",
        description: `${res.data.stepsQueued} remediation tasks created for ${res.data.totalSteps} steps.`,
      });
      load();
    } catch (e) {
      toast({ title: "Execution failed", description: e.message, variant: "destructive" });
    }
    setExecuting(false);
  };

  return (
    <div>
      <PageHeader
        title="Incident Response Playbooks (NIST 800-61)"
        subtitle="Pre-built automated response chains — execute playbooks to instantly queue remediation tasks with SLAs"
      />

      {/* Playbook cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {IR_PLAYBOOKS.map((pb) => (
          <div
            key={pb.type}
            className={`rounded-xl border-2 p-5 cursor-pointer transition-all ${selectedPlaybook === pb.type ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
            onClick={() => setSelectedPlaybook(pb.type)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-bold text-foreground">{pb.label}</h3>
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${SEVERITY_COLORS[pb.severity]}`}>{pb.severity}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{pb.description}</p>
            <div className="flex items-center gap-2 text-xs">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{pb.steps.length} steps · {pb.steps.filter(s => s.phase === "Containment").length} containment</span>
            </div>
          </div>
        ))}
      </div>

      {/* Execution panel */}
      {selectedPlaybook && (
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
            <div className="flex-1">
              <h3 className="font-heading font-bold text-foreground mb-1">Execute: {playbookByType(selectedPlaybook)?.label}</h3>
              <p className="text-xs text-muted-foreground">Select an active incident to attach this playbook to.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Select value={selectedIncident} onValueChange={setSelectedIncident}>
                <SelectTrigger className="w-full md:w-[280px] h-9"><SelectValue placeholder="Select an incident..." /></SelectTrigger>
                <SelectContent>
                  {activeIncidents.length === 0 ? (
                    <SelectItem value="none" disabled>No active incidents</SelectItem>
                  ) : (
                    activeIncidents.map(inc => (
                      <SelectItem key={inc.id} value={inc.id}>{inc.title} ({inc.severity})</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button onClick={executePlaybook} disabled={executing || !selectedIncident}>
                {executing ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                Execute
              </Button>
            </div>
          </div>

          {lastResult && lastResult.playbook_type === selectedPlaybook && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/10 p-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {lastResult.stepsQueued}/{lastResult.totalSteps} tasks created
                </span>
                <Link to="/tasks" className="text-xs text-emerald-600 hover:underline ml-auto">View tasks →</Link>
              </div>
            </div>
          )}

          {/* Steps timeline */}
          <div className="space-y-1.5">
            {playbookByType(selectedPlaybook)?.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/30 p-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{step.action}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PHASE_COLORS[step.phase] || ""}`}>{step.phase}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" /> SLA: {step.sla}h
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active incidents */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-foreground">Active Incidents</h3>
          <Link to="/incidents" className="text-xs text-primary hover:underline">View all →</Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : activeIncidents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-sm">No active incidents. Playbooks are ready when you need them.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeIncidents.slice(0, 10).map(inc => (
              <div key={inc.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <AlertTriangle className={`w-4 h-4 shrink-0 ${inc.severity === "critical" ? "text-red-500" : inc.severity === "high" ? "text-orange-500" : "text-amber-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inc.title}</p>
                  <p className="text-xs text-muted-foreground">{inc.type?.replace(/_/g, " ")} · {inc.status}</p>
                </div>
                <Badge className={SEVERITY_COLORS[inc.severity] || ""}>{inc.severity}</Badge>
                <Button size="sm" variant="outline" onClick={() => { setSelectedIncident(inc.id); setSelectedPlaybook(inc.type === "security_breach" ? "data_breach" : inc.type === "phishing" ? "phishing" : inc.type === "malware" ? "malware" : inc.type === "unauthorized_access" ? "unauthorized_access" : inc.type === "insider_threat" ? "insider_threat" : "ransomware"); }}>
                  <Play className="w-3 h-3 mr-1" /> Launch
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}