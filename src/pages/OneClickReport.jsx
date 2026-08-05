import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Loader2, ShieldCheck, Download, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { generateOneClickReport } from "@/lib/oneClickReport";

export default function OneClickReport() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState({ frameworks: 0, controls: 0, risks: 0, tasks: 0, evidence: 0, passing: 0 });

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
      base44.entities.Risk.list().catch(() => []),
      base44.entities.ComplianceTask.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
    ]).then(([fw, ctl, rsk, tsk, ev]) => {
      setStats({
        frameworks: fw.length,
        controls: ctl.length,
        risks: rsk.length,
        tasks: tsk.length,
        evidence: ev.length,
        passing: ctl.filter((c) => c.status === "passing").length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generateOneClickReport();
      toast({
        title: "Auditor report generated",
        description: `${result.pages} pages · compliance score ${result.complianceScore}%`,
      });
    } catch (e) {
      toast({ title: "Report generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const complianceScore = stats.controls ? Math.round((stats.passing / stats.controls) * 100) : 0;
  const scoreColor = complianceScore >= 70 ? "text-emerald-600" : complianceScore >= 40 ? "text-amber-600" : "text-red-600";

  return (
    <div>
      <PageHeader
        title="One-Click Auditor Report"
        subtitle="Generate a clean, professional compliance status and readiness report for external auditors — in a single click."
      />

      {/* Hero generate card */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">
              Ready to generate your compliance report
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              A single PDF document with your compliance score, framework readiness, control breakdown,
              risk summary, task status, evidence inventory, and audit trail — formatted for auditor hand-off.
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              size="lg"
              className="h-12 px-8 text-base"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Report…
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Generate Auditor Report
                </>
              )}
            </Button>
            {generating && (
              <p className="text-xs text-muted-foreground mt-3">
                Compiling data and rendering PDF — this takes a few seconds…
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* What's included */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> What's in the report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Executive summary with overall compliance score</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Framework readiness scores and certification dates</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Control status breakdown by category</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Risk register summary with severity distribution</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Task completion and evidence inventory status</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Audit trail summary with recent activity</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> Report attestation with unique report ID</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Current data snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Compliance Score</div>
                <div className={`text-2xl font-bold ${scoreColor}`}>{complianceScore}%</div>
                <div className="text-xs text-muted-foreground">{stats.passing}/{stats.controls} controls</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Frameworks</div>
                <div className="text-2xl font-bold text-foreground">{stats.frameworks}</div>
                <div className="text-xs text-muted-foreground">tracked</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Risks</div>
                <div className="text-2xl font-bold text-amber-600">{stats.risks}</div>
                <div className="text-xs text-muted-foreground">in register</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Evidence</div>
                <div className="text-2xl font-bold text-blue-600">{stats.evidence}</div>
                <div className="text-xs text-muted-foreground">items</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-amber/30 bg-amber/5 p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Report reflects live data</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            The generated PDF captures your compliance posture at the moment of generation. For recurring
            auditor updates, use the Scheduled Reports page to automate delivery.
          </p>
        </div>
      </div>
    </div>
  );
}