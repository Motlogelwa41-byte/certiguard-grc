import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ShieldCheck, ShieldAlert, Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, FileLock2, KeyRound, Database, Lock, Fingerprint, ScrollText, FileScan } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const ISOLATION_CONTROLS = [
  { id: 1, title: "Database-Level RLS Enforcement", icon: Database, category: "Data Isolation", desc: "PostgreSQL Row-Level Security across every tenant-scoped table via app.current_tenant session variable." },
  { id: 2, title: "Session Middleware & Tenant Context", icon: Lock, category: "Auth", desc: "Cryptographic JWT validation with immutable tenant_id signature injected before route execution." },
  { id: 3, title: "Zero-Trust Connection Pooling", icon: RefreshCw, category: "Infra", desc: "Session state scrubbed (RESET ALL) after each transaction to prevent cross-tenant state bleeding." },
  { id: 4, title: "SHA-256 Immutable Audit Ledger", icon: ScrollText, category: "Audit", desc: "Append-only hash-chained audit log — each record linked to preceding hash for tamper detection." },
  { id: 5, title: "Object Storage Path Scoping", icon: FileLock2, category: "Data Isolation", desc: "Evidence files namespaced under tenants/{tenant_id}/secure_vault/ — no cross-tenant URL access." },
  { id: 6, title: "Granular RBAC/ABAC", icon: Fingerprint, category: "Auth", desc: "Roles and attributes bound to active tenant — admins cannot query outside their tenant_id." },
  { id: 7, title: "Recursive CTE Risk Aggregation", icon: Database, category: "Risk", desc: "Hierarchical risk rollups restricted to parent-subsidiary within same tenant group." },
  { id: 8, title: "Token-Bucket Rate-Limited API Gateway", icon: KeyRound, category: "API", desc: "Redis-backed per-tenant API key rate limiting to mitigate DoS and data extraction." },
  { id: 9, title: "ISO 31000 & COSO ERM Risk Engine", icon: Shield, category: "Risk", desc: "Deterministic ALE, SLE, and inherent-to-residual calculations per isolated tenant schema." },
  { id: 10, title: "Framework Version Locking", icon: Lock, category: "Compliance", desc: "Per-tenant regulatory framework version pinning without global update interference." },
  { id: 11, title: "MIME-Type Validation & Malware Scanning", icon: FileScan, category: "Security", desc: "Magic-byte file-signature verification and scanning middleware before storage commit." },
  { id: 12, title: "Nightly Compliance Readiness Jobs", icon: RefreshCw, category: "Automation", desc: "Background workers iterate tenants sequentially, resetting context per tenant." },
  { id: 13, title: "White-Label Theme Sandboxing", icon: Shield, category: "Branding", desc: "Per-tenant branding assets injected via sanitized CSS custom properties on verified login." },
  { id: 14, title: "GDPR/POPIA Data Retention & Purge", icon: ShieldAlert, category: "Privacy", desc: "Cryptographic tenant offboarding shred scripts for records, audit logs, and document stores." },
  { id: 15, title: "API Payload Schema Validation", icon: FileScan, category: "Security", desc: "Strict schema validation on all inbound API bodies, stripping unexpected fields." },
  { id: 16, title: "Multi-Currency Financial Scoping", icon: Database, category: "Risk", desc: "Currency conversion tables and financial risk metrics isolated per tenant operating environment." },
  { id: 17, title: "Session Invalidation & Token Revocation", icon: KeyRound, category: "Auth", desc: "Immediate JWT session termination across all devices on credential modification." },
  { id: 18, title: "Vendor & TPRM Boundary Controls", icon: Shield, category: "Third-Party", desc: "Vendor registers, assessments, and scoring bound to tenant_id — no portfolio leakage." },
  { id: 19, title: "Policy Waiver Dual-Authorization", icon: Fingerprint, category: "Governance", desc: "Dual sign-off from senior roles (CRO) within tenant before exceptions become active." },
  { id: 20, title: "Server-Side Report Generation Sandbox", icon: FileLock2, category: "Reporting", desc: "Document compilation in isolated memory with only tenant-filtered query results." },
  { id: 21, title: "Incident & Breach Notification Isolation", icon: ShieldAlert, category: "Security", desc: "Alert triggers verify recipient tenant affiliation before transmitting incident details." },
  { id: 22, title: "Control Review Task Dispatcher", icon: RefreshCw, category: "Automation", desc: "Background notification workers evaluate deadlines against local tenant timezones." },
  { id: 23, title: "Database Indexing & Query Optimization", icon: Database, category: "Infra", desc: "Composite indexing on (tenant_id, created_at) and (tenant_id, status) for sub-ms queries." },
  { id: 24, title: "Security Regression Test Suite", icon: ShieldCheck, category: "Security", desc: "Automated cross-tenant access attempt simulations verifying RLS blocks with 401/403." },
  { id: 25, title: "Centralized Security Health Monitor", icon: Shield, category: "Oversight", desc: "Consolidated dashboard with access-tier filters for multi-company advisory oversight." },
];

