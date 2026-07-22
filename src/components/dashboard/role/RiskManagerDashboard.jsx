import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ShieldAlert, Siren, Building2, ArrowRight, CheckSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import useDashboardData from "@/hooks/useDashboardData";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";

function contractDays(end) {
  if (!end) return null;
  return Math.round((new Date(end) - new Date(new Date().toDateString())) / 86400000);
}
const scoreColor = (s) => (s >= 20 ? "bg-red-500" : s >= 12 ? "bg-orange-500" : s >= 6 ? "bg-amber-500" : "bg-emerald-500");

export default function RiskManagerDashboard() {
  const { risks, vendors, incidents, tasks, loading } = useDashboardData();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating");
  const aboveAppetite = risks.filter(
    (r) => ["above_appetite", "unacceptable"].includes(r.appetite_band) || r.exceeds_tolerance
  );
  const openIncidents = incidents.filter((i) => !["closed", "false_positive"].includes(i.status));
  const expiringVendors = vendors.filter((v) => {
    const d = contractDays(v.contract_end);
    return d !== null && d <= 60;
  });
  const offboarding = vendors.filter((v) => v.offboarding_status === "in_progress");
  const remediationTasks = tasks.filter((t) => t.type === "remediation" && t.status !== "completed");

  const riskByCategory = Object.entries(
    risks.reduce((acc, r) => {
      const cat = (r.category || "operational").replace(/_/g, " ");
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  return (
    <div>
      <PageHeader
        title="Risk Manager Dashboard"
        subtitle="Your focus: risk register, vendor risk, incidents and remediation"
        actions={
          <Link to="/risks" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open risk register <ArrowRight className="w-4 h-4" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Open Risks" value={openRisks.length} icon={AlertTriangle} color="amber" trendLabel={`${risks.length} total`} />
        <StatCard label="Above Appetite" value={aboveAppetite.length} icon={ShieldAlert} color="red" trendLabel={`${risks.filter((r) => r.status === "accepted").length} accepted`} />
        <StatCard label="Open Incidents" value={openIncidents.length} icon={Siren} color={openIncidents.length > 0 ? "red" : "green"} trendLabel={`${incidents.length} total`} />
        <StatCard label="Expiring Contracts" value={expiringVendors.length} icon={Building2} color={expiringVendors.length > 0 ? "amber" : "green"} trendLabel={`${offboarding.length} offboarding`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Above-appetite risks */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Above-Appetite Risks</h3>
            <Link to="/risk-appetite-heatmap" className="text-xs text-primary hover:underline">Heatmap</Link>
          </div>
          {aboveAppetite.length > 0 ? (
            <div className="space-y-2">
              {aboveAppetite.slice(0, 6).map((r) => {
                const score = (r.likelihood || 1) * (r.impact || 1);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{(r.category || "").replace(/_/g, " ")} · {r.owner_name || "Unassigned"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold ${scoreColor(score)}`}>{score}</span>
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No risks above appetite.</p>
          )}
        </div>

        {/* Risk distribution */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Risk Distribution by Category</h3>
          {riskByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={riskByCategory} layout="vertical" margin={{ left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No risks recorded.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring vendor contracts */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-foreground">Vendor Contracts Expiring (60d)</h3>
            <Link to="/vendors" className="text-xs text-primary hover:underline">All vendors</Link>
          </div>
          {expiringVendors.length > 0 ? (
            <div className="space-y-2">
              {expiringVendors.slice(0, 6).map((v) => {
                const d = contractDays(v.contract_end);
                return (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">Risk: {v.risk_level || "n/a"} · ends {v.contract_end}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d <= 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                      {d <= 0 ? "Expired" : `${d}d left`}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No contracts expiring soon.</p>
          )}
        </div>

        {/* Open incidents + remediation */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Open Incidents & Remediation</h3>
          {openIncidents.length === 0 && remediationTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing active.</p>
          ) : (
            <div className="space-y-2">
              {openIncidents.slice(0, 4).map((i) => (
                <div key={i.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{i.severity} · {i.status}</p>
                  </div>
                  <StatusBadge status={i.severity} />
                </div>
              ))}
              {remediationTasks.slice(0, 3).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}