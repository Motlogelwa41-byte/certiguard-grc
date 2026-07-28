import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, GraduationCap, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MATURITY_LEVELS, GRC_DOMAINS } from "@/lib/grcMaturity";
import MaturityRadarChart from "@/components/maturity/MaturityRadarChart";

const parseArr = (s) => {
  try { return JSON.parse(s || "[]"); } catch { return []; }
};
const lvlMeta = (n) => MATURITY_LEVELS[(Math.round(n || 1)) - 1] || MATURITY_LEVELS[0];

export default function MaturityDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.MaturityAssessment.list("-created_date", 100),
      base44.entities.Framework.list("-updated_date", 200),
      base44.entities.Control.list("-updated_date", 500),
    ])
      .then(([list, fw, ctl]) => {
        const sorted = [...(list || [])].sort((a, b) =>
          (a.assessment_date || a.created_date || "").localeCompare(b.assessment_date || b.created_date || "")
        );
        setAssessments(sorted);
        setFrameworks(fw || []);
        setControls(ctl || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const latest = assessments.length ? assessments[assessments.length - 1] : null;
  const first = assessments.length ? assessments[0] : null;

  const trendData = useMemo(
    () => assessments.map((a, i) => ({
      label: a.assessment_date ? a.assessment_date.slice(5) : `A${i + 1}`,
      name: a.name || `Assessment ${i + 1}`,
      Current: a.overall_level || 1,
      Target: a.target_level || 3,
    })),
    [assessments]
  );

  const latestDomains = latest ? parseArr(latest.domain_scores) : [];

  // Derived maturity from framework implementation progress
  const fwStageMap = { not_started: 1, in_progress: 3, audit_ready: 4, certified: 5 };
  const frameworkMaturity = useMemo(() => {
    const fwWithStage = frameworks.map((f) => {
      const fControls = controls.filter((c) => (c.framework_ids || []).includes(f.id));
      const passing = fControls.filter((c) => c.status === "passing").length;
      const readiness = fControls.length ? Math.round((passing / fControls.length) * 100) : (f.readiness_score || 0);
      const stage = fwStageMap[f.status] || 1;
      return { ...f, stage, readiness, controlCount: fControls.length, passing };
    });
    const avgStage = fwWithStage.length
      ? Math.round((fwWithStage.reduce((s, f) => s + f.stage, 0) / fwWithStage.length) * 10) / 10
      : 0;
    return { fwWithStage, avgStage };
  }, [frameworks, controls]);
  const fwStageMeta = lvlMeta(frameworkMaturity.avgStage || 1);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!latest) {
    return (
      <div>
        <PageHeader title="Maturity Model Dashboard" subtitle="Track how your compliance posture evolves across security maturity stages over time." />
        <EmptyState
          icon={GraduationCap}
          title="No maturity assessments yet"
          description="Run your first GRC maturity assessment to start tracking your evolution across the five maturity stages."
          actionLabel="Go to GRC Education"
          onAction={() => { window.location.href = "/grc-education"; }}
        />
      </div>
    );
  }

  const currentLevel = Math.round(latest.overall_level || 1);
  const targetLevel = Math.round(latest.target_level || 3);
  const meta = lvlMeta(currentLevel);
  const delta = first ? (latest.overall_level || 1) - (first.overall_level || 1) : 0;

  return (
    <div>
      <PageHeader
        title="Maturity Model Dashboard"
        subtitle="Track compliance evolution across the five security maturity stages over time."
        actions={<Button asChild><Link to="/grc-education">Run new assessment</Link></Button>}
      />

      {/* Stage progression summary */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Current Stage</div>
            <div className="text-4xl font-bold mt-1" style={{ color: meta.color }}>{currentLevel}</div>
            <Badge variant="secondary" className="mt-1" style={{ color: meta.color }}>{meta.name}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Target Stage</div>
            <div className="text-4xl font-bold mt-1">{targetLevel}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {targetLevel > currentLevel ? `${targetLevel - currentLevel} level${targetLevel - currentLevel > 1 ? "s" : ""} to close` : "At target"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Assessments Run</div>
            <div className="text-4xl font-bold mt-1">{assessments.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{latest.assessment_date ? `latest ${latest.assessment_date}` : ""}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <div className="text-xs text-muted-foreground">Trajectory</div>
            <div className={`text-4xl font-bold mt-1 ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">since first assessment</div>
          </CardContent>
        </Card>
      </div>

      {/* Maturity stages ladder */}
      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Security Maturity Stages</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {MATURITY_LEVELS.map((l) => {
              const reached = currentLevel >= l.level;
              const isCurrent = currentLevel === l.level;
              return (
                <div key={l.level} className="flex items-center">
                  <div
                    className={`flex flex-col items-center px-3 py-2 rounded-lg min-w-[120px] ${isCurrent ? "ring-2 ring-primary" : ""}`}
                    style={{ background: reached ? `${l.color}1a` : "transparent", opacity: reached ? 1 : 0.5 }}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: l.color }}>{l.level}</div>
                    <div className="text-xs font-medium mt-1 text-center" style={{ color: reached ? l.color : undefined }}>{l.name}</div>
                  </div>
                  {l.level < 5 && <div className="w-4 h-0.5 bg-border" />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{meta.description}</p>
        </CardContent>
      </Card>

      {/* Framework implementation maturity (derived from framework progress) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Framework Implementation Maturity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
            <div>
              <div className="text-xs text-muted-foreground">Derived org maturity from framework implementation</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-3xl font-bold" style={{ color: fwStageMeta.color }}>{frameworkMaturity.avgStage || "—"}</span>
                <Badge variant="secondary" style={{ color: fwStageMeta.color }}>{fwStageMeta.name}</Badge>
              </div>
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              {frameworks.length} frameworks tracked · {controls.length} controls
            </div>
          </div>
          <div className="space-y-2">
            {frameworkMaturity.fwWithStage.length === 0 && (
              <p className="text-sm text-muted-foreground py-3 text-center">No frameworks tracked yet.</p>
            )}
            {frameworkMaturity.fwWithStage.map((f) => {
              const sm = lvlMeta(f.stage);
              return (
                <div key={f.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: sm.color }}>{f.stage}</div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.controlCount} controls · {f.passing} passing</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">{f.readiness}%</span>
                    <Badge variant="secondary" style={{ color: sm.color }}>{sm.name}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Maturity Evolution Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <ReferenceLine y={targetLevel} stroke="#3b82f6" strokeDasharray="4 4" label={{ value: "Target", fill: "#3b82f6", fontSize: 10 }} />
                <Line type="monotone" dataKey="Current" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: "#10b981" }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="Target" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Latest radar */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Latest Maturity Profile</CardTitle></CardHeader>
          <CardContent>
            <MaturityRadarChart domains={latestDomains} />
          </CardContent>
        </Card>
      </div>

      {/* Per-domain evolution table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Domain Evolution Across Assessments</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Domain</th>
                  {assessments.map((a, i) => (
                    <th key={i} className="text-center px-3 py-2 whitespace-nowrap">
                      {a.assessment_date ? a.assessment_date.slice(5) : `A${i + 1}`}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2">Δ</th>
                </tr>
              </thead>
              <tbody>
                {GRC_DOMAINS.map((dom) => {
                  const vals = assessments.map((a) => {
                    const ds = parseArr(a.domain_scores).find((d) => d.domain === dom.key);
                    return ds?.current_level || 0;
                  });
                  const d = first && latest ? vals[vals.length - 1] - vals[0] : 0;
                  return (
                    <tr key={dom.key} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{dom.name}</td>
                      {vals.map((v, i) => {
                        const m = MATURITY_LEVELS[v - 1];
                        return (
                          <td key={i} className="text-center px-3 py-2">
                            {v > 0 ? <Badge variant="secondary" style={{ color: m?.color }}>{v}</Badge> : <span className="text-muted-foreground">—</span>}
                          </td>
                        );
                      })}
                      <td className={`text-center px-3 py-2 font-semibold ${d > 0 ? "text-emerald-600" : d < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {d > 0 ? `+${d}` : d}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Assessment history */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-sm">Assessment History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {assessments.map((a, i) => {
              const m = lvlMeta(a.overall_level);
              return (
                <div key={a.id || i} className="flex items-center justify-between border-b border-border last:border-0 py-2">
                  <div>
                    <div className="font-medium text-sm">{a.name || `Assessment ${i + 1}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.assessment_date || (a.created_date ? a.created_date.slice(0, 10) : "")} · by {a.created_by_name || "—"}
                    </div>
                  </div>
                  <Badge variant="secondary" style={{ color: m.color }}>Level {a.overall_level} — {m.name}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}