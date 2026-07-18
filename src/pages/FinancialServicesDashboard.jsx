import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  RadialBarChart, RadialBar,
} from "recharts";
import {
  Landmark, Shield, Users, Banknote, Scale, Gauge, CheckCircle, XCircle,
  AlertTriangle, Activity, Target, TrendingUp, FileCheck, Clock, ShieldAlert,
} from "lucide-react";

// Banking / financial-services regulatory domains and their benchmark frameworks
const DOMAINS = [
  { name: "Cybersecurity", icon: Shield, terms: ["pci", "iso 27001", "nist", "cyber", "cbk", "bank of uganda", "bou", "fsra", "dora"] },
  { name: "Data Privacy", icon: Users, terms: ["popia", "dpa", "gdpr", "glba", "kenya dpa", "zimbabwe dpa", "tanzania dpa"] },
  { name: "AML / CFT", icon: Banknote, terms: ["fatf", "aml", "fic", "kyc", "sarb fic"] },
  { name: "Prudential & Resilience", icon: Landmark, terms: ["basel", "dora", "mas", "ffiec", "prudential", "operational resilience"] },
  { name: "Governance & Reporting", icon: Scale, terms: ["sox", "soc 2", "sarb", "fsra", "governance", "king"] },
];

const FRAMEWORK_TERMS = [
  "basel", "fatf", "pci", "soc 2", "iso 27001", "sox", "glba", "dora", "mas", "ffiec",
  "sarb", "prudential", "cbk", "bank of uganda", "bou", "fsra", "popia", "dpa",
  "kenya dpa", "nist", "cyber", "financial", "aml", "banking", "king", "fic",
];

const BAR_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#f59e0b"];