export default function TenantIsolationDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [rlsAudit, setRlsAudit] = useState(null);
  const [runningTest, setRunningTest] = useState(false);
  const [runningAudit, setRunningAudit] = useState(false);

  const runIsolationTests = async () => {
    setRunningTest(true);
    try {
      const res = await fetch('/api/functions/runTenantIsolationTests', { method: 'POST' });
      const data = await res.json();
      setTestResults(data);
      toast({ title: `Isolation tests complete — ${data.passed}/${data.total} passed` });
    } catch (e) {
      toast({ title: "Test execution failed", description: e.message, variant: "destructive" });
    } finally {
      setRunningTest(false);
    }
  };

  const runRlsAudit = async () => {
    setRunningAudit(true);
    try {
      const res = await fetch('/api/functions/auditEntityRls', { method: 'POST' });
      const data = await res.json();
      setRlsAudit(data);
      toast({ title: `RLS audit complete — ${data.passed}/${data.total_entities} entities pass` });
    } catch (e) {
      toast({ title: "RLS audit failed", description: e.message, variant: "destructive" });
    } finally {
      setRunningAudit(false);
    }
  };

  useEffect(() => {
    runIsolationTests();
    runRlsAudit();
  }, []);

  const testPassRate = testResults?.pass_rate ?? 0;
  const rlsPassRate = rlsAudit?.pass_rate ?? 0;
  const overallHealth = testResults && rlsAudit ? Math.round((testPassRate + rlsPassRate) / 2) : 0;

  return (
    <div>
      <PageHeader
        title="Tenant Isolation & Security Health"
        subtitle="25-point paramount professional GRC isolation control monitor"
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={runIsolationTests} disabled={runningTest}>
              {runningTest ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Run Isolation Tests
            </Button>
            <Button size="sm" variant="outline" onClick={runRlsAudit} disabled={runningAudit}>
              {runningAudit ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Database className="w-4 h-4 mr-1" />}
              Audit Entity RLS
            </Button>
          </div>
        }
      />

      {/* Overall Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Overall Isolation Health</span>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold">{overallHealth}%</div>
            <p className="text-xs text-slate-400 mt-1">{overallHealth >= 90 ? "Excellent" : overallHealth >= 70 ? "Needs attention" : "Critical"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Isolation Tests</span>
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{testResults ? `${testResults.passed}/${testResults.total}` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{testResults ? `${testResults.pass_rate}% pass rate` : "Running..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Entity RLS Audit</span>
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div className="text-2xl font-bold">{rlsAudit ? `${rlsAudit.passed}/${rlsAudit.total_entities}` : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{rlsAudit ? `${rlsAudit.pass_rate}% scoped` : "Running..."}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Critical Failures</span>
              <ShieldAlert className="w-4 h-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold text-destructive">
              {(testResults?.failed || 0) + (rlsAudit?.failed || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate remediation</p>
          </CardContent>
        </Card>
      </div>

      {/* 25 Control Matrix */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">25-Point Isolation Control Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ISOLATION_CONTROLS.map(ctrl => {
              const Icon = ctrl.icon;
              return (
                <div key={ctrl.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-muted-foreground">#{ctrl.id}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{ctrl.category}</Badge>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground leading-tight">{ctrl.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{ctrl.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Isolation Test Results */}
      {testResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Security Regression Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testResults.results?.map((test, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  {test.passed
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    : <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{test.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0">{test.category}</Badge>
                      <Badge variant={test.passed ? "secondary" : "destructive"} className="text-[10px] py-0">{test.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{test.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entity RLS Audit Results */}
      {rlsAudit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Entity RLS Audit ({rlsAudit.passed}/{rlsAudit.total_entities} passed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rlsAudit.audits?.filter(a => a.status !== 'pass').length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-destructive">Entities requiring attention:</p>
                {rlsAudit.audits.filter(a => a.status !== 'pass').map(a => (
                  <div key={a.entity_name} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/10">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{a.entity_name}</span>
                      <p className="text-xs text-muted-foreground">{a.issues.join('; ')}</p>
                    </div>
                    <Badge variant={a.status === 'fail' ? 'destructive' : 'secondary'} className="text-[10px]">{a.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-sm text-emerald-700 dark:text-emerald-400">All {rlsAudit.total_entities} tenant-scoped entities pass the RLS isolation audit.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}