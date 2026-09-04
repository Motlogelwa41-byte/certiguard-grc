import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Network, Loader2, RefreshCw, AlertTriangle, ShieldCheck, Building2,
  CheckCircle2, XCircle, Eye, Globe, ScanLine, Layers
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const RISK_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700",
};

const COMPLIANCE_META = {
  compliant: { label: "Compliant", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  non_compliant: { label: "Non-Compliant", color: "bg-red-100 text-red-700", icon: XCircle },
  pending_review: { label: "Pending Review", color: "bg-amber-100 text-amber-700", icon: Eye },
  unknown: { label: "Unknown", color: "bg-slate-100 text-slate-600", icon: Eye },
};

const CHANGE_META = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  modified: { label: "Modified", color: "bg-amber-100 text-amber-700" },
  removed: { label: "Removed", color: "bg-red-100 text-red-700" },
  none: { label: "Stable", color: "bg-slate-100 text-slate-600" },
};

export default function SubprocessorTracking() {
  const { toast } = useToast();
  const [subprocessors, setSubprocessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Subprocessor.list("-risk_score", 200).catch(() => []);
      setSubprocessors(data || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("monitorSubprocessors", {});
      const data = res?.data || res;
      toast({ title: "Subprocessor scan completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Scan failed", description: e?.message }); }
    setScanning(false);
  };

  const approveSubprocessor = async (id) => {
    try {
      await base44.entities.Subprocessor.update(id, { approved: true, approved_at: new Date().toISOString(), compliance_status: "compliant" });
      toast({ title: "Subprocessor approved" });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Approve failed", description: e?.message }); }
  };

  const activeSubs = subprocessors.filter(s => s.monitoring_status === "active");
  const unapproved = activeSubs.filter(s => !s.approved);
  const highRisk = activeSubs.filter(s => s.risk_level === "high" || s.risk_level === "critical");
  const changes = activeSubs.filter(s => s.change_detected && s.change_type !== "none");

  return (
    <div>
      <PageHeader
        title="Fourth-Party Risk (Subprocessor) Tracking"
        subtitle="Track your vendors' subprocessors (fourth parties), monitor their compliance status, and get alerted when a vendor adds a new subprocessor"
        actions={
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ScanLine className="w-4 h-4 mr-1.5" />}
            Run Subprocessor Scan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Subprocessors" value={activeSubs.length} icon={Network} color="blue" trendLabel="Active fourth parties" />
        <StatCard label="Unapproved" value={unapproved.length} icon={AlertTriangle} color={unapproved.length > 0 ? "amber" : "green"} trendLabel="Need approval" />
        <StatCard label="High Risk" value={highRisk.length} icon={ShieldCheck} color={highRisk.length > 0 ? "red" : "green"} trendLabel="Critical exposure" />
        <StatCard label="Changes Detected" value={changes.length} icon={RefreshCw} color={changes.length > 0 ? "amber" : "green"} trendLabel="New/modified" />
        <StatCard label="Vendors Covered" value={new Set(activeSubs.map(s => s.vendor_id)).size} icon={Building2} color="purple" trendLabel="With subprocessors" />
      </div>

      <Tabs defaultValue="unapproved" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="unapproved"><AlertTriangle className="w-4 h-4 mr-1.5" />Unapproved ({unapproved.length})</TabsTrigger>
          <TabsTrigger value="highrisk"><ShieldCheck className="w-4 h-4 mr-1.5" />High Risk ({highRisk.length})</TabsTrigger>
          <TabsTrigger value="changes"><RefreshCw className="w-4 h-4 mr-1.5" />Changes ({changes.length})</TabsTrigger>
          <TabsTrigger value="all"><Network className="w-4 h-4 mr-1.5" />All ({activeSubs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unapproved">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {unapproved.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="All subprocessors approved" desc="Run a scan to detect new unapproved subprocessors added by your vendors." />
              ) : (
                unapproved.map((sub) => <SubprocessorCard key={sub.id} sub={sub} onApprove={approveSubprocessor} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="highrisk">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {highRisk.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No high-risk subprocessors" desc="High-risk fourth parties will appear here when detected." />
              ) : (
                highRisk.map((sub) => <SubprocessorCard key={sub.id} sub={sub} onApprove={approveSubprocessor} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="changes">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {changes.length === 0 ? (
                <EmptyState icon={RefreshCw} title="No changes detected" desc="New, modified, or removed subprocessors will appear here after a scan." />
              ) : (
                changes.map((sub) => <SubprocessorCard key={sub.id} sub={sub} onApprove={approveSubprocessor} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {activeSubs.length === 0 ? (
                <EmptyState icon={Network} title="No subprocessors tracked" desc="Run a scan to sync subprocessors from your vendor contracts." />
              ) : (
                activeSubs.map((sub) => <SubprocessorCard key={sub.id} sub={sub} onApprove={approveSubprocessor} />)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SubprocessorCard({ sub, onApprove }) {
  const riskColor = RISK_COLOR[sub.risk_level] || RISK_COLOR.medium;
  const compMeta = COMPLIANCE_META[sub.compliance_status] || COMPLIANCE_META.unknown;
  const CompIcon = compMeta.icon;
  const changeMeta = CHANGE_META[sub.change_type] || CHANGE_META.none;
  let riskFactors = [];
  try { riskFactors = JSON.parse(sub.risk_factors || '[]'); } catch (_) {}
  let dataTypes = [];
  try { dataTypes = JSON.parse(sub.data_types_processed || '[]'); } catch (_) {}

  return (
    <div className={`bg-card rounded-xl border p-4 shadow-sm ${!sub.approved ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg shrink-0 bg-purple-100 text-purple-700">
          <Layers className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">{sub.subprocessor_id}</span>
            <h3 className="text-sm font-semibold text-foreground">{sub.name}</h3>
            <Badge className={`text-xs ${riskColor}`}>{sub.risk_level} ({sub.risk_score}/100)</Badge>
            <Badge className={`text-xs ${compMeta.color}`}><CompIcon className="w-3 h-3 mr-1" />{compMeta.label}</Badge>
            {sub.change_detected && sub.change_type !== "none" && <Badge className={`text-xs ${changeMeta.color}`}>{changeMeta.label}</Badge>}
            {sub.approved ? (
              <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Unapproved</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">{sub.vendor_name}</span>
          </div>
          {sub.description && <p className="text-xs text-muted-foreground mb-2">{sub.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {sub.location && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{sub.location}</span>}
            <span>Data Access: <strong className="text-foreground">{sub.data_access_level?.replace(/_/g, ' ')}</strong></span>
            {sub.added_date && <span>Added: <strong className="text-foreground">{sub.added_date}</strong></span>}
            {sub.detected_date && <span>Detected: <strong className="text-foreground">{new Date(sub.detected_date).toLocaleDateString()}</strong></span>}
          </div>
          {dataTypes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {dataTypes.map((d, i) => <Badge key={i} variant="outline" className="text-xs">{d}</Badge>)}
            </div>
          )}
          {riskFactors.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Risk Factors</p>
              <div className="space-y-1">
                {riskFactors.map((f, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{f.factor}:</span> {f.detail}
                  </div>
                ))}
              </div>
            </div>
          )}
          {sub.security_alert_id && (
            <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />Security Alert Created
            </div>
          )}
          {!sub.approved && (
            <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => onApprove(sub.id)}>
              <CheckCircle2 className="w-3 h-3 mr-1" />Approve Subprocessor
            </Button>
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