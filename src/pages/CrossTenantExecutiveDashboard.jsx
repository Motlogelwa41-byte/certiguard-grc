import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Building2, AlertTriangle, Shield, TrendingDown, Globe2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis, Legend,
} from "recharts";
import { formatCurrencyCompact } from "@/lib/currencyRates";

const COLORS = ["#10B981", "#f59e0b", "#ef4444", "#8b5cf6", "#3b82f6", "#ec4899", "#14b8a6", "#f97316"];

export default function CrossTenantExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    base44.functions.invoke("aggregateCrossOrgRisk", {})
      .then((res) => { setData(res.data || res); })
      .catch(() => toast({ title: "Failed to load cross-tenant data", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const rollup = data?.globalRollup || {};
  const groups = data?.groups || [];

  // Flatten all tenants (holding companies + subsidiaries) for per-tenant charts
  const allTenants = [];
  groups.forEach((g) => {
    allTenants.push({
      name: g.name,
      type: g.entity_type || "holding_company",
      totalRisks: g.totalRisks,
      openRisks: g.openRisks,
      criticalRisks: g.criticalRisks,
      highRisks: g.highRisks,
      compliancePct: g.compliancePct,
      avgRiskScore: g.avgRiskScore || 0,
      totalALE: g.totalALE,
      totalResidualALE: g.totalResidualALE,
      totalControls: g.totalControls,
    });
    (g.subsidiaries || []).forEach((sub) => {
      allTenants.push({
        name: sub.name,
        type: sub.entity_type || "subsidiary",
        totalRisks: sub.totalRisks,
        openRisks: sub.openRisks,
        criticalRisks: sub.criticalRisks,
        highRisks: sub.highRisks,
        compliancePct: sub.compliancePct,
        avgRiskScore: sub.avgRiskScore || 0,
        totalALE: sub.totalALE,
        totalResidualALE: sub.totalResidualALE,
        totalControls: sub.totalControls,
      });
    });
  });

  // Chart data: compliance % by tenant
  const complianceByTenant = allTenants
    .filter((t) => t.totalControls > 0)
    .map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 13) + "…" : t.name,
      fullName: t.name,
      compliance: t.compliancePct,
      controls: t.totalControls,
    }));

  // Chart data: risk severity by tenant (stacked)
  const riskByTenant = allTenants
    .filter((t) => t.totalRisks > 0)
    .map((t) => ({
      name: t.name.length > 15 ? t.name.slice(0, 13) + "…" : t.name,
      fullName: t.name,
      critical: t.criticalRisks,
      high: t.highRisks,
      other: t.totalRisks - t.criticalRisks - t.highRisks,
    }));

  // Scatter: risk score vs compliance (bubble = ALE) — high-impact areas
  const scatterData = allTenants
    .filter((t) => t.totalRisks > 0)
    .map((t) => ({
      name: t.name,
      x: t.compliancePct,
      y: t.avgRiskScore,
      z: Math.max(t.totalALE / 1000, 1),
      ale: t.totalALE,
      risks: t.totalRisks,
    }));

  // Top high-impact areas (sorted by ALE descending)
  const topImpactAreas = [...allTenants]
    .filter((t) => t.totalRisks > 0)
    .sort((a, b) => (b.totalALE || 0) - (a.totalALE || 0))
    .slice(0, 8);

  // Risk distribution pie across all tenants
  const riskDistribution = [
    { name: "Critical", value: rollup.criticalRisks || 0, color: "#ef4444" },
    { name: "Open (non-critical)", value: (rollup.openRisks || 0) - (rollup.criticalRisks || 0), color: "#f59e0b" },
    { name: "Mitigated/Closed", value: (rollup.totalRisks || 0) - (rollup.openRisks || 0), color: "#10B981" },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <PageHeader
        title="Cross-Tenant Executive Dashboard"
        subtitle="Consolidated risk scores and compliance readiness across all managed entities — high-impact areas at a glance."
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Managed Entities" value={rollup.totalEntities || 0} icon={Building2} color="blue" />
        <StatCard label="Total Risks" value={rollup.totalRisks || 0} icon={AlertTriangle} color={(rollup.totalRisks || 0) > 0 ? "amber" : "green"} trendLabel={`${rollup.openRisks || 0} open`} />
        <StatCard label="Critical Risks" value={rollup.criticalRisks || 0} icon={TrendingDown} color={(rollup.criticalRisks || 0) > 0 ? "red" : "green"} />
        <StatCard label="Group Compliance" value={`${rollup.compliancePct || 0}%`} icon={Shield} color={(rollup.compliancePct || 0) >= 80 ? "green" : "amber"} trendLabel={`${rollup.compliantControls || 0}/${rollup.totalControls || 0} controls`} />
      </div>

      {/* Financial exposure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Inherent Financial Exposure (ALE)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrencyCompact(rollup.totalALE || 0, "ZAR")}</p>
            <p className="text-xs text-muted-foreground mt-1">Annualized loss expectancy across all entities</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Residual Financial Exposure</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrencyCompact(rollup.totalResidualALE || 0, "ZAR")}</p>
            <p className="text-xs text-muted-foreground mt-1">Post-mitigation residual exposure</p>
          </CardContent>
        </Card>
      </div>

      {allTenants.length === 0 ? (
        <div className="text-center py-16">
          <Globe2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No multi-tenant hierarchy configured. Set tenant <strong>parent_tenant_id</strong> and <strong>entity_type</strong> to enable cross-tenant rollup.
          </p>
        </div>
      ) : (
        <>
          {/* Charts row 1: Compliance by tenant + Risk distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Compliance Readiness by Entity</CardTitle></CardHeader>
              <CardContent>
                {complianceByTenant.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={complianceByTenant} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                      <Tooltip
                        formatter={(v) => [`${v}%`, "Compliance"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""}
                      />
                      <Bar dataKey="compliance" radius={[4, 4, 0, 0]}>
                        {complianceByTenant.map((entry, i) => (
                          <Cell key={i} fill={entry.compliance >= 80 ? "#10B981" : entry.compliance >= 60 ? "#f59e0b" : "#ef4444"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No compliance data available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Risk Distribution (Group)</CardTitle></CardHeader>
              <CardContent>
                {riskDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={riskDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {riskDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No risks recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2: Risk severity by tenant (stacked) + Risk vs Compliance scatter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Risk Severity by Entity</CardTitle></CardHeader>
              <CardContent>
                {riskByTenant.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={riskByTenant} margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ""} />
                      <Legend />
                      <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="high" stackId="a" fill="#f59e0b" name="High" />
                      <Bar dataKey="other" stackId="a" fill="#3b82f6" name="Medium/Low" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No risk data available.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Risk Score vs Compliance (High-Impact Map)</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Bubble size = financial exposure (ALE) · Top-left = highest impact</p>
              </CardHeader>
              <CardContent>
                {scatterData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <ScatterChart margin={{ left: -10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" dataKey="x" name="Compliance" unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="number" dataKey="y" name="Avg Risk Score" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <ZAxis type="number" dataKey="z" range={[40, 400]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        formatter={(v, name) => {
                          if (name === "ALE") return [formatCurrencyCompact(v, "ZAR"), name];
                          if (name === "Compliance") return [`${v}%`, name];
                          return [v, name];
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                      />
                      <Scatter data={scatterData} fill="#8b5cf6" name="Entities">
                        {scatterData.map((entry, i) => (
                          <Cell key={i} fill={entry.y >= 12 ? "#ef4444" : entry.y >= 8 ? "#f59e0b" : "#10B981"} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">No scatter data available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top high-impact areas table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Top High-Impact Areas by Financial Exposure
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topImpactAreas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                      <tr>
                        <th className="text-left px-4 py-2">Entity</th>
                        <th className="text-left px-4 py-2">Type</th>
                        <th className="text-center px-4 py-2">Total Risks</th>
                        <th className="text-center px-4 py-2">Critical</th>
                        <th className="text-center px-4 py-2">Avg Score</th>
                        <th className="text-center px-4 py-2">Compliance</th>
                        <th className="text-right px-4 py-2">Inherent ALE</th>
                        <th className="text-right px-4 py-2">Residual ALE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topImpactAreas.map((t, i) => (
                        <tr key={i} className="border-t border-border hover:bg-accent/30">
                          <td className="px-4 py-2 font-medium text-foreground">{t.name}</td>
                          <td className="px-4 py-2 text-muted-foreground capitalize">{(t.type || "—").replace(/_/g, " ")}</td>
                          <td className="text-center px-4 py-2">{t.totalRisks}</td>
                          <td className="text-center px-4 py-2">
                            <span className={t.criticalRisks > 0 ? "text-red-600 font-semibold" : ""}>{t.criticalRisks}</span>
                          </td>
                          <td className="text-center px-4 py-2">{t.avgRiskScore?.toFixed(1) || "—"}</td>
                          <td className="text-center px-4 py-2">
                            <span className={t.compliancePct >= 80 ? "text-emerald-600 font-semibold" : t.compliancePct >= 60 ? "text-amber-600" : "text-red-600"}>
                              {t.compliancePct}%
                            </span>
                          </td>
                          <td className="text-right px-4 py-2 font-semibold">{formatCurrencyCompact(t.totalALE || 0, "ZAR")}</td>
                          <td className="text-right px-4 py-2 font-semibold text-emerald-600">{formatCurrencyCompact(t.totalResidualALE || 0, "ZAR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No high-impact areas identified.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}