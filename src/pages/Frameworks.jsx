import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, Plus, Pencil, Trash2, ArrowRight, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";

const defaultForm = { name: "", version: "", description: "", status: "not_started", readiness_score: 0, total_controls: 0, passing_controls: 0 };

export default function Frameworks() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();
  const { canAddFramework, tenant } = useTenant();
  const fwLimit = tenant?.limits?.maxFrameworks ?? tenant?.max_frameworks ?? null;

  const load = () => base44.entities.Framework.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) {
        await base44.entities.Framework.update(editId, form);
      } else {
        if (!canAddFramework(items.length)) {
          toast({ title: "Framework limit reached", description: "Upgrade your plan to add more frameworks.", variant: "destructive" });
          return;
        }
        const res = await base44.functions.invoke('createFrameworkWithinPlan', { framework: form });
        if (res.data?.error) throw new Error(res.data.error);
      }
      setOpen(false);
      setForm(defaultForm);
      setEditId(null);
      load();
      toast({ title: editId ? "Framework updated" : "Framework created" });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name || "", version: item.version || "", description: item.description || "", status: item.status || "not_started", readiness_score: item.readiness_score || 0, total_controls: item.total_controls || 0, passing_controls: item.passing_controls || 0 });
    setEditId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Framework.delete(id);
    load();
    toast({ title: "Framework deleted" });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Frameworks" subtitle="Manage compliance frameworks and track readiness" actions={
        <div className="flex items-center gap-3">
          {fwLimit && <span className="text-xs text-muted-foreground">{items.length} / {fwLimit} frameworks</span>}
          <Button size="sm" variant="outline" onClick={() => navigate('/control-libraries')}><Library className="w-4 h-4 mr-1" /> Import Library</Button>
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Framework</Button>
        </div>
      } />
      {items.length === 0 ? (
        <EmptyState icon={Shield} title="No frameworks yet" description="Add your first compliance framework to start tracking." actionLabel="Add Framework" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((fw) => {
            const pct = fw.total_controls > 0 ? Math.round((fw.passing_controls / fw.total_controls) * 100) : fw.readiness_score || 0;
            return (
              <div key={fw.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all" onClick={() => navigate(`/controls?framework=${fw.id}&name=${encodeURIComponent(fw.name)}`)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground hover:text-primary transition-colors">{fw.name}</h3>
                      {fw.version && <p className="text-xs text-muted-foreground">v{fw.version}</p>}
                    </div>
                  </div>
                  <StatusBadge status={fw.status} />
                </div>
                {fw.description && <p className="text-sm text-muted-foreground line-clamp-2">{fw.description}</p>}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Readiness</span>
                    <span className="font-semibold text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                  <span className="flex items-center gap-1">{fw.total_controls || 0} controls · {fw.passing_controls || 0} passing <ArrowRight className="w-3 h-3 text-primary" /></span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEdit(fw)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(fw.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editId ? "Edit Framework" : "Add Framework"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. SOC 2 Type II" /></div>
            <div><Label>Version</Label><Input value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} placeholder="e.g. 2024" /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="audit_ready">Audit Ready</SelectItem>
                  <SelectItem value="certified">Certified</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Total Controls</Label><Input type="number" value={form.total_controls} onChange={(e) => setForm({ ...form, total_controls: parseInt(e.target.value) || 0 })} /></div>
              <div><Label>Passing Controls</Label><Input type="number" value={form.passing_controls} onChange={(e) => setForm({ ...form, passing_controls: parseInt(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}