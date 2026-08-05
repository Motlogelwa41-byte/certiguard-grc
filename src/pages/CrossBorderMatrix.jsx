import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Globe, GitCompare, CheckCircle2, AlertTriangle, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const JURISDICTION_LABELS = {
  global: "Global",
  us: "United States",
  eu: "European Union",
  uk: "United Kingdom",
  au: "Australia",
  za: "South Africa",
  sadc: "SADC Region",
  africa: "Africa",
  apac: "Asia-Pacific",
  industry: "Industry",
};

export default function CrossBorderMatrix() {
  const [frameworks, setFrameworks] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJurisdictions, setSelectedJurisdictions] = useState(new Set(["za", "eu", "global"]));
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.RegulatoryFramework.list(),
      base44.entities.FrameworkRequirement.list().catch(() => []),
      base44.entities.RequirementControlMapping.list().catch(() => []),
    ]).then(([f, r, m]) => { setFrameworks(f); setRequirements(r); setMappings(m); setLoading(false); });
  }, []);

  const toggleJurisdiction = (jur) => {
    const next = new Set(selectedJurisdictions);
    if (next.has(jur)) { if (next.size > 1) next.delete(jur); }
    else next.add(jur);
    setSelectedJurisdictions(next);
  };

  const filteredFrameworks = useMemo(() => frameworks.filter((f) => selectedJurisdictions.has(f.jurisdiction)), [frameworks, selectedJurisdictions]);

  // Build comparison matrix: for each framework, count requirements, mapped controls, gaps
  const matrixData = useMemo(() => {
    return filteredFrameworks.map((fw) => {
      const fwReqs = requirements.filter((r) => r.framework_id === fw.id);
      const fwMappings = mappings.filter((m) => m.framework_id === fw.id);
      const mappedReqIds = new Set(fwMappings.map((m) => m.requirement_id));
      const gaps = fwReqs.filter((r) => !mappedReqIds.has(r.id));
      return {
        framework: fw,
        totalReqs: fwReqs.length,
        mappedReqs: fwMappings.length,
        gapCount: gaps.length,
        coveragePct: fwReqs.length > 0 ? Math.round((fwMappings.length / fwReqs.length) * 100) : 0,
        gaps: gaps.slice(0, 5),
      };
    });
  }, [filteredFrameworks, requirements, mappings]);

  // Cross-framework overlap: find controls mapped to multiple frameworks
  const overlaps = useMemo(() => {
    const controlToFrameworks = {};
    mappings.forEach((m) => {
      if (!controlToFrameworks[m.control_id]) controlToFrameworks[m.control_id] = new Set();
      controlToFrameworks[m.control_id].add(m.framework_id);
    });
    const multiMapped = Object.entries(controlToFrameworks).filter(([_, fws]) => fws.size > 1);
    return {
      total: Object.keys(controlToFrameworks).length,
      multiMapped: multiMapped.length,
      overlapPct: Object.keys(controlToFrameworks).length > 0 ? Math.round((multiMapped.length / Object.keys(controlToFrameworks).length) * 100) : 0,
    };
  }, [mappings]);

  // Conflict detection: same category requirements across jurisdictions with different control coverage
  const conflicts = useMemo(() => {
    const byCategory = {};
    filteredFrameworks.forEach((fw) => {
      const fwReqs = requirements.filter((r) => r.framework_id === fw.id);
      fwReqs.forEach((r) => {
        const cat = r.category || "uncategorized";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({ framework: fw.name, jurisdiction: fw.jurisdiction, requirement: r });
      });
    });
    // Find categories where coverage differs significantly across jurisdictions
    const conflicts = [];
    Object.entries(byCategory).forEach(([cat, reqs]) => {
      const jurisdictions = new Set(reqs.map((r) => r.jurisdiction));
      if (jurisdictions.size > 1) {
        const mappedCount = reqs.filter((r) => mappings.some((m) => m.requirement_id === r.requirement.id)).length;
        const coveragePct = reqs.length > 0 ? Math.round((mappedCount / reqs.length) * 100) : 0;
        if (coveragePct < 100) {
          conflicts.push({ category: cat, totalReqs: reqs.length, mappedCount, coveragePct, jurisdictions: [...jurisdictions] });
        }
      }
    });
    return conflicts.sort((a, b) => a.coveragePct - b.coveragePct).slice(0, 10);
  }, [filteredFrameworks, requirements, mappings]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Cross-Border Compliance Matrix" subtitle="Compare regulatory frameworks across jurisdictions — overlaps, conflicts, and coverage gaps" />

      {/* Jurisdiction Selector */}
      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Jurisdictions to Compare</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(JURISDICTION_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => toggleJurisdiction(key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedJurisdictions.has(key) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
              <Globe className="w-3.5 h-3.5 inline mr-1" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><Globe className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{filteredFrameworks.length}</p><p className="text-xs text-muted-foreground">Frameworks Selected</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{overlaps.multiMapped}</p><p className="text-xs text-muted-foreground">Cross-Mapped Controls</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><GitCompare className="w-5 h-5 text-blue-500 mb-2" /><p className="text-2xl font-bold text-foreground">{overlaps.overlapPct}%</p><p className="text-xs text-muted-foreground">Overlap Rate</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><AlertTriangle className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{conflicts.length}</p><p className="text-xs text-muted-foreground">Potential Conflicts</p></div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <h3 className="font-heading font-semibold text-foreground mb-3">Coverage Matrix by Framework</h3>
        {matrixData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No frameworks found for the selected jurisdictions.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left pb-2">Framework</th><th className="text-left pb-2">Jurisdiction</th><th className="text-right pb-2">Requirements</th><th className="text-right pb-2">Mapped</th><th className="text-right pb-2">Gaps</th><th className="text-right pb-2">Coverage</th>
              </tr></thead>
              <tbody>
                {matrixData.map((row) => (
                  <tr key={row.framework.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 font-semibold text-foreground">{row.framework.name}</td>
                    <td className="py-2.5"><span className="text-xs bg-muted px-2 py-0.5 rounded-full">{JURISDICTION_LABELS[row.framework.jurisdiction] || row.framework.jurisdiction}</span></td>
                    <td className="text-right py-2.5">{row.totalReqs}</td>
                    <td className="text-right py-2.5 text-emerald-600 font-semibold">{row.mappedReqs}</td>
                    <td className="text-right py-2.5 text-red-600 font-semibold">{row.gapCount}</td>
                    <td className="text-right py-2.5">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.coveragePct >= 80 ? "bg-emerald-500" : row.coveragePct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${row.coveragePct}%` }} /></div>
                        <span className="font-semibold text-xs w-8 text-right">{row.coveragePct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Conflicts & Gaps */}
      {conflicts.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-1">Cross-Border Coverage Gaps</h3>
          <p className="text-xs text-muted-foreground mb-3">Categories where coverage differs across selected jurisdictions — potential compliance conflicts</p>
          <div className="space-y-2">
            {conflicts.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground capitalize">{c.category.replace(/_/g, " ")}</p>
                  <p className="text-xs text-muted-foreground">{c.jurisdictions.map((j) => JURISDICTION_LABELS[j] || j).join(" · ")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{c.mappedCount}/{c.totalReqs} mapped</span>
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.coveragePct >= 80 ? "bg-emerald-500" : c.coveragePct >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${c.coveragePct}%` }} /></div>
                  <span className={`text-xs font-bold w-10 text-right ${c.coveragePct >= 80 ? "text-emerald-600" : c.coveragePct >= 50 ? "text-amber-600" : "text-red-600"}`}>{c.coveragePct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlap Insight */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-heading font-semibold text-foreground mb-2">Cross-Framework Control Overlap</h3>
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{overlaps.multiMapped}</strong> of <strong className="text-foreground">{overlaps.total}</strong> mapped controls satisfy requirements across multiple jurisdictions ({overlaps.overlapPct}% overlap rate).
          {overlaps.overlapPct > 50 ? " Strong cross-jurisdiction control reuse — efficient compliance." : " Low overlap — consider consolidating controls to reduce duplication."}
        </p>
      </div>
    </div>
  );
}