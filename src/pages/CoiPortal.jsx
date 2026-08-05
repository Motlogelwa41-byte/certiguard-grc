import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Plus, Search, Eye, CheckCircle2, XCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import Can from "@/components/shared/Can";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

const DECL_TYPES = [
  { value: "conflict_of_interest", label: "Conflict of Interest" },
  { value: "outside_business", label: "Outside Business Activity" },
  { value: "gift_entertainment", label: "Gift & Entertainment" },
  { value: "insider_threat", label: "Insider Threat Concern" },
  { value: "related_party_transaction", label: "Related Party Transaction" },
];

const defaultForm = { declaration_type: "conflict_of_interest", declarer_name: "", declarer_email: "", declarer_role: "", description: "", related_party: "", nature_of_conflict: "", financial_interest: false, financial_value: "" };

export default function CoiPortal() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState("");
  const [reviewOpen, setReviewOpen] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [mitigationPlan, setMitigationPlan] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const load = () => base44.entities.ConflictOfInterest.list("-submitted_at").then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    try {
      await base44.entities.ConflictOfInterest.create({ ...form, financial_value: form.financial_value ? Number(form.financial_value) : null, submitted_at: new Date().toISOString(), status: "submitted" });
      setOpen(false); setForm(defaultForm); load();
      toast({ title: "Declaration submitted", description: "Your disclosure has been routed to the Compliance Officer for review." });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleReview = async () => {
    if (!reviewOpen) return;
    try {
      await base44.entities.ConflictOfInterest.update(reviewOpen.id, { status: reviewStatus, review_notes: reviewNotes, mitigation_plan: mitigationPlan, reviewer_name: user?.full_name || user?.email, reviewed_at: new Date().toISOString() });
      setReviewOpen(null); setReviewNotes(""); setMitigationPlan(""); load();
      toast({ title: "Review recorded" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const filtered = items.filter((d) => !search || d.declarer_name?.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase()));
  const stats = useMemo(() => ({ total: items.length, pending: items.filter((i) => i.status === "submitted" || i.status === "under_review").length, approved: items.filter((i) => i.status === "approved").length, mitigation: items.filter((i) => i.status === "mitigation_required").length }), [items]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Conflict of Interest & Insider Threat Portal" subtitle="Submit and manage declarations for conflicts of interest, outside activities, and gifts"
        actions={<Button size="sm" onClick={() => { setForm({ ...defaultForm, declarer_name: user?.full_name || "", declarer_email: user?.email || "" }); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> New Declaration</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4"><ShieldAlert className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Declarations</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><FileText className="w-5 h-5 text-amber-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><CheckCircle2 className="w-5 h-5 text-emerald-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
        <div className="bg-card rounded-xl border border-border p-4"><ShieldAlert className="w-5 h-5 text-red-500 mb-2" /><p className="text-2xl font-bold text-foreground">{stats.mitigation}</p><p className="text-xs text-muted-foreground">Mitigation Required</p></div>
      </div>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search declarations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No declarations" description="Submit conflict of interest, outside business activity, or gift declarations for compliance review." actionLabel="New Declaration" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div key={d.id} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{DECL_TYPES.find((t) => t.value === d.declaration_type)?.label}</span>
                    {d.financial_interest && <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Financial Interest</span>}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm mt-1">{d.declarer_name} <span className="text-muted-foreground font-normal">· {d.declarer_role || "—"}</span></h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
                  {d.related_party && <p className="text-xs text-muted-foreground mt-1"><span className="font-semibold">Related party:</span> {d.related_party}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={d.status} />
                  <Can permission="policies:write"><button onClick={() => { setReviewOpen(d); setReviewStatus(d.status === "submitted" ? "approved" : d.status); setReviewNotes(d.review_notes || ""); setMitigationPlan(d.mitigation_plan || ""); }} className="p-1 rounded hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Declaration</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Declaration Type</Label><Select value={form.declaration_type} onValueChange={(v) => setForm({ ...form, declaration_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DECL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Your Name</Label><Input value={form.declarer_name} onChange={(e) => setForm({ ...form, declarer_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.declarer_email} onChange={(e) => setForm({ ...form, declarer_email: e.target.value })} /></div>
            </div>
            <div><Label>Your Role</Label><Input value={form.declarer_role} onChange={(e) => setForm({ ...form, declarer_role: e.target.value })} placeholder="e.g. Employee, Director, Consultant" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Describe the potential conflict or disclosure in detail..." /></div>
            <div><Label>Related Party / Organization</Label><Input value={form.related_party} onChange={(e) => setForm({ ...form, related_party: e.target.value })} /></div>
            <div><Label>Nature of Conflict</Label><Input value={form.nature_of_conflict} onChange={(e) => setForm({ ...form, nature_of_conflict: e.target.value })} placeholder="e.g. Financial, personal, professional" /></div>
            <div className="flex items-center space-x-2">
              <Checkbox id="fin" checked={form.financial_interest} onCheckedChange={(v) => setForm({ ...form, financial_interest: v })} />
              <Label htmlFor="fin" className="cursor-pointer">Involves financial interest</Label>
            </div>
            {form.financial_interest && <div><Label>Estimated Financial Value</Label><Input type="number" value={form.financial_value} onChange={(e) => setForm({ ...form, financial_value: e.target.value })} /></div>}
            <Button className="w-full" onClick={handleSubmit} disabled={!form.description || !form.declarer_name}>Submit Declaration</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={!!reviewOpen} onOpenChange={(v) => !v && setReviewOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Review Declaration</DialogTitle></DialogHeader>
          {reviewOpen && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-sm font-semibold text-foreground">{reviewOpen.declarer_name} · {reviewOpen.declarer_role}</p>
                <p className="text-xs text-muted-foreground mt-1">{reviewOpen.description}</p>
                {reviewOpen.related_party && <p className="text-xs mt-1"><span className="font-semibold">Related party:</span> {reviewOpen.related_party}</p>}
              </div>
              <div><Label>Decision</Label><Select value={reviewStatus} onValueChange={setReviewStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="approved">Approved</SelectItem><SelectItem value="mitigation_required">Mitigation Required</SelectItem><SelectItem value="rejected">Rejected</SelectItem></SelectContent></Select></div>
              <div><Label>Review Notes</Label><Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} /></div>
              {reviewStatus === "mitigation_required" && <div><Label>Mitigation Plan</Label><Textarea value={mitigationPlan} onChange={(e) => setMitigationPlan(e.target.value)} rows={3} placeholder="Describe required mitigation actions..." /></div>}
              <Button className="w-full" onClick={handleReview}>Record Review</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}