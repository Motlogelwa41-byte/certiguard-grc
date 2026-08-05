import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/shared/StatusBadge";
import { Plus, ArrowLeft, Play, CheckCircle2, ShieldCheck, UserCog, Ban, Pencil } from "lucide-react";

const SCOPE = [
  { value: "all_users", label: "All Users" },
  { value: "admins_only", label: "Admins Only" },
];
const defaultForm = { name: "", description: "", period: "", scope: "all_users", start_date: "", end_date: "", deadline: "", reviewer_name: "", notes: "" };

export default function AccessRecertification() {
  const [campaigns, setCampaigns] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [notesByItem, setNotesByItem] = useState({});
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.AccessReviewCampaign.list("-updated_date", 100);
    setCampaigns(list || []);
    setLoading(false);
  };

  const loadItems = async (id) => {
    const list = await base44.entities.AccessReviewItem.filter({ campaign_id: id }, "-updated_date", 1000);
    setItems(list || []);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditId(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ name: c.name, description: c.description || "", period: c.period || "", scope: c.scope || "all_users", start_date: c.start_date || "", end_date: c.end_date || "", deadline: c.deadline || "", reviewer_name: c.reviewer_name || "", notes: c.notes || "" });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await base44.entities.AccessReviewCampaign.update(editId, form);
        toast({ title: "Campaign updated" });
      } else {
        const created = await base44.entities.AccessReviewCampaign.create({ ...form, status: "draft" });
        toast({ title: "Campaign created", description: "Generate review items when ready." });
      }
      setOpen(false); load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const generate = async (c) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke("runAccessRecertificationCampaign", { action: "generate", campaign_id: c.id });
      const data = res?.data || res;
      if (data?.ok) {
        toast({ title: "Review items generated", description: `${data.generated} new · ${data.total} total` });
        await load();
        if (selected) {
          const refreshed = await base44.entities.AccessReviewCampaign.get(selected.id);
          setSelected(refreshed);
          await loadItems(selected.id);
        }
      } else toast({ title: "Failed", description: data?.error, variant: "destructive" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setBusy(false);
  };

  const finalize = async (c) => {
    if (!confirm("Finalize campaign? Any un-reviewed access will be auto-revoked (least-privilege).")) return;
    setBusy(true);
    try {
      const res = await base44.functions.invoke("runAccessRecertificationCampaign", { action: "finalize", campaign_id: c.id });
      const data = res?.data || res;
      if (data?.ok) {
        toast({ title: "Campaign finalized", description: `${data.certified} certified · ${data.revoked} revoked · ${data.modified} modified` });
        await load();
        if (selected?.id === c.id) {
          const refreshed = await base44.entities.AccessReviewCampaign.get(c.id);
          setSelected(refreshed);
          await loadItems(c.id);
        }
      } else toast({ title: "Failed", description: data?.error, variant: "destructive" });
    } catch (e) { toast({ title: "Failed", description: e.message, variant: "destructive" }); }
    setBusy(false);
  };

  const decide = async (item, decision) => {
    const notes = notesByItem[item.id] || "";
    try {
      await base44.entities.AccessReviewItem.update(item.id, {
        decision, status: "completed", decision_notes: notes, decided_at: new Date().toISOString(),
      });
      toast({ title: `Access ${decision === "certify" ? "certified" : decision === "revoke" ? "flagged for revocation" : "flagged for modification"}` });
      loadItems(item.campaign_id);
      load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const openCampaign = async (c) => { setSelected(c); await loadItems(c.id); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  // Campaign detail view
  if (selected) {
    const pct = selected.total_items > 0 ? Math.round((selected.completed_items / selected.total_items) * 100) : 0;
    return (
      <div>
        <Button size="sm" variant="ghost" className="mb-3" onClick={() => { setSelected(null); setItems([]); }}><ArrowLeft className="w-4 h-4 mr-1" /> Back to campaigns</Button>
        <PageHeader
          title={selected.name}
          subtitle={`Period ${selected.period || "—"} · Scope: ${selected.scope === "admins_only" ? "Admins only" : "All users"}`}
          actions={
            <div className="flex items-center gap-2">
              {selected.status !== "completed" && <Button size="sm" variant="outline" onClick={() => generate(selected)} disabled={busy}><Play className="w-4 h-4 mr-1" /> Generate items</Button>}
              {selected.status === "in_review" && <Button size="sm" onClick={() => finalize(selected)} disabled={busy}><CheckCircle2 className="w-4 h-4 mr-1" /> Finalize</Button>}
              <Button size="sm" variant="ghost" onClick={() => openEdit(selected)}><Pencil className="w-4 h-4 mr-1" /> Edit</Button>
            </div>
          }
        />

        {/* Progress */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Total Reviews" value={selected.total_items} />
          <Stat label="Completed" value={selected.completed_items} color="text-primary" />
          <Stat label="Certified" value={selected.certified_count} color="text-success" />
          <Stat label="Revoked" value={selected.revoked_count} color="text-destructive" />
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Review progress</span><span>{pct}%</span></div>
          <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
        </div>

        {/* Review items */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Access Summary</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Notes</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Decision</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No review items yet. Click "Generate items".</td></tr>}
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3"><p className="font-medium text-foreground">{it.user_name}</p><p className="text-xs text-muted-foreground">{it.user_email}</p></td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{it.role}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs">{it.access_summary}</td>
                    <td className="px-4 py-3 max-w-[180px]">
                      {it.status === 'completed' ? (
                        <span className="text-xs text-muted-foreground">{it.decision_notes || "—"}</span>
                      ) : (
                        <Input placeholder="Notes..." className="h-8 text-xs" value={notesByItem[it.id] || ""} onChange={(e) => setNotesByItem({ ...notesByItem, [it.id]: e.target.value })} />
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={it.decision} /></td>
                    <td className="px-4 py-3 text-right">
                      {it.status === 'completed' ? (
                        <span className="text-xs text-muted-foreground">Reviewed</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide(it, "certify")}><ShieldCheck className="w-3.5 h-3.5 mr-1 text-success" /> Certify</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide(it, "modify")}><UserCog className="w-3.5 h-3.5 mr-1 text-warning" /> Modify</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => decide(it, "revoke")}><Ban className="w-3.5 h-3.5 mr-1 text-destructive" /> Revoke</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Campaign list
  return (
    <div>
      <PageHeader
        title="Access Recertification"
        subtitle="Periodically review and verify employee permissions to enforce least-privilege"
        actions={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Campaign</Button>}
      />

      {campaigns.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-foreground">No recertification campaigns yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Create a campaign, generate review items, and have reviewers certify or revoke access.</p>
          <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New Campaign</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-card rounded-2xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-heading font-bold text-foreground">{c.name}</h3>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description || "No description"}</p>
              <div className="text-xs space-y-1 mb-4 border-t border-border pt-3">
                <Row label="Period" value={c.period || "—"} />
                <Row label="Scope" value={c.scope === "admins_only" ? "Admins only" : "All users"} />
                <Row label="Deadline" value={c.deadline || "—"} />
                <Row label="Reviewer" value={c.reviewer_name || "—"} />
                <Row label="Progress" value={`${c.completed_items || 0}/${c.total_items || 0}`} />
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openCampaign(c)}>Open</Button>
                {c.status !== "completed" && <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Campaign" : "New Recertification Campaign"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 2026 Access Review" /></div>
            <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Period</Label><Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Q3 2026" /></div>
              <div><Label>Scope</Label>
                <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SCOPE.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Start</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div><Label>End</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div><Label>Lead Reviewer</Label><Input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} placeholder="CISO / IT Manager" /></div>
            <div><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Save Changes" : "Create Campaign"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <p className={`text-2xl font-bold leading-none ${color || "text-foreground"}`}>{value || 0}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
function Row({ label, value }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="text-foreground font-medium">{value}</span></div>;
}