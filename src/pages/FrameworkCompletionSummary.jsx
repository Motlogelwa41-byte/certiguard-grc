import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ShieldCheck, TrendingUp, AlertTriangle, CheckCircle2, Target, Award, ArrowRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

function colorFor(pct) {
  return pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
}

function isBdpa(name = "") {
  const n = name.toLowerCase();
  return n.includes("botswana") || n.includes("data protection") || n.includes("bdpa") || n.includes("dpa");
}

const STATUS_LABEL = {
  not_started: "Not Started",
  in_progress: "In Progress",
  audit_ready: "Audit Ready",
  certified: "Certified",
};

export default function FrameworkCompletionSummary() {
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
    return frameworks
      .map((fw) => {
        const mapped = controls.filter((c) => (c.framework_ids || []).includes(fw.id));
        const total = mapped.length;
        const passing = mapped.filter((c) => c.status === "passing").length;
        const failing = mapped.filter((c) => c.status === "failing").length;
        const notTested = mapped.filter((c) => c.status === "not_tested").length;
        const readiness = total > 0 ? Math.round((passing / total) * 100) : fw.readiness_score || 0;
        return {
          id: fw.id,
          name: fw.name,
          version: fw.version,
          status: fw.status,
          total,
          passing,
          failing,
          notTested,
          readiness,
          bdpa: isBdpa(fw.name),
        };
      })
      .sort((a, b) => (b.bdpa ? 1 : 0) - (a.bdpa ? 1 : 0) || b.readiness - a.readiness);
  }, [frameworks, controls]);

  const overall = useMemo(() => {
    const all = new Map();
    frameworks.forEach((fw) => {
      controls.filter((c) => (c.framework_ids || []).includes(fw.id)).forEach((c) => all.set(c.id, c));
    });
    const list = [...all.values()];
    const passing = list.filter((c) => c.status === "passing").length;
    const total = list.length;
    return { total, passing, readiness: total > 0 ? Math.round((passing / total) * 100) : 0 };
  }, [frameworks, controls]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (frameworks.length === 0) {
    return (
      <div>
        <PageHeader title="Framework Completion Summary" subtitle="Completion percentage across all active compliance frameworks" />
        <EmptyState icon={ShieldCheck} title="No active frameworks" description="Activate frameworks to see completion percentages." />
      </div>
    );
  }

  const bdpaFramework = perFramework.find((f) => f.bdpa);

  return (
    <div>
      <PageHeader
        title="Framework Completion Summary"
        subtitle="An instant, high-level view of completion across every active compliance framework"
      />

      {/* Overall + BDPA featured */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Overall completion ring */}
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Overall Completion</p>
            <div className="relative w-36 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ value: overall.readiness }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar background dataKey="value" cornerRadius={10} fill={colorFor(overall.readiness)} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-heading font-bold" style={{ color: colorFor(overall.readiness) }}>
                  {overall.readiness}%
                </span>
                <span className="text-xs text-muted-foreground">{overall.passing}/{overall.total} controls</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Across all mapped controls</p>
          </CardContent>
        </Card>

        {/* BDPA featured card */}
        {bdpaFramework ? (
          <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">Featured Framework</span>
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground">{bdpaFramework.name}</h3>
                  {bdpaFramework.version && <p className="text-sm text-muted-foreground">Version {bdpaFramework.version}</p>}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-heading font-bold" style={{ color: colorFor(bdpaFramework.readiness) }}>
                    {bdpaFramework.readiness}%
                  </div>
                  <span className="text-xs text-muted-foreground">complete</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Stat label="Passing" value={bdpaFramework.passing} color="text-emerald-600" />
                <Stat label="Failing" value={bdpaFramework.failing} color="text-red-600" />
                <Stat label="Not Tested" value={bdpaFramework.notTested} color="text-slate-500" />
                <Stat label="Total" value={bdpaFramework.total} color="text-foreground" />
              </div>
              <Link to="/bdpa-report" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                View full BDPA report <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardContent className="p-6 flex items-center justify-center text-center">
              <div>
                <ShieldCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No Botswana Data Protection Act framework activated yet.{" "}
                  <Link to="/sadc-frameworks" className="text-primary font-medium hover:underline">Browse SADC frameworks →</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All frameworks grid */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-heading font-semibold text-foreground">All Active Frameworks</h2>
        <span className="text-sm text-muted-foreground">{perFramework.length} framework{perFramework.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {perFramework.map((f) => (
          <FrameworkCard key={f.id} fw={f} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className={`text-lg font-heading font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function FrameworkCard({ fw }) {
  const c = colorFor(fw.readiness);
  return (
    <Card className={fw.bdpa ? "border-primary/30" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base font-heading truncate">{fw.name}</CardTitle>
            {fw.version && <p className="text-xs text-muted-foreground">v{fw.version}</p>}
          </div>
          {fw.bdpa && <span className="shrink-0 text-[10px] font-bold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">BDPA</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-heading font-bold" style={{ color: c }}>{fw.readiness}%</span>
          <span className="text-xs text-muted-foreground">{fw.passing}/{fw.total} passing</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${fw.readiness}%`, backgroundColor: c }} />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" />{fw.passing}</span>
          {fw.failing > 0 && <span className="inline-flex items-center gap-1 text-red-600"><AlertTriangle className="w-3 h-3" />{fw.failing}</span>}
          {fw.notTested > 0 && <span className="inline-flex items-center gap-1 text-slate-500"><Target className="w-3 h-3" />{fw.notTested}</span>}
          {fw.status && <span className="ml-auto text-muted-foreground">{STATUS_LABEL[fw.status] || fw.status}</span>}
        </div>
      </CardContent>
    </Card>
  );
}