import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, AlertTriangle, FileCheck, Activity, TrendingUp,
  ChevronRight, Clock, Building2, Bell,
} from "lucide-react";

export default function ExecutiveBriefing() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    complianceScore: 0,
    openIncidents: 0,
    criticalRisks: 0,
    openTasks: 0,
    overdueTasks: 0,
    passingControls: 0,
    totalControls: 0,
    activeFrameworks: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [topRisks, setTopRisks] = useState([]);
  const [frameworks, setFrameworks] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [controls, risks, incidents, tasks, fws] = await Promise.all([
          base44.entities.Control.list("-updated_date", 200).catch(() => []),
          base44.entities.Risk.list("-updated_date", 100).catch(() => []),
          base44.entities.Incident.list("-updated_date", 10).catch(() => []),
          base44.entities.ComplianceTask.list("-updated_date", 100).catch(() => []),
          base44.entities.Framework.list().catch(() => []),
        ]);

        const passing = controls.filter(c => c.status === "passing" || c.status === "compliant").length;
        const complianceScore = controls.length > 0 ? Math.round((passing / controls.length) * 100) : 0;
        const critical = risks.filter(r => (r.likelihood || 0) * (r.impact || 0) >= 15 && r.status !== "closed").length;
        const openInc = incidents.filter(i => i.status !== "closed" && i.status !== "false_positive").length;
        const openTasks = tasks.filter(t => t.status !== "completed").length;
        const overdue = tasks.filter(t => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")).length;

        setStats({
          complianceScore,
          openIncidents: openInc,
          criticalRisks: critical,
          openTasks,
          overdueTasks: overdue,
          passingControls: passing,
          totalControls: controls.length,
          activeFrameworks: fws.length,
        });
        setRecentIncidents(incidents.slice(0, 5));
        setTopRisks(risks.sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact)).slice(0, 5));
        setFrameworks(fws);
      } catch (e) {
        // silent
      }
      setLoading(false);
    })();
  }, []);

  const scoreColor = stats.complianceScore >= 75 ? "text-emerald-600" : stats.complianceScore >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = stats.complianceScore >= 75 ? "from-emerald-500 to-teal-600" : stats.complianceScore >= 50 ? "from-amber-500 to-orange-600" : "from-red-500 to-rose-600";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background">
      {/* Mobile-optimized header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-heading font-bold text-foreground leading-tight">Executive Briefing</h1>
              <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "short" })}</p>
            </div>
          </div>
          <Link to="/" className="p-2 rounded-lg hover:bg-muted">
            <ChevronRight className="w-5 h-5 text-muted-foreground rotate-180" />
          </Link>
        </div>
      </header>

      <main className="px-4 py-5 space-y-5 max-w-md mx-auto">
        {/* Compliance Score Hero */}
        <div className={`rounded-3xl bg-gradient-to-br ${scoreBg} p-6 text-white shadow-lg`}>
          <p className="text-sm font-medium opacity-90 mb-1">Overall Compliance Score</p>
          <p className="text-5xl font-bold tracking-tight">{stats.complianceScore}%</p>
          <div className="flex items-center gap-4 mt-4 text-xs">
            <div><span className="font-semibold">{stats.passingControls}</span> / {stats.totalControls} controls passing</div>
            <div><span className="font-semibold">{stats.activeFrameworks}</span> frameworks active</div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={AlertTriangle}
            label="Open Incidents"
            value={stats.openIncidents}
            color={stats.openIncidents > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}
            link="/incidents"
          />
          <MetricCard
            icon={Activity}
            label="Critical Risks"
            value={stats.criticalRisks}
            color={stats.criticalRisks > 0 ? "text-orange-600 bg-orange-50" : "text-emerald-600 bg-emerald-50"}
            link="/risks"
          />
          <MetricCard
            icon={FileCheck}
            label="Open Tasks"
            value={stats.openTasks}
            color="text-blue-600 bg-blue-50"
            link="/tasks"
          />
          <MetricCard
            icon={Clock}
            label="Overdue"
            value={stats.overdueTasks}
            color={stats.overdueTasks > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}
            link="/tasks"
          />
        </div>

        {/* Critical Incidents */}
        {recentIncidents.length > 0 && (
          <section>
            <h2 className="text-sm font-heading font-semibold text-foreground mb-2 px-1">Recent Incidents</h2>
            <div className="space-y-2">
              {recentIncidents.map(inc => (
                <Link key={inc.id} to="/incidents" className="block bg-card rounded-2xl border border-border p-4 active:bg-muted transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{inc.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{inc.type?.replace(/_/g, " ")}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      inc.severity === "critical" ? "bg-red-100 text-red-700" :
                      inc.severity === "high" ? "bg-orange-100 text-orange-700" :
                      inc.severity === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{inc.severity}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Top Risks */}
        {topRisks.length > 0 && (
          <section>
            <h2 className="text-sm font-heading font-semibold text-foreground mb-2 px-1">Top Risk Exposures</h2>
            <div className="space-y-2">
              {topRisks.map(r => {
                const score = (r.likelihood || 0) * (r.impact || 0);
                return (
                  <Link key={r.id} to="/risks" className="block bg-card rounded-2xl border border-border p-4 active:bg-muted transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">{r.category} · {r.status}</p>
                      </div>
                      <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                        score >= 20 ? "bg-red-100 text-red-700" :
                        score >= 12 ? "bg-orange-100 text-orange-700" :
                        score >= 6 ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>{score}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Framework Status */}
        {frameworks.length > 0 && (
          <section>
            <h2 className="text-sm font-heading font-semibold text-foreground mb-2 px-1">Framework Readiness</h2>
            <div className="space-y-2">
              {frameworks.slice(0, 4).map(fw => (
                <div key={fw.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-sm text-foreground truncate">{fw.name}</p>
                    <span className="text-xs text-muted-foreground">{fw.readiness_score || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${(fw.readiness_score || 0) >= 75 ? "bg-emerald-500" : (fw.readiness_score || 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${fw.readiness_score || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="text-center pt-4 pb-8">
          <p className="text-xs text-muted-foreground">CertiGuard GRC · Executive Briefing Portal</p>
          <p className="text-xs text-muted-foreground mt-1">Read-only mobile view · Tap any card for details</p>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, color, link }) {
  return (
    <Link to={link} className="bg-card rounded-2xl border border-border p-4 active:bg-muted transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}