import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, ChevronDown, ChevronRight, CheckCircle, XCircle, Circle, Minus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { exportToCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const STATUS_ICON = {
  passing: <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failing: <XCircle className="w-4 h-4 text-red-500" />,
  not_tested: <Circle className="w-4 h-4 text-slate-400" />,
  not_applicable: <Minus className="w-4 h-4 text-slate-300" />,
};

export default function FrameworkControlMap() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [selectedFw, setSelectedFw] = useState("all");

  useEffect(() => {
    Promise.all([base44.entities.Framework.list(), base44.entities.Control.list()]).then(([fws, ctls]) => {
      setFrameworks(fws);
      setControls(ctls);
      // expand all by default
      const init = {};
      fws.forEach((fw) => { init[fw.id] = true; });
      setExpanded(init);
      setLoading(false);
    });
  }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const getControlsForFramework = (fw) =>
    controls.filter((c) => (c.framework_ids || []).includes(fw.id));

  const unmapped = controls.filter((c) => !c.framework_ids || c.framework_ids.length === 0);

  const displayFrameworks = selectedFw === "all" ? frameworks : frameworks.filter((fw) => fw.id === selectedFw);

  const handleExport = () => {
    const rows = [];
    frameworks.forEach((fw) => {
      getControlsForFramework(fw).forEach((c) => {
        rows.push({ Framework: fw.name, ControlID: c.control_id, Title: c.title, Category: c.category, Status: c.status, Severity: c.severity, Owner: c.owner_name || "" });
      });
    });
    exportToCsv(rows, "framework_control_map");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Framework → Control Map"
        subtitle="See which controls satisfy each framework requirement"
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedFw}
              onChange={(e) => setSelectedFw(e.target.value)}
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Frameworks</option>
              {frameworks.map((fw) => <option key={fw.id} value={fw.id}>{fw.name}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          </div>
        }
      />

      {frameworks.length === 0 ? (
        <EmptyState icon={Shield} title="No frameworks" description="Add frameworks and map controls to them." />
      ) : (
        <div className="space-y-4">
          {displayFrameworks.map((fw) => {
            const fwControls = getControlsForFramework(fw);
            const passing = fwControls.filter((c) => c.status === "passing").length;
            const pct = fwControls.length > 0 ? Math.round((passing / fwControls.length) * 100) : 0;
            const isOpen = expanded[fw.id];
            return (
              <div key={fw.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Header */}
                <button
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                  onClick={() => toggle(fw.id)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{fw.name} {fw.version && <span className="text-xs text-muted-foreground font-normal">v{fw.version}</span>}</p>
                      <p className="text-xs text-muted-foreground">{fwControls.length} controls mapped · {passing} passing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <span className="text-sm font-semibold w-10 text-right">{pct}%</span>
                    </div>
                    <StatusBadge status={fw.status} />
                  </div>
                </button>

                {/* Controls table */}
                {isOpen && (
                  fwControls.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-muted-foreground text-center border-t border-border bg-muted/20">
                      No controls mapped to this framework yet. Edit controls and assign this framework.
                    </div>
                  ) : (
                    <div className="border-t border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/30">
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
                              <td className="px-4 py-2.5 capitalize text-muted-foreground text-xs">{(c.category || "").replace(/_/g, " ")}</td>
                              <td className="px-4 py-2.5"><StatusBadge status={c.severity} /></td>
                              <td className="px-4 py-2.5 text-muted-foreground text-xs">{c.owner_name || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            );
          })}

          {/* Unmapped controls */}
          {selectedFw === "all" && unmapped.length > 0 && (
            <div className="bg-card rounded-xl border border-dashed border-border overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30" onClick={() => toggle("__unmapped__")}>
                {expanded["__unmapped__"] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                <div>
                  <p className="font-semibold text-muted-foreground text-left">Unmapped Controls</p>
                  <p className="text-xs text-muted-foreground">{unmapped.length} controls not yet assigned to a framework</p>
                </div>
              </button>
              {expanded["__unmapped__"] && (
                <div className="border-t border-border overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {unmapped.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-4 py-2.5">{STATUS_ICON[c.status] || STATUS_ICON.not_tested}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{c.control_id}</td>
                          <td className="px-4 py-2.5 font-medium">{c.title}</td>
                          <td className="px-4 py-2.5 capitalize text-muted-foreground text-xs">{(c.category || "").replace(/_/g, " ")}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={c.severity} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}