import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Gavel, Plus, Pencil, Trash2, Search, CheckCircle2, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import Can from "@/components/shared/Can";
import { useToast } from "@/components/ui/use-toast";

const RES_TYPES = [
  { value: "strategic_directive", label: "Strategic Directive" },
  { value: "compliance_mandate", label: "Compliance Mandate" },
  { value: "risk_acceptance", label: "Risk Acceptance" },
  { value: "policy_approval", label: "Policy Approval" },
  { value: "budget_authorization", label: "Budget Authorization" },
  { value: "governance_change", label: "Governance Change" },
  { value: "other", label: "Other" },
];

const defaultForm = { title: "", description: "", resolution_type: "compliance_mandate", meeting_date: "", meeting_reference: "", owner_name: "", due_date: "", notes: "" };

export default function BoardResolutionRegister() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [signOffOpen, setSignOffOpen] = useState(null);
  const [signName, setSignName] = useState("");
  const [signRole, setSignRole] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.BoardResolution.list("-created_date").then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const num = editId ? form.resolution_number : `BR-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, "0")}`;
      if (editId) await base44.entities.BoardResolution.update(editId, form);
      else await base44.entities.BoardResolution.create({ ...form, resolution_number: num, milestones: "[]", sign_offs: "[]" });
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Resolution updated" : "Resolution created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (r) => { setForm({ title: r.title, description: r.description, resolution_type: r.resolution_type, meeting_date: r.meeting_date, meeting_reference: r.meeting_reference, owner_name: r.owner_name, due_date: r.due_date, notes: r.notes, resolution_number: r.resolution_number }); setEditId(r.id); setOpen(true); };
  const handleDelete = async (id) => { await base44.entities.BoardResolution.delete(id); load(); };

  const addSignOff = async () => {
    if (!signName.trim() || !signOffOpen) return;
    try {
      const signOffs = JSON.parse(signOffOpen.sign_offs || "[]");
      signOffs.push({ member_name: signName, role: signRole, signed_at: new Date().toISOString(), signature: signName });
      await base44.entities.BoardResolution.update(signOffOpen.id, { sign_offs: JSON.stringify(signOffs) });
      setSignOffOpen({ ...signOffOpen, sign_offs: JSON.stringify(signOffs) });
      setSignName(""); setSignRole("");
      load();
      toast({ title: "Sign-off recorded" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const filtered = items.filter((r) => !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.resolution_number?.toLowerCase().includes(search.toLowerCase()));
  const stats = useMemo(() => ({ total: items.length, pending: items.filter((i) => i.status === "pending").length, completed: items.filter((i) => i.status === "completed").length, overdue: items.filter((i) => i.status === "overdue" || (i.due_date && new Date(i.due_date) < new Date() && i.status !== "completed")).length }), [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Board Resolution Register" subtitle="Track board resolutions, strategic directives, and compliance mandates with sign-off logs"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Resolution</Button></Can>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><Gavel className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Resolutions</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Clock className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.completed}</p><p className="text-xs text-muted-foreground">Completed</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><Clock className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.overdue}</p><p className="text-xs text-muted-foreground">Overdue</p></div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search resolutions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Gavel} title="No board resolutions" description="Track strategic directives and compliance mandates passed during board meetings." actionLabel="New Resolution" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const signOffs = JSON.parse(r.sign_offs || "[]");
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.resolution_number}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">{RES_TYPES.find((t) => t.value === r.resolution_type)?.label}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-sm mt-1">{r.title}</h3>
                    {r.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {r.meeting_date && <span><Clock className="w-3 h-3 inline mr-0.5" />{r.meeting_date}</span>}
                      {r.owner_name && <span><User className="w-3 h-3 inline mr-0.5" />{r.owner_name}</span>}
                      {r.due_date && <span>Due: {r.due_date}</span>}
                      <span><CheckCircle2 className="w-3 h-3 inline mr-0.5" />{signOffs.length} sign-off(s)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.status} />
                    <Can permission="policies:write"><button onClick={() => setSignOffOpen(r)} className="p-1 rounded hover:bg-muted" title="Sign off"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></button></Can>
                    <Can permission="policies:write"><button onClick={() => handleEdit(r)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                    <Can permission="admin:users"><button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                  </div>
                </div>
                {signOffs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Sign-offs:</p>
                    <div className="flex flex-wrap gap-2">{signOffs.map((s, i) => (
                      <span key={i} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">{s.member_name} ({s.role}) · {new Date(s.signed_at).toLocaleDateString()}</span>
                    ))}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Sign-off Dialog */}
      <Dialog open={!!signOffOpen} onOpenChange={(v) => !v && setSignOffOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Board Member Sign-Off</DialogTitle></DialogHeader>
          {signOffOpen && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Resolution: <strong className="text-foreground">{signOffOpen.title}</strong></p>
              <div><Label>Board Member Name</Label><Input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Full name" /></div>
              <div><Label>Role</Label><Input value={signRole} onChange={(e) => setSignRole(e.target.value)} placeholder="e.g. Chair, Director, CFO" /></div>
              <Button className="w-full" onClick={addSignOff} disabled={!signName.trim()}><CheckCircle2 className="w-4 h-4 mr-1" /> Sign Off</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Resolution" : "New Board Resolution"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Resolution title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.resolution_type} onValueChange={(v) => setForm({ ...form, resolution_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RES_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Meeting Date</Label><Input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Meeting Reference</Label><Input value={form.meeting_reference} onChange={(e) => setForm({ ...form, meeting_reference: e.target.value })} placeholder="e.g. Q3-2026-BM" /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}