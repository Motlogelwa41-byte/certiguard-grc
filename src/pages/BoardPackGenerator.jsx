import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, FileText, Download, RefreshCw, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";

export default function BoardPackGenerator() {
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState(null);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    gatherData();
  }, []);

  const gatherData = async () => {
    try {
      const [risks, controls, findings, kpis, regulatoryChanges, incidents, frameworks] = await Promise.all([
        base44.entities.Risk.list("-risk_score", 50).catch(() => []),
        base44.entities.Control.list().catch(() => []),
        base44.entities.SecurityFinding.list("-created_date", 50).catch(() => []),
        base44.entities.KpiKri.list().catch(() => []),
        base44.entities.RegulatoryChange.list("-created_date", 20).catch(() => []),
        base44.entities.Incident.list("-created_date", 20).catch(() => []),
        base44.entities.Framework.list().catch(() => []),
      ]);
      const data = { risks, controls, findings, kpis, regulatoryChanges, incidents, frameworks };
      setRawData(data);
      setLoading(false);
    } catch (e) {
      toast({ title: "Failed to load data", description: e.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const generate = async () => {
    if (!rawData) return;
    setGenerating(true);
    try {
      const passing = rawData.controls.filter((c) => c.status === "passing").length;
      const total = rawData.controls.length;
      const complianceScore = total > 0 ? Math.round((passing / total) * 100) : 0;
      const openRisks = rawData.risks.filter((r) => r.status === "open" || r.status === "mitigating");
      const topRisks = [...openRisks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5);
      const openFindings = rawData.findings.filter((f) => f.status === "open" || f.status === "in_progress");
      const sevCounts = { critical: 0, high: 0, medium: 0, low: 0 };
      openFindings.forEach((f) => { sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1; });
      const atRiskKpis = rawData.kpis.filter((k) => k.status === "warning" || k.status === "critical");
      const openIncidents = rawData.incidents.filter((i) => i.status !== "closed" && i.status !== "false_positive");
      const fwReady = rawData.frameworks.map((f) => ({ name: f.name, score: f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : f.readiness_score || 0 }));

      const prompt = `You are a GRC executive advisor. Generate a board-ready presentation outline (8-10 slides) for a GRC board pack. Use the following current system data:

COMPLIANCE POSTURE: ${complianceScore}% (${passing}/${total} controls passing)
FRAMEWORK READINESS: ${JSON.stringify(fwReady)}
TOP RISKS: ${JSON.stringify(topRisks.map(r => ({ title: r.title, score: r.risk_score, status: r.status, category: r.category })))}
OPEN FINDINGS: ${sevCounts.critical} critical, ${sevCounts.high} high, ${sevCounts.medium} medium, ${sevCounts.low} low
AT-RISK KPIs/KRIs: ${JSON.stringify(atRiskKpis.map(k => ({ name: k.name, type: k.indicator_type, status: k.status, actual: k.actual_value, target: k.target_value })))}
REGULATORY CHANGES: ${JSON.stringify(rawData.regulatoryChanges.slice(0, 5).map(r => ({ title: r.title, jurisdiction: r.jurisdiction, impact: r.impact_level })))}
OPEN INCIDENTS: ${openIncidents.length}

Generate a JSON object with this exact schema:
{
  "slides": [
    {
      "slide_number": 1,
      "title": "Slide title",
      "bullet_points": ["Key point 1", "Key point 2", "Key point 3"],
      "speaker_notes": "Narrative summary for the presenter",
      "recommendation": "Specific board-level recommendation (if applicable)"
    }
  ]
}

Start with an executive summary slide, then cover: compliance posture, top risks, audit findings, KPI/KRI performance, regulatory landscape, incidents, and end with recommendations. Make it concise, data-driven, and executive-ready.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            slides: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  slide_number: { type: "number" },
                  title: { type: "string" },
                  bullet_points: { type: "array", items: { type: "string" } },
                  speaker_notes: { type: "string" },
                  recommendation: { type: "string" },
                },
              },
            },
          },
        },
      });

      setSlides(response.slides || []);
      toast({ title: "Board pack generated", description: `${(response.slides || []).length} slides synthesized from live data.` });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleExport = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(printRef.current, "board-pack.pdf");
      toast({ title: "Board pack exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="AI Board Pack Generator"
        subtitle="Synthesizes live risk, compliance, and KPI data into an executive-ready presentation outline"
        actions={
          <div className="flex items-center gap-2">
            {slides && <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}><Download className="w-4 h-4 mr-1" /> {exporting ? "Exporting..." : "Export PDF"}</Button>}
            <Button size="sm" onClick={generate} disabled={generating}><Sparkles className="w-4 h-4 mr-1" /> {generating ? "Synthesizing..." : "Generate Board Pack"}</Button>
          </div>
        }
      />

      {!slides && !generating && (
        <div className="text-center py-16 text-muted-foreground">
          <Presentation className="w-10 h-10 mx-auto mb-3 text-primary/40" />
          <p className="font-semibold text-foreground">Ready to generate</p>
          <p className="text-sm mt-1">Click "Generate Board Pack" to synthesize live data into an executive presentation outline.</p>
        </div>
      )}

      {generating && (
        <div className="text-center py-16">
          <RefreshCw className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">AI is analyzing risks, findings, KPIs, and regulatory changes...</p>
        </div>
      )}

      {slides && (
        <div ref={printRef} className="space-y-4">
          {slides.map((slide, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6 break-inside-avoid">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-sm">{slide.slide_number || i + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-bold text-foreground text-lg">{slide.title}</h3>
                </div>
              </div>
              {slide.bullet_points && slide.bullet_points.length > 0 && (
                <ul className="space-y-1.5 mb-3 ml-13">
                  {slide.bullet_points.map((bp, j) => (
                    <li key={j} className="text-sm text-foreground flex items-start gap-2">
                      <span className="text-primary mt-1 shrink-0">•</span>
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              )}
              {slide.speaker_notes && (
                <div className="bg-muted/40 rounded-lg p-3 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Speaker Notes</p>
                  <p className="text-sm text-muted-foreground">{slide.speaker_notes}</p>
                </div>
              )}
              {slide.recommendation && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Recommendation</p>
                  <p className="text-sm text-foreground">{slide.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}