function readinessColor(v) {
  if (v >= 80) return "text-emerald-500";
  if (v >= 50) return "text-amber-500";
  return "text-rose-500";
}
function readinessBar(v) {
  if (v >= 80) return "bg-emerald-500";
  if (v >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function FinancialServicesDashboard() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Framework.list("-updated_date", 200),
      base44.entities.Control.list("-updated_date", 500),
      base44.entities.Risk.list("-updated_date", 200),
      base44.entities.ComplianceTask.list("-updated_date", 300),
      base44.entities.Incident.list("-updated_date", 100),
    ]).then(([f, c, r, t, i]) => {
      setFrameworks(f || []);
      setControls(c || []);
      setRisks(r || []);
      setTasks(t || []);
      setIncidents(i || []);
      setLoading(false);
    }).catch((e) => {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      setLoading(false);
    });
  }, []);

  const matched = useMemo(() => {
    const terms = FRAMEWORK_TERMS.map((t) => t.toLowerCase());
    return frameworks.filter((f) => {
      const n = (f.name || "").toLowerCase();
      return terms.some((t) => n.includes(t));
    });
  }, [frameworks]);

  const stats = useMemo(() => {
    const total = matched.length;
    const avgReadiness = total > 0 ? Math.round(matched.reduce((s, f) => s + (f.readiness_score || 0), 0) / total) : 0;
    const certified = matched.filter((f) => f.status === "certified" || f.status === "audit_ready").length;

    const ctlTotal = controls.length;
    const ctlPassing = controls.filter((c) => c.status === "passing").length;
    const ctlPassRate = ctlTotal > 0 ? Math.round((ctlPassing / ctlTotal) * 100) : 0;
    const ctlFailing = controls.filter((c) => c.status === "failing").length;

    const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating").length;
    const criticalRisks = risks.filter((r) => (r.status === "open" || r.status === "mitigating") && (r.risk_score || 0) >= 15).length;

    const overdueTasks = tasks.filter((t) => t.status === "overdue").length;
    const openTasks = tasks.filter((t) => t.status === "todo" || t.status === "in_progress" || t.status === "in_review").length;

    const openIncidents = incidents.filter((i) => i.status === "detected" || i.status === "investigating" || i.status === "contained").length;

    const domainData = DOMAINS.map((d) => {
      const pf = matched.filter((f) => {
        const n = (f.name || "").toLowerCase();
        return d.terms.some((term) => n.includes(term));
      });
      const score = pf.length > 0 ? Math.round(pf.reduce((s, f) => s + (f.readiness_score || 0), 0) / pf.length) : 0;
      return { domain: d.name, score, count: pf.length };
    });

    // Attention list — failing controls + critical risks + overdue tasks + open incidents
    const failingControlsList = controls.filter((c) => c.status === "failing").slice(0, 6);
    const criticalRisksList = risks.filter((r) => (r.status === "open" || r.status === "mitigating") && (r.risk_score || 0) >= 15).slice(0, 6);
    const overdueTasksList = tasks.filter((t) => t.status === "overdue").slice(0, 6);
    const openIncidentsList = incidents.filter((i) => i.status === "detected" || i.status === "investigating" || i.status === "contained").slice(0, 6);

    return {
      total, avgReadiness, certified,
      ctlTotal, ctlPassing, ctlPassRate, ctlFailing,
      openRisks, criticalRisks,
      overdueTasks, openTasks,
      openIncidents,
      domainData,
      failingControlsList, criticalRisksList, overdueTasksList, openIncidentsList,
    };
  }, [matched, controls, risks, tasks, incidents]);

  const readinessChart = matched.map((f) => ({
    name: (f.name || "").length > 16 ? (f.name || "").slice(0, 14) + "…" : (f.name || ""),
    readiness: f.readiness_score || 0,
  }));

  const overallRing = [{ name: "Readiness", value: stats.avgReadiness, fill: stats.avgReadiness >= 80 ? "#10b981" : stats.avgReadiness >= 50 ? "#f59e0b" : "#f43f5e" }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Financial Services Compliance Dashboard"
        subtitle="Real-time compliance progress against banking & financial-sector regulatory benchmarks"
      />

      {/* Hero */}
      <div className="rounded-2xl p-6 mb-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-1">
          <Landmark className="w-7 h-7" />
          <h2 className="text-xl font-heading font-bold">Banking & Financial Services Readiness</h2>
        </div>
        <p className="text-white/90 text-sm">Basel · FATF · PCI DSS · SOC 2 · ISO 27001 · DORA · SARB · CBK · BOU · FSRA · POPIA</p>
        <div className="mt-4 flex flex-wrap gap-6">
          <HeroStat label="Standards Tracked" value={stats.total} />
          <HeroStat label="Avg Readiness" value={`${stats.avgReadiness}%`} />
          <HeroStat label="Control Pass Rate" value={`${stats.ctlPassRate}%`} />
          <HeroStat label="Audit-Ready / Certified" value={stats.certified} />
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <KpiCard icon={Gauge} label="Avg Readiness" value={`${stats.avgReadiness}%`} color="text-primary" />
        <KpiCard icon={CheckCircle} label="Controls Passing" value={`${stats.ctlPassing}/${stats.ctlTotal}`} sub={`${stats.ctlFailing} failing`} color="text-emerald-500" />
        <KpiCard icon={AlertTriangle} label="Open Risks" value={stats.openRisks} sub={`${stats.criticalRisks} critical`} color="text-amber-500" />
        <KpiCard icon={Clock} label="Overdue Tasks" value={stats.overdueTasks} sub={`${stats.openTasks} open`} color="text-rose-500" />
        <KpiCard icon={Activity} label="Open Incidents" value={stats.openIncidents} color="text-orange-500" />
      </div>

      {matched.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <Landmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
          <h3 className="font-heading font-bold text-foreground mb-1">No financial-sector frameworks imported yet</h3>
          <p className="text-sm text-muted-foreground">
            Import banking & financial standards from the SADC Framework Library to begin benchmarking progress.
          </p>
          <Button className="mt-4" onClick={() => (window.location.href = "/sadc-frameworks")}>
            <FileCheck className="w-4 h-4 mr-1.5" /> Open Framework Library
          </Button>
        </div>
      ) : (
        <>
          {/* Overall readiness ring + regulatory domain radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-card rounded-2xl border border-border p-5 flex flex-col">
              <h3 className="font-heading font-bold text-foreground mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" /> Overall Readiness
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Aggregate score across all tracked financial standards</p>
              <div className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={overallRing} startAngle={90} endAngle={-270}>
                    <RadialBar background dataKey="value" cornerRadius={10} />
                    <Tooltip formatter={(v) => [`${v}%`, "Readiness"]} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-32 mb-8">
                <p className={`text-4xl font-bold ${readinessColor(stats.avgReadiness)}`}>{stats.avgReadiness}%</p>
                <p className="text-xs text-muted-foreground">compliant</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-5 lg:col-span-2">
              <h3 className="font-heading font-bold text-foreground mb-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /> Regulatory Domain Readiness
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Cybersecurity · Data Privacy · AML/CFT · Prudential & Resilience · Governance</p>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={stats.domainData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Radar name="Readiness" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [`${v}%`, "Readiness"]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-standard readiness bars */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h3 className="font-heading font-bold text-foreground mb-1 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Progress by Standard
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Readiness score (0–100) against each tracked benchmark</p>
            <ResponsiveContainer width="100%" height={Math.max(220, readinessChart.length * 36)}>
              <BarChart data={readinessChart} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Readiness"]}
                />
                <Bar dataKey="readiness" radius={[0, 4, 4, 0]}>
                  {readinessChart.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed per-standard progress cards */}
          <div className="bg-card rounded-2xl border border-border p-5 mb-6">
            <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" /> Tracked Standards — Detailed Progress
            </h3>
            <div className="space-y-3">
              {matched.map((f) => {
                const readiness = f.readiness_score || 0;
                const passing = f.passing_controls || 0;
                const total = f.total_controls || 0;
                return (
                  <div key={f.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border border-border bg-background/50">
                    <div className="flex items-center gap-3 sm:w-64 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${readinessBar(readiness)}`} />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.version} · <StatusBadge status={f.status || "not_started"} /></p>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{passing}/{total} controls passing</span>
                        <span className="text-xs font-semibold text-foreground">{readiness}% ready</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${readinessBar(readiness)} rounded-full transition-all`} style={{ width: `${readiness}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:w-24 justify-end">
                      {readiness >= 80 ? (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : readiness >= 50 ? (
                        <Activity className="w-5 h-5 text-amber-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Requires attention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttentionList
              icon={XCircle}
              title="Failing Controls"
              empty="No failing controls — all tested controls passing."
              items={stats.failingControlsList.map((c) => ({ id: c.id, primary: c.title, secondary: c.control_id }))}
              accent="text-rose-500"
            />
            <AttentionList
              icon={AlertTriangle}
              title="Critical Risks"
              empty="No critical open risks."
              items={stats.criticalRisksList.map((r) => ({ id: r.id, primary: r.title, secondary: `Score ${r.risk_score} · ${r.status}` }))}
              accent="text-amber-500"
            />
            <AttentionList
              icon={Clock}
              title="Overdue Tasks"
              empty="No overdue compliance tasks."
              items={stats.overdueTasksList.map((t) => ({ id: t.id, primary: t.title, secondary: t.due_date ? `Due ${t.due_date}` : "No due date" }))}
              accent="text-rose-500"
            />
            <AttentionList
              icon={ShieldAlert}
              title="Open Incidents"
              empty="No open security incidents."
              items={stats.openIncidentsList.map((i) => ({ id: i.id, primary: i.title, secondary: `${i.severity} · ${i.status}` }))}
              accent="text-orange-500"
            />
          </div>
        </>
      )}
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-white/80 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <Icon className={`w-5 h-5 ${color} mb-2`} />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</p>}
    </div>
  );
}

function AttentionList({ icon: Icon, title, items, empty, accent }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${accent}`} /> {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 text-sm py-1 border-b border-border last:border-0">
              <span className="text-foreground truncate">{it.primary}</span>
              <span className="text-xs text-muted-foreground shrink-0">{it.secondary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}