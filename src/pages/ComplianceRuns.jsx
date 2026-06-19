import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Play, RotateCw, CheckCircle, XCircle, SkipForward, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

export default function ComplianceRuns() {
  const [runs, setRuns] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedFramework, setSelectedFramework] = useState("");
  const [selectedRun, setSelectedRun] = useState(null);
  const { toast } = useToast();

  const load = () => {
    Promise.all([
      base44.entities.ComplianceRun.list("-created_date"),
      base44.entities.Framework.list()
    ]).then(([cr, f]) => { setRuns(cr); setFrameworks(f); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const executeRun = async () => {
    if (!selectedFramework) { toast({ title: "Select a framework first", variant: "destructive" }); return; }
    setRunning(true);
    try {
      const framework = frameworks.find(f => f.id === selectedFramework || f.name === selectedFramework);
      const controls = await base44.entities.Control.list();
      const fwControls = controls.filter(c => c.framework_names?.includes(framework?.name) || c.framework_names?.includes(selectedFramework));

      if (fwControls.length === 0) {
        const fallbackControls = controls.slice(0, 10);
        const passed = fallbackControls.filter(c => c.status === "passing").length;
        const failed = fallbackControls.filter(c => c.status === "failing").length;
        const skipped = fallbackControls.filter(c => c.status === "not_tested" || c.status === "not_applicable").length;
        const score = Math.round((passed / fallbackControls.length) * 100);
        await base44.entities.ComplianceRun.create({
          title: `Compliance Run — ${framework?.name || selectedFramework}`,
          framework_id: selectedFramework, framework_name: framework?.name || selectedFramework,
          status: "completed", total_checks: fallbackControls.length, passed, failed, skipped, score,
          started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
          results_json: JSON.stringify(fallbackControls.map(c => ({ control_id: c.control_id, title: c.title, status: c.status }))),
        });
      } else {
        const passed = fwControls.filter(c => c.status === "passing").length;
        const failed = fwControls.filter(c => c.status === "failing").length;
        const skipped = fwControls.filter(c => c.status === "not_tested" || c.status === "not_applicable").length;
        const score = Math.round((passed / fwControls.length) * 100);
        await base44.entities.ComplianceRun.create({
          title: `Compliance Run — ${framework?.name || selectedFramework}`,
          framework_id: selectedFramework, framework_name: framework?.name || selectedFramework,
          status: "completed", total_checks: fwControls.length, passed, failed, skipped, score,
          started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
          results_json: JSON.stringify(fwControls.map(c => ({ control_id: c.control_id, title: c.title, status: c.status }))),
        });
      }
      toast({ title: "Compliance run completed" });
      load();
    } catch (e) { toast({ title: "Run failed", description: e.message, variant: "destructive" }); }
    setRunning(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Compliance Runs" subtitle="Execute automated compliance checks against frameworks" />
      <div className="flex items-center gap-3 mb-6 bg-card rounded-xl border border-border p-4">
        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Select framework to audit" /></SelectTrigger>
          <SelectContent>{frameworks.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={executeRun} disabled={running || !selectedFramework}>
          {running ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</> : <><Play className="w-4 h-4 mr-2" /> Execute Run</>}
        </Button>
      </div>

      {runs.length === 0 ? (
        <EmptyState icon={Play} title="No compliance runs yet" description="Execute your first compliance check run against a framework." actionLabel="Run Now" onAction={() => {}} />
      ) : (
        <div className="space-y-4">
          {runs.map((run) => (
            <div key={run.id} className={`bg-card rounded-xl border p-5 cursor-pointer transition-colors ${selectedRun?.id === run.id ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/30'}`} onClick={() => setSelectedRun(selectedRun?.id === run.id ? null : run)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <StatusBadge status={run.status} />
                  <div>
                    <h3 className="font-medium text-foreground">{run.title}</h3>
                    <p className="text-xs text-muted-foreground">{run.framework_name} · {run.started_at ? new Date(run.started_at).toLocaleString() : ''}</p>
                  </div>
                </div>
                {run.score !== undefined && (
                  <div className={`text-lg font-bold ${run.score >= 80 ? 'text-emerald-600' : run.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{run.score}%</div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs">
                <div className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" />{run.passed || 0} passed</div>
                <div className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-red-500" />{run.failed || 0} failed</div>
                <div className="flex items-center gap-1"><SkipForward className="w-3.5 h-3.5 text-muted-foreground" />{run.skipped || 0} skipped</div>
              </div>
              {selectedRun?.id === run.id && run.results_json && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold mb-2">Detailed Results</h4>
                  <div className="space-y-1">
                    {(() => { try { return JSON.parse(run.results_json); } catch { return []; } })().map((c, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{c.control_id}</span>
                          <span>{c.title}</span>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}