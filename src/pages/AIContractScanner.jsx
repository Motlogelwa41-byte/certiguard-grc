import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileSearch, Upload, Sparkles, AlertTriangle, CheckCircle2, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

export default function AIContractScanner() {
  const [contractText, setContractText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const { toast } = useToast();

  const handleScan = async () => {
    if (!contractText.trim() || contractText.length < 100) { toast({ title: "More text needed", description: "Paste at least 100 characters of contract text.", variant: "destructive" }); return; }
    setScanning(true);
    try {
      const prompt = `You are a GRC legal compliance AI. Analyze the following contract/SLA text and identify compliance risks. Cross-reference against standard data protection policies (POPIA, GDPR), information security requirements (ISO 27001), and common vendor risk thresholds.

CONTRACT TEXT:
"""
${contractText.slice(0, 8000)}
"""

Generate a JSON object with this exact schema:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "summary": "Brief overall assessment",
  "high_risk_clauses": [{"clause", "risk", "severity"}],
  "missing_clauses": ["List of important missing clauses e.g. indemnity, data breach notification, audit rights"],
  "compliance_anomalies": [{"issue", "framework", "severity"}],
  "recommendations": ["Actionable recommendations"]
}

Focus on: data protection gaps, liability caps, indemnity missing, audit rights, sub-processor disclosures, breach notification SLAs, and termination clauses.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            summary: { type: "string" },
            high_risk_clauses: { type: "array", items: { type: "object", properties: { clause: { type: "string" }, risk: { type: "string" }, severity: { type: "string" } } } },
            missing_clauses: { type: "array", items: { type: "string" } },
            compliance_anomalies: { type: "array", items: { type: "object", properties: { issue: { type: "string" }, framework: { type: "string" }, severity: { type: "string" } } } },
            recommendations: { type: "array", items: { type: "string" } },
          },
        },
      });
      setResult(res);
      toast({ title: "Contract scan complete" });
    } catch (e) { toast({ title: "Scan failed", description: e.message, variant: "destructive" }); }
    setScanning(false);
  };

  const riskColors = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

  return (
    <div>
      <PageHeader title="AI Contract & SLA Compliance Scanner" subtitle="Upload vendor contracts or SLAs for AI-powered risk analysis against internal thresholds and data protection policies" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="bg-card rounded-xl border border-border p-5">
          <Label className="mb-2 block">Paste Contract / SLA Text</Label>
          <Textarea value={contractText} onChange={(e) => setContractText(e.target.value)} rows={14} placeholder="Paste the full text of the vendor contract, SLA, or DPA you want to analyze..." className="font-mono text-xs" />
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted-foreground">{contractText.length} characters</span>
            <Button onClick={handleScan} disabled={scanning || contractText.length < 100}>
              {scanning ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Scanning...</> : <><Sparkles className="w-4 h-4 mr-1" /> Scan Contract</>}
            </Button>
          </div>
          <div className="bg-muted/40 rounded-lg p-3 mt-4">
            <p className="text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5 inline mr-1" />The AI cross-references contract clauses against POPIA, GDPR, ISO 27001, and your internal risk thresholds to identify high-risk liabilities, missing indemnity clauses, and compliance anomalies.</p>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {!result && !scanning && (
            <div className="text-center py-16 text-muted-foreground">
              <FileSearch className="w-10 h-10 mx-auto mb-3 text-primary/40" />
              <p className="font-semibold text-foreground">Awaiting scan</p>
              <p className="text-sm mt-1">Paste contract text and click "Scan Contract" to begin AI analysis.</p>
            </div>
          )}
          {scanning && (
            <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" /><p className="text-sm text-muted-foreground">AI is analyzing clauses against compliance frameworks...</p></div>
          )}
          {result && (
            <>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-bold text-foreground">Risk Assessment</h3>
                  <span className={`text-sm font-bold uppercase px-3 py-1 rounded-full ${riskColors[result.risk_level] || riskColors.medium}`}>{result.risk_level}</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.summary}</p>
              </div>

              {result.high_risk_clauses && result.high_risk_clauses.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-500" /> High-Risk Clauses</h3>
                  <div className="space-y-2">
                    {result.high_risk_clauses.map((c, i) => (
                      <div key={i} className="bg-muted/40 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1"><span className="text-sm font-semibold text-foreground">{c.clause}</span><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${riskColors[c.severity] || riskColors.medium}`}>{c.severity}</span></div>
                        <p className="text-xs text-muted-foreground">{c.risk}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.missing_clauses && result.missing_clauses.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" /> Missing Clauses</h3>
                  <ul className="space-y-1.5">{result.missing_clauses.map((m, i) => <li key={i} className="text-sm text-foreground flex items-start gap-2"><span className="text-red-500 mt-0.5">•</span>{m}</li>)}</ul>
                </div>
              )}

              {result.compliance_anomalies && result.compliance_anomalies.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-1"><Shield className="w-4 h-4 text-blue-500" /> Compliance Anomalies</h3>
                  <div className="space-y-2">{result.compliance_anomalies.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm"><span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${riskColors[a.severity] || riskColors.medium}`}>{a.severity}</span><div><span className="font-semibold text-foreground">{a.issue}</span><span className="text-xs text-muted-foreground ml-1">({a.framework})</span></div></div>
                  ))}</div>
                </div>
              )}

              {result.recommendations && result.recommendations.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                  <h3 className="font-heading font-semibold text-primary mb-3 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Recommendations</h3>
                  <ul className="space-y-1.5">{result.recommendations.map((r, i) => <li key={i} className="text-sm text-foreground flex items-start gap-2"><span className="text-primary mt-0.5">•</span>{r}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}