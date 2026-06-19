import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Upload, Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";

const gates = [
  { id: "GATE-P01-01", principle: 1, domain: "Leadership", requirement: "The board must demonstrate collective integrity, competence, and accountability through documented board evaluations and skills matrices." },
  { id: "GATE-P02-01", principle: 2, domain: "Ethics & Citizenship", requirement: "The organization must integrate Botho and ethical culture into its core citizenship strategy with documented ethics policies." },
  { id: "GATE-P03-01", principle: 3, domain: "Strategy & Performance", requirement: "Strategy must be based on Integrated Thinking, balancing financial, social, and environmental capitals with measurable KPIs." },
  { id: "GATE-P04-01", principle: 4, domain: "Reporting", requirement: "Reporting must satisfy the Double Materiality requirement covering both Financial and Impact Materiality." },
  { id: "GATE-P05-01", principle: 5, domain: "Governing Body", requirement: "The board must have a majority of independent members with rigorous review for members serving over 9 years, per BSE Listing Rules 5.11." },
  { id: "GATE-P08-01", principle: 8, domain: "Risk Governance", requirement: "The board must treat risk as an opportunity for value creation with a documented risk appetite framework." },
  { id: "GATE-P09-01", principle: 9, domain: "Compliance", requirement: "There must be a framework for ensuring compliance with the Botswana Data Protection Act (BDPA) including data mapping and DPIAs." },
  { id: "GATE-P10-01", principle: 10, domain: "AI & Technology", requirement: "There must be clear human accountability for decisions made by AI systems and automated algorithms, documented in an algorithmic impact assessment." },
  { id: "GATE-P12-01", principle: 12, domain: "Assurance", requirement: "The Combined Assurance model must provide a holistic view of the organization's control environment." },
];

