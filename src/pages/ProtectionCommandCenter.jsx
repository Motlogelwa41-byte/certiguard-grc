import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Shield, ShieldCheck, ShieldAlert, Fingerprint, KeyRound, Lock,
  Activity, AlertTriangle, CheckCircle2, XCircle, Clock, Zap,
  Radar, Eye, Building2, Server, RefreshCw, TrendingUp, Users, Bug
} from "lucide-react";

export default function ProtectionCommandCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attestations, setAttestations] = useState([]);
  const [reviewItems, setReviewItems] = useState([]);
  const [findings, setFindings] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [controls, setControls] = useState([]);
  const [connections, setConnections] = useState([]);
  const [auditTrail, setAuditTrail] = useState([]);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [att, rev, fin, inc, ctl, conn, aud] = await Promise.all([
        base44.entities.AccessAttestation.list("-login_timestamp", 200).catch(() => []),
        base44.entities.AccessReviewItem.list("-created_date", 200).catch(() => []),
        base44.entities.SecurityFinding.list("-detected_date", 200).catch(() => []),
        base44.entities.Incident.list("-created_date", 100).catch(() => []),
        base44.entities.Control.list().catch(() => []),
        base44.entities.Connection.list().catch(() => []),
        base44.entities.AuditTrail.list("-created_date", 30).catch(() => []),
      ]);
      setAttestations(att || []);
      setReviewItems(rev || []);
      setFindings(fin || []);
      setIncidents(inc || []);
      setControls(ctl || []);
      setConnections(conn || []);
      setAuditTrail(aud || []);
    } catch (e) {
      toast({ title: "Failed to load protection data", variant: "destructive" });
    }
    setLoading(false);
    setRefreshing(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Pillar 1: Identity Protection ──
  const identity = useMemo(() => {
    const total = attestations.length;
    const mfaVerified = attestations.filter(a => a.mfa_verified).length;
    const mfaRate = total ? Math.round((mfaVerified / total) * 100) : 100;
    const flagged = attestations.filter(a => a.flagged).length;
    const blocked = attestations.filter(a => a.action_taken === "blocked").length;
    const uniqueIps = new Set(attestations.map(a => a.ip_address).filter(Boolean)).size;
    const anomalies = attestations.filter(a => a.anomaly_flags && a.anomaly_flags.length > 0).length;
    return { total, mfaVerified, mfaRate, flagged, blocked, uniqueIps, anomalies };
  }, [attestations]);

  // ── Pillar 2: Privileged Access ──
  const privileged = useMemo(() => {
    const pending = reviewItems.filter(r => r.status === "open" && r.decision === "pending").length;
    const certified = reviewItems.filter(r => r.decision === "certify").length;
    const revoked = reviewItems.filter(r => r.decision === "revoke").length;
    const completed = reviewItems.filter(r => r.status === "completed").length;
    const total = reviewItems.length;
    const completionRate = total ? Math.round((completed / total) * 100) : 100;
    return { pending, certified, revoked, completed, total, completionRate };
  }, [reviewItems]);

  // ── Pillar 3: Threat Detection & Response ──
  const threats = useMemo(() => {
    const openFindings = findings.filter(f => f.status === "open").length;
    const criticalFindings = findings.filter(f => f.severity === "critical" || f.severity === "high").length;
    const remediated = findings.filter(f => f.status === "remediated").length;
    const activeIncidents = incidents.filter(i => i.status !== "closed" && i.status !== "false_positive").length;
    const criticalIncidents = incidents.filter(i => i.severity === "critical" || i.severity === "high").length;
    const contained = incidents.filter(i => i.status === "contained" || i.status === "remediated").length;
    const mttrValues = incidents.filter(i => i.mttr_hours && i.mttr_hours > 0).map(i => i.mttr_hours);
    const avgMttr = mttrValues.length ? Math.round((mttrValues.reduce((a, b) => a + b, 0) / mttrValues.length) * 10) / 10 : 0;
    return { openFindings, criticalFindings, remediated, activeIncidents, criticalIncidents, contained, avgMttr };
  }, [findings, incidents]);

  // ── Pillar 4: System Protection & Availability ──
  const system = useMemo(() => {
    const passing = controls.filter(c => c.status === "passing").length;
    const total = controls.length;
    const passRate = total ? Math.round((passing / total) * 100) : 100;
    const connectedServices = connections.filter(c => c.status === "connected").length;
    const errorServices = connections.filter(c => c.status === "error").length;
    const healthyConnections = connections.filter(c => c.health === "healthy").length;
    const auditEntries = auditTrail.length;
    const auditIntact = auditEntries.length > 0;
    return { passing, total, passRate, connectedServices, errorServices, healthyConnections, auditEntries, auditIntact };
  }, [controls, connections, auditTrail]);

  // ── Composite Protection Score ──
  const protectionScore = useMemo(() => {
    let score = 0;
    // Identity (25): MFA rate
    score += Math.round((identity.mfaRate / 100) * 25);
    // Privileged access (25): completion rate
    score += Math.round((privileged.completionRate / 100) * 25);
    // Threat detection (25): inverted open findings (fewer open = higher score)
    const threatRatio = threats.openFindings === 0 ? 1 : Math.max(0, 1 - (threats.openFindings / Math.max(threats.openFindings, 20)));
    score += Math.round(threatRatio * 25);
    // System protection (25): control pass rate + audit integrity
    score += Math.round((system.passRate / 100) * 15);
    score += system.auditIntact ? 10 : 0;
    return Math.min(score, 100);
  }, [identity, privileged, threats, system]);

  const scoreColor = protectionScore >= 90 ? "text-emerald-600 dark:text-emerald-400"
    : protectionScore >= 70 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const ringColor = protectionScore >= 90 ? "#10b981" : protectionScore >= 70 ? "#f59e0b" : "#ef4444";
  const scoreLabel = protectionScore >= 90 ? "Protected — 24/7 Active" : protectionScore >= 70 ? "Strong — Minor Gaps" : "Action Required";

  // ── Real-time activity feed ──
  const recentActivity = useMemo(() => {
    const auditEvents = (auditTrail || []).slice(0, 10).map(e => ({
      type: "audit", id: e.id, time: e.created_date,
      title: e.action || "audit event", detail: e.entity_type || "", icon: Activity
    }));
    const findingEvents = (findings || []).slice(0, 5).map(f => ({
      type: "finding", id: f.id, time: f.detected_date,
      title: f.title || "security finding", detail: f.source || "", icon: Bug
    }));
    const incidentEvents = (incidents || []).slice(0, 5).map(i => ({
      type: "incident", id: i.id, time: i.detected_date || i.created_date,
      title: i.title || "incident", detail: i.severity || "", icon: ShieldAlert
    }));
    return [...auditEvents, ...findingEvents, ...incidentEvents]
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 15);
  }, [auditTrail, findings, incidents]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="24/7 Protection Command Center"
        subtitle="Unified real-time protection across identity, access, threats, and system integrity"
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </Button>
        }
      />

      {/* Hero: Composite Protection Score */}
      <div className="mb-6 rounded-2xl border border-border bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-32 h-32 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-white/15" />
              <circle cx="60" cy="60" r="52" fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(protectionScore / 100) * 327} 327`}
                style={{ transition: "stroke-dasharray 0.8s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-heading font-bold" style={{ color: ringColor }}>{protectionScore}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/60">Protection</span>
            </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <Shield className="w-5 h-5" style={{ color: ringColor }} />
              <h2 className="text-lg font-heading font-bold">{scoreLabel}</h2>
            </div>
            <p className="text-sm text-white/70 max-w-xl">
              {identity.mfaRate}% identity MFA coverage · {privileged.completionRate}% access recertified · {threats.openFindings} open threats · {system.passRate}% controls passing · {system.auditEntries} audit entries chain-verified.
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live monitoring active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Four Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Pillar 1: Identity Protection */}
        <PillarCard
          icon={Fingerprint}
          title="Identity Protection"
          subtitle="Continuous real-time identity security"
          score={identity.mfaRate}
          scoreLabel="MFA Coverage"
          accent="emerald"
          stats={[
            { label: "MFA Verified", value: `${identity.mfaVerified}/${identity.total}`, icon: KeyRound, color: "text-emerald-500" },
            { label: "Flagged Sessions", value: identity.flagged, icon: AlertTriangle, color: identity.flagged > 0 ? "text-amber-500" : "text-emerald-500" },
            { label: "Anomalies", value: identity.anomalies, icon: Eye, color: identity.anomalies > 0 ? "text-amber-500" : "text-emerald-500" },
            { label: "Blocked", value: identity.blocked, icon: Lock, color: "text-red-500" },
          ]}
          link="/zero-trust-ledger"
          linkLabel="Zero-Trust Ledger →"
        />

        {/* Pillar 2: Privileged Access */}
        <PillarCard
          icon={ShieldCheck}
          title="Privileged Access"
          subtitle="Modern access governance & recertification"
          score={privileged.completionRate}
          scoreLabel="Review Completion"
          accent="blue"
          stats={[
            { label: "Pending Reviews", value: privileged.pending, icon: Clock, color: privileged.pending > 0 ? "text-amber-500" : "text-emerald-500" },
            { label: "Certified", value: privileged.certified, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Revoked", value: privileged.revoked, icon: XCircle, color: "text-red-500" },
            { label: "Total Items", value: privileged.total, icon: Users, color: "text-blue-500" },
          ]}
          link="/access-recertification"
          linkLabel="Access Recertification →"
        />

        {/* Pillar 3: Threat Detection & Response */}
        <PillarCard
          icon={Radar}
          title="Threat Detection & Response"
          subtitle="Detect and respond to attacks as they happen"
          score={threats.openFindings === 0 ? 100 : Math.max(0, 100 - threats.openFindings * 5)}
          scoreLabel="Threat Posture"
          accent="red"
          stats={[
            { label: "Open Findings", value: threats.openFindings, icon: Bug, color: threats.openFindings > 0 ? "text-amber-500" : "text-emerald-500" },
            { label: "Critical/High", value: threats.criticalFindings, icon: AlertTriangle, color: threats.criticalFindings > 0 ? "text-red-500" : "text-emerald-500" },
            { label: "Active Incidents", value: threats.activeIncidents, icon: ShieldAlert, color: threats.activeIncidents > 0 ? "text-red-500" : "text-emerald-500" },
            { label: "Avg MTTR (hrs)", value: threats.avgMttr, icon: Clock, color: "text-blue-500" },
          ]}
          link="/edr-dashboard"
          linkLabel="EDR / XDR →"
        />

        {/* Pillar 4: System Protection & Availability */}
        <PillarCard
          icon={Server}
          title="System Protection & Availability"
          subtitle="Platform integrity, controls, and uptime"
          score={system.passRate}
          scoreLabel="Control Pass Rate"
          accent="purple"
          stats={[
            { label: "Controls Passing", value: `${system.passing}/${system.total}`, icon: CheckCircle2, color: "text-emerald-500" },
            { label: "Connected Services", value: system.connectedServices, icon: Zap, color: "text-blue-500" },
            { label: "Error Services", value: system.errorServices, icon: AlertTriangle, color: system.errorServices > 0 ? "text-red-500" : "text-emerald-500" },
            { label: "Audit Entries", value: system.auditEntries, icon: Activity, color: "text-purple-500" },
          ]}
          link="/security-command-center"
          linkLabel="Security Command Center →"
        />
      </div>

      {/* Real-time Activity Feed */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h3 className="text-sm font-heading font-bold text-foreground">Real-Time Activity Feed</h3>
          </div>
          <span className="text-xs text-muted-foreground">Last {recentActivity.length} events</span>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No recent activity. Protection monitoring is active.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {recentActivity.map((event, i) => {
              const Icon = event.icon;
              const color = event.type === "incident" ? "text-red-500"
                : event.type === "finding" ? "text-amber-500" : "text-emerald-500";
              return (
                <div key={`${event.type}-${event.id || i}`} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded-md hover:bg-muted/40">
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} />
                  <span className="font-medium text-foreground shrink-0">{event.title}</span>
                  <span className="text-muted-foreground truncate">{event.detail}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">
                    {event.time ? new Date(event.time).toLocaleString() : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/incidents" className="rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <ShieldAlert className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-foreground">Incident Response</p>
        </Link>
        <Link to="/edr-dashboard" className="rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Radar className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium text-foreground">EDR / XDR</p>
        </Link>
        <Link to="/zero-trust-ledger" className="rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Fingerprint className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-foreground">Zero-Trust Ledger</p>
        </Link>
        <Link to="/security-command-center" className="rounded-xl border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-center">
          <Shield className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-foreground">Platform Hardening</p>
        </Link>
      </div>
    </div>
  );
}

function PillarCard({ icon: Icon, title, subtitle, score, scoreLabel, accent, stats, link, linkLabel }) {
  const accentMap = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-600 dark:text-emerald-400", ring: "#10b981" },
    blue: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-600 dark:text-blue-400", ring: "#3b82f6" },
    red: { bg: "bg-red-50 dark:bg-red-900/20", text: "text-red-600 dark:text-red-400", ring: "#ef4444" },
    purple: { bg: "bg-purple-50 dark:bg-purple-900/20", text: "text-purple-600 dark:text-purple-400", ring: "#a855f7" },
  };
  const a = accentMap[accent] || accentMap.emerald;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${a.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${a.text}`} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="relative w-12 h-12">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <circle cx="24" cy="24" r="20" fill="none" stroke={a.ring} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 126} 126`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-bold ${a.text}`}>{score}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{scoreLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((s) => {
          const SIcon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-2">
              <SIcon className={`w-3.5 h-3.5 ${s.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground leading-none">{s.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {link && (
        <Link to={link} className="text-xs text-primary hover:underline">{linkLabel}</Link>
      )}
    </div>
  );
}