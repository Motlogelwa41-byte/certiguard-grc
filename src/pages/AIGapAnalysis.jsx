import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Loader2, Sparkles, AlertTriangle, ShieldCheck, Target, TrendingUp, Plus } from "lucide-react";

const INDUSTRIES = [
  "Financial Services", "Healthcare", "Technology/SaaS", "Mining", "Telecommunications",
  "Government", "Retail/E-commerce", "Manufacturing", "Education", "Energy/Utilities", "Other"
];

export default function AIGapAnalysis() {
  const { toast } = useToast();
  const [industry, setIndustry] = useState("Financial Services");
  const [jurisdiction, setJurisdiction] = useState("South Africa");
  const [companyContext, setCompanyContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [existingControls, setExistingControls] = useState([]);
  const [frameworks, setFrameworks] = useState([]);

  useEffect(() => {
    base44.entities.Control.list("-updated_date", 200).then(setExistingControls).catch(() => {});
    base44.entities.Framework.list().then(setFrameworks).catch(() => {});
  }, []);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const controlBrief = existingControls.slice(0, 80).map(c => ({
        title: c.title, category: c.category, status: c.status, control_id: c.control_id,
      }));
      const fwNames = frameworks.map(f => f.name);

      const prompt = `You are a senior GRC consultant specializing in ${industry} compliance in ${jurisdiction}.
Analyze this organization's current compliance posture and provide a tailored gap analysis.

INDUSTRY: ${industry}
JURISDICTION: ${jurisdiction}
ACTIVE FRAMEWORKS: ${fwNames.join(", ") || "None yet"}
COMPANY CONTEXT: ${companyContext || "No additional context provided"}

EXISTING CONTROLS (${controlBrief.length}):
${JSON.stringify(controlBrief)}

Provide a comprehensive JSON response with:
1. industry_risk_profile: Top 5 inherent risks for this industry/jurisdiction with likelihood (1-5), impact (1-5), and description
2. missing_controls: 8-10 recommended controls that are NOT in the existing list, with title, category, priority (critical/high/medium), framework_reference, and rationale
3. compliance_priority_roadmap: 6-8 phased recommendations ordered by priority (phase 1 = immediate, phase 2 = 30-60 days, phase 3 = 60-90 days), each with action, rationale, and estimated_effort
4. recommended_frameworks: 3-4 frameworks this organization should adopt based on industry and jurisdiction, with name and reason`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            industry_risk_profile: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_name: { type: "string" },
                  likelihood: { type: "number" },
                  impact: { type: "number" },
                  description: { type: "string" },
                },
              },
            },
            missing_controls: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  category: { type: "string" },
                  priority: { type: "string" },
                  framework_reference: { type: "string" },
                  rationale: { type: "string" },
                },
              },
            },
            compliance_priority_roadmap: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  phase: { type: "string" },
                  action: { type: "string" },
                  rationale: { type: "string" },
                  estimated_effort: { type: "string" },
                },
              },
            },
            recommended_frameworks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  reason: { type: "string" },
                },
              },
            },
          },
        },
      });

      setAnalysis(result);
      toast({ title: "Gap analysis complete", description: "AI recommendations generated successfully." });
    } catch (e) {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const createRisk = async (risk) => {
    try {
      await base44.entities.Risk.create({
        title: risk.risk_name,
        description: risk.description,
        likelihood: risk.likelihood,
        impact: risk.impact,
        risk_score: risk.likelihood * risk.impact,
        category: "operational",
        status: "open",
        treatment: "mitigate",
      });
      toast({ title: "Risk created", description: risk.risk_name });
    } catch (e) {
      toast({ title: "Failed to create risk", description: e.message, variant: "destructive" });
    }
  };

  const createControl = async (ctrl) => {
    try {
      await base44.entities.Control.create({
        title: ctrl.title,
        category: ctrl.category || "other",
        status: "todo",
        description: ctrl.rationale,
      });
      toast({ title: "Control created", description: ctrl.title });
    } catch (e) {
      toast({ title: "Failed to create control", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        title="AI Gap Analysis"
        subtitle="Industry-aware compliance gap detection and control recommendation engine"
      />

      <div className="bg-card rounded-2xl border border-border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="mb-1.5 block">Industry Sector</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block">Primary Jurisdiction</Label>
            <Select value={jurisdiction} onValueChange={setJurisdiction}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["South Africa", "Botswana", "Kenya", "Nigeria", "Zimbabwe", "Tanzania", "Uganda", "Zambia", "Ghana", "Global"].map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mb-4">
          <Label className="mb-1.5 block">Company Context (optional)</Label>
          <Textarea
            rows={3}
            placeholder="e.g. We are a mid-sized bank with 500 employees, cloud-hosted core banking system, and 3rd-party payment processor integrations..."
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value)}
          />
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {loading ? "Analyzing..." : "Run AI Gap Analysis"}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Analyzes your {existingControls.length} existing controls against industry benchmarks and recommends tailored gaps.
        </p>
      </div>

      {analysis && (
        <div className="space-y-6">
          {/* Risk Profile */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-heading font-semibold">Industry Risk Profile</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.industry_risk_profile?.map((r, i) => (
                <div key={i} className="border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{r.risk_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">L: {r.likelihood}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">I: {r.impact}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Score: {r.likelihood * r.impact}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => createRisk(r)}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Controls */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="text-lg font-heading font-semibold">Recommended Missing Controls</h2>
            </div>
            <div className="space-y-2">
              {analysis.missing_controls?.map((c, i) => (
                <div key={i} className="border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{c.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.priority === "critical" ? "bg-red-100 text-red-700" : c.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{c.priority}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{c.rationale}</p>
                    {c.framework_reference && <p className="text-xs text-primary mt-1">Ref: {c.framework_reference}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => createControl(c)}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Roadmap */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-heading font-semibold">Compliance Priority Roadmap</h2>
            </div>
            <div className="space-y-3">
              {analysis.compliance_priority_roadmap?.map((p, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{i + 1}</div>
                    {i < analysis.compliance_priority_roadmap.length - 1 && <div className="w-0.5 h-full bg-border mt-1 min-h-[2rem]" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.phase}</span>
                      {p.estimated_effort && <span className="text-xs text-muted-foreground">{p.estimated_effort}</span>}
                    </div>
                    <p className="font-medium text-foreground">{p.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Frameworks */}
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-heading font-semibold">Recommended Frameworks</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {analysis.recommended_frameworks?.map((f, i) => (
                <div key={i} className="border border-border rounded-xl p-4">
                  <p className="font-medium text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{f.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}