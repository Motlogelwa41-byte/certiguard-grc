import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, FileQuestion, Search, Eye } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import QuestionnaireForm from "@/components/questionnaires/QuestionnaireForm";

export default function SecurityQuestionnaires() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.SecurityQuestionnaire.list("-created_date", 500)
      .then((d) => setItems(d || []))
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (q) => {
    if (!confirm(`Delete "${q.title}" and its questions?`)) return;
    try {
      await base44.entities.SecurityQuestionnaire.delete(q.id);
      load();
      toast({ title: "Questionnaire deleted" });
    } catch (e) { toast({ title: "Delete failed", description: e.message, variant: "destructive" }); }
  };

  const filtered = items.filter((q) => !search || `${q.title} ${q.client_name}`.toLowerCase().includes(search.toLowerCase()));
  const drafting = items.filter((q) => q.status === "drafting" || q.status === "in_review").length;
  const submitted = items.filter((q) => q.status === "submitted" || q.status === "closed").length;

  return (
    <div>
      <PageHeader title="Security Questionnaires" subtitle="Automate responses to incoming security and due-diligence questionnaires"
        actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New questionnaire</Button>} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total" value={items.length} icon={FileQuestion} color="blue" />
        <StatCard label="In progress" value={drafting} icon={FileQuestion} color={drafting ? "amber" : "slate"} />
        <StatCard label="Submitted" value={submitted} icon={FileQuestion} color={submitted ? "green" : "slate"} />
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questionnaires…" className="pl-9 max-w-md" />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileQuestion className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No questionnaires yet. Intake a customer security review to start drafting responses.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New questionnaire</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Questionnaire</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Due</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3"><Link to={`/questionnaires/${q.id}`} className="font-medium hover:underline">{q.title}</Link><div className="text-xs text-muted-foreground">{q.answered_count || 0}/{q.item_count || 0} answered</div></td>
                    <td className="px-4 py-3 text-muted-foreground">{q.client_name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{(q.request_type || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{q.due_date || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild><Link to={`/questionnaires/${q.id}`}><Eye className="w-4 h-4" /></Link></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(q); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(q)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <QuestionnaireForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />
    </div>
  );
}