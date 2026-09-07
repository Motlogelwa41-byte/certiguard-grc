import React, { useState } from "react";
import { Brain, Upload, Loader2, AlertTriangle, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function AIVendorDocumentAnalysis({ vendorId, vendorName, open, onOpenChange }) {
  const { toast } = useToast();
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const handleFile = async (f) => {
    setFile(f);
    if (!f) return;
    try {
      const { file_url } = await window.base44.integrations.Core.UploadFile({ file: f });
      setFileUrl(file_url);
    } catch (e) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    }
  };

  const analyze = async () => {
    if (!fileUrl) {
      toast({ title: "Please upload a document first", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch("/api/functions/analyzeVendorDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_url: fileUrl, vendor_id: vendorId, vendor_name: vendorName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data.analysis);
      toast({ title: "Vendor document analyzed" });
    } catch (e) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColor = result?.risk_level === "low" ? "bg-emerald-100 text-emerald-700"
    : result?.risk_level === "medium" ? "bg-amber-100 text-amber-700"
    : result?.risk_level === "high" ? "bg-orange-100 text-orange-700"
    : "bg-rose-100 text-rose-700";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI Vendor Document Analysis {vendorName && `— ${vendorName}`}
          </DialogTitle>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <div>
              <Label>Upload Vendor Security Document (SOC 2, ISO 27001, Pen Test, Questionnaire)</Label>
              <Input type="file" accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg" onChange={(e) => handleFile(e.target.files?.[0])} className="mt-1" />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({fileUrl ? "uploaded ✓" : "uploading..."})</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              The AI will read the document and extract certifications, security controls, control gaps, risk indicators,
              and provide a risk score and approval recommendation. Results require human validation before becoming official.
            </p>
          </div>
        )}

        {analyzing && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">AI is reading the vendor document...</p>
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-lg ${riskColor}`}>
                <span className="text-2xl font-bold">{result.risk_score}</span>
                <span className="text-sm ml-1">/100</span>
              </div>
              <div>
                <Badge className={riskColor}>{result.risk_level?.toUpperCase()} RISK</Badge>
                <p className="text-sm font-medium mt-1 capitalize">{result.overall_recommendation?.replace(/_/g, " ")}</p>
              </div>
              <div className="ml-auto">
                <Badge variant="secondary" className="capitalize">{result.security_maturity} maturity</Badge>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-1">Posture Summary</p>
              <p className="text-sm text-muted-foreground">{result.posture_summary}</p>
            </div>

            {result.certifications?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Certifications Found</p>
                <div className="flex flex-wrap gap-2">
                  {result.certifications.map((c, i) => (
                    <Badge key={i} className={c.status === "expired" ? "bg-rose-100 text-rose-700 border-0" : "bg-emerald-100 text-emerald-700 border-0"}>
                      <ShieldCheck className="w-3 h-3 mr-1" />{c.name} {c.valid_until ? `(${c.valid_until})` : ""}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {result.control_gaps?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-amber-600" /> Control Gaps ({result.control_gaps.length})</p>
                <div className="space-y-2">
                  {result.control_gaps.map((g, i) => (
                    <div key={i} className="rounded-lg border border-border p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className={g.severity === "critical" || g.severity === "high" ? "bg-rose-100 text-rose-700 border-0" : "bg-amber-100 text-amber-700 border-0"}>{g.severity}</Badge>
                        <span className="font-medium">{g.gap}</span>
                      </div>
                      {g.recommendation && <p className="text-xs text-muted-foreground mt-1">→ {g.recommendation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_actions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Recommended Due Diligence Actions</p>
                <div className="space-y-1">
                  {result.recommended_actions.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge className={a.priority === "critical" || a.priority === "high" ? "bg-rose-100 text-rose-700 border-0 text-xs" : "bg-amber-100 text-amber-700 border-0 text-xs"}>{a.priority}</Badge>
                      <span>{a.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
              ⚠ This AI assessment requires human validation before becoming an official vendor risk record.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setResult(null); setFile(null); setFileUrl(""); onOpenChange(false); }}>Close</Button>
          {!result && <Button onClick={analyze} disabled={analyzing || !fileUrl}>{analyzing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analyzing...</> : <><Brain className="w-4 h-4 mr-1" /> Analyze Document</>}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}