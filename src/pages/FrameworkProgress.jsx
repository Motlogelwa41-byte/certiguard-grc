import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Shield, TrendingUp, AlertTriangle, CheckCircle2, Target } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Cell, LabelList
} from "recharts";

const STATUS_COLORS = {
  passing: "#10b981",
  failing: "#ef4444",
  not_tested: "#94a3b8",
  not_applicable: "#cbd5e1",
};

function colorFor(pct) {
  return pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
}

export default function FrameworkProgress() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
    ]).then(([fws, ctls]) => {
      setFrameworks(fws || []);
      setControls(ctls || []);
      setLoading(false);
    });
  }, []);

  const perFramework = useMemo(() => {
    return frameworks.map((fw) => {
      const mapped = controls.filter((c) => (c.framework_ids || []).includes(fw.id));
      const total = mapped.length;
      const counts = { passing: 0, failing: 0, not_tested: 0, not_applicable: 0 };
      mapped.forEach((c) => { if (counts[c.status] !== undefined) counts[c.status]++; });
      const readiness = total > 0 ? Math.round((counts.passing / total) * 100) : fw.readiness_score || 0;
      return {
        id: fw.id,
        name: fw.name,
        version: fw.version,
        status: fw.status,
        total,
        counts,
        readiness,
        gap: Math.max(0, 100 - readiness),
      };
    });
  }, [frameworks, controls]);

  const overall = useMemo(() => {
    const all = new Map();
    frameworks.forEach((fw) => {
      controls.filter((c) => (c.framework_ids || []).includes(fw.id)).forEach((c) => all.set(c.id, c));
    });
    const list = [...all.values()];
    const passing = list.filter((c) => c.status === "passing").length;
    const failing = list.filter((c) => c.status === "failing").length;
    const not_tested = list.filter((c) => c.status === "not_tested").length;
    const total = list.length;
    return { total, passing, failing, not_tested, readiness: total > 0 ? Math.round((passing / total) * 100) : 0 };
  }, [frameworks, controls]);

  const activeCount = perFramework.filter((f) => f.status !== "certified").length;
  const certifiedCount = perFramework.filter((f) => f.status === "certified").length;
  const gaugeData = [{ name: "Readiness", value: overall.readiness, fill: colorFor(overall.readiness) }];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (frameworks.length === 0) {
    return (
      <div>
        <PageHeader title="Framework Progress" subtitle="Visual readiness progress across all your compliance frameworks" />
        <EmptyState icon={Shield} title="No frameworks yet" description="Add frameworks to track readiness progress here." actionLabel="Add Framework" onAction={() => (window.location.href = "/frameworks")} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Framework Progress"
        subtitle="Visual readiness progress across all your compliance frameworks — how close you are to full readiness per standard"
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard icon={Target} label="Overall Readiness" value={`${overall.readiness}%`} accent={colorFor(overall.readiness)} />
        <SummaryCard icon={Shield} label="Active Frameworks" value={activeCount} sub={`${certifiedCount} certified`} accent="#3b82f6" />
        <SummaryCard icon={CheckCircle2} label="Passing Controls" value={overall.passing} sub={`of ${overall.total} mapped`} accent="#10b981" />
        <SummaryCard icon={AlertTriangle} label="Needs Attention" value={overall.failing + overall.not_tested} sub={`${overall.failing} failing · ${overall.not_tested} untested`} accent="#ef4444" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Overall health gauge */}
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-2">Overall Compliance Health</h3>
          <div className="relative h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart innerRadius="72%" outerRadius="100%" data={gaugeData} startAngle={90} endAngle={-270}>
                <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={12} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-bold text-foreground">{overall.readiness}%</span>
              <span className="text-xs text-muted-foreground mt-0.5">audit-ready</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {overall.readiness >= 80 ? "Strong posture — maintain continuous monitoring." : overall.readiness >= 50 ? "On track — close remaining gaps to reach audit readiness." : "Significant gaps — prioritise failing and untested controls."}
          </p>
        </div>

        {/* Per-framework readiness bars */}
        <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
          <h3 className="font-heading font-semibold text-foreground mb-3">Readiness by Framework</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perFramework} layout="vertical" margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
                <Bar dataKey="readiness" radius={[0, 6, 6, 0]} barSize={18}>
                  {perFramework.map((f) => <Cell key={f.id} fill={colorFor(f.readiness)} />)}
                  <LabelList dataKey="readiness" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Control status breakdown per framework (stacked) */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-heading font-semibold text-foreground mb-3">Control Status Breakdown by Framework</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perFramework} margin={{ left: 8, right: 8, top: 8, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-12} textAnchor="end" height={56} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="counts.passing" name="Passing" stackId="a" fill={STATUS_COLORS.passing} />
              <Bar dataKey="counts.failing" name="Failing" stackId="a" fill={STATUS_COLORS.failing} />
              <Bar dataKey="counts.not_tested" name="Not tested" stackId="a" fill={STATUS_COLORS.not_tested} />
              <Bar dataKey="counts.not_applicable" name="N/A" stackId="a" fill={STATUS_COLORS.not_applicable} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs">
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground capitalize">
              <span className="w-3 h-3 rounded-sm" style={{ background: c }} /> {k.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      {/* Per-framework table with journey-to-100 */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Framework</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Controls</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground w-1/3">Journey to Full Readiness</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Gap</th>
              </tr>
            </thead>
            <tbody>
              {perFramework.map((f) => (
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/frameworks" className="font-medium text-foreground hover:text-primary hover:underline">{f.name}</Link>
                    {f.version && <span className="text-xs text-muted-foreground ml-1.5">v{f.version}</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="text-foreground font-medium">{f.counts.passing}</span> passing
                    <span className="text-muted-foreground/60"> / {f.total || 0}</span>
                    {f.counts.failing > 0 && <span className="text-red-600 ml-2">{f.counts.failing} failing</span>}
                    {f.counts.not_tested > 0 && <span className="text-slate-500 ml-2">{f.counts.not_tested} untested</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${f.readiness}%`, background: colorFor(f.readiness) }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground w-10 text-right">{f.readiness}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${f.gap === 0 ? "bg-emerald-100 text-emerald-700" : f.gap <= 20 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {f.gap === 0 ? "Ready" : `${f.gap}% to go`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}1a` }}>
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate">{label}{sub ? <span className="text-muted-foreground/70"> · {sub}</span> : null}</p>
      </div>
    </div>
  );
}