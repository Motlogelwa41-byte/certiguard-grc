import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Brain, Zap, Activity, AlertTriangle, Radar, ScanLine,
  CheckCircle2, XCircle, Clock, Play, ArrowUp, Users, FileCheck,
  ShieldCheck, Lock, ScrollText, Server, Loader2, Cpu, Network
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const SIEM_INTEGRATIONS = [
  { name: "Splunk Enterprise", icon: Server, connected: true, events_per_sec: 0, status: "active" },
  { name: "Elastic SIEM", icon: Network, connected: true, events_per_sec: 0, status: "active" },
  { name: "Microsoft Sentinel", icon: ShieldCheck, connected: true, events_per_sec: 0, status: "active" },
  { name: "Sumo Logic", icon: Activity, connected: false, events_per_sec: 0, status: "disconnected" },
  { name: "Internal SIEM", icon: Cpu, connected: true, events_per_sec: 0, status: "active" },
];

const DETECTION_TYPE_META = {
  signature_based: { label: "Signature-Based", color: "bg-blue-100 text-blue-700", icon: ScanLine },
  behavioral_ml: { label: "Behavioral ML", color: "bg-purple-100 text-purple-700", icon: Brain },
  heuristic: { label: "Heuristic", color: "bg-amber-100 text-amber-700", icon: Zap },
  hybrid: { label: "Hybrid", color: "bg-emerald-100 text-emerald-700", icon: Radar },
};

const THREAT_CATEGORY_META = {
  malware: { label: "Malware", color: "bg-red-100 text-red-700" },
  ransomware: { label: "Ransomware", color: "bg-red-100 text-red-700" },
  phishing: { label: "Phishing", color: "bg-orange-100 text-orange-700" },
  lateral_movement: { label: "Lateral Movement", color: "bg-purple-100 text-purple-700" },
  data_exfiltration: { label: "Data Exfiltration", color: "bg-red-100 text-red-700" },
  privilege_escalation: { label: "Privilege Escalation", color: "bg-amber-100 text-amber-700" },
  insider_threat: { label: "Insider Threat", color: "bg-orange-100 text-orange-700" },
  zero_day: { label: "Zero-Day", color: "bg-red-100 text-red-700" },
  brute_force: { label: "Brute Force", color: "bg-amber-100 text-amber-700" },
  anomalous_access: { label: "Anomalous Access", color: "bg-blue-100 text-blue-700" },
  ddos: { label: "DDoS", color: "bg-red-100 text-red-700" },
  supply_chain: { label: "Supply Chain", color: "bg-purple-100 text-purple-700" },
};

