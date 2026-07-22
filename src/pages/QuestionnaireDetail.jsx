import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Plus, Pencil, Trash2, Wand2, Send, Building2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import QuestionnaireItemDialog from "@/components/questionnaires/QuestionnaireItemDialog";

const CONFIDENCE_STYLE = { drafted: "bg-blue-100 text-blue-700", verified: "bg-emerald-100 text-emerald-700", needs_input: "bg-amber-100 text-amber-700", none: "bg-slate-100 text-slate-500" };

export default function QuestionnaireDetail() {
  const { id } = useParams();
  const [q, setQ] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoFilling, setAutoFilling] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.SecurityQuestionnaire.get(id),
      base44.entities.QuestionnaireItem.filter({ questionnaire_id: id }, "created_date", 500),
    ]).then(([d, its]) => { setQ(d); setItems(its || []); })
      .catch(() => toast({ title: "Not found", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const autoFill = async () => {
    setAutoFilling(true);
    try {
      const res = await base44.functions.invoke("autoFillQuestionnaire", { questionnaire_id: id });
      const d = res.data || res;
      toast({ title: "Drafts generated", description: `${d.drafted || 0} of ${d.total || 0} questions answered with AI suggestions` });
      load();
    } catch (e) {
      toast({ title: "Auto-fill failed", description: e.message, variant: "destructive" });
    } finally { setAutoFilling(false); }
  };

  const submit = async () => {
    if (!confirm("Mark this questionnaire as submitted to the client?")) return;
    try {
      await base44.entities.SecurityQuestionnaire.update(id, { status: "submitted", submitted_date: new Date().toISOString().slice(0, 10) });
      load();
      toast({ title: "Questionnaire submitted" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
  };

  const deleteItem = async (it) => {
    if (!confirm(`Delete question "${it.question}"?`)) return;
    await base44.entities.QuestionnaireItem.delete(it.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  if (!q) return <div className="text-center py-20 text-muted-foreground">Questionnaire not found. <Link to="/questionnaires" className="text-primary underline">Back</Link></div>;

  return (
    <div>
      <Link to="/questionnaires" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"><ArrowLeft className="w-4 h-4" /> Questionnaires</Link>
      <PageHeader title={q.title} subtitle={`${q.client_name} · ${q.client_email || ""}`}
        actions={
          <>
            <Button variant="outline" onClick={autoFill} disabled={autoFilling}>
              {autoFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Auto-fill answers
            </Button>
            <Button onClick={submit} disabled={q.status === "submitted"}><Send className="w-4 h-4" /> Submit</Button>
          </>
        } />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Status</p><div className="mt-1"><StatusBadge status={q.status} /></div></div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Due</p><p className="text-sm font-medium mt-1">{q.due_date || "—"}</p></div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Questions</p><p className="text-sm font-medium mt-1">{items.length}</p></div>
        <div className="bg-card rounded-lg border border-border p-4"><p className="text-xs text-muted-foreground uppercase">Answered</p><p className="text-sm font-medium mt-1">{items.filter((i) => i.answer).length}</p></div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Questions ({items.length})</h3>
        <Button size="sm" onClick={() => { setEditingItem(null); setItemOpen(true); }}><Plus className="w-4 h-4" /> Add question</Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Building2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-3">No questions yet. Add questions, then use "Auto-fill answers" to draft AI responses from your policies and controls.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <div key={it.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {it.section && <span className="text-xs text-muted-foreground uppercase tracking-wider">{it.section}</span>}
                  <p className="text-sm font-medium">{it.question}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {it.confidence && it.confidence !== "none" && <span className={`text-xs px-2 py-0.5 rounded-full ${CONFIDENCE_STYLE[it.confidence]}`}>{it.confidence.replace(/_/g, " ")}</span>}
                  <StatusBadge status={it.status} />
                  <Button size="icon" variant="ghost" onClick={() => { setEditingItem(it); setItemOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteItem(it)}><Trash2 className="w-3.5 h-3.5 text-red-600" /></Button>
                </div>
              </div>
              {it.suggested_answer && (
                <div className="mt-2 pl-3 border-l-2 border-blue-200">
                  <p className="text-xs text-muted-foreground uppercase">AI suggestion</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{it.suggested_answer}</p>
                </div>
              )}
              {it.answer && (
                <div className="mt-2 pl-3 border-l-2 border-emerald-300">
                  <p className="text-xs text-muted-foreground uppercase">Final answer</p>
                  <p className="text-sm mt-0.5">{it.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <QuestionnaireItemDialog open={itemOpen} onOpenChange={setItemOpen} questionnaire={q} editing={editingItem} onSaved={load} />
    </div>
  );
}