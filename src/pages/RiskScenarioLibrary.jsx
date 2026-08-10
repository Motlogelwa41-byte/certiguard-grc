import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Library, Search, Plus, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { logAuditTrail } from "@/lib/auditLogger";
import { riskScenarios, riskScenarioCategories } from "@/lib/riskScenarioLibrary";

function riskScoreColor(score) {
  if (score >= 16) return "text-red-500";
  if (score >= 9) return "text-amber-500";
  return "text-emerald-500";
}

export default function RiskScenarioLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [importing, setImporting] = useState(null);
  const [confirmScenario, setConfirmScenario] = useState(null);

  const filtered = useMemo(() => {
    return riskScenarios.filter((s) => {
      if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, categoryFilter]);

  const handleImport = async (scenario) => {
    setImporting(scenario.id);
    try {
      const score = scenario.likelihood * scenario.impact;
      const created = await base44.entities.Risk.create({
        title: scenario.title,
        description: scenario.description,
        category: scenario.category,
        likelihood: scenario.likelihood,
        impact: scenario.impact,
        risk_score: score,
        status: "open",
        treatment: scenario.treatment,
        mitigation_plan: scenario.mitigation_plan,
        notes: `Imported from Risk Scenario Library (${scenario.id})`,
      });
      await logAuditTrail({
        action: "create",
        entity_type: "Risk",
        entity_id: created.id,
        entity_name: scenario.title,
        user,
        severity: "info",
        notes: `Imported from scenario library: ${scenario.id}`,
      });
      toast({ title: "Risk imported", description: `"${scenario.title}" added to your risk register.` });
      setConfirmScenario(null);
    } catch (e) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setImporting(null);
  };

  return (
    <div>
      <PageHeader
        title="Risk Scenario Library"
        subtitle="Pre-built GRC risk scenario templates — browse and import common risks into your register"
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search scenarios..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {riskScenarioCategories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((scenario) => {
          const score = scenario.likelihood * scenario.impact;
          return (
            <div key={scenario.id} className="bg-card rounded-xl border border-border p-4 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                    {scenario.category}
                  </span>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${riskScoreColor(score)}`}>{score}</div>
                  <div className="text-[9px] text-muted-foreground">risk score</div>
                </div>
              </div>
              <h3 className="font-medium text-sm text-foreground mb-1">{scenario.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{scenario.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {(scenario.tags || []).map((tag) => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                <span className="font-medium">L:{scenario.likelihood}</span> × <span className="font-medium">I:{scenario.impact}</span>
                <span className="mx-1.5">·</span>
                <span className="capitalize">{scenario.treatment}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-auto"
                onClick={() => setConfirmScenario(scenario)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Import to Register
              </Button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Library className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No scenarios match your filters.</p>
        </div>
      )}

      <Dialog open={!!confirmScenario} onOpenChange={(v) => !v && setConfirmScenario(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Import Risk Scenario
            </DialogTitle>
            <DialogDescription>
              This will create a new risk in your register based on this template. You can edit the details after import.
            </DialogDescription>
          </DialogHeader>
          {confirmScenario && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <div className="font-medium text-sm text-foreground">{confirmScenario.title}</div>
                <p className="text-xs text-muted-foreground mt-1">{confirmScenario.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs">
                  <span>Category: <span className="font-medium capitalize">{confirmScenario.category}</span></span>
                  <span>L: <span className="font-medium">{confirmScenario.likelihood}</span></span>
                  <span>I: <span className="font-medium">{confirmScenario.impact}</span></span>
                  <span>Score: <span className="font-bold">{confirmScenario.likelihood * confirmScenario.impact}</span></span>
                </div>
              </div>
              {confirmScenario.mitigation_plan && (
                <div>
                  <Label className="text-xs">Suggested mitigation plan</Label>
                  <p className="text-xs text-muted-foreground mt-1">{confirmScenario.mitigation_plan}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmScenario(null)}>Cancel</Button>
            <Button onClick={() => handleImport(confirmScenario)} disabled={importing === confirmScenario?.id}>
              {importing === confirmScenario?.id ? "Importing..." : "Import to Register"}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}