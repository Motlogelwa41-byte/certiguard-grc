import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Search, Zap, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { controlTestTemplates, testTemplateCategories, getTemplatesByCategory } from "@/lib/controlTestTemplates";

export default function ControlTestLibrary() {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [applyOpen, setApplyOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const filtered = controlTestTemplates.filter((t) => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.frameworks.some((f) => f.toLowerCase().includes(search.toLowerCase()));
    const matchCat = activeCat === "all" || t.category === activeCat;
    return matchSearch && matchCat;
  });

  const grouped = getTemplatesByCategory();

  const handleApply = (template) => {
    setSelected(template);
    setApplyOpen(true);
  };

  const confirmApply = async () => {
    setCreating(true);
    try {
      await base44.entities.ControlTest.create({
        title: selected.title,
        description: selected.description,
        category: selected.category,
        pass_criteria: selected.passCriteria,
        fail_criteria: selected.failCriteria,
        automation_level: selected.automationLevel,
        evidence_type: selected.evidenceType,
        status: "draft",
        notes: `Created from template: ${selected.id}\nFrameworks: ${selected.frameworks.join(", ")}\nIntegration: ${selected.integration || "manual"}`,
      });
      toast({ title: "Control test created", description: "Find it in the Control Tests page." });
      setApplyOpen(false);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setCreating(false);
  };

  return (
    <div>
      <PageHeader
        title="Control Test Library"
        subtitle="30+ pre-built test templates mapped to SOC 2, ISO 27001, NIST CSF, POPIA & more. Apply in one click."
        actions={<Button size="sm" variant="outline" onClick={() => setSearch("")}><Filter className="w-4 h-4 mr-1" /> {filtered.length} templates</Button>}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search templates by name, framework, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCat("all")}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
        >
          All ({controlTestTemplates.length})
        </button>
        {Object.entries(testTemplateCategories).map(([key, val]) => {
          const count = controlTestTemplates.filter((t) => t.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveCat(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${activeCat === key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}
            >
              {val.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Templates grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-5 flex flex-col hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{t.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${testTemplateCategories[t.category]?.color || "bg-muted text-muted-foreground"}`}>
                  {testTemplateCategories[t.category]?.label || t.category}
                </span>
              </div>
              <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${t.severity === "critical" ? "bg-red-100 text-red-700" : t.severity === "high" ? "bg-orange-100 text-orange-700" : t.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                {t.severity}
              </span>
            </div>

            <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-3">{t.description}</p>

            <div className="flex flex-wrap gap-1 mb-3">
              {t.frameworks.slice(0, 4).map((fw) => (
                <span key={fw} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{fw}</span>
              ))}
            </div>

            <div className="text-xs space-y-1 mb-3 border-t border-border pt-3">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-muted-foreground" />
                <span className="text-muted-foreground capitalize">{t.automationLevel.replace(/_/g, " ")}</span>
              </div>
              {t.integration && (
                <div className="text-muted-foreground">Integration: <span className="text-foreground font-medium">{t.integration}</span></div>
              )}
            </div>

            <Button size="sm" className="w-full" onClick={() => handleApply(t)}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Apply Template
            </Button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p>No templates match your search.</p>
        </div>
      )}

      {/* Apply confirmation dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Test Template</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <h3 className="font-heading font-semibold text-foreground">{selected.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
                <div><span className="text-muted-foreground">Pass criteria:</span> <span className="text-foreground">{selected.passCriteria}</span></div>
                <div><span className="text-muted-foreground">Fail criteria:</span> <span className="text-foreground">{selected.failCriteria}</span></div>
                <div><span className="text-muted-foreground">Automation:</span> <span className="text-foreground capitalize">{selected.automationLevel.replace(/_/g, " ")}</span></div>
                <div><span className="text-muted-foreground">Evidence type:</span> <span className="text-foreground">{selected.evidenceType}</span></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {selected.frameworks.map((fw) => (
                  <span key={fw} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{fw}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">This will create a new control test in draft status. You can customize it in the Control Tests page.</p>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setApplyOpen(false)}>Cancel</Button>
                <Button className="flex-1" onClick={confirmApply} disabled={creating}>
                  {creating ? "Creating..." : "Create Test"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}