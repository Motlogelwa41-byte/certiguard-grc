import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, Loader2, RefreshCw, ShieldAlert, ExternalLink, Building2,
  Search, Activity, Eye, CheckCircle2, XCircle
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const INCIDENT_TYPE_META = {
  data_breach: { label: "Data Breach", color: "bg-red-100 text-red-700" },
  ransomware: { label: "Ransomware", color: "bg-red-100 text-red-700" },
  outage: { label: "Outage", color: "bg-amber-100 text-amber-700" },
  vulnerability_disclosure: { label: "Vulnerability", color: "bg-orange-100 text-orange-700" },
  rating_downgrade: { label: "Rating Downgrade", color: "bg-amber-100 text-amber-700" },
  supply_chain_attack: { label: "Supply Chain", color: "bg-red-100 text-red-700" },
  insider_threat: { label: "Insider Threat", color: "bg-purple-100 text-purple-700" },
  regulatory_action: { label: "Regulatory", color: "bg-blue-100 text-blue-700" },
  other: { label: "Other", color: "bg-slate-100 text-slate-600" },
};

const SEVERITY_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700", info: "bg-slate-100 text-slate-600",
};

const EXPOSURE_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700", none: "bg-slate-100 text-slate-600",
};

export default function VendorIncidentMonitor() {
  const { toast } = useToast();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.VendorIncident.list("-detected_date", 100).catch(() => []);
      setIncidents(data || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("monitorVendorIncidents", {});
      const data = res?.data || res;
      toast({ title: "Vendor incident scan completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Scan failed", description: e?.message }); }
    setScanning(false);
  };

  const highExposure = incidents.filter(i => i.our_exposure_level === "high" || i.our_exposure_level === "critical");
  const openIncidents = incidents.filter(i => i.status === "detected" || i.status === "investigating");
  const criticalSeverity = incidents.filter(i => i.severity === "critical" || i.severity === "high");
  const alertsSent = incidents.filter(i => i.alert_sent);

  return (
    <div>
      <PageHeader
        title="Vendor Incident & Breach Monitor"
        subtitle="Continuous third-party monitoring — scans for publicly reported vendor breaches, security incidents, and rating changes. Alerts you in real-time when a vendor you depend on suffers an incident."
        actions={
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
            Run Incident Scan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Incidents" value={incidents.length} icon={AlertTriangle} color="blue" trendLabel="Detected" />
        <StatCard label="High Exposure" value={highExposure.length} icon={ShieldAlert} color={highExposure.length > 0 ? "red" : "green"} trendLabel="Our risk" />
        <StatCard label="Open" value={openIncidents.length} icon={Activity} color={openIncidents.length > 0 ? "amber" : "green"} trendLabel="Need action" />
        <StatCard label="Critical/High" value={criticalSeverity.length} icon={AlertTriangle} color={criticalSeverity.length > 0 ? "red" : "green"} trendLabel="Severity" />
        <StatCard label="Alerts Sent" value={alertsSent.length} icon={ShieldAlert} color="purple" trendLabel="Notified" />
      </div>

      <Tabs defaultValue="high" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="high"><ShieldAlert className="w-4 h-4 mr-1.5" />High Exposure ({highExposure.length})</TabsTrigger>
          <TabsTrigger value="open"><Activity className="w-4 h-4 mr-1.5" />Open ({openIncidents.length})</TabsTrigger>
          <TabsTrigger value="all"><AlertTriangle className="w-4 h-4 mr-1.5" />All ({incidents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="high">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {highExposure.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No high-exposure incidents" desc="Run a scan to check vendors for publicly reported breaches and incidents." />
              ) : (
                highExposure.map((inc) => <IncidentCard key={inc.id} incident={inc} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="open">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {openIncidents.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No open incidents" desc="All detected vendor incidents have been remediated or closed." />
              ) : (
                openIncidents.map((inc) => <IncidentCard key={inc.id} incident={inc} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {incidents.length === 0 ? (
                <EmptyState icon={Search} title="No incidents detected" desc="Run a vendor incident scan to check your vendor inventory for publicly reported breaches and security incidents." />
              ) : (
                incidents.map((inc) => <IncidentCard key={inc.id} incident={inc} />)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IncidentCard({ incident }) {
  const typeMeta = INCIDENT_TYPE_META[incident.incident_type] || INCIDENT_TYPE_META.other;
  let affectedServices = [];
  try { affectedServices = JSON.parse(incident.affected_services || '[]'); } catch (_) {}
  let dataTypes = [];
  try { dataTypes = JSON.parse(incident.data_types_affected || '[]'); } catch (_) {}
  let actions = [];
  try { actions = JSON.parse(incident.recommended_actions || '[]'); } catch (_) {}

  return (
    <div className={`bg-card rounded-xl border p-4 shadow-sm ${incident.our_exposure_level === "critical" || incident.our_exposure_level === "high" ? 'border-red-200 dark:border-red-800' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${typeMeta.color}`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">{incident.incident_id}</span>
            <h3 className="text-sm font-semibold text-foreground">{incident.title}</h3>
            <Badge className={`text-xs ${typeMeta.color}`}>{typeMeta.label}</Badge>
            <Badge className={`text-xs ${SEVERITY_COLOR[incident.severity] || SEVERITY_COLOR.medium}`}>Severity: {incident.severity}</Badge>
            <Badge className={`text-xs ${EXPOSURE_COLOR[incident.our_exposure_level] || EXPOSURE_COLOR.low}`}>Our Exposure: {incident.our_exposure_level}</Badge>
            <Badge variant="outline" className="text-xs">{incident.status}</Badge>
            {incident.alert_sent && <Badge className="bg-purple-100 text-purple-700 text-xs"><ShieldAlert className="w-3 h-3 mr-1" />Alert Sent</Badge>}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{incident.vendor_name}</span>
            {incident.vendor_website && <a href={incident.vendor_website} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{incident.vendor_website}</a>}
          </div>
          <p className="text-xs text-muted-foreground mb-2">{incident.description}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
            {incident.reported_date && <span>Reported: <strong className="text-foreground">{incident.reported_date}</strong></span>}
            {incident.detected_date && <span>Detected: <strong className="text-foreground">{new Date(incident.detected_date).toLocaleDateString()}</strong></span>}
            {incident.source_name && <span>Source: <strong className="text-foreground">{incident.source_name}</strong></span>}
          </div>
          {incident.source_url && (
            <a href={incident.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mb-2">
              <ExternalLink className="w-3 h-3" />View source report
            </a>
          )}
          {affectedServices.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Affected Services</p>
              <div className="flex flex-wrap gap-1.5">
                {affectedServices.map((s, i) => <Badge key={i} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
            </div>
          )}
          {dataTypes.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Data Types Affected</p>
              <div className="flex flex-wrap gap-1.5">
                {dataTypes.map((d, i) => <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200">{d}</Badge>)}
              </div>
            </div>
          )}
          {incident.exposure_assessment && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-amber-600 mb-1">Our Exposure Assessment</p>
              <p className="text-xs text-muted-foreground">{incident.exposure_assessment}</p>
            </div>
          )}
          {actions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Recommended Actions</p>
              <div className="space-y-1">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`font-mono ${a.priority === "critical" ? "text-red-600" : a.priority === "high" ? "text-orange-600" : "text-muted-foreground"}`}>[{a.priority}]</span>
                    <span className="text-foreground">{a.action}</span>
                    <span className="text-muted-foreground">— {a.owner}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{desc}</p>
    </div>
  );
}