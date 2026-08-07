import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Download, CheckCircle, Clock, BookOpen, Globe, Star, ChevronDown, ChevronUp, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { SADC_LIBRARY } from "@/lib/sadcLibrary";

const REGIONS = ["All Regions", "South Africa", "Botswana", "Zimbabwe", "Kenya", "Tanzania", "Uganda", "Malawi", "Zambia", "DRC", "Nigeria", "African Union", "SADC Region", "Global"];
const CATEGORIES = ["All Categories", "Data Privacy", "Cybersecurity", "Financial Services", "ESG Reporting", "Mining & ESG", "Telecommunications & ICT", "Healthcare & Pharma", "Energy & Utilities", "Procurement & Public Finance", "Corporate Registry & IP", "Professional Services & Audit", "Real Estate & Property", "Competition & Antitrust", "Trade & Industry", "Public Finance & Governance", "Business & Industry", "Tax & Revenue", "Food Safety & Standards", "Education & Human Resource Development", "Education & Qualifications"];

const categoryColors = {
  "Data Privacy": "bg-purple-100 text-purple-700",
  "Cybersecurity": "bg-blue-100 text-blue-700",
  "Financial Services": "bg-emerald-100 text-emerald-700",
  "ESG Reporting": "bg-teal-100 text-teal-700",
  "Mining & ESG": "bg-amber-100 text-amber-700",
  "Telecommunications & ICT": "bg-indigo-100 text-indigo-700",
  "Healthcare & Pharma": "bg-rose-100 text-rose-700",
  "Energy & Utilities": "bg-orange-100 text-orange-700",
  "Procurement & Public Finance": "bg-cyan-100 text-cyan-700",
  "Corporate Registry & IP": "bg-slate-100 text-slate-700",
  "Professional Services & Audit": "bg-violet-100 text-violet-700",
  "Real Estate & Property": "bg-lime-100 text-lime-700",
  "Competition & Antitrust": "bg-red-100 text-red-700",
  "Trade & Industry": "bg-sky-100 text-sky-700",
  "Public Finance & Governance": "bg-stone-100 text-stone-700",
  "Business & Industry": "bg-fuchsia-100 text-fuchsia-700",
  "Tax & Revenue": "bg-yellow-100 text-yellow-700",
  "Food Safety & Standards": "bg-green-100 text-green-700",
  "Education & Human Resource Development": "bg-pink-100 text-pink-700",
  "Education & Qualifications": "bg-fuchsia-100 text-fuchsia-700",
};

// Maps library categories → valid FrameworkRequirement categories (supports governance & privacy)
const REQ_CATEGORY_MAP = {
  "Data Privacy": "privacy",
  "Cybersecurity": "security_operations",
  "Financial Services": "risk_management",
  "Telecommunications & ICT": "security_operations",
  "Healthcare & Pharma": "compliance",
  "Energy & Utilities": "compliance",
  "Procurement & Public Finance": "governance",
  "Corporate Registry & IP": "governance",
  "Professional Services & Audit": "compliance",
  "Real Estate & Property": "compliance",
  "Competition & Antitrust": "compliance",
  "Trade & Industry": "compliance",
  "Public Finance & Governance": "governance",
  "Business & Industry": "governance",
  "Tax & Revenue": "compliance",
  "Food Safety & Standards": "compliance",
  "Mining & ESG": "compliance",
  "ESG Reporting": "compliance",
  "Education & Human Resource Development": "compliance",
  "Education & Qualifications": "compliance",
};

// Maps library categories → valid Control categories (no governance/privacy — use compliance/data_protection)
const CONTROL_CATEGORY_MAP = {
  "Data Privacy": "data_protection",
  "Cybersecurity": "security_operations",
  "Financial Services": "risk_management",
  "Telecommunications & ICT": "security_operations",
  "Healthcare & Pharma": "compliance",
  "Energy & Utilities": "compliance",
  "Procurement & Public Finance": "compliance",
  "Corporate Registry & IP": "compliance",
  "Professional Services & Audit": "compliance",
  "Real Estate & Property": "compliance",
  "Competition & Antitrust": "compliance",
  "Trade & Industry": "compliance",
  "Public Finance & Governance": "compliance",
  "Business & Industry": "compliance",
  "Tax & Revenue": "compliance",
  "Food Safety & Standards": "compliance",
  "Mining & ESG": "compliance",
  "ESG Reporting": "compliance",
  "Education & Human Resource Development": "compliance",
  "Education & Qualifications": "compliance",
};