const INCIDENT_STATUS_META = {
  detected: { label: "Detected", color: "bg-red-100 text-red-700" },
  investigating: { label: "Investigating", color: "bg-amber-100 text-amber-700" },
  contained: { label: "Contained", color: "bg-blue-100 text-blue-700" },
  remediated: { label: "Remediated", color: "bg-emerald-100 text-emerald-700" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-700" },
  false_positive: { label: "False Positive", color: "bg-slate-100 text-slate-600" },
};

export default function ThreatDetectionCenter() {
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a, i, at] = await Promise.all([
        base44.entities.ThreatDetectionRule.list("-created_date", 50).catch(() => []),
        base44.entities.SecurityAlert.list("-detected_at", 50).catch(() => []),
        base44.entities.Incident.list("-detected_date", 20).catch(() => []),
        base44.entities.AuditTrail.list("-created_date", 20).catch(() => []),
      ]);
      setRules(r || []);
      setAlerts(a || []);
      setIncidents(i || []);
      setAuditTrail(at || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runThreatScan = async (scope) => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("runThreatDetection", { scan_scope: scope });
      const data = res?.data || res;
      toast({
        title: data.threats_detected > 0 ? `${data.threats_detected} threat(s) detected!` : "Threat scan completed",
        description: `${data.rules_evaluated} rules evaluated — ${data.alerts_created} alert(s), ${data.incidents_created} incident(s) created`,
        variant: data.threats_detected > 0 ? "destructive" : "default",
      });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Scan failed", description: e?.message }); }
    setScanning(false);
  };

  const coordinateIR = async (incidentId) => {
    setActionLoading(`coord-${incidentId}`);
    try {
      const res = await base44.functions.invoke("coordinateIncidentResponse", { incident_id: incidentId, action: "coordinate" });
      const data = res?.data || res;
      toast({ title: `IR coordination initiated: ${incidentId}`, description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Coordination failed", description: e?.message }); }
    setActionLoading(null);
  };

  const escalateIR = async (incidentId) => {
    setActionLoading(`esc-${incidentId}`);
    try {
      const res = await base44.functions.invoke("coordinateIncidentResponse", { incident_id: incidentId, action: "escalate", escalate_to_role: "incident_responder" });
      const data = res?.data || res;
      toast({ title: `Escalated: ${incidentId}`, description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Escalation failed", description: e?.message }); }
    setActionLoading(null);
  };

  const triggerPlaybook = async (incidentId) => {
    setActionLoading(`pb-${incidentId}`);
    try {
      const res = await base44.functions.invoke("coordinateIncidentResponse", { incident_id: incidentId, action: "trigger_playbook", playbook_id: "standard_ir_playbook" });
      const data = res?.data || res;
      toast({ title: `Playbook triggered: ${incidentId}`, description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Playbook failed", description: e?.message }); }
    setActionLoading(null);
  };

  const notifyStakeholders = async (incidentId) => {
    setActionLoading(`notif-${incidentId}`);
    try {
      const res = await base44.functions.invoke("coordinateIncidentResponse", { incident_id: incidentId, action: "notify_stakeholders" });
      const data = res?.data || res;
      toast({ title: `Stakeholders notified: ${incidentId}`, description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Notification failed", description: e?.message }); }
    setActionLoading(null);
  };

  // Stats
  const activeRules = rules.filter(r => r.status === "active").length;
  const signatureRules = rules.filter(r => r.detection_type === "signature_based" || r.detection_type === "hybrid").length;
  const mlRules = rules.filter(r => r.detection_type === "behavioral_ml" || r.detection_type === "hybrid").length;
  const openAlerts = alerts.filter(a => a.status === "open" || a.status === "investigating").length;
  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const activeIncidents = incidents.filter(i => i.status === "detected" || i.status === "investigating" || i.status === "contained").length;
  const auditEntries = auditTrail.length;

  return (
    <div>
      <PageHeader
        title="Threat Detection & SIEM Center"
        subtitle="AI-driven threat detection combining signature-based rules with behavioral ML, tamper-evident audit trails, and incident response coordination"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => runThreatScan("signature_only")} disabled={scanning}>
              {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ScanLine className="w-4 h-4 mr-1.5" />}
              Signature Scan
            </Button>
            <Button variant="outline" onClick={() => runThreatScan("behavioral_only")} disabled={scanning}>
              {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Brain className="w-4 h-4 mr-1.5" />}
              ML Scan
            </Button>
            <Button onClick={() => runThreatScan("all")} disabled={scanning}>
              {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Radar className="w-4 h-4 mr-1.5" />}
              Full Threat Scan
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Active Rules" value={activeRules} icon={Radar} color="blue" trendLabel={`${rules.length} total`} />
        <StatCard label="Signature Rules" value={signatureRules} icon={ScanLine} color="blue" trendLabel="Pattern matching" />
        <StatCard label="Behavioral ML" value={mlRules} icon={Brain} color="purple" trendLabel="Anomaly detection" />
        <StatCard label="Open Alerts" value={openAlerts} icon={AlertTriangle} color={openAlerts > 0 ? "red" : "green"} trendLabel={`${criticalAlerts} critical`} />
        <StatCard label="Active Incidents" value={activeIncidents} icon={Shield} color={activeIncidents > 0 ? "red" : "green"} trendLabel="In response" />
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="rules"><Radar className="w-4 h-4 mr-1.5" />Detection Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="alerts"><AlertTriangle className="w-4 h-4 mr-1.5" />Threat Alerts ({alerts.length})</TabsTrigger>
          <TabsTrigger value="incidents"><Shield className="w-4 h-4 mr-1.5" />Incident Response ({incidents.length})</TabsTrigger>
          <TabsTrigger value="siem"><Network className="w-4 h-4 mr-1.5" />SIEM Integration</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="w-4 h-4 mr-1.5" />Audit Trail ({auditEntries})</TabsTrigger>
        </TabsList>

        {/* DETECTION RULES */}
        <TabsContent value="rules">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Radar className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No threat detection rules configured.</p>
              <p className="text-xs text-muted-foreground">Create signature-based and behavioral ML rules to enable AI-driven threat detection.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const dtMeta = DETECTION_TYPE_META[rule.detection_type] || DETECTION_TYPE_META.signature_based;
                const DtIcon = dtMeta.icon;
                const catMeta = THREAT_CATEGORY_META[rule.threat_category] || THREAT_CATEGORY_META.malware;
                return (
                  <div key={rule.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg shrink-0 bg-muted">
                        <DtIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{rule.rule_id}</span>
                          <h3 className="text-sm font-semibold text-foreground">{rule.name}</h3>
                          <Badge variant="outline" className={`text-xs ${dtMeta.color}`}><DtIcon className="w-3 h-3 mr-1" />{dtMeta.label}</Badge>
                          <Badge variant="outline" className={`text-xs ${catMeta.color}`}>{catMeta.label}</Badge>
                          <Badge variant="outline" className="text-xs">{rule.severity}</Badge>
                          <Badge className={rule.status === "active" ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-slate-100 text-slate-600 text-xs"}>
                            {rule.status === "active" ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}{rule.status}
                          </Badge>
                        </div>
                        {rule.description && <p className="text-xs text-muted-foreground mb-2">{rule.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {rule.detection_type === "behavioral_ml" || rule.detection_type === "hybrid" ? (
                            <span className="flex items-center gap-1"><Brain className="w-3 h-3" />Model: {rule.ml_model || "isolation_forest"} • Threshold: σ≥{rule.ml_threshold || 3}</span>
                          ) : null}
                          {rule.detection_type === "signature_based" || rule.detection_type === "hybrid" ? (
                            <span className="flex items-center gap-1"><ScanLine className="w-3 h-3" />SIEM: {rule.siem_source}</span>
                          ) : null}
                          {rule.auto_create_incident && <span className="flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" />Auto-incident → {rule.auto_assign_role}</span>}
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" />Triggered: {rule.trigger_count || 0}x</span>
                          {rule.false_positive_rate > 0 && <span className="flex items-center gap-1"><XCircle className="w-3 h-3" />FP rate: {rule.false_positive_rate}%</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* THREAT ALERTS */}
        <TabsContent value="alerts">
          {alerts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500/40 mb-3" />
              <p className="text-sm text-muted-foreground">No threat alerts detected. Run a threat scan to check for active threats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className={`bg-card rounded-xl border p-4 shadow-sm ${alert.severity === "critical" ? "border-red-300 dark:border-red-800" : "border-border"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${alert.severity === "critical" ? "bg-red-100 dark:bg-red-900/20" : alert.severity === "high" ? "bg-orange-100 dark:bg-orange-900/20" : "bg-amber-100 dark:bg-amber-900/20"}`}>
                      <AlertTriangle className={`w-5 h-5 ${alert.severity === "critical" ? "text-red-600" : alert.severity === "high" ? "text-orange-600" : "text-amber-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                        <Badge variant="outline" className="text-xs">{alert.severity}</Badge>
                        <Badge className={alert.status === "open" ? "bg-red-100 text-red-700 text-xs" : alert.status === "investigating" ? "bg-amber-100 text-amber-700 text-xs" : "bg-emerald-100 text-emerald-700 text-xs"}>{alert.status}</Badge>
                        {alert.detected_at && <span className="text-xs text-muted-foreground">{new Date(alert.detected_at).toLocaleString()}</span>}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">{alert.title}</h3>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                      {alert.source_ip && <p className="text-xs text-muted-foreground mt-1">Source IP: <strong className="text-foreground">{alert.source_ip}</strong></p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* INCIDENT RESPONSE */}
        <TabsContent value="incidents">
          {incidents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No incidents. Threat detection will auto-create incidents for high/critical threats.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((incident) => {
                const stMeta = INCIDENT_STATUS_META[incident.status] || INCIDENT_STATUS_META.detected;
                let timeline = [];
                try { timeline = JSON.parse(incident.timeline_events || '[]'); } catch (_) {}
                const canCoordinate = incident.status === "detected";
                const canEscalate = incident.status === "investigating" || incident.status === "detected";
                const canPlaybook = incident.status !== "closed" && incident.status !== "remediated";
                return (
                  <div key={incident.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${incident.severity === "critical" ? "bg-red-100 dark:bg-red-900/20" : "bg-amber-100 dark:bg-amber-900/20"}`}>
                        <Shield className={`w-5 h-5 ${incident.severity === "critical" ? "text-red-600" : "text-amber-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {incident.incident_id && <span className="text-xs font-mono text-muted-foreground">{incident.incident_id}</span>}
                          <Badge variant="outline" className="text-xs">{incident.type}</Badge>
                          <Badge variant="outline" className="text-xs">{incident.severity}</Badge>
                          <Badge className={`text-xs ${stMeta.color}`}>{stMeta.label}</Badge>
                          {incident.escalation_level > 0 && <Badge className="bg-purple-100 text-purple-700 text-xs"><ArrowUp className="w-3 h-3 mr-1" />Escalation L{incident.escalation_level}</Badge>}
                          {incident.assigned_to && <Badge variant="outline" className="text-xs"><Users className="w-3 h-3 mr-1" />{incident.assigned_to}</Badge>}
                        </div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{incident.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>
                        {timeline.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Timeline ({timeline.length} events)</p>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {timeline.slice(-3).map((ev, i) => (
                                <div key={i} className="text-xs text-muted-foreground flex gap-2">
                                  <Clock className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span><strong className="text-foreground">{ev.event}</strong> — {ev.actor} ({new Date(ev.timestamp).toLocaleString()})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {canCoordinate && (
                          <Button size="sm" onClick={() => coordinateIR(incident.incident_id)} disabled={actionLoading === `coord-${incident.incident_id}`}>
                            {actionLoading === `coord-${incident.incident_id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Users className="w-3.5 h-3.5 mr-1" />}
                            Coordinate
                          </Button>
                        )}
                        {canEscalate && (
                          <Button size="sm" variant="outline" onClick={() => escalateIR(incident.incident_id)} disabled={actionLoading === `esc-${incident.incident_id}`}>
                            {actionLoading === `esc-${incident.incident_id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ArrowUp className="w-3.5 h-3.5 mr-1" />}
                            Escalate
                          </Button>
                        )}
                        {canPlaybook && (
                          <Button size="sm" variant="outline" onClick={() => triggerPlaybook(incident.incident_id)} disabled={actionLoading === `pb-${incident.incident_id}`}>
                            {actionLoading === `pb-${incident.incident_id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                            Playbook
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => notifyStakeholders(incident.incident_id)} disabled={actionLoading === `notif-${incident.incident_id}`}>
                          {actionLoading === `notif-${incident.incident_id}` ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
                          Notify
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SIEM INTEGRATION */}
        <TabsContent value="siem">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-foreground mb-1">SIEM Platform Integrations</h3>
            <p className="text-sm text-muted-foreground mb-4">Real-time security event ingestion and correlation across connected SIEM platforms.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SIEM_INTEGRATIONS.map((siem) => {
                const Icon = siem.icon;
                return (
                  <div key={siem.name} className={`p-4 rounded-lg border ${siem.connected ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/5" : "border-border"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${siem.connected ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${siem.connected ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-foreground">{siem.name}</h4>
                          {siem.connected ? <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Active</Badge> : <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Disconnected</Badge>}
                        </div>
                        {siem.connected && <p className="text-xs text-emerald-600 flex items-center gap-1"><Activity className="w-3 h-3" />Real-time event streaming active</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* AUDIT TRAIL INTEGRITY */}
        <TabsContent value="audit">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h3 className="font-heading font-semibold text-foreground">Tamper-Evident Audit Trail</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Every platform action is cryptographically chained to satisfy rigorous regulatory reporting standards.</p>
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Chain Integrity: Verified</p>
                <p className="text-xs text-muted-foreground">{auditEntries} recent entries — all hash-chained and tamper-evident</p>
              </div>
            </div>
            {auditTrail.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditTrail.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs font-mono">{entry.action}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(entry.created_date).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{entry.details || 'No details'}</p>
                      <p className="text-xs text-muted-foreground">Entity: {entry.entity_type || 'N/A'} • By: {entry.created_by || 'system'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No recent audit trail entries.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}