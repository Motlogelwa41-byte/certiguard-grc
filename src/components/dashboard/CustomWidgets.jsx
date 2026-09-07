import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, AlertTriangle, TrendingUp, Building, Bell, CheckCircle2, FileCheck, Activity, ChevronRight } from "lucide-react";

// Individual widget components — each fetches its own data

export function ComplianceScoreWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    base44.entities.Control.list().then((controls) => {
      const passing = (controls || []).filter((c) => c.status === "passing").length;
      const total = (controls || []).length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;
      setData({ score, passing, failing: total - passing, total });
    }).catch(() => setError(true));
  }, []);

  if (error) return <WidgetError />;
  if (!data) return <WidgetSkeleton />;
  const color = data.score >= 70 ? "#16a34a" : data.score >= 40 ? "#d97706" : "#dc2626";

  return (
    <div className="flex items-center gap-4">
      <div className="relative flex items-center justify-center shrink-0">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(data.score / 100) * 264} 264`} className="transition-all duration-1000" />
        </svg>
        <span className="absolute text-lg font-heading font-bold" style={{ color }}>{data.score}%</span>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Compliance Score</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-600 font-medium">{data.passing} passing</span>
          <span className="text-rose-600 font-medium">{data.failing} failing</span>
        </div>
        <p className="text-xs text-muted-foreground">{data.total} total controls</p>
      </div>
    </div>
  );
}

export function OverdueTasksWidget() {
  const [tasks, setTasks] = useState([]);
  useEffect(() => {
    base44.entities.ComplianceTask.list().then((all) => {
      const today = new Date().toISOString().slice(0, 10);
      const overdue = (all || []).filter((t) =>
        t.status === "overdue" || (t.due_date && t.due_date.slice(0, 10) < today && t.status !== "completed")
      );
      setTasks(overdue);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-rose-600" />
        <span className="text-2xl font-heading font-bold text-foreground">{tasks.length}</span>
        <span className="text-xs text-muted-foreground">overdue</span>
      </div>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {tasks.slice(0, 3).map((t) => (
          <div key={t.id} className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <ChevronRight className="w-3 h-3 shrink-0" /> {t.title}
          </div>
        ))}
        {tasks.length === 0 && <p className="text-xs text-muted-foreground">No overdue tasks 🎉</p>}
      </div>
    </div>
  );
}

export function OpenRisksWidget() {
  const [risks, setRisks] = useState([]);
  useEffect(() => {
    base44.entities.Risk.list().then((all) => {
      setRisks((all || []).filter((r) => r.status === "open" || r.status === "mitigating"));
    }).catch(() => {});
  }, []);

  const critical = risks.filter((r) => (r.risk_score || 0) >= 20).length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-amber-600" />
        <span className="text-2xl font-heading font-bold text-foreground">{risks.length}</span>
        <span className="text-xs text-muted-foreground">open risks</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-rose-600 font-medium">{critical} critical</span>
        <span className="text-amber-600 font-medium">{risks.length - critical} other</span>
      </div>
    </div>
  );
}

export function VendorRiskWidget() {
  const [vendors, setVendors] = useState([]);
  useEffect(() => {
    base44.entities.Vendor.list().then((all) => setVendors(all || [])).catch(() => {});
  }, []);

  const highRisk = vendors.filter((v) => v.risk_level === "high" || v.risk_level === "critical").length;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Building className="w-4 h-4 text-primary" />
        <span className="text-2xl font-heading font-bold text-foreground">{vendors.length}</span>
        <span className="text-xs text-muted-foreground">vendors</span>
      </div>
      <p className="text-xs text-rose-600 font-medium">{highRisk} high-risk</p>
    </div>
  );
}

export function RegulatoryAlertsWidget() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => {
    base44.entities.RegulatoryAlert.filter({ is_active: true }, "-created_date", 5).then(setAlerts).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-primary" />
        <span className="text-2xl font-heading font-bold text-foreground">{alerts.length}</span>
        <span className="text-xs text-muted-foreground">active alerts</span>
      </div>
      <div className="space-y-1 max-h-24 overflow-y-auto">
        {alerts.slice(0, 3).map((a) => (
          <div key={a.id} className="text-xs text-muted-foreground truncate">{a.title}</div>
        ))}
        {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts</p>}
      </div>
    </div>
  );
}

export function ControlStatusWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    base44.entities.Control.list().then((controls) => {
      const c = controls || [];
      setData({
        passing: c.filter((x) => x.status === "passing").length,
        failing: c.filter((x) => x.status === "failing").length,
        notTested: c.filter((x) => x.status === "not_tested" || !x.status).length,
        total: c.length,
      });
    }).catch(() => setError(true));
  }, []);

  if (error) return <WidgetError />;
  if (!data) return <WidgetSkeleton />;
  const segments = [
    { label: "Passing", value: data.passing, color: "#16a34a" },
    { label: "Failing", value: data.failing, color: "#dc2626" },
    { label: "Not Tested", value: data.notTested, color: "#d97706" },
  ];

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Control Status Breakdown</p>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-foreground flex-1">{s.label}</span>
            <span className="text-xs font-semibold text-foreground">{s.value}</span>
            <span className="text-xs text-muted-foreground">{data.total > 0 ? Math.round((s.value / data.total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EvidenceStatusWidget() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    base44.entities.Evidence.list("-created_date", 200).then((all) => {
      const e = all || [];
      setData({
        approved: e.filter((x) => x.status === "approved").length,
        pending: e.filter((x) => x.status === "pending_review").length,
        total: e.length,
      });
    }).catch(() => setError(true));
  }, []);

  if (error) return <WidgetError />;
  if (!data) return <WidgetSkeleton />;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <FileCheck className="w-4 h-4 text-primary" />
        <span className="text-2xl font-heading font-bold text-foreground">{data.total}</span>
        <span className="text-xs text-muted-foreground">evidence items</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-emerald-600 font-medium">{data.approved} approved</span>
        <span className="text-amber-600 font-medium">{data.pending} pending</span>
      </div>
    </div>
  );
}

export function RecentActivityWidget() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    base44.entities.AuditTrail.list("-created_date", 10).then(setLogs).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-4 h-4 text-primary" />
        <p className="text-xs text-muted-foreground">Recent Activity</p>
      </div>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {logs.slice(0, 5).map((l) => (
          <div key={l.id} className="text-xs flex items-start gap-1.5">
            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground truncate">{l.entity_name || l.action || "Activity"}</p>
              <p className="text-muted-foreground">{l.action} · {l.performed_by_name || l.user_name || "System"}</p>
            </div>
          </div>
        ))}
        {logs.length === 0 && <p className="text-xs text-muted-foreground">No recent activity</p>}
      </div>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="flex items-center justify-center h-16">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

function WidgetError() {
  return (
    <div className="flex items-center justify-center h-16 text-xs text-muted-foreground">
      Unable to load — try again later
    </div>
  );
}