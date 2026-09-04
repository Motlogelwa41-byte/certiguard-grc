import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, HeartPulse, FileCheck, AlertTriangle, Target, ListChecks,
  Upload, CheckCircle2, XCircle, Clock, TrendingDown, Zap, FileText,
  Database, ScrollText, FileSearch, ArrowRight, Activity
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const EVIDENCE_META = {
  policies: { label: "Policies", icon: FileText, color: "blue" },
  asset_inventories: { label: "Asset Inventories", icon: Database, color: "purple" },
  access_logs: { label: "Access Logs", icon: ScrollText, color: "amber" },
  audit_reports: { label: "Previous Audit Reports", icon: FileSearch, color: "emerald" },
};

const GRADE_META = {
  excellent: { label: "Excellent", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  good: { label: "Good", color: "bg-blue-100 text-blue-700 border-blue-200" },
  fair: { label: "Fair", color: "bg-amber-100 text-amber-700 border-amber-200" },
  poor: { label: "Poor", color: "bg-orange-100 text-orange-700 border-orange-200" },
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
};

const APPETITE_META = {
  within_tolerance: { label: "Within Tolerance", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  near_limit: { label: "Near Limit", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  breached: { label: "Breached", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const PRIORITY_META = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

export default function OnboardingHealthCheckDashboard() {
  const { toast } = useToast();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [latest, setLatest] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.OnboardingHealthCheck.list("-scan_started_at", 20).catch(() => []);
      setChecks(data || []);
      setLatest(data && data.length > 0 ? data[0] : null);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runHealthCheck = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("runOnboardingHealthCheck", {
        evidence_documents: [],
        risk_tolerance: 70,
      });
      const data = res?.data || res;
      toast({
        title: `Health check completed: ${data.check_id}`,
        description: `${data.frameworks_scanned} frameworks • ${data.total_findings} findings • ${data.poam_count} POA&M items • Score: ${data.overall_health_score}%`,
      });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Health check failed", description: e?.message }); }
    setRunning(false);
  };

  const parseJSON = (str, fallback) => {
    try { return JSON.parse(str || '[]'); } catch (_) { return fallback; }
  };

  const evidence = latest ? parseJSON(latest.evidence_ingestion, {}) : {};
  const frameworkResults = latest ? parseJSON(latest.framework_results, []) : [];
  const poamItems = latest ? parseJSON(latest.poam_items, []) : [];
  const recommendations = latest ? parseJSON(latest.recommendations, []) : [];

  return (
    <div>
      <PageHeader
        title="Onboarding Health Check & Compliance Scan"
        subtitle="Automated evidence ingestion, framework mapping, residual risk scoring, and POA&M generation"
        actions={
          <Button onClick={runHealthCheck} disabled={running}>
            {running ? <><Activity className="w-4 h-4 mr-1.5 animate-spin" />Running Scan...</> : <><Zap className="w-4 h-4 mr-1.5" />Run Health Check</>}
          </Button>
        }
      />

      {/* Posture Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Health Score" value={latest ? `${latest.overall_health_score}%` : "—"} icon={HeartPulse} color={latest?.overall_health_score >= 70 ? "green" : "amber"} trendLabel={latest ? GRADE_META[latest.health_grade]?.label : "No scan yet"} />
        <StatCard label="Frameworks Scanned" value={latest ? frameworkResults.length : "—"} icon={Shield} color="blue" trendLabel="ISO, NIST, POPIA, BDP" />
        <StatCard label="Total Findings" value={latest?.total_findings ?? "—"} icon={AlertTriangle} color={latest?.critical_findings > 0 ? "red" : "amber"} trendLabel={latest ? `${latest.critical_findings} critical` : ""} />
        <StatCard label="Residual Risk" value={latest ? `${latest.residual_risk_score}/100` : "—"} icon={TrendingDown} color={latest?.risk_appetite_status === "breached" ? "red" : latest?.risk_appetite_status === "near_limit" ? "amber" : "green"} trendLabel={latest ? `Tolerance: ${latest.risk_tolerance}` : ""} />
        <StatCard label="POA&M Items" value={latest?.poam_count ?? "—"} icon={ListChecks} color={latest?.poam_count > 0 ? "amber" : "green"} trendLabel={latest ? `${latest.critical_findings + latest.high_findings} high priority` : ""} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : !latest ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <HeartPulse className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-heading font-semibold text-foreground mb-2">No onboarding health check yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">Run an automated compliance scan to ingest evidence, map findings against frameworks, calculate residual risk, and generate a POA&M.</p>
          <Button onClick={runHealthCheck} disabled={running}><Zap className="w-4 h-4 mr-1.5" />Run First Health Check</Button>
        </div>
      ) : (
        <Tabs defaultValue="evidence" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="evidence"><Upload className="w-4 h-4 mr-1.5" />Evidence Ingestion</TabsTrigger>
            <TabsTrigger value="frameworks"><Shield className="w-4 h-4 mr-1.5" />Framework Mapping</TabsTrigger>
            <TabsTrigger value="risk"><Target className="w-4 h-4 mr-1.5" />Residual Risk</TabsTrigger>
            <TabsTrigger value="poam"><ListChecks className="w-4 h-4 mr-1.5" />POA&M ({poamItems.length})</TabsTrigger>
            <TabsTrigger value="recommendations"><FileCheck className="w-4 h-4 mr-1.5" />Recommendations</TabsTrigger>
          </TabsList>

          {/* EVIDENCE INGESTION */}
          <TabsContent value="evidence">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-heading font-semibold text-foreground mb-1">Evidence Documentation Ingestion</h3>
              <p className="text-sm text-muted-foreground mb-4">Policies, asset inventories, access logs, and previous audit reports — validated and SHA-256 hashed to the Audit Evidence Ledger.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(EVIDENCE_META).map(([key, meta]) => {
                  const ev = evidence[key] || { uploaded: 0, validated: 0, count: 0, hash_verified: false, items: [] };
                  const Icon = meta.icon;
                  const isIngested = ev.validated > 0;
                  return (
                    <div key={key} className={`p-4 rounded-lg border ${isIngested ? "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-900/5" : "border-border"}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${isIngested ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-muted"}`}>
                          <Icon className={`w-5 h-5 ${isIngested ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-foreground">{meta.label}</h4>
                            {isIngested ? <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Validated</Badge> : <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" />Pending</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{ev.count || 0} document(s) ingested • {ev.validated || 0} validated</p>
                          {ev.hash_verified && <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />SHA-256 hash verified in Audit Evidence Ledger</p>}
                          {ev.items && ev.items.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {ev.items.slice(0, 3).map((item, i) => (
                                <div key={i} className="text-xs font-mono text-muted-foreground truncate">
                                  {item.file_name} {item.sha256 && <span className="text-emerald-600">• {item.sha256}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* FRAMEWORK MAPPING */}
          <TabsContent value="frameworks">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-heading font-semibold text-foreground mb-1">Triangulation — Findings Mapped to Regulatory Controls</h3>
              <p className="text-sm text-muted-foreground mb-4">Technical findings mapped directly to ISO 27001, NIST CSF 2.0, POPIA, and Botswana Data Protection Act requirements.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 font-semibold text-muted-foreground">Framework</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Requirements</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Mapped</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Coverage</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Gaps</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Residual Risk</th>
                      <th className="pb-2 font-semibold text-muted-foreground text-center">Appetite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {frameworkResults.map((fw, i) => {
                      const appetite = APPETITE_META[fw.risk_appetite_status] || APPETITE_META.within_tolerance;
                      const AppetiteIcon = appetite.icon;
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-3">
                            <div className="font-medium text-foreground">{fw.framework_name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{fw.framework_code}</div>
                          </td>
                          <td className="py-3 text-center text-foreground">{fw.total_requirements}</td>
                          <td className="py-3 text-center text-foreground">{fw.mapped_controls}</td>
                          <td className="py-3 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full ${fw.coverage_pct >= 70 ? "bg-emerald-500" : fw.coverage_pct >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${fw.coverage_pct}%` }} />
                              </div>
                              <span className="text-xs font-medium">{fw.coverage_pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={fw.gaps_identified > 0 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}>{fw.gaps_identified}</Badge>
                          </td>
                          <td className="py-3 text-center">
                            <span className={`font-semibold ${fw.residual_risk_score > fw.risk_tolerance ? "text-red-600" : fw.residual_risk_score > fw.risk_tolerance * 0.8 ? "text-amber-600" : "text-emerald-600"}`}>{fw.residual_risk_score}</span>
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant="outline" className={`text-xs ${appetite.color}`}><AppetiteIcon className="w-3 h-3 mr-1" />{appetite.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* RESIDUAL RISK */}
          <TabsContent value="risk">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-foreground mb-4">Risk vs Tolerance</h3>
                <div className="flex items-center justify-center mb-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke={latest.residual_risk_score > latest.risk_tolerance ? "hsl(0 72% 51%)" : latest.residual_risk_score > latest.risk_tolerance * 0.8 ? "hsl(38 92% 50%)" : "hsl(160 84% 31%)"} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(latest.residual_risk_score / 100) * 314} 314`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-heading font-bold text-foreground">{latest.residual_risk_score}</span>
                      <span className="text-xs text-muted-foreground">Residual Risk</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Risk Tolerance</span>
                    <span className="font-semibold text-foreground">{latest.risk_tolerance}/100</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Appetite Status</span>
                    {(() => { const a = APPETITE_META[latest.risk_appetite_status]; const AIcon = a.icon; return <Badge variant="outline" className={a.color}><AIcon className="w-3 h-3 mr-1" />{a.label}</Badge>; })()}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-6 shadow-sm lg:col-span-2">
                <h3 className="font-heading font-semibold text-foreground mb-4">Findings by Severity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Critical", value: latest.critical_findings, color: "bg-red-500", text: "text-red-600" },
                    { label: "High", value: latest.high_findings, color: "bg-orange-500", text: "text-orange-600" },
                    { label: "Medium", value: latest.medium_findings, color: "bg-amber-500", text: "text-amber-600" },
                    { label: "Low", value: latest.low_findings, color: "bg-blue-500", text: "text-blue-600" },
                  ].map((f) => (
                    <div key={f.label} className="p-4 rounded-lg border border-border text-center">
                      <div className={`text-3xl font-heading font-bold ${f.text}`}>{f.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{f.label}</div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Total Findings</span>
                    <span className="font-semibold text-foreground">{latest.total_findings}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Health Grade</span>
                    <Badge className={GRADE_META[latest.health_grade]?.color}>{GRADE_META[latest.health_grade]?.label}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* POA&M */}
          <TabsContent value="poam">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Plan of Action & Milestones (POA&M)</h3>
                <Badge variant="outline">{poamItems.length} items</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">Automated remediation plan generated from compliance gaps — each item maps a finding to a regulatory control with a target milestone date.</p>
              {poamItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
                  <p className="text-sm text-muted-foreground">No POA&M items — all framework requirements have mapped controls.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {poamItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30">
                      <div className={`px-2 py-0.5 rounded text-xs font-mono font-medium shrink-0 ${PRIORITY_META[item.priority] || PRIORITY_META.medium}`}>{item.item_id}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className={`text-xs ${PRIORITY_META[item.priority] || PRIORITY_META.medium}`}>{item.priority}</Badge>
                          <Badge variant="outline" className="text-xs">{item.framework}</Badge>
                          <span className="text-xs text-muted-foreground">Risk: <strong className="text-foreground">{item.residual_risk}</strong></span>
                          <span className="text-xs text-muted-foreground">Due: <strong className="text-foreground">{item.target_date}</strong></span>
                        </div>
                        <p className="text-sm text-foreground">{item.finding}</p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><ArrowRight className="w-3 h-3" />{item.milestone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* RECOMMENDATIONS */}
          <TabsContent value="recommendations">
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <h3 className="font-heading font-semibold text-foreground mb-4">Prioritized Recommendations</h3>
              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No recommendations — all checks passed.</p>
              ) : (
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                      <div className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${PRIORITY_META[rec.priority] || PRIORITY_META.medium}`}>{rec.priority}</div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{rec.recommendation}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">Framework: <strong className="text-foreground">{rec.framework}</strong></span>
                          <span className="text-xs text-muted-foreground">Target: <strong className="text-foreground">{rec.target_date}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Scan History */}
      {checks.length > 1 && (
        <div className="mt-6 bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-heading font-semibold text-foreground mb-3">Scan History</h3>
          <div className="space-y-2">
            {checks.slice(0, 5).map((c, i) => (
              <div key={c.id || i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 text-sm">
                <span className="text-xs font-mono text-muted-foreground">{c.check_id}</span>
                <span className="text-foreground">{new Date(c.scan_started_at).toLocaleString()}</span>
                <Badge className={GRADE_META[c.health_grade]?.color}>{GRADE_META[c.health_grade]?.label}</Badge>
                <span className="text-muted-foreground">Score: {c.overall_health_score}%</span>
                <span className="text-muted-foreground">Findings: {c.total_findings}</span>
                <span className="text-muted-foreground">POA&M: {c.poam_count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}