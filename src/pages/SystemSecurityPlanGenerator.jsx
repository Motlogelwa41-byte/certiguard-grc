import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Loader2, RefreshCw, CheckCircle2, Shield, BookOpen,
  FileCheck, Layers, Database, AlertCircle, Download
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

export default function SystemSecurityPlanGenerator() {
  const { toast } = useToast();
  const [ssp, setSsp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SystemSecurityPlan.list("-generated_at", 5).catch(() => []);
      setSsp((data || [])[0] || null);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await base44.functions.invoke("generateSystemSecurityPlan", { regenerate: true });
      const data = res?.data || res;
      toast({ title: "SSP Generated", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Generation failed", description: e?.message }); }
    setGenerating(false);
  };

  let sections = [];
  try { sections = JSON.parse(ssp?.sections || '[]'); } catch (_) {}
  let frameworkCoverage = [];
  try { frameworkCoverage = JSON.parse(ssp?.framework_coverage || '[]'); } catch (_) {}

  return (
    <div>
      <PageHeader
        title="System Security Plan (SSP) Generator"
        subtitle="Automatically generates and maintains a living SSP document from your control library, evidence, framework mappings, and ROPA — always current, audit-ready"
        actions={
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            {generating ? "Generating..." : ssp ? "Regenerate SSP" : "Generate SSP"}
          </Button>
        }
      />

      {ssp && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Sections" value={ssp.section_count || 0} icon={Layers} color="blue" trendLabel="Document sections" />
          <StatCard label="Word Count" value={ssp.total_word_count || 0} icon={FileText} color="slate" trendLabel="Total words" />
          <StatCard label="Controls" value={ssp.control_coverage_count || 0} icon={Shield} color="green" trendLabel="Referenced" />
          <StatCard label="Evidence" value={ssp.evidence_count || 0} icon={Database} color="purple" trendLabel="Referenced" />
          <StatCard label="Frameworks" value={ssp.framework_count || 0} icon={BookOpen} color="amber" trendLabel="Covered" />
          <StatCard label="Audit Ready" value={ssp.audit_ready ? "Yes" : "No"} icon={ssp.audit_ready ? CheckCircle2 : AlertCircle} color={ssp.audit_ready ? "green" : "red"} trendLabel={`${ssp.compliance_score || 0}% coverage`} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : !ssp ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No System Security Plan yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">Click "Generate SSP" to auto-assemble a living system security plan from your controls, evidence, and framework mappings.</p>
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Generate SSP
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Section navigation */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-3 sticky top-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-semibold text-foreground">Sections</h3>
                <Badge variant="outline" className="text-xs">v{ssp.version}</Badge>
              </div>
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {sections.map((section, idx) => (
                  <button
                    key={section.section_id}
                    onClick={() => setActiveSection(idx)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${activeSection === idx ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'}`}
                  >
                    <span className="font-mono opacity-60 mr-1.5">{idx + 1}.</span>
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section content */}
          <div className="lg:col-span-3">
            {sections[activeSection] && (
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
                  <div>
                    <h2 className="text-xl font-heading font-bold text-foreground">{sections[activeSection].title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sections[activeSection].word_count} words · Updated {new Date(sections[activeSection].last_updated).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{sections[activeSection].source === "ai_generated" ? "AI Generated" : sections[activeSection].source}</Badge>
                </div>
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
                  {sections[activeSection].content}
                </div>
              </div>
            )}

            {/* Framework coverage table */}
            {frameworkCoverage.length > 0 && activeSection === 0 && (
              <div className="bg-card rounded-xl border border-border p-5 mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Framework Coverage</h3>
                <div className="space-y-2">
                  {frameworkCoverage.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                      <span className="text-sm text-foreground">{f.name}</span>
                      <Badge variant="outline" className="text-xs">{f.covered_count}/{f.requirement_count} requirements</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}