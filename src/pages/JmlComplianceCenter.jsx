import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus, UserMinus, RefreshCw, AlertTriangle, ShieldCheck,
  Loader2, UserCog, Clock, CheckCircle2, XCircle, Activity, FileText, Wrench
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const EVENT_META = {
  joiner: { label: "Joiner", icon: UserPlus, color: "bg-blue-100 text-blue-700", desc: "New employee onboarded" },
  mover: { label: "Mover", icon: UserCog, color: "bg-amber-100 text-amber-700", desc: "Department or title changed" },
  leaver: { label: "Leaver", icon: UserMinus, color: "bg-red-100 text-red-700", desc: "Employee terminated or suspended" },
};

const RISK_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700", none: "bg-slate-100 text-slate-600",
};

export default function JmlComplianceCenter() {
  const { toast } = useToast();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.JmlEvent.list("-detected_at", 100).catch(() => []);
      setEvents(data || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("processJmlEvents", {});
      const data = res?.data || res;
      toast({ title: "JML scan completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Scan failed", description: e?.message }); }
    setScanning(false);
  };

  const joiners = events.filter(e => e.event_type === "joiner");
  const movers = events.filter(e => e.event_type === "mover");
  const leavers = events.filter(e => e.event_type === "leaver");
  const riskyAccounts = events.filter(e => e.access_risk_flagged);
  const openRisks = events.filter(e => e.status === "detected" || e.status === "investigating");

  return (
    <div>
      <PageHeader
        title="Joiner/Mover/Leaver Compliance Center"
        subtitle="Automated JML compliance controls — access provisioning, de-provisioning, and access drift detection driven by HRIS/IdP integration"
        actions={
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Run JML Scan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Joiners" value={joiners.length} icon={UserPlus} color="blue" trendLabel="New hires" />
        <StatCard label="Movers" value={movers.length} icon={UserCog} color="amber" trendLabel="Dept/title changes" />
        <StatCard label="Leavers" value={leavers.length} icon={UserMinus} color="red" trendLabel="Terminated" />
        <StatCard label="Risky Accounts" value={riskyAccounts.length} icon={AlertTriangle} color={riskyAccounts.length > 0 ? "red" : "green"} trendLabel="Access risk flagged" />
        <StatCard label="Open Risks" value={openRisks.length} icon={ShieldCheck} color={openRisks.length > 0 ? "amber" : "green"} trendLabel="Need remediation" />
      </div>

      <Tabs defaultValue="risky" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="risky"><AlertTriangle className="w-4 h-4 mr-1.5" />Risky Accounts ({riskyAccounts.length})</TabsTrigger>
          <TabsTrigger value="joiners"><UserPlus className="w-4 h-4 mr-1.5" />Joiners ({joiners.length})</TabsTrigger>
          <TabsTrigger value="movers"><UserCog className="w-4 h-4 mr-1.5" />Movers ({movers.length})</TabsTrigger>
          <TabsTrigger value="leavers"><UserMinus className="w-4 h-4 mr-1.5" />Leavers ({leavers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="risky">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {riskyAccounts.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No risky accounts" desc="JML scan will flag former employees with active access and movers with stale department access." />
              ) : (
                riskyAccounts.map((event) => <JmlEventCard key={event.id} event={event} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="joiners">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {joiners.length === 0 ? (
                <EmptyState icon={UserPlus} title="No joiners detected" desc="New employees will appear here after HRIS sync detects them." />
              ) : (
                joiners.map((event) => <JmlEventCard key={event.id} event={event} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="movers">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {movers.length === 0 ? (
                <EmptyState icon={UserCog} title="No movers detected" desc="Employees who change department or title will appear here for access drift verification." />
              ) : (
                movers.map((event) => <JmlEventCard key={event.id} event={event} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leavers">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {leavers.length === 0 ? (
                <EmptyState icon={UserMinus} title="No leavers detected" desc="Terminated employees will appear here for de-provisioning verification." />
              ) : (
                leavers.map((event) => <JmlEventCard key={event.id} event={event} />)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JmlEventCard({ event }) {
  const meta = EVENT_META[event.event_type] || EVENT_META.joiner;
  const Icon = meta.icon;
  let staleSystems = [];
  try { staleSystems = JSON.parse(event.access_stale_systems || '[]'); } catch (_) {}

  return (
    <div className={`bg-card rounded-xl border p-4 shadow-sm ${event.access_risk_flagged ? 'border-red-200 dark:border-red-800' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${meta.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">{event.event_id}</span>
            <h3 className="text-sm font-semibold text-foreground">{event.user_name || event.user_email}</h3>
            <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
            {event.access_risk_flagged && <Badge className="bg-red-100 text-red-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Access Risk</Badge>}
            <Badge className={`text-xs ${RISK_COLOR[event.risk_level] || RISK_COLOR.none}`}>{event.risk_level}</Badge>
            <Badge variant="outline" className="text-xs">{event.status}</Badge>
            {event.evidence_collected && <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Evidence</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mb-2">{event.risk_reason}</p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {event.user_email && <span>Email: <strong className="text-foreground">{event.user_email}</strong></span>}
            {event.new_department && <span>Dept: <strong className="text-foreground">{event.new_department}</strong></span>}
            {event.new_title && <span>Title: <strong className="text-foreground">{event.new_title}</strong></span>}
            {event.previous_department && event.new_department && event.previous_department !== event.new_department && (
              <span>Move: <strong className="text-foreground">{event.previous_department} → {event.new_department}</strong></span>
            )}
            {event.detected_at && <span>Detected: <strong className="text-foreground">{new Date(event.detected_at).toLocaleString()}</strong></span>}
            {event.source && <span>Source: <strong className="text-foreground">{event.source.replace(/_/g, ' ')}</strong></span>}
          </div>
          {staleSystems.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-red-600 mb-1">Stale Access ({staleSystems.length} systems)</p>
              <div className="flex flex-wrap gap-1.5">
                {staleSystems.map((s, i) => (
                  <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200">{s.system}: {s.access_level || 'access'}</Badge>
                ))}
              </div>
            </div>
          )}
          {(event.security_alert_id || event.remediation_item_id) && (
            <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs">
              {event.security_alert_id && <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3 h-3" />Security Alert Created</span>}
              {event.remediation_item_id && <span className="flex items-center gap-1 text-red-600"><Wrench className="w-3 h-3" />Remediation Item Created</span>}
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