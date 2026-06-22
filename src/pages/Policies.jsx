import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Pencil, Trash2, Search, Eye, CheckSquare } from "lucide-react";
import { Link } from "react-router-dom";
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

const policyCategories = ["information_security","data_privacy","acceptable_use","access_control","incident_response","business_continuity","change_management","vendor_management","human_resources","physical_security"];
const defaultForm = { title: "", description: "", content: "", category: "information_security", status: "draft", version: "1.0", owner_name: "", acknowledgment_required: true, next_review_date: "" };

export default function Policies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.Policy.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Policy.update(editId, form);
      else await base44.entities.Policy.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Policy updated" : "Policy created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title || "", description: item.description || "", content: item.content || "", category: item.category || "information_security", status: item.status || "draft", version: item.version || "1.0", owner_name: item.owner_name || "", acknowledgment_required: item.acknowledgment_required !== false, next_review_date: item.next_review_date || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.Policy.delete(id); load(); toast({ title: "Policy deleted" }); };

  const filtered = items.filter((p) => !search || p.title?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Policies"
        subtitle="Create, manage, and track policy compliance"
        actions={
          <div className="flex items-center gap-2">
            <Link to="/policy-acknowledgments">
              <Button variant="outline" size="sm"><CheckSquare className="w-4 h-4 mr-1" /> Acknowledgments</Button>
            </Link>
            <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Policy</Button>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={FileText} title="No policies yet" description="Create policies to define your organization's compliance posture." actionLabel="Add Policy" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-foreground text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{(p.category || "").replace(/_/g, " ")}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Version: </span><span className="font-semibold">{p.version || "1.0"}</span></div>
                <div><span className="text-muted-foreground">Owner: </span><span className="font-semibold">{p.owner_name || "—"}</span></div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                <span className="text-muted-foreground">{p.acknowledgment_required ? "Ack required" : "No ack needed"}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setViewPolicy(p); setViewOpen(true); }} className="p-1 rounded hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleEdit(p)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewPolicy?.title}</DialogTitle></DialogHeader>
          {viewPolicy && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <StatusBadge status={viewPolicy.status} />
                <span className="text-xs text-muted-foreground">v{viewPolicy.version || "1.0"}</span>
                <span className="text-xs text-muted-foreground capitalize">{(viewPolicy.category || "").replace(/_/g, " ")}</span>
              </div>
              {viewPolicy.description && <p className="text-sm text-muted-foreground">{viewPolicy.description}</p>}
              {viewPolicy.content && <div className="bg-muted/50 rounded-lg p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">{viewPolicy.content}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Policy" : "Add Policy"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{policyCategories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} /></div>
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            </div>
            <div><Label>Next Review Date</Label><Input type="date" value={form.next_review_date} onChange={(e) => setForm({ ...form, next_review_date: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.acknowledgment_required} onCheckedChange={(v) => setForm({ ...form, acknowledgment_required: v })} />
              <Label>Acknowledgment Required</Label>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Policy Content</Label><Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} placeholder="Full policy text..." /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}