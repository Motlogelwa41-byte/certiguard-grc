import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { GraduationCap, Plus, Pencil, Trash2, Search, Clock, Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { title: "", description: "", category: "security_awareness", type: "online_course", duration_minutes: 30, mandatory: true, renewal_period_months: 12, assignee_count: 0, completed_count: 0, status: "draft", created_by_name: "", due_date: "", content_url: "", framework_ids: [] };

const categories = ["security_awareness", "data_privacy", "incident_response", "compliance", "anti_phishing", "code_of_conduct", "insider_threat", "role_based", "other"];
const types = ["online_course", "workshop", "webinar", "video", "quiz", "document", "simulation"];

export default function Training() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.Training.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Training.update(editId, form);
      else await base44.entities.Training.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Training updated" : "Training created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({
      title: item.title || "", description: item.description || "", category: item.category || "security_awareness",
      type: item.type || "online_course", duration_minutes: item.duration_minutes || 30,
      mandatory: !!item.mandatory, renewal_period_months: item.renewal_period_months || 12,
      assignee_count: item.assignee_count || 0, completed_count: item.completed_count || 0,
      status: item.status || "draft", created_by_name: item.created_by_name || "",
      due_date: item.due_date || "", content_url: item.content_url || "", framework_ids: item.framework_ids || []
    });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.Training.delete(id); load(); toast({ title: "Deleted" }); };

  const handleMarkComplete = async (id) => {
    const item = items.find(i => i.id === id);
    await base44.entities.Training.update(id, { completed_count: (item.completed_count || 0) + 1 });
    load(); toast({ title: "Marked as completed" });
  };

  const filtered = items.filter(i => !search || i.title?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const activeCount = items.filter(i => i.status === "active").length;
  const totalMandatory = items.filter(i => i.mandatory).length;

  return (
    <div>
      <PageHeader title="Training & Awareness" subtitle="Employee compliance training management and tracking" actions={<Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Training</Button>} />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <GraduationCap className="w-5 h-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total Courses</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <BookOpen className="w-5 h-5 text-emerald-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <Users className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{items.reduce((s, i) => s + (i.assignee_count || 0), 0)}</p>
          <p className="text-xs text-muted-foreground">Total Assignees</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <Clock className="w-5 h-5 text-amber-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalMandatory}</p>
          <p className="text-xs text-muted-foreground">Mandatory</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No training courses" description="Create your first compliance training course." actionLabel="Add Training" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div key={t.id} className="bg-card rounded-xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  {t.mandatory && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">Mandatory</span>}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{t.type?.replace(/_/g, " ")}</span>
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{t.title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-1 flex-1">{t.description || "No description"}</p>
              <p className="text-[10px] text-muted-foreground mb-2">{t.category?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} · {t.duration_minutes} min · Renews every {t.renewal_period_months} months</p>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: t.assignee_count ? `${Math.round((t.completed_count || 0) / t.assignee_count * 100)}%` : "0%" }} />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{t.completed_count || 0}/{t.assignee_count || 0}</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />{t.due_date || "No deadline"}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleMarkComplete(t.id)} className="px-2 py-1 text-[10px] font-medium bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100">Mark Complete</button>
                  <button onClick={() => handleEdit(t)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Training" : "Add Training Course"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Security Awareness" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Renewal (months)</Label><Input type="number" value={form.renewal_period_months} onChange={(e) => setForm({ ...form, renewal_period_months: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Assignees</Label><Input type="number" value={form.assignee_count} onChange={(e) => setForm({ ...form, assignee_count: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Completed</Label><Input type="number" value={form.completed_count} onChange={(e) => setForm({ ...form, completed_count: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={form.mandatory} onCheckedChange={(v) => setForm({ ...form, mandatory: v })} /><Label>Mandatory</Label></div>
            </div>
            <div><Label>Content URL</Label><Input value={form.content_url} onChange={(e) => setForm({ ...form, content_url: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create Training"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}