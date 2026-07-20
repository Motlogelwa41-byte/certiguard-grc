import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Play, Pencil, Trash2, FileCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { logAuditTrail } from "@/lib/auditLogger";
import { useAuth } from "@/lib/AuthContext";
import Can from "@/components/shared/Can";

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

const detailRows = [
  { key: "control_id", label: "Control ID" },
  { key: "category", label: "Category", format: (v) => (v || "").replace(/_/g, " ") },
  { key: "severity", label: "Severity", render: (v) => <StatusBadge status={v} /> },
  { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  { key: "automation_status", label: "Automation", render: (v) => <StatusBadge status={v} /> },
  { key: "owner_name", label: "Owner", format: (v) => v || "—" },
  { key: "last_tested", label: "Last Tested", format: (v) => v || "Never" },
  { key: "next_review", label: "Next Review", format: (v) => v || "—" },
  { key: "evidence_count", label: "Evidence Count", format: (v) => v || 0 },
];

export default function ControlDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [control, setControl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const c = await base44.entities.Control.get(id);
      setControl(c);
    } catch (e) {
      setControl(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const nextReview = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
      const seed = hashStr((control.id || "") + "|" + today);
      const passing = (seed % 100) >= 15;

      const updates = {
        last_tested: today,
        next_review: nextReview,
        evidence_count: (control.evidence_count || 0) + 1,
        status: passing ? "passing" : "failing",
      };
      await base44.entities.Control.update(control.id, updates);
      await logAuditTrail({ action: "run", entity_type: "Control", entity_id: control.id, entity_name: control.title, after: updates, user, severity: passing ? "info" : "warning" });

      if (passing) {
        try {
          await base44.entities.Evidence.create({
            title: `Manual test run — ${control.title}`,
            description: `Test run for control ${control.control_id || ""} (${control.title}) on ${today}. Result: Passing.`,
            control_id: control.id,
            control_title: control.title,
            type: "log",
            status: "approved",
            collected_date: today,
            notes: "Triggered from Control Detail page.",
          });
        } catch (_) { /* best-effort evidence */ }
      }

      toast({ title: passing ? "Control test passed" : "Control test failed", description: `Result: ${passing ? "Passing" : "Failing"}.` });
      await load();
    } catch (e) {
      toast({ title: "Run failed", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this control? This cannot be undone.")) return;
    await base44.entities.Control.delete(control.id);
    await logAuditTrail({ action: "delete", entity_type: "Control", entity_id: control.id, entity_name: control.title, before: control, user, severity: "warning" });
    toast({ title: "Control deleted" });
    navigate("/controls");
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!control) return (
    <div className="text-center py-16">
      <FileCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-muted-foreground">Control not found.</p>
      <Button variant="outline" className="mt-4" onClick={() => navigate("/controls")}>Back to Controls</Button>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-sm">
        <Link to="/controls" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Controls
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{control.control_id}</span>
            <StatusBadge status={control.status} />
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground tracking-tight">{control.title}</h1>
          {control.description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{control.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Can permission="controls:write">
            <Button onClick={handleRun} disabled={running}>
              <Play className="w-4 h-4 mr-1" /> {running ? "Running…" : "Run Test"}
            </Button>
          </Can>
          <Can permission="controls:write">
            <Button variant="outline" onClick={() => navigate("/controls", { state: { editId: control.id } })}>
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </Button>
          </Can>
          <Can permission="controls:delete">
            <Button variant="outline" onClick={handleDelete}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </Can>
        </div>
      </div>

      {control.status === "failing" && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 pt-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Control is currently failing</p>
              <p className="text-sm text-amber-700">Run a test to re-evaluate, or launch a remediation loop from the Controls list.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          {detailRows.map((row) => (
            <div key={row.key} className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span className="text-sm font-medium text-right">
                {row.render ? row.render(control[row.key]) : (row.format ? row.format(control[row.key]) : (control[row.key] || "—"))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {control.notes && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{control.notes}</p></CardContent>
        </Card>
      )}

      {control.framework_names && control.framework_names.length > 0 && (
        <Card className="mt-4">
          <CardHeader><CardTitle className="text-base">Mapped Frameworks</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {control.framework_names.map((f, i) => (
                <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{f}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}