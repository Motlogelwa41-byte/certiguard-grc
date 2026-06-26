import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Shield, CheckCircle, XCircle, Circle, Minus,
  Download, AlertTriangle, LayoutGrid, List, TrendingUp
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { exportToCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";

const STATUS_ICON = {
  passing: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failing: <XCircle className="w-4 h-4 text-red-500" />,
  not_tested: <Circle className="w-4 h-4 text-slate-400" />,
  not_applicable: <Minus className="w-4 h-4 text-slate-300" />,
};

const CELL_BG = {
  passing: "bg-emerald-500",
  failing: "bg-red-500",
  not_tested: "bg-slate-600",
  not_applicable: "bg-slate-700",
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
  compliance: "Compliance",
  human_resources: "HR",
  asset_management: "Asset Mgmt",
};

function CoverageCell({ status }) {
  const bg = CELL_BG[status] || "bg-slate-700";
  const title = status ? status.replace(/_/g, " ") : "not mapped";
  return (
    <div className={`w-6 h-6 rounded-sm ${bg} opacity-90 cursor-default`} title={title} />
  );
}

function GapCard({ title, value, color, sub }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm font-medium mt-0.5">{title}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FrameworkControlMap() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("matrix"); // "matrix" | "list"
  const [selectedFw, setSelectedFw] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    Promise.all([base44.entities.Framework.list(), base44.entities.Control.list()]).then(([fws, ctls]) => {
      setFrameworks(fws);
      setControls(ctls);
      setLoading(false);
    });
  }, []);

  const displayFrameworks = useMemo(
    () => (selectedFw === "all" ? frameworks : frameworks.filter((fw) => fw.id === selectedFw)),
    [frameworks, selectedFw]
  );

  const displayControls = useMemo(() => {
    let c = controls;
    if (selectedFw !== "all") c = c.filter((ctrl) => (ctrl.framework_ids || []).includes(selectedFw));
    if (selectedCategory !== "all") c = c.filter((ctrl) => ctrl.category === selectedCategory);
    return c;
  }, [controls, selectedFw, selectedCategory]);

  const unmapped = useMemo(
    () => controls.filter((c) => !c.framework_ids || c.framework_ids.length === 0),
    [controls]
  );

  // Gap metrics
  const totalMapped = controls.filter((c) => c.framework_ids && c.framework_ids.length > 0).length;
  const totalFailing = controls.filter((c) => c.status === "failing").length;
  const totalUntested = controls.filter((c) => c.status === "not_tested").length;

  // Category coverage per framework
  const categories = [...new Set(controls.map((c) => c.category).filter(Boolean))];

  const getCoverageForFwCategory = (fw, cat) => {
    const ctls = controls.filter((c) => (c.framework_ids || []).includes(fw.id) && c.category === cat);
    if (ctls.length === 0) return null;
    const passing = ctls.filter((c) => c.status === "passing").length;
    const pct = Math.round((passing / ctls.length) * 100);
    return { total: ctls.length, passing, pct };
  };

  const handleExport = () => {
    const rows = [];
    frameworks.forEach((fw) => {
      controls.filter((c) => (c.framework_ids || []).includes(fw.id)).forEach((c) => {
        rows.push({ Framework: fw.name, ControlID: c.control_id, Title: c.title, Category: c.category, Status: c.status, Severity: c.severity, Owner: c.owner_name || "" });
      });
    });
    exportToCsv(rows, "framework_control_map");
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (frameworks.length === 0) return (
    <div>
      <PageHeader title="Framework Control Map" subtitle="Visual coverage map of controls across compliance frameworks" />
      <EmptyState icon={Shield} title="No frameworks yet" description="Add frameworks and map controls to them to see coverage." />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Framework Control Map"
        subtitle="Visual coverage map of controls across compliance frameworks"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("matrix")}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "matrix" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Matrix
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
            </div>
            <select
              value={selectedFw}
              onChange={(e) => setSelectedFw(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Frameworks</option>
              {frameworks.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
            </select>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => <option key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          </div>
        }
      />

      {/* Gap Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <GapCard title="Controls Mapped" value={totalMapped} color="bg-card border-border text-foreground" sub={`of ${controls.length} total`} />
        <GapCard title="Unmapped Controls" value={unmapped.length} color={unmapped.length > 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-card border-border text-foreground"} sub="not in any framework" />
        <GapCard title="Failing Controls" value={totalFailing} color={totalFailing > 0 ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-card border-border text-foreground"} sub="need remediation" />
        <GapCard title="Untested Controls" value={totalUntested} color={totalUntested > 0 ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-card border-border text-foreground"} sub="awaiting assessment" />
      </div>

      {/* Framework Readiness Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Framework Coverage</h3>
        </div>
        <div className="space-y-3">
          {frameworks.map((fw) => {
            const mapped = controls.filter((c) => (c.framework_ids || []).includes(fw.id));
            const passing = mapped.filter((c) => c.status === "passing").length;
            const failing = mapped.filter((c) => c.status === "failing").length;
            const untested = mapped.filter((c) => c.status === "not_tested").length;
            const pct = mapped.length > 0 ? Math.round((passing / mapped.length) * 100) : 0;
            return (
              <div key={fw.id} className="flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-foreground truncate">{fw.name}</div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${mapped.length > 0 ? (passing / mapped.length) * 100 : 0}%` }} />
                    <div className="h-full bg-red-500 transition-all" style={{ width: `${mapped.length > 0 ? (failing / mapped.length) * 100 : 0}%` }} />
                    <div className="h-full bg-slate-500 transition-all" style={{ width: `${mapped.length > 0 ? (untested / mapped.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-bold w-10 text-right">{pct}%</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground w-40 shrink-0">
                  <span className="text-emerald-500 font-medium">{passing} pass</span>
                  <span className="text-red-500 font-medium">{failing} fail</span>
                  <span>{untested} untested</span>
                </div>
                <StatusBadge status={fw.status} />
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Passing</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Failing</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-500 inline-block" /> Untested</span>
        </div>
      </div>

      {/* Matrix View */}
      {view === "matrix" && (
        <div className="bg-card rounded-xl border border-border p-5 overflow-x-auto">
          <h3 className="font-heading font-semibold text-foreground mb-4">Coverage Heatmap — Category × Framework</h3>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No control categories to display.</p>
          ) : (
            <table className="text-xs min-w-full">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground pr-4 pb-3 min-w-[140px]">Category</th>
                  {displayFrameworks.map((fw) => (
                    <th key={fw.id} className="text-center font-medium text-muted-foreground pb-3 px-2 min-w-[90px]">
                      <div className="truncate max-w-[90px]">{fw.name}</div>
                    </th>
                  ))}
                  <th className="text-center font-medium text-muted-foreground pb-3 px-2 min-w-[70px]">Unmapped</th>
                </tr>
              </thead>
              <tbody>
                {categories
                  .filter((cat) => selectedCategory === "all" || cat === selectedCategory)
                  .map((cat) => {
                    const unmappedInCat = controls.filter((c) => c.category === cat && (!c.framework_ids || c.framework_ids.length === 0));
                    return (
                      <tr key={cat} className="border-t border-border/50">
                        <td className="pr-4 py-2.5 font-medium text-foreground">{CATEGORY_LABELS[cat] || cat}</td>
                        {displayFrameworks.map((fw) => {
                          const cov = getCoverageForFwCategory(fw, cat);
                          return (
                            <td key={fw.id} className="text-center px-2 py-2.5">
                              {cov ? (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex gap-0.5 flex-wrap justify-center max-w-[80px]">
                                    {controls
                                      .filter((c) => (c.framework_ids || []).includes(fw.id) && c.category === cat)
                                      .map((c) => <CoverageCell key={c.id} status={c.status} />)}
                                  </div>
                                  <span className={`font-semibold ${cov.pct >= 80 ? "text-emerald-500" : cov.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                                    {cov.pct}%
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-600 text-lg">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="text-center px-2 py-2.5">
                          {unmappedInCat.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-medium">
                              <AlertTriangle className="w-3 h-3" />{unmappedInCat.length}
                            </span>
                          ) : (
                            <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {displayFrameworks.map((fw) => {
            const fwControls = displayControls.filter((c) => (c.framework_ids || []).includes(fw.id));
            const passing = fwControls.filter((c) => c.status === "passing").length;
            const pct = fwControls.length > 0 ? Math.round((passing / fwControls.length) * 100) : 0;
            return (
              <div key={fw.id} className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{fw.name} {fw.version && <span className="text-xs text-muted-foreground font-normal">v{fw.version}</span>}</p>
                      <p className="text-xs text-muted-foreground">{fwControls.length} controls · {passing} passing · {pct}% coverage</p>
                    </div>
                  </div>
                  <StatusBadge status={fw.status} />
                </div>

                {fwControls.length === 0 ? (
                  <div className="px-5 py-6 text-sm text-muted-foreground text-center border-t border-border">
                    No controls mapped. Edit controls and assign this framework.
                  </div>
                ) : (
                  <div className="border-t border-border overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/20">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">ID</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Control</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Category</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Severity</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Owner</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fwControls.map((c) => (
                          <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                            <td className="px-4 py-2.5">{STATUS_ICON[c.status] || STATUS_ICON.not_tested}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.control_id}</td>
                            <td className="px-4 py-2.5 font-medium max-w-xs truncate">{c.title}</td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{CATEGORY_LABELS[c.category] || c.category}</td>
                            <td className="px-4 py-2.5"><StatusBadge status={c.severity} /></td>
                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.owner_name || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {/* Unmapped section */}
          {selectedFw === "all" && unmapped.length > 0 && (
            <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-400">Unmapped Controls — Gaps</p>
                  <p className="text-xs text-muted-foreground">{unmapped.length} controls not assigned to any framework</p>
                </div>
              </div>
              <div className="border-t border-amber-500/20 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {unmapped.map((c) => (
                      <tr key={c.id} className="border-t border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-2.5">{STATUS_ICON[c.status] || STATUS_ICON.not_tested}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.control_id}</td>
                        <td className="px-4 py-2.5 font-medium">{c.title}</td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">{CATEGORY_LABELS[c.category] || c.category}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={c.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}