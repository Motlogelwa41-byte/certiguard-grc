import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Brain, Upload, Loader2, CheckCircle, XCircle, Plus,
  FileText, Link2, Zap, Download, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

export default function AIControlMapper() {
  const [documentText, setDocumentText] = useState("");
  const [fileUploading, setFileUploading] = useState(false);
  const [running, setRunning] = useState(false);
  const [mappings, setMappings] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [targetFramework, setTargetFramework] = useState("all");
  const [importing, setImporting] = useState(false);
  const [selectedMappings, setSelectedMappings] = useState(new Set());
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Framework.list().then(f => setFrameworks(f || []));
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: { type: "object", properties: { text: { type: "string" } } }
      });
      if (result?.output?.text) setDocumentText(result.output.text);
      else if (result?.output) setDocumentText(JSON.stringify(result.output, null, 2));
      toast({ title: "Document loaded", description: "Document text extracted. Ready to map controls." });
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setFileUploading(false);
  };

  const runMapping = async () => {
    if (!documentText.trim()) {
      toast({ title: "No document", description: "Please paste or upload a policy/procedure document.", variant: "destructive" });
      return;
    }
    setRunning(true);
    setMappings([]);
    setSelectedMappings(new Set());

    const frameworkContext = targetFramework !== "all"
      ? `Focus on mapping controls to the ${frameworks.find(f => f.id === targetFramework)?.name || targetFramework} framework.`
      : `Map controls to relevant frameworks including SOC 2, ISO 27001, POPIA, NIST CSF, and any SADC regional regulations.`;

    const prompt = `You are a GRC compliance expert. Analyze the following policy/procedure document and identify all security and compliance controls it describes or implies.

${frameworkContext}

For each control found, extract:
1. A clear control title (concise, actionable)
2. The control category (one of: access_control, data_protection, incident_response, change_management, risk_management, security_operations, business_continuity, network_security, physical_security, compliance, human_resources, asset_management)
3. The severity (critical, high, medium, low)
4. The framework mappings (e.g. SOC 2 CC6.1, ISO 27001 A.9.2.1, POPIA Section 19)
5. A brief description (1-2 sentences)
6. A suggested control ID prefix (e.g. AC, DP, IR)
7. Evidence location — exact quote from the document that proves this control exists

Return a JSON with a "controls" array. Each item: { title, category, severity, description, framework_references (array of strings like "SOC 2 CC6.1"), evidence_quote, suggested_id_prefix }

DOCUMENT TO ANALYZE:
${documentText.substring(0, 10000)}`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: "claude_sonnet_4_6",
        response_json_schema: {
          type: "object",
          properties: {
            controls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" },
                  framework_references: { type: "array", items: { type: "string" } },
                  evidence_quote: { type: "string" },
                  suggested_id_prefix: { type: "string" }
                }
              }
            }
          }
        }
      });

      const found = result?.controls || [];
      const numbered = found.map((c, i) => ({
        ...c,
        suggested_control_id: `${c.suggested_id_prefix || "CTL"}-${String(i + 1).padStart(3, "0")}`,
        _key: i
      }));
      setMappings(numbered);
      setSelectedMappings(new Set(numbered.map(c => c._key)));
      toast({ title: `${found.length} controls identified`, description: "Review and import them into your control library." });
    } catch (e) {
      toast({ title: "Mapping failed", description: e.message, variant: "destructive" });
    }
    setRunning(false);
  };

  const toggleSelect = (key) => {
    setSelectedMappings(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const importSelected = async () => {
    const toImport = mappings.filter(m => selectedMappings.has(m._key));
    if (!toImport.length) return;
    setImporting(true);

    const fw = targetFramework !== "all" ? frameworks.find(f => f.id === targetFramework) : null;
    let successCount = 0;

    for (const ctrl of toImport) {
      try {
        await base44.entities.Control.create({
          control_id: ctrl.suggested_control_id,
          title: ctrl.title,
          description: ctrl.description,
          category: ctrl.category || "compliance",
          status: "not_tested",
          severity: ctrl.severity || "medium",
          automation_status: "manual",
          notes: `Framework references: ${(ctrl.framework_references || []).join(", ")}\n\nEvidence: "${ctrl.evidence_quote}"`,
          framework_ids: fw ? [fw.id] : [],
          framework_names: fw ? [fw.name] : [],
        });
        successCount++;
      } catch {}
    }

    toast({ title: `${successCount} controls imported`, description: "Added to your Controls library for testing and tracking." });
    setImporting(false);
  };

  const severityColor = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700" };

  return (
    <div>
      <PageHeader
        title="AI Control Mapper"
        subtitle="Upload any policy or procedure document — AI extracts and maps controls to frameworks automatically"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Input panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">Document Input</h3>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Paste policy / procedure text</Label>
              <Textarea
                value={documentText}
                onChange={e => setDocumentText(e.target.value)}
                rows={10}
                placeholder="Paste your security policy, IT procedure, compliance document, or any text describing security controls..."
                className="resize-none text-sm"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-3 hover:bg-muted/50 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">{fileUploading ? "Extracting text…" : "Upload PDF, DOC, TXT, CSV"}</span>
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={fileUploading} accept=".pdf,.doc,.docx,.txt,.json,.csv" />
            </label>

            {documentText && (
              <p className="text-xs text-muted-foreground">{documentText.length.toLocaleString()} characters loaded</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <h3 className="font-heading font-semibold text-foreground">Mapping Options</h3>

            <div>
              <Label className="mb-1.5 block">Target Framework (optional)</Label>
              <Select value={targetFramework} onValueChange={setTargetFramework}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frameworks</SelectItem>
                  {frameworks.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={runMapping}
              disabled={running || !documentText.trim()}
            >
              {running
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Mapping controls…</>
                : <><Brain className="w-4 h-4 mr-2" />Extract & Map Controls</>
              }
            </Button>

            {running && (
              <p className="text-xs text-center text-muted-foreground animate-pulse">
                AI is reading your document and identifying controls…
              </p>
            )}
          </div>
        </div>

        {/* Right — Results */}
        <div className="lg:col-span-2">
          {mappings.length === 0 && !running ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Ready to Map</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Upload or paste any policy document. AI will identify all security controls and map them to frameworks like SOC 2, ISO 27001, POPIA, and NIST CSF.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-sm mx-auto">
                {["Security Policy", "IT Procedures", "Compliance Doc"].map(t => (
                  <div key={t} className="text-xs bg-muted rounded-lg p-2 text-muted-foreground flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0" />{t}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {mappings.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <span className="font-semibold text-foreground">{mappings.length} controls identified</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{selectedMappings.size} selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedMappings(
                          selectedMappings.size === mappings.length
                            ? new Set()
                            : new Set(mappings.map(m => m._key))
                        )}
                      >
                        {selectedMappings.size === mappings.length ? "Deselect All" : "Select All"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={importSelected}
                        disabled={selectedMappings.size === 0 || importing}
                      >
                        {importing
                          ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Importing…</>
                          : <><Plus className="w-3.5 h-3.5 mr-1" />Import {selectedMappings.size} Controls</>
                        }
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {mappings.map((ctrl) => (
                  <div
                    key={ctrl._key}
                    className={`bg-card rounded-xl border transition-colors cursor-pointer ${
                      selectedMappings.has(ctrl._key) ? "border-primary bg-primary/3" : "border-border"
                    }`}
                    onClick={() => toggleSelect(ctrl._key)}
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedMappings.has(ctrl._key)}
                          onChange={() => toggleSelect(ctrl._key)}
                          onClick={e => e.stopPropagation()}
                          className="mt-1 w-4 h-4 rounded shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-muted-foreground">{ctrl.suggested_control_id}</span>
                            <h3 className="font-semibold text-foreground text-sm">{ctrl.title}</h3>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${severityColor[ctrl.severity] || "bg-slate-100 text-slate-600"}`}>
                              {ctrl.severity}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {(ctrl.category || "").replace(/_/g, " ")}
                            </span>
                            {(ctrl.framework_references || []).map((ref, i) => (
                              <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Link2 className="w-2.5 h-2.5" />{ref}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{ctrl.description}</p>
                          {ctrl.evidence_quote && (
                            <div className="bg-muted/60 rounded-lg p-2 border-l-2 border-primary/40">
                              <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Evidence in document:</p>
                              <p className="text-xs text-foreground italic line-clamp-2">"{ctrl.evidence_quote}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}