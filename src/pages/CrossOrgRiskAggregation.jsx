import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Building2, AlertTriangle, Shield, TrendingDown, ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCurrencyCompact, convertCurrency, CURRENCIES } from "@/lib/currencyRates";

export default function CrossOrgRiskAggregation() {
  const [tenants, setTenants] = useState([]);
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Tenant.list("-created_date", 200),
      base44.entities.Risk.list("-created_date", 500),
      base44.entities.Control.list("-created_date", 500),
    ]).then(([t, r, c]) => {
      setTenants(t || []);
      setRisks(r || []);
      setControls(c || []);
    }).catch(() => toast({ title: "Failed to load aggregation data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  // Build hierarchy: find holding companies (parent_tenant_id is empty but has children)
  const holdingCompanies = useMemo(() => {
    return tenants.filter((t) => t.entity_type === "holding_company" || (!t.parent_tenant_id && tenants.some((c) => c.parent_tenant_id === t.id)));
  }, [tenants]);

  const getSubsidiaries = (parentId) => tenants.filter((t) => t.parent_tenant_id === parentId);

  const getTenantRisks = (tenantId) => {
    // Risks are tenant-scoped via RLS, but admin can see all. Match by tenant_id field.
    return risks.filter((r) => r.tenant_id === tenantId);
  };

  const getTenantControls = (tenantId) => controls.filter((c) => c.tenant_id === tenantId);

  const computeMetrics = (tenantId) => {
    const tRisks = getTenantRisks(tenantId);
    const tControls = getTenantControls(tenantId);
    const openRisks = tRisks.filter((r) => r.status === "open" || r.status === "mitigating");
    const totalALE = tRisks.reduce((s, r) => s + (r.annualized_loss_expectancy || 0), 0);
    const totalResidualALE = tRisks.reduce((s, r) => s + (r.residual_annualized_loss_expectancy || 0), 0);
    const criticalRisks = tRisks.filter((r) => (r.risk_score || 0) >= 16);
    const highRisks = tRisks.filter((r) => (r.risk_score || 0) >= 12 && (r.risk_score || 0) < 16);
    const compliantControls = tControls.filter((c) => c.status === "compliant" || c.status === "effective");
    const compliancePct = tControls.length > 0 ? (compliantControls.length / tControls.length) * 100 : 0;
    const avgRiskScore = tRisks.length > 0 ? tRisks.reduce((s, r) => s + (r.risk_score || 0), 0) / tRisks.length : 0;
    return {
      totalRisks: tRisks.length,
      openRisks: openRisks.length,
      criticalRisks: criticalRisks.length,
      highRisks: highRisks.length,
      totalALE,
      totalResidualALE,
      compliancePct: Math.round(compliancePct),
      avgRiskScore: avgRiskScore.toFixed(1),
      totalControls: tControls.length,
      compliantControls: compliantControls.length,
    };
  };

  const rollupMetrics = useMemo(() => {
    const allRisks = risks;
    const allControls = controls;
    const totalALE = allRisks.reduce((s, r) => s + (r.annualized_loss_expectancy || 0), 0);
    const totalResidualALE = allRisks.reduce((s, r) => s + (r.residual_annualized_loss_expectancy || 0), 0);
    const criticalCount = allRisks.filter((r) => (r.risk_score || 0) >= 16).length;
    const compliantControls = allControls.filter((c) => c.status === "compliant" || c.status === "effective");
    const compliancePct = allControls.length > 0 ? (compliantControls.length / allControls.length) * 100 : 0;
    return {
      totalEntities: tenants.length,
      totalRisks: allRisks.length,
      criticalRisks: criticalCount,
      totalALE,
      totalResidualALE,
      compliancePct: Math.round(compliancePct),
    };
  }, [tenants, risks, controls]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <PageHeader title="Cross-Organizational Risk Aggregation" subtitle="Holding company rollup — consolidated risk, exposure, and compliance health across all managed entities" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Managed Entities" value={rollupMetrics.totalEntities} icon={Building2} color="blue" />
        <StatCard label="Aggregate Open Risks" value={rollupMetrics.totalRisks} icon={AlertTriangle} color={rollupMetrics.totalRisks ? "amber" : "slate"} />
        <StatCard label="Critical Risks (Group)" value={rollupMetrics.criticalRisks} icon={AlertTriangle} color={rollupMetrics.criticalRisks ? "red" : "slate"} />
        <StatCard label="Group Compliance" value={`${rollupMetrics.compliancePct}%`} icon={Shield} color={rollupMetrics.compliancePct >= 80 ? "green" : "amber"} />
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Group Financial Exposure (Inherent ALE)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Inherent Annualized Loss Expectancy</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(rollupMetrics.totalALE, "ZAR")}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Residual Annualized Loss Expectancy</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(rollupMetrics.totalResidualALE, "ZAR")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {holdingCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No holding company hierarchy configured. Set a tenant's <strong>parent_tenant_id</strong> and <strong>entity_type</strong> to "holding_company" to enable cross-organizational rollup.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {holdingCompanies.map((hc) => {
            const subs = getSubsidiaries(hc.id);
            const hcMetrics = computeMetrics(hc.id);
            const isExpanded = expanded === hc.id;
            return (
              <Card key={hc.id} className="overflow-hidden">
                <CardHeader className="cursor-pointer hover:bg-accent/30" onClick={() => setExpanded(isExpanded ? null : hc.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      <Building2 className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{hc.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{subs.length} subsidiary{subs.length !== 1 ? "ies" : ""} · {hcMetrics.totalRisks} risks · {hcMetrics.compliancePct}% compliant</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right"><span className="text-xs text-muted-foreground block">Inherent ALE</span><span className="font-semibold">{formatCurrencyCompact(hcMetrics.totalALE, "ZAR")}</span></div>
                      <div className="text-right"><span className="text-xs text-muted-foreground block">Residual ALE</span><span className="font-semibold text-emerald-600">{formatCurrencyCompact(hcMetrics.totalResidualALE, "ZAR")}</span></div>
                      <div className="text-right"><span className="text-xs text-muted-foreground block">Critical</span><span className={`font-semibold ${hcMetrics.criticalRisks ? "text-red-600" : ""}`}>{hcMetrics.criticalRisks}</span></div>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="text-left px-4 py-2">Subsidiary / Client</th>
                            <th className="text-left px-4 py-2">Entity Type</th>
                            <th className="text-center px-4 py-2">Risks</th>
                            <th className="text-center px-4 py-2">Critical</th>
                            <th className="text-center px-4 py-2">Avg Score</th>
                            <th className="text-right px-4 py-2">Inherent ALE</th>
                            <th className="text-right px-4 py-2">Residual ALE</th>
                            <th className="text-center px-4 py-2">Compliance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Holding company's own metrics */}
                          <tr className="border-t border-border bg-primary/5">
                            <td className="px-4 py-2 font-medium">{hc.name} (Direct)</td>
                            <td className="px-4 py-2"><StatusBadge status={hc.entity_type || "standalone"} /></td>
                            <td className="text-center px-4 py-2">{hcMetrics.totalRisks}</td>
                            <td className="text-center px-4 py-2">{hcMetrics.criticalRisks}</td>
                            <td className="text-center px-4 py-2">{hcMetrics.avgRiskScore}</td>
                            <td className="text-right px-4 py-2 font-semibold">{formatCurrencyCompact(hcMetrics.totalALE, "ZAR")}</td>
                            <td className="text-right px-4 py-2 font-semibold text-emerald-600">{formatCurrencyCompact(hcMetrics.totalResidualALE, "ZAR")}</td>
                            <td className="text-center px-4 py-2">{hcMetrics.compliancePct}%</td>
                          </tr>
                          {subs.map((sub) => {
                            const m = computeMetrics(sub.id);
                            return (
                              <tr key={sub.id} className="border-t border-border hover:bg-accent/30">
                                <td className="px-4 py-2 pl-8">↳ {sub.name}</td>
                                <td className="px-4 py-2"><StatusBadge status={sub.entity_type || "subsidiary"} /></td>
                                <td className="text-center px-4 py-2">{m.totalRisks}</td>
                                <td className="text-center px-4 py-2">{m.criticalRisks}</td>
                                <td className="text-center px-4 py-2">{m.avgRiskScore}</td>
                                <td className="text-right px-4 py-2 font-semibold">{formatCurrencyCompact(m.totalALE, "ZAR")}</td>
                                <td className="text-right px-4 py-2 font-semibold text-emerald-600">{formatCurrencyCompact(m.totalResidualALE, "ZAR")}</td>
                                <td className="text-center px-4 py-2">{m.compliancePct}%</td>
                              </tr>
                            );
                          })}
                          {/* Rollup total */}
                          <tr className="border-t-2 border-border bg-muted/30 font-bold">
                            <td className="px-4 py-2" colSpan={2}>Group Total ({hc.name})</td>
                            <td className="text-center px-4 py-2">{hcMetrics.totalRisks + subs.reduce((s, sub) => s + computeMetrics(sub.id).totalRisks, 0)}</td>
                            <td className="text-center px-4 py-2">{hcMetrics.criticalRisks + subs.reduce((s, sub) => s + computeMetrics(sub.id).criticalRisks, 0)}</td>
                            <td className="text-center px-4 py-2">—</td>
                            <td className="text-right px-4 py-2">{formatCurrencyCompact(hcMetrics.totalALE + subs.reduce((s, sub) => s + computeMetrics(sub.id).totalALE, 0), "ZAR")}</td>
                            <td className="text-right px-4 py-2 text-emerald-600">{formatCurrencyCompact(hcMetrics.totalResidualALE + subs.reduce((s, sub) => s + computeMetrics(sub.id).totalResidualALE, 0), "ZAR")}</td>
                            <td className="text-center px-4 py-2">{Math.round((hcMetrics.compliancePct + subs.reduce((s, sub) => s + computeMetrics(sub.id).compliancePct, 0)) / (1 + subs.length))}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}