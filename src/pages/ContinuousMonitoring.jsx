import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Activity, Loader2, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2,
  Cpu, Clock, ChevronRight,
} from "lucide-react";

function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const SEVERITY_META = {
  critical: { label: "Critical", color: "#dc2626", bg: "#fef2f2" },
  high: { label: "High", color: "#ea580c", bg: "#fff7ed" },
  medium: { label: "Medium", color: "#d97706", bg: "#fffbeb" },
  low: { label: "Low", color: "#64748b", bg: "#f1f5f9" },
};

export default function ContinuousMonitoring() {
  const [controls, setControls] = useState([]);
  const [runs, setRuns] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.Control.list("-updated_date", 500),
      base44.entities.ComplianceRun.list("-created_date", 20),
      base44.entities.SecurityAlert.list("-created_date", 50),
    ]).then(([c, r, a]) => {
      setControls(c || []);
      setRuns((r || []).filter((x) => (x.title || "").includes("Continuous Control Monitoring")));
      setAlerts((a || []).filter((x) => x.type === "config_change"));
    }).catch(() => toast({ title: "Failed to load monitoring data", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke("continuousControlMonitoring", {});
      const d = res.data || {};
      if (d.error) throw new Error(d.error);
      toast({
        title: "Monitoring complete",
        description: `${d.passed} passed, ${d.failed} failed of ${d.total} automated controls — score ${d.score}%`,
      });
      load();
    } catch (e) {
      toast({ title: "Monitoring run failed", description: e.message, variant: "destructive" });
    } finally { setRunning(false); }
  };

  const stats = useMemo(() => {
    const automated = controls.filter((c) => c.automation_status === "automated" || c.automation_status === "partially_automated").length;
    const passing = controls.filter((c) => c.status === "passing").length;
    const failing = controls.filter((c) => c.status === "failing").length;
    return { total: controls.length, automated, passing, failing };
  }, [controls]);

  const lastRun = runs[0];
  const failingControls = useMemo(
    () => controls.filter((c) => c.status === "failing")
      .sort((a, b) => (a.severity === "critical" ? 0 : 1) - (b.severity === "critical" ? 0 : 1)),
    [controls]
  );

  return (
    <>
      <PageHeader
        title="Continuous Control Monitoring"
        subtitle="Automated evidence collection and real-time alerting on failing controls"
        actions={
          <Button onClick={runNow} disabled={running} size="sm">
            {running ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Run Monitoring Now
          </Button>
        }
      />

      {/* KPI hero */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-300" />
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300">Control Health Posture</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-4xl font-black text-blue-200">{stats.total}</p>
            <p className="text-xs text-slate-400 mt-1">Total Controls</p>
          </div>
          <div>
            <p className="text-4xl font-black text-indigo-300">{stats.automated}</p>
            <p className="text-xs text-slate-400 mt-1">Automated / Monitored</p>
          </div>
          <div>
            <p className="text-4xl font-black text-emerald-400">{stats.passing}</p>
            <p className="text-xs text-slate-400 mt-1">Passing</p>
          </div>
          <div>
            <p className="text-4xl font-black text-red-400">{stats.failing}</p>
            <p className="text-xs text-slate-400 mt-1">Failing</p>
          </div>
        </div>
        {lastRun && (
          <div className="mt-4 flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm">
            <Clock className="w-4 h-4 text-blue-300" />
            <span className="text-slate-200">Last run {fmtDateTime(lastRun.started_at)} — score <span className="font-bold text-white">{lastRun.score}%</span>, {lastRun.passed} passed / {lastRun.failed} failed</span>
          </div>
        )}
        {stats.failing > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-200 font-medium">{stats.failing} control(s) currently failing — security alerts generated and Slack notified</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Loader2 className="w-7 h-7 text-primary animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Failing controls */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-foreground">Failing Controls</h3>
              <span className="text-xs text-muted-foreground ml-auto">{failingControls.length}</span>
            </div>
            {failingControls.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/60 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No failing controls. All monitored controls are passing.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {failingControls.map((c) => {
                  const sm = SEVERITY_META[c.severity] || SEVERITY_META.medium;
                  return (
                    <div key={c.id} className="flex items-start gap-3 border border-border rounded-lg p-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: sm.color, backgroundColor: sm.bg }}>{sm.label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.control_id} · {c.category?.replace(/_/g, " ")}</p>
                        {c.owner_name && <p className="text-xs text-muted-foreground">Owner: {c.owner_name}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent monitoring runs */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Monitoring Runs</h3>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-10">
                <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No runs yet. Trigger a monitoring run to begin.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {runs.map((r) => (
                  <div key={r.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{fmtDateTime(r.started_at)}</span>
                      <span className={`text-sm font-bold ${r.score >= 90 ? "text-emerald-600" : r.score >= 70 ? "text-amber-600" : "text-red-600"}`}>{r.score}%</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {r.passed} passed</span>
                      <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-500" /> {r.failed} failed</span>
                      <span>{r.skipped} skipped</span>
                      <span className="ml-auto">{r.triggered_by || "scheduled"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent alerts */}
          <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Recent Failing-Control Alerts</h3>
              <span className="text-xs text-muted-foreground ml-auto">{alerts.length}</span>
            </div>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts generated.</p>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 10).map((a) => {
                  const sm = SEVERITY_META[a.severity] || SEVERITY_META.medium;
                  return (
                    <div key={a.id} className="flex items-start gap-3 border border-border rounded-lg p-3">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: sm.color, backgroundColor: sm.bg }}>{sm.label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">{fmtDateTime(a.detected_at)} · {a.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}