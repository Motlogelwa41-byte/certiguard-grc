import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ShieldCheck, FileCheck, ClipboardList, MessageSquare, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import EvidenceReviewDialog from "@/components/auditor/EvidenceReviewDialog";
import AuditorFindingDialog from "@/components/auditor/AuditorFindingDialog";
import AuditorRequestDialog from "@/components/auditor/AuditorRequestDialog";
import EvidencePacksTab from "@/components/auditor/EvidencePacksTab";

export default function AuditorPortal() {
  const { user } = useAuth();
  const canWrite = user?.role !== "external_auditor";
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState(null);
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [findings, setFindings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reviewItem, setReviewItem] = useState(null);
  const [findingOpen, setFindingOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState(null);
  const [requestOpen, setRequestOpen] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.AuditorScope.list("-created_date", 50),
      base44.entities.Framework.list("-created_date", 200),
      base44.entities.Control.list("-created_date", 500),
      base44.entities.Evidence.list("-created_date", 500),
      base44.entities.AuditFinding.list("-created_date", 500),
      base44.entities.AuditorRequest.list("-created_date", 200),
    ]).then(([sc, fw, ctrl, ev, fnd, req]) => {
      setFrameworks(fw || []);
      setControls(ctrl || []);
      setEvidence(ev || []);
      setFindings(fnd || []);
      setRequests(req || []);
      const mine = (sc || []).find((s) => s.auditor_id === user?.id && s.status === "active");
      setScope(mine || null);
    }).catch(() => toast({ title: "Failed to load portal data", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.id]);

  const scopedFwIds = scope?.framework_ids || [];
  const allFw = !scopedFwIds.length;
  const scopedControls = useMemo(() => {
    if (allFw) return controls;
    return controls.filter((c) => (c.framework_ids || []).some((id) => scopedFwIds.includes(id)));
  }, [controls, scopedFwIds, allFw]);
  const scopedControlIds = useMemo(() => new Set(scopedControls.map((c) => c.id)), [scopedControls]);
  const scopedEvidence = useMemo(() => (allFw ? evidence : evidence.filter((e) => e.control_id && scopedControlIds.has(e.control_id))), [evidence, scopedControlIds, allFw]);
  const scopedFindings = useMemo(() => (allFw ? findings : findings.filter((f) => !f.linked_control_id || scopedControlIds.has(f.linked_control_id))), [findings, scopedControlIds, allFw]);
  const myRequests = useMemo(() => (requests || []).filter((r) => r.auditor_id === user?.id), [requests, user?.id]);

  const pendingEvidence = scopedEvidence.filter((e) => e.status === "pending_review");
  const openFindings = scopedFindings.filter((f) => ["open", "in_remediation"].includes(f.status));
  const openRequests = myRequests.filter((r) => r.status === "open");

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!scope) {
    return (
      <div>
        <PageHeader title="Auditor Portal" subtitle="External auditor review workspace" />
        <div className="text-center py-20">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No active engagement scope assigned to your account.</p>
          <p className="text-xs text-muted-foreground mt-1">Ask the tenant administrator to assign you an auditor scope.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Auditor Portal" subtitle={`Scoped engagement — ${allFw ? "All frameworks" : scope.framework_names?.join(", ") || "Scoped frameworks"}${!canWrite ? " · Observation only" : ""}`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Scoped Frameworks" value={allFw ? frameworks.length : scopedFwIds.length} icon={ShieldCheck} color="blue" />
        <StatCard label="Pending Evidence" value={pendingEvidence.length} icon={FileCheck} color={pendingEvidence.length ? "amber" : "green"} />
        <StatCard label="Open Findings" value={openFindings.length} icon={ClipboardList} color={openFindings.length ? "red" : "green"} />
        <StatCard label="Open Requests" value={openRequests.length} icon={MessageSquare} color="purple" />
      </div>

      <Tabs defaultValue="evidence">
        <TabsList>
          <TabsTrigger value="evidence">Evidence Review</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="mapping">Framework Mapping</TabsTrigger>
          <TabsTrigger value="packs">Evidence Packs</TabsTrigger>
        </TabsList>

        <TabsContent value="evidence" className="mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Evidence</th>
                    <th className="text-left px-4 py-3">Control</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Collected</th>
                    <th className="text-right px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedEvidence.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No evidence in scope.</td></tr>}
                  {scopedEvidence.map((e) => (
                    <tr key={e.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3">
                        <div className="font-medium">{e.title}</div>
                        {e.file_url && <a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">open file</a>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.control_title || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{e.collected_date || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {canWrite ? (
                          <Button size="sm" variant="outline" onClick={() => setReviewItem(e)}>Review</Button>
                        ) : e.file_url ? (
                          <a href={e.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">View file</a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="controls" className="mt-4">
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Control</th>
                    <th className="text-left px-4 py-3">Category</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Evidence</th>
                    <th className="text-left px-4 py-3">Last tested</th>
                  </tr>
                </thead>
                <tbody>
                  {scopedControls.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No controls in scope.</td></tr>}
                  {scopedControls.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="px-4 py-3"><div className="font-medium">{c.control_id ? `${c.control_id} — ` : ""}{c.title}</div></td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{c.category}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{c.evidence_count || 0}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{c.last_tested || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="findings" className="mt-4">
          {canWrite && (
            <div className="flex justify-end mb-3">
              <Button onClick={() => { setEditingFinding(null); setFindingOpen(true); }}><Plus className="w-4 h-4" /> Raise finding</Button>
            </div>
          )}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Finding</th>
                    <th className="text-left px-4 py-3">Severity</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Due</th>
                    <th className="text-right px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {scopedFindings.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No findings raised.</td></tr>}
                  {scopedFindings.map((f) => (
                    <tr key={f.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3"><div className="font-medium">{f.title}</div><div className="text-xs text-muted-foreground">{f.linked_control_name || "—"}</div></td>
                      <td className="px-4 py-3"><StatusBadge status={f.severity} /></td>
                      <td className="px-4 py-3 text-muted-foreground capitalize">{(f.finding_type || "").replace(/_/g, " ")}</td>
                      <td className="px-4 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{f.due_date || "—"}</td>
                      <td className="px-4 py-3 text-right">{canWrite && <Button size="sm" variant="ghost" onClick={() => { setEditingFinding(f); setFindingOpen(true); }}>Edit</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="requests" className="mt-4">
          {canWrite && (
            <div className="flex justify-end mb-3">
              <Button onClick={() => setRequestOpen(true)}><Plus className="w-4 h-4" /> New request</Button>
            </div>
          )}
          <div className="space-y-3">
            {myRequests.length === 0 && <p className="text-center py-10 text-sm text-muted-foreground">No requests raised.</p>}
            {myRequests.map((r) => (
              <div key={r.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{r.title}</span>
                  <StatusBadge status={r.status === "open" ? "pending_review" : r.status === "answered" ? "in_review" : "approved"} />
                </div>
                <p className="text-sm text-foreground">{r.question}</p>
                {r.related_control_name && <p className="text-xs text-muted-foreground mt-1">Control: {r.related_control_name}</p>}
                {r.response && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground">Response from {r.responded_by || "compliance team"}:</p>
                    <p className="text-sm">{r.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="mt-4">
          <div className="space-y-4">
            {(allFw ? frameworks : frameworks.filter((f) => scopedFwIds.includes(f.id))).map((f) => {
              const fControls = scopedControls.filter((c) => (c.framework_ids || []).includes(f.id));
              const fEvidence = scopedEvidence.filter((e) => fControls.some((c) => c.id === e.control_id));
              const passing = fControls.filter((c) => c.status === "passing").length;
              const failing = fControls.filter((c) => c.status === "failing").length;
              const notTested = fControls.filter((c) => c.status === "not_tested").length;
              const readiness = fControls.length ? Math.round((passing / fControls.length) * 100) : 0;
              return (
                <div key={f.id} className="bg-card rounded-xl border border-border p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground">{f.name}</h3>
                      <p className="text-xs text-muted-foreground">{f.version ? `v${f.version} · ` : ""}{fControls.length} controls · {fEvidence.length} evidence items</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={f.status} />
                      <span className="text-sm font-semibold" style={{ color: readiness >= 80 ? "#10b981" : readiness >= 50 ? "#eab308" : "#ef4444" }}>{readiness}% ready</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-emerald-600">{passing}</div>
                      <div className="text-xs text-muted-foreground">Passing</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-red-600">{failing}</div>
                      <div className="text-xs text-muted-foreground">Failing</div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-muted-foreground">{notTested}</div>
                      <div className="text-xs text-muted-foreground">Not tested</div>
                    </div>
                  </div>
                  {fControls.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3 text-center">No controls mapped to this framework.</p>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                          <tr>
                            <th className="text-left px-3 py-2">Control</th>
                            <th className="text-left px-3 py-2">Status</th>
                            <th className="text-left px-3 py-2">Evidence</th>
                            <th className="text-left px-3 py-2">Owner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fControls.map((c) => (
                            <tr key={c.id} className="border-t border-border">
                              <td className="px-3 py-2"><span className="font-medium">{c.control_id ? `${c.control_id} — ` : ""}{c.title}</span></td>
                              <td className="px-3 py-2"><StatusBadge status={c.status} /></td>
                              <td className="px-3 py-2 text-muted-foreground">{c.evidence_count || 0}</td>
                              <td className="px-3 py-2 text-muted-foreground text-xs">{c.owner_name || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="packs" className="mt-4">
          <EvidencePacksTab
            frameworks={allFw ? frameworks : frameworks.filter((f) => scopedFwIds.includes(f.id))}
            controls={scopedControls}
            evidence={scopedEvidence}
          />
        </TabsContent>
      </Tabs>

      <EvidenceReviewDialog evidence={reviewItem} open={!!reviewItem} onOpenChange={(o) => !o && setReviewItem(null)} reviewerName={user?.full_name || user?.email} onDone={load} />
      <AuditorFindingDialog open={findingOpen} onOpenChange={setFindingOpen} controls={scopedControls} editing={editingFinding} onSaved={load} />
      <AuditorRequestDialog open={requestOpen} onOpenChange={setRequestOpen} controls={scopedControls} auditor={user} scopeId={scope?.id} onSaved={load} />
    </div>
  );
}