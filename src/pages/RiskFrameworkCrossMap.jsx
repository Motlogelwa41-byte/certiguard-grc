import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Shield, CheckCircle, XCircle, Circle, Minus,
  Download, Layers, GitCompare, TrendingUp, Sparkles,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { exportToCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";

const TARGET_FW_NAMES = ["ISO 27001", "COSO ERM", "ISO 31000"];

const FW_COLORS = {
  "ISO 27001": "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "COSO ERM": "text-violet-400 bg-violet-500/10 border-violet-500/30",
  "ISO 31000": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
};

const FW_DOT = {
  "ISO 27001": "bg-blue-500",
  "COSO ERM": "bg-violet-500",
  "ISO 31000": "bg-emerald-500",
};

const CATEGORY_LABELS = {
  access_control: "Access Control",
  data_protection: "Data Protection",
  incident_response: "Incident Response",
  change_management: "Change Management",
  risk_management: "Risk Management",
  security_operations: "Security Ops",
  business_continuity: "Business Continuity",
  network_security: "Network Security",
  physical_security: "Physical Security",
  compliance: "Governance & Compliance",
  human_resources: "HR",
  asset_management: "Asset Mgmt",
};

const STATUS_ICON = {
  passing: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failing: <XCircle className="w-4 h-4 text-red-500" />,
  not_tested: <Circle className="w-4 h-4 text-slate-400" />,
  not_applicable: <Minus className="w-4 h-4 text-slate-300" />,
};

function StatCard({ label, value, sub, icon: Icon, tone }) {
  const toneCls = tone === "warn"
    ? "border-amber-500/30 bg-amber-500/5"
    : tone === "good"
    ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-border bg-card";
  return (
    <div className={`rounded-xl border p-4 ${toneCls}`}>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-bold">{value}</p>
        {Icon && <Icon className="w-5 h-5 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium mt-0.5">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RiskFrameworkCrossMap() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [overlapFilter, setOverlapFilter] = useState("all"); // all | all3 | pair | single

  useEffect(() => {
    Promise.all([base44.entities.Framework.list(), base44.entities.Control.list()]).then(([fws, ctls]) => {
      setFrameworks(fws);
      setControls(ctls);
      setLoading(false);
    });
  }, []);

  const targetFws = useMemo(
    () => TARGET_FW_NAMES.map((name) => frameworks.find((f) => f.name === name)).filter(Boolean),
    [frameworks]
  );

  // Controls mapped to at least one target framework
  const mappedControls = useMemo(
    () => controls.filter((c) => {
      const names = c.framework_names || [];
      return TARGET_FW_NAMES.some((n) => names.includes(n));
    }),
    [controls]
  );

  const hasFw = (c, name) => (c.framework_names || []).includes(name);

  const overlapBuckets = useMemo(() => {
    const all3 = mappedControls.filter((c) => TARGET_FW_NAMES.every((n) => hasFw(c, n)));
    const exactly2 = mappedControls.filter((c) => {
      const count = TARGET_FW_NAMES.filter((n) => hasFw(c, n)).length;
      return count === 2;
    });
    const exactly1 = mappedControls.filter((c) => {
      const count = TARGET_FW_NAMES.filter((n) => hasFw(c, n)).length;
      return count === 1;
    });
    return { all3, exactly2, exactly1 };
  }, [mappedControls]);

  const perFwStats = useMemo(
    () => TARGET_FW_NAMES.map((name) => {
      const fw = frameworks.find((f) => f.name === name);
      const mapped = mappedControls.filter((c) => hasFw(c, name));
      const passing = mapped.filter((c) => c.status === "passing").length;
      const failing = mapped.filter((c) => c.status === "failing").length;
      const untested = mapped.filter((c) => c.status === "not_tested").length;
      const pct = mapped.length > 0 ? Math.round((passing / mapped.length) * 100) : 0;
      return { name, fw, total: mapped.length, passing, failing, untested, pct };
    }),
    [mappedControls, frameworks]
  );

  const filteredControls = useMemo(() => {
    if (overlapFilter === "all") return mappedControls;
    if (overlapFilter === "all3") return overlapBuckets.all3;
    if (overlapFilter === "pair") return overlapBuckets.exactly2;
    if (overlapFilter === "single") return overlapBuckets.exactly1;
    return mappedControls;
  }, [mappedControls, overlapFilter, overlapBuckets]);

  const categories = useMemo(
    () => [...new Set(filteredControls.map((c) => c.category).filter(Boolean))],
    [filteredControls]
  );

  const handleExport = () => {
    const rows = filteredControls.map((c) => ({
      ControlID: c.control_id,
      Title: c.title,
      Category: CATEGORY_LABELS[c.category] || c.category,
      Status: c.status,
      Severity: c.severity,
      Owner: c.owner_name || "",
      ISO27001: hasFw(c, "ISO 27001") ? "Yes" : "No",
      COSOERM: hasFw(c, "COSO ERM") ? "Yes" : "No",
      ISO31000: hasFw(c, "ISO 31000") ? "Yes" : "No",
    }));
    exportToCsv(rows, "risk_framework_crossmap");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (targetFws.length === 0) return (
    <div>
      <PageHeader title="Risk Framework Cross-Mapping" subtitle="ISO 27001 × COSO ERM × ISO 31000" />
      <EmptyState icon={Shield} title="Target frameworks missing" description="Create ISO 27001, COSO ERM, and ISO 31000 frameworks to use this view." />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Risk Framework Cross-Mapping"
        subtitle="Prove compliance across ISO 27001, COSO ERM & ISO 31000 simultaneously"
        actions={
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
        }
      />

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Controls mapped (≥1 framework)" value={mappedControls.length} sub={`of ${controls.length} total`} icon={Shield} />
        <StatCard label="Cover all 3 frameworks" value={overlapBuckets.all3.length} sub="unified evidence" icon={Layers} tone="good" />
        <StatCard label="Cover exactly 2 frameworks" value={overlapBuckets.exactly2.length} sub="partial overlap" icon={GitCompare} />
        <StatCard label="Cover only 1 framework" value={overlapBuckets.exactly1.length} sub="single-framework gaps" icon={TrendingUp} tone={overlapBuckets.exactly1.length > 0 ? "warn" : undefined} />
      </div>

      {/* Per-framework readiness bars */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Per-Framework Readiness</h3>
        </div>
        <div className="space-y-4">
          {perFwStats.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <div className="w-28 text-sm font-medium text-foreground truncate flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${FW_DOT[s.name]}`} />
                {s.name}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: `${(s.passing / Math.max(s.total,1)) * 100}%` }} />
                  <div className="h-full bg-red-500" style={{ width: `${(s.failing / Math.max(s.total,1)) * 100}%` }} />
                  <div className="h-full bg-slate-500" style={{ width: `${(s.untested / Math.max(s.total,1)) * 100}%` }} />
                </div>
                <span className="text-sm font-bold w-10 text-right">{s.pct}%</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground w-40 shrink-0">
                <span className="text-emerald-500 font-medium">{s.passing} pass</span>
                <span className="text-red-500 font-medium">{s.failing} fail</span>
                <span>{s.untested} untested</span>
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">{s.total} controls</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Passing</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Failing</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-500 inline-block" /> Untested</span>
        </div>
      </div>

      {/* Overlap legend + filter */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Cross-Framework Overlap</h3>
            <span className="text-xs text-muted-foreground">A single control satisfying multiple frameworks = one evidence collection effort</span>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {[
              { k: "all", label: "All" },
              { k: "all3", label: "All 3" },
              { k: "pair", label: "Pairs" },
              { k: "single", label: "Single only" },
            ].map((opt) => (
              <button
                key={opt.k}
                onClick={() => setOverlapFilter(opt.k)}
                className={`px-3 py-1.5 font-medium transition-colors ${overlapFilter === opt.k ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Venn-style overlap chips */}
        <div className="flex flex-wrap gap-3 mb-5">
          {TARGET_FW_NAMES.map((name) => {
            const count = mappedControls.filter((c) => hasFw(c, name)).length;
            return (
              <div key={name} className={`rounded-lg border px-3 py-2 flex items-center gap-2 ${FW_COLORS[name]}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${FW_DOT[name]}`} />
                <span className="font-semibold text-sm">{name}</span>
                <span className="text-xs opacity-80">{count} controls</span>
              </div>
            );
          })}
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm text-primary">{overlapBuckets.all3.length}</span>
            <span className="text-xs text-muted-foreground">unified (all 3)</span>
          </div>
        </div>

        {/* Cross-map table */}
        {filteredControls.length === 0 ? (
          <EmptyState icon={GitCompare} title="No controls in this overlap" description="Adjust the filter or map more controls to these frameworks." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/20">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Control</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Category</th>
                  {TARGET_FW_NAMES.map((n) => (
                    <th key={n} className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${FW_DOT[n]}`} />{n}
                      </span>
                    </th>
                  ))}
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground text-xs">Overlap</th>
                </tr>
              </thead>
              <tbody>
                {filteredControls.map((c) => {
                  const overlapCount = TARGET_FW_NAMES.filter((n) => hasFw(c, n)).length;
                  return (
                    <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-2.5">{STATUS_ICON[c.status] || STATUS_ICON.not_tested}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground max-w-xs truncate">{c.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">{c.control_id}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{CATEGORY_LABELS[c.category] || c.category}</td>
                      {TARGET_FW_NAMES.map((n) => (
                        <td key={n} className="text-center px-4 py-2.5">
                          {hasFw(c, n) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-emerald-500/15">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                            </span>
                          ) : (
                            <Minus className="w-4 h-4 text-slate-600 mx-auto" />
                          )}
                        </td>
                      ))}
                      <td className="text-center px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          overlapCount === 3 ? "bg-primary/15 text-primary" : overlapCount === 2 ? "bg-amber-500/15 text-amber-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {overlapCount}/3
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category × framework matrix */}
      <div className="bg-card rounded-xl border border-border p-5 overflow-x-auto">
        <h3 className="font-heading font-semibold text-foreground mb-4">Coverage Heatmap — Category × Framework</h3>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No control categories to display.</p>
        ) : (
          <table className="text-xs min-w-full">
            <thead>
              <tr>
                <th className="text-left font-medium text-muted-foreground pr-4 pb-3 min-w-[160px]">Category</th>
                {TARGET_FW_NAMES.map((n) => (
                  <th key={n} className="text-center font-medium text-muted-foreground pb-3 px-2 min-w-[100px]">{n}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat} className="border-t border-border/50">
                  <td className="pr-4 py-2.5 font-medium text-foreground">{CATEGORY_LABELS[cat] || cat}</td>
                  {TARGET_FW_NAMES.map((n) => {
                    const ctls = filteredControls.filter((c) => c.category === cat && hasFw(c, n));
                    const passing = ctls.filter((c) => c.status === "passing").length;
                    const pct = ctls.length > 0 ? Math.round((passing / ctls.length) * 100) : 0;
                    return (
                      <td key={n} className="text-center px-2 py-2.5">
                        {ctls.length > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-semibold text-foreground">{ctls.length}</span>
                            <span className={`text-xs ${pct >= 80 ? "text-emerald-500" : pct >= 50 ? "text-amber-400" : "text-red-400"}`}>{pct}% pass</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-lg">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}