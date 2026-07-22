import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
  Rocket, ArrowRight, ArrowLeft, Check, Loader2, Building2, Target,
  Upload, Play, ShieldCheck, AlertTriangle, FileDown, Sparkles, TrendingUp
} from "lucide-react";

const STEPS = ["Company", "Goal", "Import Risks", "Assess", "Done"];

const INDUSTRIES = ["Aerospace & Defense", "Financial Services", "Healthcare", "Technology / SaaS", "Government", "Energy & Utilities", "Telecommunications", "Other"];
const REGIONS = ["South Africa", "SADC", "African Union", "European Union", "United Kingdom", "United States", "Global"];
const SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];
const CATEGORIES = ["operational", "technical", "compliance", "financial", "strategic", "reputational", "third_party"];

const SAMPLE_RISKS = `Unpatched ground station firmware | 4 | 5 | technical
Single-region cloud dependency | 3 | 4 | operational
Insider threat to proprietary designs | 2 | 5 | compliance
Vendor assessment backlog | 3 | 4 | third_party
POPIA data subject request delays | 3 | 3 | compliance`;

export default function GuidedOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);

  // Step 1 — company
  const [company, setCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rg_company") || "{}"); } catch { return {}; }
  });
  const [industry, setIndustry] = useState(company.industry || "Aerospace & Defense");
  const [region, setRegion] = useState(company.region || "South Africa");
  const [size, setSize] = useState(company.size || "51-200");
  const [companyName, setCompanyName] = useState(company.name || "");

  // Step 2 — goal
  const [frameworks, setFrameworks] = useState([]);
  const [loadingFws, setLoadingFws] = useState(true);
  const [goalFrameworkId, setGoalFrameworkId] = useState(null);
  const [targetScore, setTargetScore] = useState(80);
  const [targetDate, setTargetDate] = useState("");

  // Step 3 — import risks
  const [riskText, setRiskText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Step 4 — assessment
  const [controls, setControls] = useState([]);
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [fws, ctls] = await Promise.all([
          base44.entities.Framework.list("-updated_date", 100),
          base44.entities.Control.list("-updated_date", 300),
        ]);
        setFrameworks(fws || []);
        setControls(ctls || []);
        if (fws && fws.length && !goalFrameworkId) setGoalFrameworkId(fws[0].id);
      } catch (e) {
        toast({ title: "Could not load frameworks", description: e.message, variant: "destructive" });
      }
      setLoadingFws(false);
    })();
  }, []);

  const saveCompany = () => {
    const profile = { name: companyName, industry, region, size };
    localStorage.setItem("rg_company", JSON.stringify(profile));
  };

  const next = () => {
    if (step === 0) saveCompany();
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const importRisks = async () => {
    const lines = riskText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast({ title: "Nothing to import", description: "Paste at least one risk line.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const records = lines.map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        const title = parts[0];
        if (!title) return null;
        const likelihood = Math.min(5, Math.max(1, parseInt(parts[1]) || 3));
        const impact = Math.min(5, Math.max(1, parseInt(parts[2]) || 3));
        let category = (parts[3] || "operational").toLowerCase();
        if (!CATEGORIES.includes(category)) category = "operational";
        return {
          title,
          likelihood,
          impact,
          risk_score: likelihood * impact,
          category,
          status: "open",
          treatment: "mitigate",
        };
      }).filter(Boolean);

      if (records.length === 0) {
        toast({ title: "No valid risks", description: "Each line needs at least a title.", variant: "destructive" });
        setImporting(false);
        return;
      }
      await base44.entities.Risk.bulkCreate(records);
      setImportedCount(records.length);
      toast({ title: `${records.length} risks imported`, description: "Your risk register is ready to review." });
      next();
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(false);
  };

  const runAssessment = async () => {
    setAssessing(true);
    try {
      const passing = controls.filter((c) => c.status === "passing").length;
      const failing = controls.filter((c) => c.status === "failing").length;
      const notTested = controls.filter((c) => c.status === "not_tested").length;
      const na = controls.filter((c) => c.status === "not_applicable").length;
      const total = controls.length;
      const score = total > 0 ? Math.round((passing / total) * 100) : 0;

      const perFw = frameworks.map((f) => ({
        name: f.name,
        readiness: f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : (f.readiness_score || 0),
        status: f.status,
      }));

      const nowIso = new Date().toISOString();
      await base44.entities.ComplianceRun.create({
        title: `First Assessment — ${companyName || "New Tenant"}`,
        status: "completed",
        total_checks: total,
        passed: passing,
        failed: failing,
        skipped: na + notTested,
        score,
        started_at: nowIso,
        completed_at: nowIso,
        results_json: JSON.stringify({ perFw, passing, failing, notTested, na }),
        triggered_by: "Guided Onboarding",
      });

      setAssessment({ score, passing, failing, notTested, na, total, perFw });
      toast({ title: "Assessment complete", description: `Compliance score: ${score}%` });
      next();
    } catch (e) {
      toast({ title: "Assessment failed", description: e.message, variant: "destructive" });
    }
    setAssessing(false);
  };

  const goalFw = frameworks.find((f) => f.id === goalFrameworkId);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
            <Rocket className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">Guided Onboarding</h1>
            <p className="text-sm text-muted-foreground">Get your compliance program live in four guided steps.</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div className={`flex items-center gap-2 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i < step ? "bg-primary text-primary-foreground border-primary" : i === step ? "border-primary" : "border-border"}`}>
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-sm font-medium hidden sm:block">{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        {/* Step 1 — Company */}
        {step === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">Tell us about your company</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">This tailors your dashboards, frameworks, and reporting.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div className="sm:col-span-2">
                <Label>Company name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ryder Space" />
              </div>
              <div>
                <Label>Industry</Label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <Label>Region</Label>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Company size</Label>
                <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
                  {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Goal */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">Set your first compliance goal</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Pick a framework to pursue and a target readiness score to hit.</p>
            {loadingFws ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8"><Loader2 className="w-4 h-4 animate-spin" /> Loading frameworks…</div>
            ) : frameworks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No frameworks yet — add one in <span className="font-medium">Frameworks</span> first.</p>
            ) : (
              <div className="space-y-5 max-w-2xl">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {frameworks.map((f) => {
                    const on = goalFrameworkId === f.id;
                    return (
                      <button key={f.id} onClick={() => setGoalFrameworkId(f.id)} className={`text-left p-3 rounded-xl border transition-colors ${on ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{f.name}</span>
                          {on && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Current readiness: {f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : (f.readiness_score || 0)}%</p>
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Target readiness score: <span className="font-bold text-emerald-400">{targetScore}%</span></Label>
                    <input type="range" min={50} max={100} value={targetScore} onChange={(e) => setTargetScore(+e.target.value)} className="w-full accent-emerald-500 mt-2" />
                    <div className="flex justify-between text-xs text-muted-foreground"><span>50%</span><span>100%</span></div>
                  </div>
                  <div>
                    <Label>Target date</Label>
                    <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">When do you want to reach {targetScore}% readiness?</p>
                  </div>
                </div>
                {goalFw && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">Your first goal</p>
                      <p>Reach <span className="font-semibold text-foreground">{targetScore}%</span> readiness on <span className="font-semibold text-foreground">{goalFw.name}</span>{targetDate ? ` by ${targetDate}` : ""}.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Import risks */}
        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">Import your existing risks</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">Paste your risks below — one per line — and we'll build your risk register.</p>
            <div className="rounded-lg border border-border bg-muted/30 p-3 mb-3 text-xs text-muted-foreground font-mono">
              Format: <span className="text-foreground">Title | Likelihood(1-5) | Impact(1-5) | Category</span>
            </div>
            <Textarea rows={8} value={riskText} onChange={(e) => setRiskText(e.target.value)} placeholder={SAMPLE_RISKS} className="font-mono text-xs" />
            <div className="flex items-center gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setRiskText(SAMPLE_RISKS)}><Sparkles className="w-3.5 h-3.5 mr-1" /> Load sample</Button>
              <span className="text-xs text-muted-foreground">Categories: {CATEGORIES.join(", ")}</span>
            </div>
            <div className="flex justify-end mt-6">
              <Button onClick={importRisks} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Import {riskText.split("\n").filter((l) => l.trim()).length || ""} risks
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Assessment */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Play className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-heading font-semibold">Run your first assessment</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-5">We'll scan your controls and calculate a live compliance score.</p>
            {!assessment && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-4">{controls.length} controls ready to assess across {frameworks.length} frameworks.</p>
                <Button onClick={runAssessment} disabled={assessing} size="lg">
                  {assessing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                  Run assessment
                </Button>
              </div>
            )}
            {assessment && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Compliance Score", value: `${assessment.score}%`, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                    { label: "Passing", value: assessment.passing, cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                    { label: "Failing", value: assessment.failing, cls: "bg-red-50 border-red-200 text-red-700" },
                    { label: "Not Tested", value: assessment.notTested, cls: "bg-amber-50 border-amber-200 text-amber-700" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
                      <p className="text-2xl font-bold">{s.value}</p>
                      <p className="text-xs font-medium mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" /> Framework readiness</p>
                  <div className="space-y-2">
                    {assessment.perFw.map((f) => (
                      <div key={f.name} className="flex items-center gap-3">
                        <span className="text-xs text-foreground w-40 truncate">{f.name}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${f.readiness}%`, backgroundColor: f.readiness >= 80 ? "#10b981" : f.readiness >= 50 ? "#f59e0b" : "#ef4444" }} />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right">{f.readiness}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={next}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5 — Done */}
        {step === 4 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-1">You're all set!</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              {companyName || "Your tenant"} is onboarded. {importedCount > 0 && `${importedCount} risks imported. `}Your first assessment scored {assessment?.score ?? 0}%.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => navigate("/")}><Rocket className="w-4 h-4 mr-1" /> Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate("/risk-heatmap")}><AlertTriangle className="w-4 h-4 mr-1" /> View Risk Heatmap</Button>
              <Button variant="outline" onClick={() => navigate("/audit-readiness-report")}><FileDown className="w-4 h-4 mr-1" /> Audit Readiness Report</Button>
            </div>
          </div>
        )}

        {/* Nav buttons (hidden on assess-running and done) */}
        {step < 3 && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={back} disabled={step === 0}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
            {step !== 2 && <Button onClick={next} disabled={step === 0 && !companyName}>Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>}
          </div>
        )}
        {step === 3 && !assessment && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button variant="ghost" onClick={back}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </div>
        )}
      </div>
    </div>
  );
}