export default function AIAuditor() {
  const [selectedGate, setSelectedGate] = useState(null);
  const [documentText, setDocumentText] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);
  const [runAll, setRunAll] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema: { type: "object", properties: { text: { type: "string" } } } });
      if (result?.output?.text) setDocumentText(result.output.text);
      else if (result?.output) setDocumentText(JSON.stringify(result.output, null, 2));
      toast({ title: "Document loaded" });
    } catch (err) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    setFileUploading(false);
  };

  const auditGate = async (gate) => {
    const prompt = `ROLE: You are the AI Automated Auditor for the Ethical Edge Open GRC platform.

TARGET GATE: ${gate.id}
DOMAIN: ${gate.domain}
REQUIREMENT: ${gate.requirement}

EVALUATION DOCUMENT: ${documentText.substring(0, 8000)}

Evaluate the document against the requirement. Be deterministic and strict — only mark PASSED if you find explicit auditable evidence.

Return JSON:
{
  "gate_id": "${gate.id}",
  "is_passed": boolean,
  "confidence_score": number (0-1),
  "evidence_citation": "exact quote or explanation of gap",
  "risk_rating": "LOW" | "MEDIUM" | "HIGH"
}`;
    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: { type: "object", properties: { gate_id: { type: "string" }, is_passed: { type: "boolean" }, confidence_score: { type: "number" }, evidence_citation: { type: "string" }, risk_rating: { type: "string" } }, required: ["gate_id", "is_passed"] } });
      return result;
    } catch (e) { return { gate_id: gate.id, is_passed: false, confidence_score: 0, evidence_citation: "Error: " + e.message, risk_rating: "HIGH" }; }
  };

  const runAudit = async () => {
    if (!documentText) { toast({ title: "Please enter or upload a document to audit", variant: "destructive" }); return; }
    const targets = runAll ? gates : selectedGate ? [selectedGate] : [];
    if (targets.length === 0) { toast({ title: "Select a gate first", variant: "destructive" }); return; }
    setRunning(true);
    setResults([]);
    const auditResults = [];
    for (const gate of targets) {
      const r = await auditGate(gate);
      auditResults.push(r);
      setResults([...auditResults]);
    }
    setRunning(false);
    const passed = auditResults.filter(r => r.is_passed).length;
    toast({ title: `Audit complete: ${passed}/${auditResults.length} gates passed` });
  };

  const passed = results.filter(r => r.is_passed).length;
  const failed = results.filter(r => !r.is_passed).length;

  return (
    <div>
      <PageHeader title="AI Compliance Auditor" subtitle="Automated audit against King V gates using AI document analysis" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Document Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-heading font-semibold text-foreground mb-3">Evidence Document</h3>
            <Label className="text-xs text-muted-foreground mb-1 block">Paste document text or upload</Label>
            <Textarea value={documentText} onChange={(e) => setDocumentText(e.target.value)} rows={10} placeholder="Paste policy, board minutes, compliance report, or any auditable document..." className="resize-none" />
            <div className="mt-2">
              <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{fileUploading ? "Uploading..." : "Upload document (PDF, DOC, etc.)"}</span>
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={fileUploading} accept=".pdf,.doc,.docx,.txt,.json,.csv" />
              </label>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-heading font-semibold text-foreground mb-3">Select Gate(s)</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {gates.map((g) => (
                <button key={g.id} onClick={() => { setSelectedGate(g); setRunAll(false); }} className={`w-full text-left p-2.5 rounded-lg text-xs border transition-colors ${selectedGate?.id === g.id && !runAll ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                  <span className="font-mono font-semibold text-primary">{g.id}</span>
                  <span className="ml-2 text-foreground font-medium">{g.domain}</span>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">{g.requirement}</p>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              <button onClick={() => { setRunAll(true); setSelectedGate(null); }} className={`w-full text-left p-2.5 rounded-lg text-xs border transition-colors ${runAll ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}>
                <span className="font-semibold text-foreground">🔍 Run All Gates (Full Audit)</span>
              </button>
              <Button className="w-full" onClick={runAudit} disabled={running || !documentText || (!selectedGate && !runAll)}>
                {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Auditing...</> : <><Brain className="w-4 h-4 mr-2" /> Run AI Audit</>}
              </Button>
            </div>
          </div>
        </div>

        {/* Right — Results */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="font-heading font-semibold text-foreground mb-4">Audit Results</h3>
            {results.length > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                  <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-500" /><span className="text-lg font-bold text-emerald-600">{passed}</span><span className="text-sm text-muted-foreground">Passed</span></div>
                  <div className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" /><span className="text-lg font-bold text-red-600">{failed}</span><span className="text-sm text-muted-foreground">Failed</span></div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${results.length > 0 ? Math.round((passed/results.length)*100) : 0}%` }} />
                  </div>
                  <span className="text-sm font-semibold">{results.length > 0 ? Math.round((passed/results.length)*100) : 0}%</span>
                </div>
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <div key={i} className={`p-4 rounded-lg border ${r.is_passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {r.is_passed ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                          <span className="font-mono text-sm font-semibold">{r.gate_id}</span>
                          <StatusBadge status={r.risk_rating?.toLowerCase()} />
                        </div>
                        <span className="text-xs text-muted-foreground">Confidence: {Math.round((r.confidence_score || 0) * 100)}%</span>
                      </div>
                      <p className="text-sm text-foreground">{r.evidence_citation}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Ready to Audit</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">Upload or paste a document, select audit gates, and run the AI auditor to get compliance results.</p>
              </div>
            )}
          </div>

          {results.length > 0 && (
            <div className="mt-4 bg-card rounded-xl border border-border p-5">
              <h3 className="font-heading font-semibold text-foreground mb-3">Audit Summary (Download-Ready)</h3>
              <div className="bg-muted/50 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {results.map((r, i) => (
                  `${r.gate_id} | ${r.is_passed ? '✅ PASSED' : '❌ FAILED'} | Risk: ${r.risk_rating} | Confidence: ${Math.round((r.confidence_score||0)*100)}%\n  ${r.evidence_citation}\n\n`
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}