export default function SADCFrameworks() {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [category, setCategory] = useState("All Categories");
  const [expanded, setExpanded] = useState(null);
  const [importing, setImporting] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    base44.entities.Framework.list().then(d => { setFrameworks(d || []); setLoading(false); });
  }, []);

  const isImported = (libId) => frameworks.some(f => f.name.toLowerCase().includes(SADC_LIBRARY.find(l => l.id === libId)?.name?.toLowerCase() || "XNONE"));

  const handleImport = async (lib) => {
    setImporting(lib.id);
    try {
      // 1. Create the Framework record via plan-limited guard function
      const planRes = await base44.functions.invoke('createFrameworkWithinPlan', {
        framework: {
          name: lib.name,
          version: lib.version,
          description: `${lib.full_name}. ${lib.description}`,
          status: "not_started",
          readiness_score: 0,
          total_controls: lib.key_requirements.length,
          passing_controls: 0,
        }
      });
      if (planRes.data?.error) throw new Error(planRes.data.error);
      const framework = planRes.data.framework;

      const reqCategory = REQ_CATEGORY_MAP[lib.category] || "compliance";
      const ctrlCategory = CONTROL_CATEGORY_MAP[lib.category] || "compliance";
      const codePrefix = lib.id.split("_")[0].toUpperCase();

      // 2. Create FrameworkRequirement records (one per key requirement)
      const requirements = await base44.entities.FrameworkRequirement.bulkCreate(
        lib.key_requirements.map((req, i) => ({
          framework_id: framework.id,
          framework_name: lib.name,
          framework_code: codePrefix,
          requirement_id: `${codePrefix}-${String(i + 1).padStart(2, "0")}`,
          title: req,
          description: `${req} — as mandated under ${lib.full_name}.`,
          section: lib.category,
          category: reqCategory,
          is_mandatory: lib.mandatory,
          guidance: lib.description,
          order_index: i,
          mapped_control_count: 1,
        }))
      );

      // 3. Create Control records (one per requirement)
      const controls = await base44.entities.Control.bulkCreate(
        lib.key_requirements.map((req, i) => ({
          control_id: `${codePrefix}-${String(i + 1).padStart(2, "0")}`,
          title: req,
          description: `Implementation control for ${req} under ${lib.name}.`,
          category: ctrlCategory,
          status: "not_tested",
          severity: lib.mandatory ? "high" : "medium",
          framework_ids: [framework.id],
          framework_names: [lib.name],
          automation_status: "manual",
        }))
      );

      // 4. Wire requirements ↔ controls via RequirementControlMapping
      await base44.entities.RequirementControlMapping.bulkCreate(
        requirements.map((req, i) => ({
          requirement_id: req.id,
          requirement_title: req.title,
          requirement_ref: req.requirement_id,
          framework_id: framework.id,
          framework_name: lib.name,
          framework_code: codePrefix,
          control_id: controls[i].id,
          control_title: controls[i].title,
          control_ref: controls[i].control_id,
          mapping_confidence: "full",
          mapping_notes: "Auto-generated on framework import.",
          status: "active",
        }))
      );

      const updated = await base44.entities.Framework.list();
      setFrameworks(updated);
      toast({
        title: `${lib.name} imported & wired`,
        description: `${lib.key_requirements.length} requirements, controls, and mappings created. Ready for evidence collection, gap analysis, and audit.`,
      });
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(null);
  };

  const filtered = SADC_LIBRARY.filter(lib => {
    const matchSearch = !search || lib.name.toLowerCase().includes(search.toLowerCase()) || lib.full_name.toLowerCase().includes(search.toLowerCase()) || lib.tags.some(t => t.includes(search.toLowerCase()));
    const matchRegion = region === "All Regions" || lib.region === region;
    const matchCat = category === "All Categories" || lib.category === category;
    return matchSearch && matchRegion && matchCat;
  });

  const mandatoryCount = SADC_LIBRARY.filter(l => l.mandatory).length;
  const importedCount = SADC_LIBRARY.filter(l => frameworks.some(f => f.name.toLowerCase().includes(l.name.toLowerCase()))).length;

  return (
    <div>
      <PageHeader
        title="SADC Framework Library"
        subtitle="Pre-built compliance frameworks for Southern & Eastern Africa — your regional competitive edge"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Frameworks Available", value: SADC_LIBRARY.length, icon: BookOpen, color: "text-primary" },
          { label: "Mandatory (Legal)", value: mandatoryCount, icon: Shield, color: "text-red-500" },
          { label: "Countries Covered", value: 10, icon: Globe, color: "text-blue-500" },
          { label: "Imported to My Stack", value: importedCount, icon: CheckCircle, color: "text-emerald-500" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search frameworks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={region} onChange={e => setRegion(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {REGIONS.map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Library cards */}
      <div className="space-y-3">
        {filtered.map(lib => {
          const imported = frameworks.some(f => f.name.toLowerCase().includes(lib.name.toLowerCase()));
          const isOpen = expanded === lib.id;
          return (
            <div key={lib.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Header row */}
              <div className="flex items-start gap-4 p-4">
                <div className="text-2xl shrink-0">{lib.flag}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-heading font-bold text-foreground">{lib.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryColors[lib.category] || "bg-slate-100 text-slate-600"}`}>{lib.category}</span>
                    {lib.mandatory && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">⚠ Mandatory</span>}
                    {imported && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">✓ Imported</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{lib.full_name} · {lib.version}</p>
                  <p className="text-xs text-muted-foreground">{lib.region} · {lib.authority}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{lib.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-lg font-bold text-foreground">{lib.controls_count}</p>
                    <p className="text-[10px] text-muted-foreground">controls</p>
                  </div>
                  <Button
                    size="sm"
                    variant={imported ? "outline" : "default"}
                    disabled={imported || importing === lib.id}
                    onClick={() => handleImport(lib)}
                  >
                    {importing === lib.id ? (
                      <span className="flex items-center gap-1"><span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Importing…</span>
                    ) : imported ? (
                      <><CheckCircle className="w-3.5 h-3.5 mr-1" />Imported</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-1" />Import</>
                    )}
                  </Button>
                  <button onClick={() => setExpanded(isOpen ? null : lib.id)} className="p-1.5 rounded hover:bg-muted">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-border bg-muted/30 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-amber-500" />Key Requirements</p>
                    <ul className="space-y-1">
                      {lib.key_requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><Star className="w-3.5 h-3.5 text-blue-500" />Related International Frameworks</p>
                    <div className="flex flex-wrap gap-1.5">
                      {lib.related_international.map((r, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{r}</span>
                      ))}
                    </div>
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-foreground mb-1.5">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {lib.tags.map((t, i) => (
                          <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No frameworks match your filters.</p>
        </div>
      )}
    </div>
  );
}