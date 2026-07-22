import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Plus, History, Pencil, Trash2, FlaskRound } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import StatCard from "@/components/shared/StatCard";
import ControlTestForm from "@/components/control-tests/ControlTestForm";
import ControlTestResultsDialog from "@/components/control-tests/ControlTestResultsDialog";
import { controlTestByKey } from "@/lib/controlTestRegistry";

function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

export default function ControlTests() {
  const [tests, setTests] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [runningAll, setRunningAll] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [historyTest, setHistoryTest] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.ControlTest.list("-created_date", 500),
      base44.entities.Control.list("-created_date", 500),
    ]).then(([t, c]) => { setTests(t || []); setControls(c || []); })
      .catch(() => toast({ title: "Failed to load control tests", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const runOne = async (test) => {
    setRunning(test.id);
    try {
      const res = await base44.functions.invoke("runControlTests", { test_id: test.id });
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      toast({ title: "Test complete", description: `${d.passed} passed · ${d.failed} failed${d.errors ? ` · ${d.errors} errors` : ""}` });
      load();
    } catch (e) {
      toast({ title: "Test run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    try {
      const res = await base44.functions.invoke("runControlTests", {});
      const d = res.data || res;
      if (d.error) throw new Error(d.error);
      toast({ title: "All tests complete", description: `${d.passed}/${d.total} passed · ${d.failed} failed${d.errors ? ` · ${d.errors} errors` : ""}` });
      load();
    } catch (e) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunningAll(false);
    }
  };

  const handleDelete = async (test) => {
    if (!confirm(`Delete test "${test.title}"?`)) return;
    try {
      await base44.entities.ControlTest.delete(test.id);
      load();
      toast({ title: "Test deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const toggleEnabled = async (test) => {
    await base44.entities.ControlTest.update(test.id, { enabled: !test.enabled });
    load();
  };

  const passing = tests.filter((t) => t.last_result === "pass").length;
  const failing = tests.filter((t) => t.last_result === "fail").length;
  const enabled = tests.filter((t) => t.enabled !== false).length;

  return (
    <div>
      <PageHeader
        title="Automated Control Tests"
        subtitle="Continuous automated testing engine — each test evaluates live data, updates linked control status, and records immutable results"
        actions={
          <>
            <Button variant="outline" onClick={runAll} disabled={runningAll || loading}>
              {runningAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run all
            </Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="w-4 h-4" /> New test
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tests" value={tests.length} icon={FlaskRound} color="blue" trendLabel={`${enabled} enabled`} />
        <StatCard label="Passing" value={passing} icon={FlaskRound} color="green" />
        <StatCard label="Failing" value={failing} icon={FlaskRound} color={failing > 0 ? "red" : "green"} />
        <StatCard label="Enabled" value={enabled} icon={FlaskRound} color="amber" trendLabel={`${tests.length - enabled} disabled`} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16">
          <FlaskRound className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No automated control tests yet. Create your first test to start continuous compliance.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New test</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Test</th>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Frequency</th>
                  <th className="text-left px-4 py-3 font-medium">Controls</th>
                  <th className="text-left px-4 py-3 font-medium">Last result</th>
                  <th className="text-left px-4 py-3 font-medium">Last run</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map((t) => {
                  const reg = controlTestByKey(t.test_key);
                  return (
                    <tr key={t.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{t.title}</span>
                          {t.enabled === false && <span className="text-xs text-muted-foreground">(disabled)</span>}
                        </div>
                        {reg && <span className="text-xs text-muted-foreground">{reg.label}</span>}
                        {t.last_run_summary && <span className="text-xs text-muted-foreground block">{t.last_run_summary}</span>}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{t.service || reg?.service}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{t.frequency}</td>
                      <td className="px-4 py-3 text-muted-foreground">{(t.linked_control_ids || []).length}</td>
                      <td className="px-4 py-3">
                        {t.last_result === "not_run" ? <StatusBadge status="not_tested" /> :
                         t.last_result === "pass" ? <StatusBadge status="passing" /> :
                         t.last_result === "fail" ? <StatusBadge status="failing" /> :
                         <StatusBadge status="draft" />}
                        {t.last_fail_count > 0 && <span className="text-xs text-red-600 ml-1">{t.last_fail_count} fail</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDateTime(t.last_run_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => runOne(t)} disabled={running === t.id} title="Run now">
                            {running === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setHistoryTest(t)} title="History"><History className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => toggleEnabled(t)} title="Toggle enabled">
                            <span className="text-xs">{t.enabled === false ? "Off" : "On"}</span>
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(t)} title="Delete"><Trash2 className="w-4 h-4 text-red-600" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ControlTestForm open={formOpen} onOpenChange={setFormOpen} editing={editing} controls={controls} onSaved={load} />
      <ControlTestResultsDialog test={historyTest} open={!!historyTest} onOpenChange={(o) => !o && setHistoryTest(null)} />
    </div>
  );
}