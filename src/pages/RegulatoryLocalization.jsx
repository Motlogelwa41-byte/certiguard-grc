import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Languages, Sparkles, Loader2, FileText, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "af", label: "Afrikaans" },
  { value: "st", label: "Sesotho" },
  { value: "zu", label: "isiZulu" },
  { value: "xh", label: "isiXhosa" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "sw", label: "Swahili" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
];

const CONTENT_TYPES = [
  { value: "regulatory_requirement", label: "Regulatory Requirement" },
  { value: "risk_description", label: "Risk Description" },
  { value: "policy_document", label: "Policy Document" },
  { value: "control_guidance", label: "Control Guidance" },
];

export default function RegulatoryLocalization() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("af");
  const [contentType, setContentType] = useState("regulatory_requirement");
  const [translating, setTranslating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState("");
  const { toast } = useToast();

  useEffect(() => { base44.entities.RegulatoryFramework.list().then(setFrameworks).catch(() => {}); }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) { toast({ title: "Source text required", variant: "destructive" }); return; }
    setTranslating(true);
    try {
      const sourceLabel = LANGUAGES.find((l) => l.value === sourceLang)?.label || sourceLang;
      const targetLabel = LANGUAGES.find((l) => l.value === targetLang)?.label || targetLang;
      const typeLabel = CONTENT_TYPES.find((t) => t.value === contentType)?.label || contentType;

      const prompt = `You are a certified legal translator specializing in GRC (Governance, Risk, Compliance) content. Translate the following ${typeLabel} from ${sourceLabel} to ${targetLabel}.

CRITICAL REQUIREMENTS:
1. Maintain exact legal traceability — the translation must preserve the same legal meaning and obligations as the original
2. Use jurisdictionally appropriate legal terminology for ${targetLabel}
3. Preserve any regulatory references, clause numbers, or framework citations exactly as-is
4. If the content references a specific regulatory framework, ensure the translation uses the officially recognized name in the target language's jurisdiction

SOURCE TEXT (${sourceLabel}):
"""
${sourceText.slice(0, 5000)}
"""

Generate a JSON object:
{
  "translated_text": "The full translated text",
  "source_language": "${sourceLabel}",
  "target_language": "${targetLabel}",
  "content_type": "${typeLabel}",
  "legal_disclaimer": "Note about legal traceability and that the original source text remains the authoritative version",
  "key_terms": [{"source_term", "translated_term", "note"}]
}`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            translated_text: { type: "string" },
            source_language: { type: "string" },
            target_language: { type: "string" },
            content_type: { type: "string" },
            legal_disclaimer: { type: "string" },
            key_terms: { type: "array", items: { type: "object", properties: { source_term: { type: "string" }, translated_term: { type: "string" }, note: { type: "string" } } } },
          },
        },
      });
      setResult(res);
      toast({ title: "Translation complete", description: `${typeLabel} translated to ${targetLabel}` });
    } catch (e) { toast({ title: "Translation failed", description: e.message, variant: "destructive" }); }
    setTranslating(false);
  };

  const copyResult = () => { navigator.clipboard.writeText(result?.translated_text || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div>
      <PageHeader title="Regulatory Localization Engine" subtitle="Translate regulatory requirements, risk descriptions, and policies across SADC and international languages with legal traceability" />

      <div className="bg-card rounded-xl border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Label>Content Type</Label><Select value={contentType} onValueChange={setContentType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CONTENT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Source Language</Label><Select value={sourceLang} onValueChange={setSourceLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Target Language</Label><Select value={targetLang} onValueChange={setTargetLang}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Framework (optional)</Label><Select value={selectedFramework} onValueChange={setSelectedFramework}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value={null}>None</SelectItem>{frameworks.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source */}
        <div className="bg-card rounded-xl border border-border p-5">
          <Label className="mb-2 block flex items-center gap-1"><FileText className="w-4 h-4" /> Source Text ({LANGUAGES.find((l) => l.value === sourceLang)?.label})</Label>
          <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} rows={14} placeholder="Paste the regulatory requirement, risk description, or policy text to translate..." />
          <Button className="w-full mt-3" onClick={handleTranslate} disabled={translating || !sourceText.trim()}>
            {translating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Translating...</> : <><Sparkles className="w-4 h-4 mr-1" /> Translate with Legal Traceability</>}
          </Button>
        </div>

        {/* Result */}
        <div className="space-y-4">
          {!result && !translating && (
            <div className="text-center py-16 text-muted-foreground"><Languages className="w-10 h-10 mx-auto mb-3 text-primary/40" /><p className="font-semibold text-foreground">Awaiting translation</p><p className="text-sm mt-1">Paste source text and click translate to generate a legally traceable translation.</p></div>
          )}
          {translating && <div className="text-center py-16"><Loader2 className="w-8 h-8 mx-auto mb-3 text-primary animate-spin" /><p className="text-sm text-muted-foreground">AI is translating with legal terminology preservation...</p></div>}
          {result && (
            <>
              <div className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-semibold text-foreground flex items-center gap-1"><Languages className="w-4 h-4 text-primary" /> {result.target_language} Translation</h3>
                  <Button size="sm" variant="ghost" onClick={copyResult}>{copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}</Button>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{result.translated_text}</p>
              </div>
              {result.key_terms && result.key_terms.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-5">
                  <h3 className="font-heading font-semibold text-foreground mb-3">Key Legal Terms</h3>
                  <div className="space-y-2">{result.key_terms.map((t, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded shrink-0">{t.source_term}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-semibold text-foreground">{t.translated_term}</span>
                      {t.note && <span className="text-xs text-muted-foreground">({t.note})</span>}
                    </div>
                  ))}</div>
                </div>
              )}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400"><strong>Legal Disclaimer:</strong> {result.legal_disclaimer}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}