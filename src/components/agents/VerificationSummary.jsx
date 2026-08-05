import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

export default function VerificationSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const run = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [controls, risks, tasks, findings, vendors, frameworks] = await Promise.all([
        base44.entities.Control.list('-created_date', 200),
        base44.entities.Risk.list('-created_date', 200),
        base44.entities.ComplianceTask.list('-created_date', 200),
        base44.entities.SecurityFinding.list('-created_date', 200),
        base44.entities.Vendor.list('-created_date', 200),
        base44.entities.Framework.list('-created_date', 50),
      ]);

      const failing = controls.filter(c => c.status === "failing").length;
      const passing = controls.filter(c => c.status === "passing").length;
      const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== "completed").length;
      const openCritical = findings.filter(f => (f.severity === "critical" || f.severity === "high") && f.status === "open").length;
      const pendingVendors = vendors.filter(v => v.status === "pending_review" || v.status === "under_review").length;
      const riskScoreOk = risks.every(r => r.risk_score === (r.likelihood || 0) * (r.impact || 0));

      setData({
        totals: { controls: controls.length, risks: risks.length, tasks: tasks.length, findings: findings.length, vendors: vendors.length, frameworks: frameworks.length },
        failing, passing, overdue, openCritical, pendingVendors, riskScoreOk,
      });
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { run(); }, []);

  const stats = data ? [
    { label: "Controls Passing", value: data.passing, total: data.totals.controls, icon: CheckCircle2, tone: "emerald" },
    { label: "Controls Failing", value: data.failing, icon: XCircle, tone: data.failing > 0 ? "red" : "muted" },
    { label: "Overdue Tasks", value: data.overdue, icon: AlertTriangle, tone: data.overdue > 0 ? "amber" : "muted" },
    { label: "Open Critical Findings", value: data.openCritical, icon: ShieldAlert, tone: data.openCritical > 0 ? "red" : "muted" },
    { label: "Vendors Pending Review", value: data.pendingVendors, icon: ShieldCheck, tone: data.pendingVendors > 0 ? "amber" : "muted" },
    { label: "Risk Scores Valid", value: data.riskScoreOk ? "✓" : "✗", icon: data.riskScoreOk ? CheckCircle2 : XCircle, tone: data.riskScoreOk ? "emerald" : "red" },
  ] : [];

  const toneClasses = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    muted: "text-muted-foreground bg-muted/40 border-border",
  };

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground">Live Verification Snapshot</h3>
            <p className="text-[11px] text-muted-foreground">Auto-checked against your GRC data</p>
          </div>
        </div>
        <button onClick={run} disabled={loading} className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
          ))
        ) : (
          stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-lg border px-3 py-2.5 ${toneClasses[s.tone]}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-medium uppercase tracking-wider truncate">{s.label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums">
                  {s.value}{s.total !== undefined && <span className="text-xs font-normal text-muted-foreground">/{s.total}</span>}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}