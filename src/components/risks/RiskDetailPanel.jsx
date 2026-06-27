import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Shield, FileCheck, Loader2, ExternalLink, Plus, CheckCircle2, Circle, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const SCORE_BG = (score) => {
  if (score >= 20) return "bg-red-500 text-white";
  if (score >= 12) return "bg-orange-500 text-white";
  if (score >= 6) return "bg-amber-500 text-white";
  return "bg-emerald-500 text-white";
};

const STEP_STATUS_ICON = {
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />,
  in_progress: <Clock className="w-4 h-4 text-amber-500 shrink-0" />,
  todo: <Circle className="w-4 h-4 text-muted-foreground shrink-0" />,
};

const STEP_STATUS_CYCLE = { todo: "in_progress", in_progress: "completed", completed: "todo" };

export default function RiskDetailPanel({ risk, onClose }) {
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stepsLoading, setStepsLoading] = useState(false);

  // New step form state
  const [showStepForm, setShowStepForm] = useState(false);
  const [newStep, setNewStep] = useState({ title: "", status: "todo", linked_control_id: "", linked_control_name: "", due_date: "", owner_name: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!risk) return;
    setLoading(true);
    setControls([]);
    setEvidence([]);
    setSteps([]);
    setShowStepForm(false);

    const controlIds = risk.related_control_ids || [];

    Promise.all([
      controlIds.length > 0
        ? base44.entities.Control.list().then(all => all.filter(c => controlIds.includes(c.id) || controlIds.includes(c.control_id)))
        : Promise.resolve([]),
      base44.entities.Evidence.list().then(all => all.filter(e => controlIds.some(id => e.control_id === id || e.control_ids?.includes(id)))),
      base44.entities.MitigationStep.filter({ risk_id: risk.id }),
    ]).then(([ctls, evs, stps]) => {
      setControls(ctls);
      setEvidence(evs);
      setSteps(stps);
      setLoading(false);
    });
  }, [risk?.id]);

  const loadSteps = () =>
    base44.entities.MitigationStep.filter({ risk_id: risk.id }).then(setSteps);

  const addStep = async () => {
    if (!newStep.title.trim()) return;
    setSaving(true);
    await base44.entities.MitigationStep.create({ ...newStep, risk_id: risk.id });
    setNewStep({ title: "", status: "todo", linked_control_id: "", linked_control_name: "", due_date: "", owner_name: "", notes: "" });
    setShowStepForm(false);
    await loadSteps();
    setSaving(false);
  };

  const cycleStatus = async (step) => {
    const next = STEP_STATUS_CYCLE[step.status] || "todo";
    await base44.entities.MitigationStep.update(step.id, { status: next });
    await loadSteps();
  };

  const deleteStep = async (id) => {
    await base44.entities.MitigationStep.delete(id);
    await loadSteps();
  };

  const handleControlLink = (e) => {
    const selected = controls.find(c => c.id === e.target.value);
    setNewStep(s => ({ ...s, linked_control_id: e.target.value, linked_control_name: selected?.title || "" }));
  };

  if (!risk) return null;

  const score = risk.likelihood * risk.impact;
  const completedSteps = steps.filter(s => s.status === "completed").length;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            {risk.risk_id && <p className="text-[10px] font-mono text-muted-foreground mb-0.5">{risk.risk_id}</p>}
            <h2 className="text-base font-heading font-bold text-foreground leading-snug">{risk.title}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${SCORE_BG(score)}`}>Score {score}</span>
              <StatusBadge status={risk.status} />
              <StatusBadge status={risk.treatment} />
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* Risk details */}
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Likelihood</p>
                <p className="font-semibold text-foreground">{risk.likelihood} / 5</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Impact</p>
                <p className="font-semibold text-foreground">{risk.impact} / 5</p>
              </div>
              {risk.owner_name && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Owner</p>
                  <p className="font-semibold text-foreground">{risk.owner_name}</p>
                </div>
              )}
              {risk.due_date && (
                <div className="bg-muted/40 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Due Date</p>
                  <p className="font-semibold text-foreground">{risk.due_date}</p>
                </div>
              )}
            </div>
            {risk.description && <p className="text-muted-foreground text-xs leading-relaxed">{risk.description}</p>}
            {risk.mitigation_plan && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Mitigation Plan</p>
                <p className="text-xs text-foreground leading-relaxed">{risk.mitigation_plan}</p>
              </div>
            )}
          </div>

          {/* ── Mitigation Steps ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Mitigation Steps</h3>
              {steps.length > 0 && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {completedSteps}/{steps.length} done
                </span>
              )}
              <button
                onClick={() => setShowStepForm(v => !v)}
                className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add step
              </button>
            </div>

            {/* Progress bar */}
            {steps.length > 0 && (
              <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                />
              </div>
            )}

            {/* Add form */}
            {showStepForm && (
              <div className="bg-muted/30 border border-border rounded-xl p-4 mb-3 space-y-3">
                <input
                  placeholder="Step title *"
                  value={newStep.title}
                  onChange={e => setNewStep(s => ({ ...s, title: e.target.value }))}
                  className="w-full text-sm bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={newStep.status}
                    onChange={e => setNewStep(s => ({ ...s, status: e.target.value }))}
                    className="text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <input
                    type="date"
                    value={newStep.due_date}
                    onChange={e => setNewStep(s => ({ ...s, due_date: e.target.value }))}
                    className="text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <input
                  placeholder="Owner name"
                  value={newStep.owner_name}
                  onChange={e => setNewStep(s => ({ ...s, owner_name: e.target.value }))}
                  className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {controls.length > 0 && (
                  <select
                    value={newStep.linked_control_id}
                    onChange={handleControlLink}
                    className="w-full text-xs bg-background border border-input rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Link to a control (optional)</option>
                    {controls.map(c => (
                      <option key={c.id} value={c.id}>{c.control_id ? `${c.control_id} — ` : ""}{c.title}</option>
                    ))}
                  </select>
                )}
                <textarea
                  placeholder="Notes (optional)"
                  value={newStep.notes}
                  onChange={e => setNewStep(s => ({ ...s, notes: e.target.value }))}
                  rows={2}
                  className="w-full text-xs bg-background border border-input rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowStepForm(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-input">Cancel</button>
                  <button
                    onClick={addStep}
                    disabled={saving || !newStep.title.trim()}
                    className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Save Step"}
                  </button>
                </div>
              </div>
            )}

            {/* Steps list */}
            {steps.length === 0 && !showStepForm ? (
              <p className="text-xs text-muted-foreground italic py-2">No mitigation steps yet. Add one to track progress.</p>
            ) : (
              <div className="space-y-2">
                {steps.map(step => (
                  <div key={step.id} className="flex items-start gap-2 bg-muted/20 border border-border rounded-lg p-3">
                    <button onClick={() => cycleStatus(step)} className="mt-0.5" title="Click to cycle status">
                      {STEP_STATUS_ICON[step.status] || STEP_STATUS_ICON.todo}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${step.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {step.title}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-muted-foreground">
                        {step.linked_control_name && <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">🔗 {step.linked_control_name}</span>}
                        {step.owner_name && <span>👤 {step.owner_name}</span>}
                        {step.due_date && <span>📅 {step.due_date}</span>}
                      </div>
                      {step.notes && <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{step.notes}</p>}
                    </div>
                    <button onClick={() => deleteStep(step.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {!loading && (
            <>
              {/* Linked Controls */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Linked Controls</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{controls.length}</span>
                </div>
                {controls.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No controls linked to this risk.</p>
                ) : (
                  <div className="space-y-2">
                    {controls.map(c => (
                      <div key={c.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3 border border-border">
                        <div className="flex-1 min-w-0">
                          {c.control_id && <p className="text-[10px] font-mono text-muted-foreground">{c.control_id}</p>}
                          <p className="text-sm font-medium text-foreground">{c.title}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <StatusBadge status={c.status} />
                            <StatusBadge status={c.severity} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Linked Evidence */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Linked Evidence</h3>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{evidence.length}</span>
                </div>
                {evidence.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-2">No evidence linked to this risk's controls.</p>
                ) : (
                  <div className="space-y-2">
                    {evidence.map(e => (
                      <div key={e.id} className="flex items-start gap-3 bg-muted/30 rounded-lg p-3 border border-border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{e.title || e.name}</p>
                          {e.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.description}</p>}
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {e.status && <StatusBadge status={e.status} />}
                            {e.type && <span className="text-[10px] text-muted-foreground capitalize">{e.type}</span>}
                          </div>
                        </div>
                        {e.file_url && (
                          <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 shrink-0">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}