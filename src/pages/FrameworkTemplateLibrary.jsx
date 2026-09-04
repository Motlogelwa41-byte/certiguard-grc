import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Library, Loader2, CheckCircle2, ArrowRight, Zap, FileCheck,
  Layers, GitBranch, Search, Globe, ShieldCheck
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { FRAMEWORK_TEMPLATES, TEMPLATE_COUNT, TOTAL_REQUIREMENTS, TOTAL_CONTROLS, TOTAL_MAPPINGS } from "@/lib/frameworkTemplates";

const JURISDICTION_META = {
  global: { label: "Global", color: "bg-blue-100 text-blue-700" },
  us: { label: "United States", color: "bg-blue-100 text-blue-700" },
  eu: { label: "European Union", color: "bg-indigo-100 text-indigo-700" },
  uk: { label: "United Kingdom", color: "bg-purple-100 text-purple-700" },
  au: { label: "Australia", color: "bg-emerald-100 text-emerald-700" },
  za: { label: "South Africa", color: "bg-amber-100 text-amber-700" },
  sadc: { label: "SADC Region", color: "bg-amber-100 text-amber-700" },
};

export default function FrameworkTemplateLibrary() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [applying, setApplying] = useState(null);
  const [applied, setApplied] = useState(new Set());

  const filtered = useMemo(() => {
    if (!search) return FRAMEWORK_TEMPLATES;
    const q = search.toLowerCase();
    return FRAMEWORK_TEMPLATES.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.code.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q) ||
      f.authority.toLowerCase().includes(q)
    );
  }, [search]);

  const applyTemplate = async (template) => {
    setApplying(template.code);
    try {
      const res = await base44.functions.invoke("applyFrameworkTemplate", { template_code: template.code });
      const data = res?.data || res;
      toast({ title: "Template applied", description: data.message });
      setApplied(prev => new Set([...prev, template.code]));
    } catch (e) {
      toast({ variant: "destructive", title: "Apply failed", description: e?.message });
    }
    setApplying(null);
  };

  return (
    <div>
      <PageHeader
        title="Pre-Built Framework Control Templates"
        subtitle="28 out-of-the-box frameworks with pre-mapped requirements → controls → automated tests. Apply a template to auto-populate controls and wire automated testing instantly."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Framework Templates" value={TEMPLATE_COUNT} icon={Library} color="blue" trendLabel="Out-of-the-box" />
        <StatCard label="Pre-Mapped Requirements" value={TOTAL_REQUIREMENTS} icon={FileCheck} color="purple" trendLabel="With control mappings" />
        <StatCard label="Pre-Built Controls" value={TOTAL_CONTROLS} icon={ShieldCheck} color="green" trendLabel="With automated tests" />
        <StatCard label="Requirement→Control Mappings" value={TOTAL_MAPPINGS} icon={GitBranch} color="amber" trendLabel="Auto-linked" />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search frameworks by name, code, or authority..." className="pl-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((template) => {
          const isApplied = applied.has(template.code);
          const isApplying = applying === template.code;
          const autoCount = template.controls.filter(c => c.automation_status === "automated").length;
          const jurMeta = JURISDICTION_META[template.jurisdiction] || JURISDICTION_META.global;

          return (
            <div key={template.code} className="bg-card rounded-xl border border-border p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <Badge className={`text-xs ${jurMeta.color}`}>{jurMeta.label}</Badge>
              </div>
              <h3 className="text-sm font-heading font-bold text-foreground mb-1">{template.name}</h3>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><FileCheck className="w-3 h-3" />{template.requirements.length} requirements</span>
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" />{template.controls.length} controls</span>
                <span className="flex items-center gap-1"><Zap className="w-3 h-3" />{autoCount} automated</span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium">Authority:</span> {template.authority} · <span className="font-medium">Version:</span> {template.version}
              </div>
              {isApplied && (
                <div className="mb-3 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />Template applied — controls auto-populated
                </div>
              )}
              <div className="mt-auto">
                <Button
                  onClick={() => applyTemplate(template)}
                  disabled={isApplying || isApplied}
                  className="w-full"
                  variant={isApplied ? "outline" : "default"}
                >
                  {isApplying ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> :
                   isApplied ? <CheckCircle2 className="w-4 h-4 mr-1.5" /> :
                   <ArrowRight className="w-4 h-4 mr-1.5" />}
                  {isApplied ? "Applied" : isApplying ? "Applying..." : "Apply Template"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}