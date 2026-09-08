import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Printer, Download, ShieldCheck, AlertCircle, CheckCircle2, XCircle, FileText, TrendingUp, Clock, Globe } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SADC_LIBRARY } from "@/lib/sadcLibrary";

// SADC country regions for filtering
const SADC_REGIONS = [
  "South Africa", "Botswana", "Zimbabwe", "Zambia", "Tanzania", "Malawi",
  "Mozambique", "Namibia", "Lesotho", "Eswatini", "DRC", "Madagascar",
  "Mauritius", "Seychelles", "SADC Region", "African Union"
];

// Filter to SADC-relevant frameworks
const SADC_FRAMEWORKS = SADC_LIBRARY.filter(fw =>
  SADC_REGIONS.includes(fw.region) ||
  (fw.tags || []).some(t => t.includes("sadc"))
);

const CATEGORY_COLORS = {
  "Data Privacy": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500" },
  "Cybersecurity": { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", bar: "bg-red-500" },
  "Financial Services": { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", bar: "bg-blue-500" },
  "Telecommunications & ICT": { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", bar: "bg-violet-500" },
  "Mining & ESG": { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", bar: "bg-amber-500" },
  "Healthcare & Pharma": { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-700", bar: "bg-rose-500" },
  "Energy & Utilities": { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", bar: "bg-orange-500" },
  "Education & Human Resource Development": { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", bar: "bg-cyan-500" },
  "Education & Qualifications": { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", bar: "bg-cyan-500" },
  "Corporate Registry & IP": { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", bar: "bg-slate-500" },
  "Procurement & Public Finance": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", bar: "bg-indigo-500" },
  "Public Finance & Governance": { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", bar: "bg-indigo-500" },
  "Tax & Revenue": { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", bar: "bg-teal-500" },
  "Competition & Antitrust": { bg: "bg-fuchsia-50", border: "border-fuchsia-200", text: "text-fuchsia-700", bar: "bg-fuchsia-500" },
  "Real Estate & Property": { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-700", bar: "bg-lime-500" },
  "Trade & Industry": { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", bar: "bg-emerald-500" },
  "Professional Services & Audit": { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700", bar: "bg-sky-500" },
  "Business & Industry": { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", bar: "bg-slate-500" },
};

const getColor = (cat) => CATEGORY_COLORS[cat] || { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", bar: "bg-slate-500" };

export default function SadcReadinessSummary() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Control.list("-updated_date", 500)
      .then((c) => { setControls(c || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const analyzeFramework = (fw) => {
    const mappedControls = controls.filter((c) =>
      (c.framework_names || []).some((fn) =>
        fn.toLowerCase().includes(fw.name.toLowerCase()) ||
        fn.toLowerCase().includes(fw.id.replace("_", " ").toLowerCase()) ||
        fn.toLowerCase().includes(fw.full_name.toLowerCase())
      )
    );

    const passing = mappedControls.filter((c) => c.status === "passing").length;
    const failing = mappedControls.filter((c) => c.status === "failing").length;
    const notTested = mappedControls.filter((c) => c.status === "not_tested").length;
    const naControls = mappedControls.filter((c) => c.status === "not_applicable").length;
    const testableTotal = mappedControls.length - naControls;
    const readinessScore = testableTotal > 0 ? Math.round((passing / testableTotal) * 100) : 0;
    const coveragePct = fw.controls_count > 0 ? Math.round((mappedControls.length / fw.controls_count) * 100) : 0;

    return {
      ...fw,
      mappedControls: mappedControls.length,
      passing, failing, notTested, naControls,
      readinessScore, coveragePct,
      gap: fw.controls_count - mappedControls.length
    };
  };

  const results = SADC_FRAMEWORKS.map(analyzeFramework);
  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.readinessScore, 0) / results.length)
    : 0;
  const totalMapped = results.reduce((s, r) => s + r.mappedControls, 0);
  const totalPassing = results.reduce((s, r) => s + r.passing, 0);
  const totalFailing = results.reduce((s, r) => s + r.failing, 0);
  const totalNotTested = results.reduce((s, r) => s + r.notTested, 0);

  // Group by category
  const categories = {};
  results.forEach((r) => {
    const cat = r.category || "Other";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(r);
  });

  const exportCsv = () => {
    const headers = ["Framework", "Full Name", "Region", "Category", "Authority", "Mandatory", "Total Controls (Lib)", "Mapped Controls", "Passing", "Failing", "Not Tested", "N/A", "Readiness %", "Coverage %", "Gap"];
    const rows = results.map(r => [
      r.name, r.full_name, r.region, r.category, r.authority,
      r.mandatory ? "Yes" : "No",
      r.controls_count, r.mappedControls, r.passing, r.failing, r.notTested, r.naControls,
      r.readinessScore, r.coveragePct, r.gap
    ]);
    const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sadc-readiness-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="SADC Performance Summary Report"
        subtitle="High-level readiness across all SADC regional regulatory frameworks — shareable with stakeholders"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1.5" /> Print / PDF
            </Button>
          </div>
        }
      />

      {/* Overall Score Banner */}
      <Card className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-300 font-medium uppercase tracking-wider">Combined SADC Readiness Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-heading font-bold">{overallScore}%</span>
                <span className="text-slate-400 text-sm">across {results.length} frameworks</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                {Object.keys(categories).length} regulatory categories · {SADC_FRAMEWORKS.filter(f => f.mandatory).length} mandatory frameworks
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{totalPassing}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Passing</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{totalFailing}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Failing</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">{totalNotTested}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Not Tested</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{totalMapped}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Mapped</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framework Cards by Category */}
      {Object.entries(categories).map(([catName, fws]) => {
        const color = getColor(catName);
        const catScore = fws.length > 0
          ? Math.round(fws.reduce((s, r) => s + r.readinessScore, 0) / fws.length)
          : 0;
        return (
          <div key={catName} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-heading font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${color.bar}`} />
                {catName}
                <span className="text-muted-foreground font-normal normal-case">({fws.length})</span>
              </h3>
              <span className={`text-sm font-bold ${color.text}`}>{catScore}% avg</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fws.map((fw) => (
                <Card key={fw.id} className={`border ${color.border}`}>
                  <CardHeader className={`${color.bg} rounded-t-xl pb-3`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-lg">{fw.flag}</span>
                          <CardTitle className={`text-sm ${color.text}`}>{fw.name}</CardTitle>
                          {fw.mandatory && (
                            <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Mandatory</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{fw.region}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-2xl font-heading font-bold ${color.text}`}>{fw.readinessScore}%</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded p-1.5">
                        <p className="text-base font-bold text-emerald-600">{fw.passing}</p>
                        <p className="text-[10px] text-muted-foreground">Pass</p>
                      </div>
                      <div className="bg-muted/40 rounded p-1.5">
                        <p className="text-base font-bold text-red-600">{fw.failing}</p>
                        <p className="text-[10px] text-muted-foreground">Fail</p>
                      </div>
                      <div className="bg-muted/40 rounded p-1.5">
                        <p className="text-base font-bold text-amber-600">{fw.notTested}</p>
                        <p className="text-[10px] text-muted-foreground">Untested</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Coverage</span>
                        <span className="text-[11px] font-medium text-foreground">{fw.mappedControls}/{fw.controls_count} controls</span>
                      </div>
                      <Progress value={fw.coveragePct} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground">Readiness</span>
                        <span className={`text-[11px] font-bold ${color.text}`}>{fw.readinessScore}%</span>
                      </div>
                      <Progress value={fw.readinessScore} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Stakeholder Summary Footer */}
      <Card className="bg-muted/30 mt-6">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Executive Summary</p>
              <p className="text-sm text-muted-foreground mt-1">
                This report aggregates organizational readiness against <strong>{results.length} SADC regional regulatory frameworks</strong> across{" "}
                {Object.keys(categories).length} categories ({Object.keys(categories).join(", ")}).
                The combined readiness score is <strong>{overallScore}%</strong>, based on {totalMapped} mapped controls.
                {totalFailing > 0 && ` ${totalFailing} controls are currently failing and require immediate remediation.`}
                {totalNotTested > 0 && ` ${totalNotTested} controls remain untested.`}
                {overallScore < 50 ? " Immediate action is recommended to address compliance gaps." : overallScore < 80 ? " Continued focus on remaining gaps will improve readiness." : " The organization demonstrates strong compliance posture across the SADC region."}
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Generated on {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })} · CertiGuard GRC Platform · Ethical Edge GRC Consulting (Pty) Ltd
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}