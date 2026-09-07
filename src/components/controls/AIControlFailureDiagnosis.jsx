import React, { useState } from "react";
import { Brain, Loader2, Wrench, AlertTriangle, Clock, ShieldAlert, Lightbulb } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function AIControlFailureDiagnosis({ control, testResult, open, onOpenChange }) {
  const { toast } = useToast();
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);

  const diagnose = async () => {
    setDiagnosing(true);
    setDiagnosis(null);
    try {
      const res = await fetch("/api/functions/diagnoseControlFailure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          control_id: control?.control_id || control?.id,
          control_title: control?.title,
          test_name: testResult?.test_name || testResult?.test_key,
          test_result: testResult?.result || "FAIL",
          error_details: testResult?.error_message || testResult?.error_details,
          framework: control?.framework || control?.framework_name,
          category: control?.category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Diagnosis failed");
      setDiagnosis(data.diagnosis);
      toast({ title: "Control failure diagnosed" });
    } catch (e) {
      toast({ title: "Diagnosis failed", description: e.message, variant: "destructive" });
    } finally {
      setDiagnosing(false);
    }
  };

  const severityColor = (s) => {
    if (s === "critical") return "bg-rose-100 text-rose-700 border-0";
    if (s === "high") return "bg-orange-100 text-orange-700 border-0";
    if (s === "medium") return "bg-amber-100 text-amber-700 border-0";
    return "bg-blue-100 text-blue-700 border-0";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setDiagnosis(null); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Failure Diagnosis {control?.title && `— ${control.title}`}
          </DialogTitle>
        </DialogHeader>

        {!diagnosis && !diagnosing && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The AI will analyze why this control test failed and provide a root cause, plain-language explanation,
              step-by-step fix instructions, prevention measures, and evidence needed to pass the next test.
            </p>
            {testResult?.error_message && (
              <div className="rounded-lg border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 p-3 text-sm">
                <p className="font-semibold text-rose-700 dark:text-rose-400">Test Error:</p>
                <p className="text-rose-600 dark:text-rose-300 font-mono text-xs mt-1">{testResult.error_message}</p>
              </div>
            )}
          </div>
        )}

        {diagnosing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">AI is diagnosing the failure...</p>
          </div>
        )}

        {diagnosis && !diagnosing && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={severityColor(diagnosis.severity_if_unfixed)}>
                <ShieldAlert className="w-3 h-3 mr-1" />{diagnosis.severity_if_unfixed} if unfixed
              </Badge>
              <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Est. fix: {diagnosis.estimated_fix_time}</Badge>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-600" /> Root Cause</p>
              <p className="text-sm text-muted-foreground">{diagnosis.root_cause}</p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Plain-Language Explanation</p>
              <p className="text-sm text-muted-foreground">{diagnosis.plain_language_explanation}</p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1 flex items-center gap-1"><Wrench className="w-4 h-4 text-primary" /> Step-by-Step Fix</p>
              <div className="space-y-2">
                {diagnosis.fix_steps?.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">{step.step}</span>
                    <div className="flex-1">
                      <p className="text-sm">{step.action}</p>
                      <Badge variant="outline" className="text-xs mt-1 capitalize">{step.responsible_role?.replace(/_/g, " ")}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1 flex items-center gap-1"><Lightbulb className="w-4 h-4 text-amber-500" /> Prevention</p>
              <p className="text-sm text-muted-foreground">{diagnosis.prevention}</p>
            </div>

            {diagnosis.evidence_needed?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Evidence Needed to Pass Next Test</p>
                <div className="space-y-1">
                  {diagnosis.evidence_needed.map((e, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary" className="text-xs">{e.type}</Badge>
                      <span className="text-muted-foreground">{e.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnosis.related_controls_at_risk?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-rose-600" /> Related Controls at Risk</p>
                <div className="space-y-1">
                  {diagnosis.related_controls_at_risk.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant="outline" className="text-xs font-mono">{c.control_id}</Badge>
                      <span className="text-muted-foreground">{c.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setDiagnosis(null); onOpenChange(false); }}>Close</Button>
          {!diagnosis && <Button onClick={diagnose} disabled={diagnosing}>{diagnosing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Diagnosing...</> : <><Brain className="w-4 h-4 mr-1" /> Diagnose Failure</>}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}