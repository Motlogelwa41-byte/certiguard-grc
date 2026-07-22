import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  TrendingDown, ShieldAlert, Gauge, AlertTriangle, Target, ChevronRight,
  Activity, ShieldCheck, FileCheck, ClipboardList
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

function parseJson(str, fallback) {
  try { const v = JSON.parse(str); return v || fallback; } catch { return fallback; }
}

const sevRank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
const sevTone = {
  critical: "bg-red-500/10 text-red-600 border-red-500/30",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  info: "bg-slate-500/10 text-slate-500 border-slate-500/30"
};

function maturityLabel(lvl) {
  if (!lvl) return "Not Assessed";
  if (lvl >= 4.5) return "Optimized";
  if (lvl >= 3.5) return "Quantitatively Managed";
  if (lvl >= 2.5) return "Defined";
  if (lvl >= 1.5) return "Managed";
  return "Initial";
}
function maturityColor(lvl) {
  if (!lvl) return "text-slate-400";
  if (lvl >= 4) return "text-emerald-600";
  if (lvl >= 3) return "text-blue-600";
  if (lvl >= 2) return "text-amber-600";
  return "text-red-600";
}

function MetricCard({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${tone || "bg-primary/10 text-primary"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-heading font-bold text-foreground leading-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {sub && <div className="text-xs text-muted-foreground/80 mt-1">{sub}</div>}
      </div>
    </div>
  );
}

export default function ExecutiveRiskReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [assessments, findings, risks, frameworks, controls] = await Promise.all([
          base44.entities.MaturityAssessment.list("-assessment_date", 10),
          base44.entities.SecurityFinding.list("-created_date", 200),
          base44.entities.Risk.list("-updated_date", 200),
          base44.entities.Framework.list("-updated_date", 50),
          base44.entities.Control.list("-updated_date", 500),
        ]);
        setData({ assessments, findings, risks, frameworks, controls });
      } catch (e) {
        console.error("ExecutiveRiskReport load error", e);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <EmptyState icon={AlertTriangle} title="Unable to load report" description="Could not fetch executive risk data." />;
  }

  const latest = data.assessments[0] || null;
  const overall = latest?.overall_level || 0;
  const target = latest?.target_level || 0;
  const domains = parseJson(latest?.domain_scores, []);
  const roadmap = parseJson(latest?.roadmap, []);

  const findings = (data.findings || []).slice().sort((a, b) => (sevRank[b.severity] || 0) - (sevRank[a.severity] || 0));
  const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_progress");
  const criticalHigh = openFindings.filter((f) => f.severity === "critical" || f.severity === "high");
  const topFindings = criticalHigh.slice(0, 8);

  const risks = (data.risks || []).slice().sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating");
  const aboveAppetite = openRisks.filter(
    (r) => r.exceeds_tolerance || r.appetite_band === "above_appetite" || r.appetite_band === "unacceptable"
  );
  const topRisks = openRisks.slice(0, 6);

  const passing = data.controls.filter((c) => c.status === "passing").length;
  const failing = data.controls.filter((c) => c.status === "failing").length;
  const score = data.controls.length ? Math.round((passing / data.controls.length) * 100) : 0;
  const auditReady = data.frameworks.filter((f) => f.status === "audit_ready" || f.status === "certified").length;
  const certifiedFw = data.frameworks.filter((f) => f.status === "certified").length;

  const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`;
  const scoreTone = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";

  return (
    <div>
      <PageHeader
        title="Executive Risk Report"
        subtitle={`${quarter} compliance maturity & top security findings — high-level view for leadership`}
        actions={
          <Link to="/executive-risk-summary" className="text-sm text-primary hover:underline flex items-center gap-1">
            Detailed risk summary <ChevronRight className="w-4 h-4" />
          </Link>
        }
      />

      {/* Executive summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard icon={Gauge} label="Compliance Maturity" value={overall ? `${overall.toFixed(1)} / 5` : "—"}
          sub={maturityLabel(overall)} tone={overall >= 3 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"} />
        <MetricCard icon={ShieldCheck} label="Compliance Score" value={`${score}%`}
          sub={`${passing} passing · ${failing} failing of ${data.controls.length} controls`} tone={`${scoreTone.replace("text-", "bg-").replace("-600", "-500/10")} ${scoreTone}`} />
        <MetricCard icon={ShieldAlert} label="Open High/Critical Findings" value={criticalHigh.length}
          sub={`${openFindings.length} total open findings`} tone="bg-red-500/10 text-red-600" />
        <MetricCard icon={TrendingDown} label="Risks Above Appetite" value={aboveAppetite.length}
          sub={`${openRisks.length} open risks tracked`} tone={aboveAppetite.length ? "bg-orange-500/10 text-orange-600" : "bg-emerald-500/10 text-emerald-600"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Compliance maturity */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              <h2 className="text-base font-heading font-semibold text-foreground">Quarterly Compliance Maturity</h2>
            </div>
            {latest && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{latest.name}</div>
                <div className={`text-sm font-semibold ${maturityColor(overall)}`}>
                  Level {overall ? overall.toFixed(1) : "—"} · {maturityLabel(overall)}
                </div>
              </div>
            )}
          </div>

          {!latest ? (
            <EmptyState icon={Gauge} title="No maturity assessment on record" description="Run a self-assessment in GRC Education to populate this report." />
          ) : (
            <>
              {/* Overall vs target bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Current maturity</span>
                  <span>Target: {target ? target.toFixed(1) : "—"}</span>
                </div>
                <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(overall / 5) * 100}%` }} />
                  {target > 0 && (
                    <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/60" style={{ left: `${(target / 5) * 100}%` }} />
                  )}
                </div>
              </div>

              {/* Domain breakdown */}
              {domains.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Domain Scores</div>
                  {domains.map((d, i) => {
                    const cur = d.current_level || 0;
                    const tgt = d.target_level || 0;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground font-medium">{d.domain_name || d.domain}</span>
                          <span className="text-muted-foreground text-xs">
                            <span className={maturityColor(cur)}>{cur.toFixed(1)}</span>
                            <span className="mx-1">/</span>
                            <span>{tgt.toFixed(1)}</span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(cur / 5) * 100}%` }} />
                          {tgt > 0 && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/50" style={{ left: `${(tgt / 5) * 100}%` }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {roadmap.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Priority Improvement Actions</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roadmap.slice(0, 4).map((r, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-muted/40 border border-border">
                        <span className={`mt-0.5 text-xs font-semibold px-2 py-0.5 rounded ${r.priority === "critical" || r.priority === "high" ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {r.priority || "med"}
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm text-foreground font-medium leading-snug">{r.title}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {r.domain_name || r.domain} · {r.current_level || 0}→{r.target_level || 0}
                            {r.due_date ? ` · due ${r.due_date}` : ""}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Framework & risk snapshot */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck className="w-5 h-5 text-primary" />
              <h2 className="text-base font-heading font-semibold text-foreground">Framework Posture</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-2xl font-heading font-bold text-foreground">{auditReady}</div>
                <div className="text-xs text-muted-foreground">Audit-ready / Certified</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-2xl font-heading font-bold text-emerald-600">{certifiedFw}</div>
                <div className="text-xs text-muted-foreground">Certified</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-2xl font-heading font-bold text-foreground">{data.frameworks.length}</div>
                <div className="text-xs text-muted-foreground">Frameworks tracked</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-2xl font-heading font-bold text-amber-600">{data.frameworks.filter((f) => f.status === "in_progress").length}</div>
                <div className="text-xs text-muted-foreground">In progress</div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-base font-heading font-semibold text-foreground">Top Open Risks</h2>
            </div>
            {topRisks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open risks.</p>
            ) : (
              <div className="space-y-3">
                {topRisks.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground font-medium truncate">{r.title}</div>
                      <div className="text-xs text-muted-foreground">{r.owner_name || "Unassigned"} · {r.category}</div>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded ${r.risk_score >= 16 ? "bg-red-500/10 text-red-600" : r.risk_score >= 9 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                      {r.risk_score || 0}
                    </span>
                  </div>
                ))}
                <Link to="/risks" className="text-xs text-primary hover:underline flex items-center gap-1 pt-1">
                  View full risk register <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top security findings */}
      <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <h2 className="text-base font-heading font-semibold text-foreground">Top Security Findings (High & Critical)</h2>
          </div>
          <Link to="/vulnerabilities" className="text-xs text-primary hover:underline flex items-center gap-1">
            All findings <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {topFindings.length === 0 ? (
          <div className="px-6 py-10">
            <EmptyState icon={ShieldCheck} title="No high or critical findings open" description="All high-severity findings are remediated or none detected." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Finding</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Source / Asset</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Detected</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                </tr>
              </thead>
              <tbody>
                {topFindings.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{f.title}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${sevTone[f.severity] || sevTone.info}`}>
                        {(f.severity || "").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      <div>{f.source || "—"}</div>
                      {f.asset && <div className="text-foreground/70">{f.asset}</div>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{f.detected_date || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{f.owner_name || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="w-3.5 h-3.5" />
        <span>Generated {new Date().toLocaleString()} · {quarter} · CertiGuard GRC</span>
      </div>
    </div>
  );
}