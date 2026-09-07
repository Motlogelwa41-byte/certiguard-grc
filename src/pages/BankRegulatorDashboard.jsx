import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Landmark, Shield, AlertTriangle, FileCheck, FileX, Clock, TrendingDown,
  CheckCircle2, XCircle, AlertCircle, ArrowRight, FileDown, CalendarClock,
  Building2, Scale, Briefcase, Percent, Activity, Eye, Bell, ChevronRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import ComplianceScoreRing from "@/components/dashboard/ComplianceScoreRing";
import { Button } from "@/components/ui/button";

export default function BankRegulatorDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    frameworks: [],
    controls: [],
    risks: [],
    evidence: [],
    auditFindings: [],
    tasks: [],
    incidents: [],
    filings: [],
    certifications: [],
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        frameworks, controls, risks, evidence, auditFindings,
        tasks, incidents, filings, certifications,
      ] = await Promise.all([
        base44.entities.Framework.list('-updated_date', 200).catch(() => []),
        base44.entities.Control.list('-updated_date', 500).catch(() => []),
        base44.entities.Risk.list('-risk_score', 200).catch(() => []),
        base44.entities.Evidence.list('-expiry_date', 500).catch(() => []),
        base44.entities.AuditFinding.list('-updated_date', 200).catch(() => []),
        base44.entities.ComplianceTask.list('-due_date', 200).catch(() => []),
        base44.entities.Incident.list('-updated_date', 100).catch(() => []),
        base44.entities.RegulatoryFiling.list('-due_date', 100).catch(() => []),
        base44.entities.Certification.list('-updated_date', 100).catch(() => []),
      ]);
      setData({ frameworks, controls, risks, evidence, auditFindings, tasks, incidents, filings, certifications });
    } catch (e) {
      // best-effort
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const { frameworks, controls, risks, evidence, auditFindings, tasks, incidents, filings, certifications } = data;

  // --- Compliance Health Score ---
  const passingControls = controls.filter((c) => c.status === "passing").length;
  const controlScore = controls.length ? Math.round((passingControls / controls.length) * 100) : 0;
  const fwScore = frameworks.length
    ? Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / frameworks.length)
    : 0;
  const complianceScore = frameworks.length ? Math.round(controlScore * 0.6 + fwScore * 0.4) : controlScore;
  const healthVerdict =
    complianceScore >= 85 ? "Strong" : complianceScore >= 70 ? "Adequate" : complianceScore >= 50 ? "Weak" : "Critical";
  const readinessGrade =
    complianceScore >= 90 ? "A" : complianceScore >= 80 ? "B" : complianceScore >= 70 ? "C" : complianceScore >= 60 ? "D" : "F";

  // --- Critical Areas Needing Immediate Attention ---
  const overdueTasks = tasks.filter((t) => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "done" && t.status !== "completed"));
  const missingEvidence = evidence.filter((e) => e.missing_evidence || e.status === "missing");
  const expiredEvidence = evidence.filter((e) => e.status === "expired");
  const expiringEvidence = evidence.filter((e) => {
    if (!e.expiry_date || e.status === "approved") return false;
    const days = (new Date(e.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 30;
  });
  const openFindings = auditFindings.filter((f) => f.status === "open" || f.status === "in_progress");
  const criticalFindings = openFindings.filter((f) => f.severity === "critical" || f.severity === "high");
  const openIncidents = incidents.filter((i) => i.status !== "closed" && i.status !== "false_positive");
  const criticalRisks = risks.filter((r) =>
    (r.status === "open" || r.status === "mitigating") &&
    (r.risk_score >= 16 || ["above_appetite", "unacceptable"].includes(r.appetite_band) || r.exceeds_tolerance)
  );
  const overdueFilings = filings.filter((f) => f.status === "overdue" || (f.due_date && new Date(f.due_date) < new Date() && f.status !== "submitted" && f.status !== "acknowledged"));

  const criticalItems = [
    ...overdueTasks.slice(0, 5).map((t) => ({ type: "Overdue Task", title: t.title, detail: `Due ${t.due_date}`, severity: "high", link: "/tasks" })),
    ...missingEvidence.slice(0, 5).map((e) => ({ type: "Missing Evidence", title: e.title, detail: e.control_title || "Unlinked", severity: "critical", link: "/evidence" })),
    ...expiredEvidence.slice(0, 3).map((e) => ({ type: "Expired Evidence", title: e.title, detail: `Expired ${e.expiry_date || ""}`, severity: "critical", link: "/evidence" })),
    ...criticalFindings.slice(0, 5).map((f) => ({ type: "Audit Finding", title: f.title || f.finding_id, detail: f.severity, severity: "high", link: "/audit-findings" })),
    ...criticalRisks.slice(0, 5).map((r) => ({ type: "Critical Risk", title: r.title, detail: `Score ${r.risk_score}`, severity: "critical", link: "/risks" })),
    ...overdueFilings.slice(0, 3).map((f) => ({ type: "Overdue Filing", title: f.filing_name, detail: `Due ${f.due_date}`, severity: "high", link: "/regulatory-filings" })),
  ].sort((a, b) => (a.severity === "critical" ? -1 : 1));

  // --- Banking-Specific Regulatory Frameworks ---
  const bankingFrameworks = frameworks.filter((f) =>
    /SARB|FSCA|POPIA|Basel|King|Banks Act|FSRA|Solvency|AML|FIC|NCA|FAIS/i.test(f.name || f.code || "")
  );
  const otherFrameworks = frameworks.filter((f) => !bankingFrameworks.includes(f));

  // --- Certification Status ---
  const activeCerts = certifications.filter((c) => c.status === "active" || c.status === "certified");
  const expiringCerts = certifications.filter((c) => {
    if (!c.expiry_date) return false;
    const days = (new Date(c.expiry_date) - new Date()) / (1000 * 60 * 60 * 24);
    return days > 0 && days <= 90;
  });

  // --- Risk Appetite vs Tolerance ---
  const aboveAppetite = risks.filter((r) => ["above_appetite", "unacceptable"].includes(r.appetite_band)).length;

  // Critical security gaps by category (failing controls grouped)
  const failingControls = controls.filter((c) => c.status === "failing");
  const gapsByCategory = failingControls.reduce((acc, c) => {
    const cat = (c.category || "uncategorized").replace(/_/g, " ");
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  const sortedGaps = Object.entries(gapsByCategory).sort(([, a], [, b]) => b - a);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regulator Dashboard"
        subtitle="Executive compliance health overview for banking regulators — SARB, FSCA, and Information Regulator readiness."
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileDown className="w-4 h-4 mr-1.5" /> Export
          </Button>
        }
      />

      {/* Hero: Compliance Health Score */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[hsl(222_47%_11%)] via-[hsl(217_33%_15%)] to-[hsl(215_28%_9%)] p-6 sm:p-8">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-[hsl(160_84%_37%)]/20 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[hsl(160_84%_60%)] bg-[hsl(160_84%_37%)]/10 border border-[hsl(160_84%_37%)]/25 rounded-full px-3 py-1">
              <Landmark className="w-3.5 h-3.5" /> Banking Regulator View
            </span>
            <h1 className="mt-3 text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">Compliance Health & Readiness</h1>
            <p className="mt-1.5 text-sm text-slate-300 max-w-xl">
              Real-time posture across all regulatory frameworks, controls, evidence, and risk appetite.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400">Overall Health:</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                complianceScore >= 85 ? "text-[hsl(160_84%_55%)] bg-[hsl(160_84%_37%)]/15 border-[hsl(160_84%_37%)]/30"
                : complianceScore >= 70 ? "text-amber-300 bg-amber-500/15 border-amber-400/30"
                : complianceScore >= 50 ? "text-orange-300 bg-orange-500/15 border-orange-400/30"
                : "text-rose-300 bg-rose-500/15 border-rose-400/30"
              }`}>{healthVerdict}</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link to="/audit-readiness-report" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                <CalendarClock className="w-3.5 h-3.5" /> Audit Readiness
              </Link>
              <Link to="/executive-risk-report" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                <TrendingDown className="w-3.5 h-3.5" /> Risk Report
              </Link>
              <Link to="/reports" className="inline-flex items-center gap-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg px-3 py-1.5 transition-colors">
                <FileDown className="w-3.5 h-3.5" /> Full Reports
              </Link>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur text-center">
            <ComplianceScoreRing score={complianceScore} size={140} />
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-400">Readiness Grade</span>
              <span className={`text-lg font-heading font-bold ${
                complianceScore >= 80 ? "text-emerald-400" : complianceScore >= 60 ? "text-amber-400" : "text-rose-400"
              }`}>{readinessGrade}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top-Level Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Compliance Score" value={`${complianceScore}%`} icon={Shield} color={complianceScore >= 80 ? "green" : complianceScore >= 60 ? "amber" : "red"} trendLabel={healthVerdict} />
        <StatCard label="Critical Risks" value={criticalRisks.length} icon={AlertTriangle} color={criticalRisks.length > 0 ? "red" : "green"} trendLabel={`${risks.length} total risks`} />
        <StatCard label="Open Audit Findings" value={openFindings.length} icon={FileX} color={openFindings.length > 0 ? "amber" : "green"} trendLabel={`${criticalFindings.length} high/critical`} />
        <StatCard label="Missing/Expired Evidence" value={missingEvidence.length + expiredEvidence.length} icon={Clock} color={(missingEvidence.length + expiredEvidence.length) > 0 ? "red" : "green"} trendLabel={`${expiringEvidence.length} expiring soon`} />
      </div>

      {/* Critical Areas Needing Immediate Attention */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="font-heading font-semibold text-foreground">Critical Areas Needing Immediate Attention</h3>
          </div>
          <span className="text-xs font-medium text-muted-foreground">{criticalItems.length} items</span>
        </div>
        {criticalItems.length > 0 ? (
          <div className="space-y-2">
            {criticalItems.map((item, i) => (
              <Link key={i} to={item.link} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${item.severity === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.type} · {item.detail}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 py-8 text-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-sm text-muted-foreground">No critical areas — all compliance items are on track.</p>
          </div>
        )}
      </div>

      {/* Critical Security Gaps by Category */}
      {sortedGaps.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">Critical Security Gaps by Category</h3>
            </div>
            <Link to="/controls" className="text-xs text-primary hover:underline flex items-center gap-1">Control register <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedGaps.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <span className="text-sm font-medium text-red-900 capitalize">{cat}</span>
                <span className="text-lg font-heading font-bold text-red-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Banking Regulatory Framework Readiness */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Banking Regulatory Readiness</h3>
            </div>
            <Link to="/frameworks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {bankingFrameworks.length > 0 ? (
            <div className="space-y-3">
              {bankingFrameworks.map((fw) => {
                const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
                return (
                  <div key={fw.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground w-40 truncate">{fw.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                    </div>
                    <span className="text-sm font-semibold text-foreground w-12 text-right">{pct}%</span>
                    <StatusBadge status={fw.status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No banking-specific frameworks tracked. Activate SARB, FSCA, or POPIA frameworks.</p>
          )}
          {otherFrameworks.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mt-5 mb-2">Other Frameworks</p>
              <div className="space-y-2">
                {otherFrameworks.slice(0, 5).map((fw) => {
                  const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
                  return (
                    <div key={fw.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground w-40 truncate">{fw.name}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10B981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span className="text-sm font-semibold text-foreground w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Evidence Submission Status */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Evidence Submission Status</h3>
            </div>
            <Link to="/evidence" className="text-xs text-primary hover:underline flex items-center gap-1">Evidence manager <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <p className="text-xs text-red-700 font-medium">Missing</p>
              </div>
              <p className="text-2xl font-heading font-bold text-red-700 mt-1">{missingEvidence.length}</p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-orange-700 font-medium">Expired</p>
              </div>
              <p className="text-2xl font-heading font-bold text-orange-700 mt-1">{expiredEvidence.length}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <p className="text-xs text-amber-700 font-medium">Expiring ≤30d</p>
              </div>
              <p className="text-2xl font-heading font-bold text-amber-700 mt-1">{expiringEvidence.length}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs text-emerald-700 font-medium">Approved</p>
              </div>
              <p className="text-2xl font-heading font-bold text-emerald-700 mt-1">{evidence.filter((e) => e.status === "approved").length}</p>
            </div>
          </div>
          {expiringEvidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Expiring Soon</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {expiringEvidence.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <span className="text-foreground truncate">{e.title}</span>
                    <span className="text-xs text-amber-600 font-medium shrink-0 ml-3">{e.expiry_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Appetite vs Tolerance */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Risk Appetite</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Within Appetite</span>
              <span className="text-sm font-semibold text-emerald-600">{risks.filter((r) => r.appetite_band === "within_appetite").length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tolerance Zone</span>
              <span className="text-sm font-semibold text-amber-600">{risks.filter((r) => r.appetite_band === "tolerance_zone").length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Above Appetite</span>
              <span className="text-sm font-semibold text-orange-600">{risks.filter((r) => r.appetite_band === "above_appetite").length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Unacceptable</span>
              <span className="text-sm font-semibold text-red-600">{risks.filter((r) => r.appetite_band === "unacceptable").length}</span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${aboveAppetite > 0 ? "text-red-500" : "text-emerald-500"}`} />
                <p className="text-xs text-muted-foreground">
                  {aboveAppetite > 0 ? `${aboveAppetite} risk(s) exceed appetite — regulator notification may be required.` : "All risks within appetite."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Regulatory Filings */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Regulatory Filings</h3>
            </div>
            <Link to="/regulatory-filings" className="text-xs text-primary hover:underline flex items-center gap-1">View <ArrowRight className="w-3 h-3" /></Link>
          </div>
          {filings.length > 0 ? (
            <div className="space-y-2">
              {filings.slice(0, 5).map((f) => (
                <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{f.filing_name}</p>
                    <p className="text-xs text-muted-foreground">{f.regulator} · Due {f.due_date || "—"}</p>
                  </div>
                  <StatusBadge status={f.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No regulatory filings tracked.</p>
          )}
        </div>

        {/* Certifications */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Percent className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Certifications</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
              <p className="text-xs text-emerald-700 font-medium">Active</p>
              <p className="text-xl font-heading font-bold text-emerald-700 mt-0.5">{activeCerts.length}</p>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-xs text-amber-700 font-medium">Expiring ≤90d</p>
              <p className="text-xl font-heading font-bold text-amber-700 mt-0.5">{expiringCerts.length}</p>
            </div>
          </div>
          {activeCerts.length > 0 ? (
            <div className="space-y-2">
              {activeCerts.slice(0, 4).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground truncate">{c.name || c.certification_id}</span>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No active certifications.</p>
          )}
        </div>
      </div>

      {/* Incident Summary */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Incident & Breach Summary</h3>
          </div>
          <Link to="/incidents" className="text-xs text-primary hover:underline flex items-center gap-1">Incident register <ArrowRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Open Incidents</p>
            <p className="text-2xl font-heading font-bold text-foreground mt-1">{openIncidents.length}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-xs text-red-700">Critical/High</p>
            <p className="text-2xl font-heading font-bold text-red-700 mt-1">{openIncidents.filter((i) => i.severity === "critical" || i.severity === "high").length}</p>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">Regulator Notified</p>
            <p className="text-2xl font-heading font-bold text-foreground mt-1">{incidents.filter((i) => i.notify_regulator).length}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
            <p className="text-xs text-emerald-700">Resolved/Closed</p>
            <p className="text-2xl font-heading font-bold text-emerald-700 mt-1">{incidents.filter((i) => i.status === "closed" || i.status === "remediated").length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}