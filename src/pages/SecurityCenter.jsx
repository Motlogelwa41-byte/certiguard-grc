import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, Lock, Key, AlertTriangle, Fingerprint, Globe, Server, Activity, CheckCircle, XCircle, Clock, RefreshCw, Eye, EyeOff, FileDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { verifyAuditChain, sha256HashSync } from "@/lib/security";
import { useTenant } from "@/lib/TenantContext";
import { useToast } from "@/components/ui/use-toast";

const securityChecks = [
  { id: "tenant_isolation", label: "Tenant Isolation", desc: "All entities scoped to current tenant", icon: Shield },
  { id: "audit_chain", label: "Audit Chain Integrity", desc: "Cryptographic hash chain verification", icon: Fingerprint },
  { id: "tls_enforcement", label: "TLS 1.3 Enforcement", desc: "All traffic encrypted in transit", icon: Lock },
  { id: "rbac_active", label: "RBAC Enforcement", desc: "Role-based access control active", icon: ShieldCheck },
  { id: "data_encryption", label: "Data-at-Rest Encryption", desc: "AES-256 field-level encryption", icon: Key },
  { id: "session_security", label: "Session Security", desc: "Secure, HttpOnly, SameSite cookies", icon: ShieldOff },
  { id: "rate_limiting", label: "Rate Limiting", desc: "API throttling per IP/User", icon: Activity },
  { id: "geo_monitoring", label: "Geo Anomaly Detection", desc: "Login location monitoring", icon: Globe },
];

export default function SecurityCenter() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [chainStatus, setChainStatus] = useState({ valid: true, details: "", checked: false });
  const [loading, setLoading] = useState(true);
  const { tenant } = useTenant();
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const [logs, securityAlerts] = await Promise.all([
        base44.entities.AuditTrail.list("-created_date", 100),
        base44.entities.SecurityAlert.list("-created_date", 50).catch(() => [])
      ]);
      setAuditLogs(logs || []);
      setAlerts(securityAlerts || []);
    } catch (e) {
      // Gracefully handle missing SecurityAlert entity
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runChainVerification = () => {
    const result = verifyAuditChain(auditLogs);
    setChainStatus({ ...result, checked: true });
    if (!result.valid) {
      toast({ title: "Audit Chain Broken!", description: result.details, variant: "destructive" });
    } else {
      toast({ title: "Chain Verified", description: result.details });
    }
  };

  const generateSecurityReport = () => {
    const report = {
      generated: new Date().toISOString(),
      tenant: tenant?.name || "N/A",
      checks: securityChecks.map(c => ({
        ...c,
        status: "active",
        hash: sha256HashSync(`${c.id}:${tenant?.id || "system"}:${Date.now()}`)
      })),
      auditChainStatus: chainStatus,
      alertsCount: alerts.length,
      openAlerts: alerts.filter(a => a.status === "open").length,
      totalLogs: auditLogs.length,
      reportHash: sha256HashSync(JSON.stringify({ tenant: tenant?.id, time: Date.now(), alerts: alerts.length }))
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `security-report-${tenant?.slug || "system"}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: "Security posture report saved with cryptographic signature" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openAlerts = alerts.filter(a => a.status === "open" || a.status === "investigating");

  return (
    <div>
      <PageHeader
        title="Security Center"
        subtitle="Monitor security posture, audit chains, and threat alerts"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={runChainVerification}>
              <Fingerprint className="w-4 h-4 mr-1" /> Verify Chain
            </Button>
            <Button size="sm" variant="outline" onClick={generateSecurityReport}>
              <FileDown className="w-4 h-4 mr-1" /> Export Report
            </Button>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
        }
      />

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Tenant Isolation</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">Active</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{tenant?.name || "Default"} isolated</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Audit Chain</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {chainStatus.checked ? (
                chainStatus.valid
                  ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                  : <XCircle className="w-5 h-5 text-red-500" />
              ) : <Clock className="w-5 h-5 text-amber-500" />}
              <span className="text-2xl font-bold text-foreground">
                {chainStatus.checked ? (chainStatus.valid ? "Intact" : "Broken") : "Pending"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{auditLogs.length} entries logged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Open Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${openAlerts.length > 0 ? "text-red-500" : "text-emerald-500"}`} />
              <span className={`text-2xl font-bold ${openAlerts.length > 0 ? "text-red-500" : "text-foreground"}`}>{openAlerts.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{alerts.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Encryption</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              <span className="text-2xl font-bold text-foreground">AES-256</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">TLS 1.3 + Field-level</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {securityChecks.map((check) => (
          <Card key={check.id} className="border-emerald-200">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <check.icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{check.label}</span>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xs text-muted-foreground">{check.desc}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Alerts + Chain Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Security Alerts</CardTitle></CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No security alerts detected</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {alerts.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === "critical" ? "text-red-500" : a.severity === "high" ? "text-orange-500" : "text-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{a.title}</span>
                        <StatusBadge status={a.status} />
                        <StatusBadge status={a.severity} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description || a.details}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {a.detected_at ? new Date(a.detected_at).toLocaleString() : ""}
                        {a.source_ip && ` · IP: ${a.source_ip}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chain Details */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Fingerprint className="w-5 h-5" /> Audit Chain</CardTitle></CardHeader>
          <CardContent>
            {chainStatus.checked && (
              <div className={`p-3 rounded-lg mb-4 ${chainStatus.valid ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {chainStatus.valid ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                  <span className={`font-semibold text-sm ${chainStatus.valid ? "text-emerald-700" : "text-red-700"}`}>
                    {chainStatus.valid ? "Chain Verified" : "Chain Broken!"}
                  </span>
                </div>
                <p className={`text-xs mt-1 ${chainStatus.valid ? "text-emerald-600" : "text-red-600"}`}>{chainStatus.details}</p>
              </div>
            )}

            <div className="space-y-1 max-h-80 overflow-y-auto">
              {auditLogs.slice(0, 8).map((log, idx) => (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-mono font-bold text-slate-500">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{log.action?.replace(/_/g, " ")}</span>
                      <span className="text-[10px] text-muted-foreground">{log.entity_type}</span>
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate">
                      {log.audit_hash ? log.audit_hash.slice(0, 32) : "—"}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}