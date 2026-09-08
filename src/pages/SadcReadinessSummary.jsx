import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Printer, ShieldCheck, AlertCircle, CheckCircle2, XCircle, FileText, TrendingUp, Clock } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SADC_REQUIREMENT_LIBRARIES } from "@/lib/sadcRequirementLibrary";

const FRAMEWORKS = [
  { code: "popia", shortName: "POPIA", fullName: "Protection of Personal Information Act", jurisdiction: "South Africa", accent: "emerald", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", ring: "text-emerald-500", bar: "bg-emerald-500" },
  { code: "bdpa_bw", shortName: "BDPA", fullName: "Botswana Data Protection Act", jurisdiction: "Botswana", accent: "blue", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", ring: "text-blue-500", bar: "bg-blue-500" },
];

const CATEGORY_LABELS = {
  privacy: "Privacy & Data Subject Rights",
  data_protection: "Data Protection & Security",
  governance: "Governance & Accountability",
  compliance: "Compliance & Records",
  incident_response: "Incident Response & Breach Notification",
};

export default function SadcReadinessSummary() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Control.list("-updated_date", 500)
      .then((c) => { setControls(c || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const analyzeFramework = (fw) => {
    const lib = SADC_REQUIREMENT_LIBRARIES[fw.code];
    const requirements = lib ? lib.requirements : [];
    const totalReqs = requirements.length;
    const mandatoryReqs = requirements.filter((r) => r.is_mandatory).length;

    const mappedControls = controls.filter((c) =>
      (c.framework_names || []).some((fn) =>
        fn.toLowerCase().includes(fw.shortName.toLowerCase()) ||
        fn.toLowerCase().includes(fw.code.replace("_", " ").toLowerCase())
      )
    );

    const passing = mappedControls.filter((c) => c.status === "passing").length;
    const failing = mappedControls.filter((c) => c.status === "failing").length;
    const notTested = mappedControls.filter((c) => c.status === "not_tested").length;
    const naControls = mappedControls.filter((c) => c.status === "not_applicable").length;
    const testableTotal = mappedControls.length - naControls;
    const readinessScore = testableTotal > 0 ? Math.round((passing / testableTotal) * 100) : 0;

    // Category breakdown
    const categories = {};
    requirements.forEach((r) => {
      const cat = r.category || "other";
      if (!categories[cat]) categories[cat] = { total: 0, label: CATEGORY_LABELS[cat] || cat };
      categories[cat].total++;
    });

    // Top gaps — requirements in categories with fewest mapped controls
    const gaps = requirements
      .filter((r) => r.is_mandatory)
      .slice(0, 5)
      .map((r) => ({
        id: r.requirement_id,
        title: r.title,
        section: r.section,
        category: r.category,
      }));

    return { ...fw, totalReqs, mandatoryReqs, mappedControls: mappedControls.length, passing, failing, notTested, naControls, readinessScore, categories, gaps, requirements };
  };

  const results = FRAMEWORKS.map(analyzeFramework);
  const overallScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.readinessScore, 0) / results.length)
    : 0;

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
        title="POPIA & BDPA Readiness Summary"
        subtitle="High-level readiness report for SADC regional data protection frameworks — shareable with stakeholders"
        actions={
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Print / Share
          </Button>
        }
      />

      {/* Overall Score Banner */}
      <Card className="mb-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-0">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-slate-300 font-medium uppercase tracking-wider">Combined Readiness Score</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-5xl font-heading font-bold">{overallScore}%</span>
                <span className="text-slate-400 text-sm">across {results.length} frameworks</span>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-emerald-400">{results.reduce((s, r) => s + r.passing, 0)}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Passing</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{results.reduce((s, r) => s + r.failing, 0)}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Failing</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">{results.reduce((s, r) => s + r.notTested, 0)}</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Not Tested</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framework Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {results.map((fw) => (
          <Card key={fw.code} className={`border ${fw.border}`}>
            <CardHeader className={`${fw.bg} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className={`text-lg ${fw.text}`}>{fw.shortName}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{fw.fullName} · {fw.jurisdiction}</p>
                </div>
                <div className="text-right">
                  <span className={`text-3xl font-heading font-bold ${fw.text}`}>{fw.readinessScore}%</span>
                  <p className="text-xs text-muted-foreground">Readiness</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Total Requirements</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{fw.totalReqs}</p>
                  <p className="text-[11px] text-muted-foreground">{fw.mandatoryReqs} mandatory</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Mapped Controls</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-1">{fw.mappedControls}</p>
                  <p className="text-[11px] text-muted-foreground">{fw.totalReqs - fw.mappedControls > 0 ? `${fw.totalReqs - fw.mappedControls} reqs unmapped` : "All mapped"}</p>
                </div>
              </div>

              {/* Control Status Breakdown */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Control Status Breakdown</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1">Passing</span>
                    <span className="text-sm font-semibold text-foreground">{fw.passing}</span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fw.mappedControls > 0 ? (fw.passing / fw.mappedControls) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1">Failing</span>
                    <span className="text-sm font-semibold text-foreground">{fw.failing}</span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${fw.mappedControls > 0 ? (fw.failing / fw.mappedControls) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm text-foreground flex-1">Not Tested</span>
                    <span className="text-sm font-semibold text-foreground">{fw.notTested}</span>
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fw.mappedControls > 0 ? (fw.notTested / fw.mappedControls) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement Categories */}
              {Object.keys(fw.categories).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Requirements by Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(fw.categories).map(([key, cat]) => (
                      <span key={key} className={`text-[11px] px-2 py-1 rounded-md ${fw.bg} ${fw.text} font-medium`}>
                        {cat.label}: {cat.total}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Readiness Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Readiness</span>
                  <span className={`text-sm font-bold ${fw.text}`}>{fw.readinessScore}%</span>
                </div>
                <Progress value={fw.readinessScore} className={`h-2.5 [&>div]:${fw.bar}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Gaps & Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Key Compliance Gaps Requiring Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((fw) => (
              <div key={fw.code}>
                <p className={`text-sm font-semibold ${fw.text} mb-2`}>{fw.shortName} — Priority Requirements</p>
                <div className="space-y-1.5">
                  {fw.gaps.map((g, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm border-l-2 border-muted pl-3 py-1">
                      <span className="font-mono text-[11px] text-muted-foreground shrink-0 mt-0.5">{g.id}</span>
                      <div>
                        <p className="text-foreground font-medium leading-tight">{g.title}</p>
                        <p className="text-[11px] text-muted-foreground">{g.section}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stakeholder Summary Footer */}
      <Card className="bg-muted/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">Executive Summary</p>
              <p className="text-sm text-muted-foreground mt-1">
                This report summarizes organizational readiness against {results.map((r) => r.shortName).join(" and ")} data protection frameworks.
                The combined readiness score is <strong>{overallScore}%</strong>, based on{" "}
                {results.reduce((s, r) => s + r.mappedControls, 0)} mapped controls across{" "}
                {results.reduce((s, r) => s + r.totalReqs, 0)} regulatory requirements.
                {overallScore < 50 ? " Immediate action is recommended to address compliance gaps." : overallScore < 80 ? " Continued focus on remaining gaps will improve readiness." : " The organization demonstrates strong compliance posture."}
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Generated on {new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })} · CertiGuard GRC Platform
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}