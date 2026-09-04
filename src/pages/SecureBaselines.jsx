import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Shield, Play, Download, AlertTriangle, CheckCircle2, XCircle, FileCode, GitBranch, Lock, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { CIS_BASELINE_TEMPLATES, CATEGORY_LABELS } from "@/lib/cisBaselines";

const SEV_COLOR = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};
const STATUS_COLOR = {
  pass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  fail: "bg-red-100 text-red-700 border-red-200",
  not_checked: "bg-slate-100 text-slate-500 border-slate-200",
  not_applicable: "bg-slate-100 text-slate-500 border-slate-200",
  error: "bg-orange-100 text-orange-700 border-orange-200",
};
const PLATFORM_ICON = { linux: "🐧", windows: "🪟", kubernetes: "☸️", cloud: "☁️", network: "🌐", database: "🗄️", container: "📦", generic: "⚙️" };

export default function SecureBaselines() {
  const { toast } = useToast();
  const [baselines, setBaselines] = useState([]);
  const [results, setResults] = useState([]);
  const [changeLog, setChangeLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [b, r, c] = await Promise.all([
        base44.entities.SecureBaseline.list("-updated_date", 100).catch(() => []),
        base44.entities.BaselineCheckResult.list("-validated_at", 200).catch(() => []),
        base44.entities.ConfigurationChangeLog.list("-changed_at", 200).catch(() => []),
      ]);
      setBaselines(b || []);
      setResults(r || []);
      setChangeLog(c || []);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to load baselines", description: e?.message });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleImportTemplates = async () => {
    setImporting(true);
    try {
      const me = await base44.auth.me();
      const tenantId = me?.data?.tenant_id || me?.tenant_id || "";
      const toCreate = CIS_BASELINE_TEMPLATES.map((t) => ({
        ...t,
        tenant_id: tenantId,
        config_items: JSON.stringify(t.config_items),
        total_checks: t.config_items.length,
        status: "active",
        owner_name: me?.full_name || "",
        owner_id: me?.id || "",
      }));
      await base44.entities.SecureBaseline.bulkCreate(toCreate);
      toast({ title: "CIS baselines imported", description: `${toCreate.length} benchmark baselines created from the CIS library.` });
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Import failed", description: e?.message });
    }
    setImporting(false);
  };

  const handleRunValidation = async (baselineId) => {
    setValidating(true);
    try {
      const res = await base44.functions.invoke("runBaselineValidation", baselineId ? { baseline_id: baselineId } : {});
      const data = res?.data || res;
      if (data?.ok) {
        toast({
          title: "Validation complete",
          description: `${data.baselines_validated} baseline(s) • ${data.pass} pass • ${data.fail} fail • ${data.drift_events} drift events logged.`,
        });
        loadData();
      } else {
        throw new Error(data?.error || "Validation returned an error");
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Validation failed", description: e?.message });
    }
    setValidating(false);
  };

  const activeBaselines = baselines.filter((b) => b.status === "active").length;
  const driftEvents = changeLog.filter((c) => c.drift_detected).length;
  const passingChecks = results.filter((r) => r.status === "pass").length;
  const failedChecks = results.filter((r) => r.status === "fail").length;
  const avgCompliance = baselines.length > 0
    ? Math.round(baselines.reduce((s, b) => s + (b.compliance_pct || 0), 0) / baselines.length)
    : 0;

  return (
    <div>
      <PageHeader
        title="Secure Baselines & Configuration Management"
        subtitle="CIS Benchmark-aligned golden baselines, automated validation, immutable drift detection, and IaC governance"
        icon={Shield}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Baselines" value={activeBaselines} icon={Shield} color="blue" trendLabel={`${baselines.length} total`} />
        <StatCard label="Avg Compliance" value={`${avgCompliance}%`} icon={CheckCircle2} color={avgCompliance >= 80 ? "green" : "amber"} />
        <StatCard label="Drift Events" value={driftEvents} icon={AlertTriangle} color={driftEvents > 0 ? "red" : "green"} trendLabel={`${failedChecks} failing checks`} />
        <StatCard label="Checks Passed" value={passingChecks} icon={CheckCircle2} color="green" trendLabel={`${results.length} total checks run`} />
      </div>

      <Tabs defaultValue="baselines" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="baselines">Baselines</TabsTrigger>
          <TabsTrigger value="results">Validation Results</TabsTrigger>
          <TabsTrigger value="changelog">Change Log & Drift</TabsTrigger>
          <TabsTrigger value="iac">IaC Governance</TabsTrigger>
        </TabsList>

        {/* BASELINES TAB */}
        <TabsContent value="baselines">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Golden configuration baselines aligned to CIS benchmarks</p>
            <div className="flex gap-2">
              {baselines.length === 0 && (
                <Button onClick={handleImportTemplates} disabled={importing} variant="default" size="sm">
                  {importing ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                  Import CIS Templates
                </Button>
              )}
              <Button onClick={() => handleRunValidation()} disabled={validating} variant="outline" size="sm">
                {validating ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Play className="w-4 h-4 mr-1.5" />}
                Run All Validations
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : baselines.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No secure baselines configured yet.</p>
              <Button onClick={handleImportTemplates} disabled={importing}>
                <Download className="w-4 h-4 mr-2" /> Import CIS Benchmark Templates
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {baselines.map((b) => {
                const items = (() => { try { return JSON.parse(b.config_items || "[]"); } catch { return []; } })();
                const pct = b.compliance_pct || 0;
                return (
                  <div key={b.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{PLATFORM_ICON[b.target_platform] || "⚙️"}</span>
                          <h3 className="font-heading font-semibold text-foreground truncate">{b.name}</h3>
                          <Badge variant="outline" className="text-xs">{b.cis_version}</Badge>
                          {b.enforcement_mode === "enforce" && (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><Lock className="w-3 h-3 mr-1" />Enforced</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{b.cis_benchmark} • {b.platform_detail || b.target_platform}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[b.category] || b.category}</Badge>
                          <Badge variant="outline" className="text-xs">{items.length} CIS checks</Badge>
                          <Badge variant="outline" className="text-xs">v{b.version}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{b.validation_frequency}</Badge>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-3xl font-heading font-bold ${pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600"}`}>{pct}%</div>
                        <p className="text-xs text-muted-foreground">{b.passing_checks || 0}/{items.length} passing</p>
                        {b.last_validated && <p className="text-xs text-muted-foreground mt-1">Validated {new Date(b.last_validated).toLocaleDateString()}</p>}
                        <Button onClick={() => handleRunValidation(b.id)} disabled={validating} variant="outline" size="sm" className="mt-2">
                          <Play className="w-3.5 h-3.5 mr-1" /> Validate
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* VALIDATION RESULTS TAB */}
        <TabsContent value="results">
          <p className="text-sm text-muted-foreground mb-4">Automated CIS check results — pass/fail per check per asset</p>
          {results.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No validation results yet. Run a validation to populate this view.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">CIS Check</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Asset</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">CIS Ref</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Expected</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Actual</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Severity</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.slice(0, 100).map((r) => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="p-3 max-w-xs"><p className="font-medium text-foreground truncate">{r.check_name}</p><p className="text-xs text-muted-foreground">{r.baseline_name}</p></td>
                        <td className="p-3 text-xs">{r.asset_name || "—"}</td>
                        <td className="p-3 text-xs font-mono">{r.cis_reference || "—"}</td>
                        <td className="p-3 text-xs font-mono">{r.expected_value || "—"}</td>
                        <td className="p-3 text-xs font-mono">{r.actual_value || "—"}</td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs border ${SEV_COLOR[r.severity] || ""}`}>{r.severity}</span></td>
                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLOR[r.status] || ""}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {results.length > 100 && <p className="text-xs text-muted-foreground p-3 text-center">Showing 100 of {results.length} results</p>}
            </div>
          )}
        </TabsContent>

        {/* CHANGE LOG TAB */}
        <TabsContent value="changelog">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Immutable change management log — append-only, tamper-evident record of all configuration changes and drift</p>
          </div>
          {changeLog.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Lock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No changes logged yet. Drift events will appear here automatically when validation detects deviations.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {changeLog.slice(0, 100).map((c) => (
                <div key={c.id} className={`bg-card rounded-lg border p-4 flex items-start gap-3 ${c.drift_detected ? "border-red-200 bg-red-50/30" : "border-border"}`}>
                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${c.drift_detected ? "bg-red-100" : "bg-emerald-100"}`}>
                    {c.drift_detected ? <AlertTriangle className="w-4.5 h-4.5 text-red-600" /> : <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground text-sm">{c.field_changed || "Configuration change"}</span>
                      <Badge variant="outline" className="text-xs capitalize">{c.change_type?.replace(/_/g, " ")}</Badge>
                      {c.drift_detected && <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Drift • {c.drift_severity}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {c.baseline_name} • {c.asset_name || "—"} • {c.changed_by || "—"} • {c.changed_at ? new Date(c.changed_at).toLocaleString() : "—"}
                    </p>
                    {(c.previous_value || c.new_value) && (
                      <p className="text-xs mt-1 font-mono text-muted-foreground">
                        <span className="line-through">{c.previous_value || "—"}</span> → <span className="text-foreground">{c.new_value || "—"}</span>
                      </p>
                    )}
                    {c.iac_manifest_ref && <p className="text-xs text-muted-foreground mt-1">IaC ref: <span className="font-mono">{c.iac_manifest_ref}</span></p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* IAC GOVERNANCE TAB */}
        <TabsContent value="iac">
          <p className="text-sm text-muted-foreground mb-4">Infrastructure-as-Code governance — version-controlled configuration manifests eliminating unmonitored drift</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {baselines.length === 0 ? (
              <div className="col-span-2 text-center py-16 border border-dashed border-border rounded-xl">
                <FileCode className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Import CIS baselines to track IaC manifest versions.</p>
              </div>
            ) : baselines.map((b) => (
              <div key={b.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-semibold text-foreground text-sm truncate">{b.name}</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">IaC Repository</span><span className="font-mono text-xs truncate max-w-[200px]">{b.iac_repository || "Not configured"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Manifest Version</span><span className="font-mono text-xs">{b.iac_manifest_version || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Manifest URL</span><span className="font-mono text-xs truncate max-w-[200px]">{b.iac_manifest_url ? <a href={b.iac_manifest_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View</a> : "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Baseline Version</span><span className="font-mono text-xs">v{b.version}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Enforcement</span><Badge variant="outline" className="text-xs capitalize">{b.enforcement_mode}</Badge></div>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {b.enforcement_mode === "enforce"
                      ? "Drift from this baseline is actively blocked and alerts are sent on any deviation."
                      : b.enforcement_mode === "monitor"
                      ? "Drift from this baseline is monitored and alerts are sent, but not blocked."
                      : "Validation checks are disabled for this baseline."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}