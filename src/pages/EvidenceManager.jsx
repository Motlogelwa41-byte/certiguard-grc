import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Paperclip, Plus, Pencil, Trash2, Search, Upload, ExternalLink, Link2, Layers,
  CheckSquare, Clock, XCircle, CheckCircle2, ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import BulkUploadPanel from "@/components/evidence/BulkUploadPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";

const evidenceTypes = ["screenshot", "document", "report", "log", "certificate", "configuration", "other"];
const statusFilters = [
  { value: "all", label: "All evidence" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "expired", label: "Expired" },
];
const defaultForm = { title: "", description: "", type: "document", status: "pending_review", control_id: "", control_title: "", collected_date: "", expiry_date: "", reviewer_name: "", notes: "", file_url: "", file_name: "" };

export default function EvidenceManager() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [evidence, ctls] = await Promise.all([base44.entities.Evidence.list(), base44.entities.Control.list()]);
    setItems(evidence);
    setControls(ctls);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm({ ...form, file_url, file_name: file.name });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Evidence.update(editId, form);
      else await base44.entities.Evidence.create({ ...form, status: "pending_review" });

      // Hash the uploaded file and write to the append-only audit ledger (SHA-256 integrity proof)
      if (form.file_url) {
        try {
          await base44.functions.invoke('hashEvidenceToLedger', {
            file_url: form.file_url,
            file_name: form.file_name,
            control_id: form.control_id,
            notes: `Evidence: ${form.title}`,
          });
        } catch (hashErr) {
          console.error('Ledger hashing failed:', hashErr);
        }
      }

      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Evidence updated" : "Evidence added", description: editId ? undefined : "Sent to compliance manager for review." });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ title: item.title || "", description: item.description || "", type: item.type || "document", status: item.status || "pending_review", control_id: item.control_id || "", control_title: item.control_title || "", collected_date: item.collected_date || "", expiry_date: item.expiry_date || "", reviewer_name: item.reviewer_name || "", notes: item.notes || "", file_url: item.file_url || "", file_name: item.file_name || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.Evidence.delete(id); load(); toast({ title: "Evidence deleted" }); };

  const openReview = (item) => {
    setReviewItem(item);
    setReviewDecision("approved");
    setReviewNotes(item.review_notes || "");
    setReviewOpen(true);
  };

  const submitReview = async () => {
    if (reviewDecision === "rejected" && !reviewNotes.trim()) {
      toast({ title: "Notes required", description: "A rejection reason is required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const reviewerName = user?.full_name || user?.email || "Compliance Manager";
      await base44.entities.Evidence.update(reviewItem.id, {
        status: reviewDecision,
        reviewer_name: reviewerName,
        reviewed_at: today,
        review_notes: reviewNotes.trim(),
      });
      toast({ title: reviewDecision === "approved" ? "Evidence approved" : "Evidence rejected", description: "Review decision recorded." });
      setReviewOpen(false); setReviewItem(null); setReviewNotes(""); load();
    } catch (e) {
      toast({ title: "Review failed", description: e.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const filtered = items.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search && !e.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const pendingCount = items.filter((e) => e.status === "pending_review").length;
  const approvedCount = items.filter((e) => e.status === "approved").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Evidence" subtitle="Collect, review, and approve audit evidence" actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}><Layers className="w-4 h-4 mr-1" /> Bulk Upload</Button>
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Evidence</Button>
        </div>
      } />

      {/* Review queue summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><ClipboardCheck className="w-3.5 h-3.5" /> Pending review</div>
          <div className="text-2xl font-heading font-bold text-amber-600">{pendingCount}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</div>
          <div className="text-2xl font-heading font-bold text-emerald-600">{approvedCount}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Paperclip className="w-3.5 h-3.5" /> Total items</div>
          <div className="text-2xl font-heading font-bold text-foreground">{items.length}</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Clock className="w-3.5 h-3.5" /> Approval workflow</div>
          <div className="text-sm font-semibold text-foreground leading-tight mt-1">New uploads require manager sign-off</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search evidence..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {statusFilters.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Paperclip} title="No evidence collected" description="Upload evidence for your controls — it enters review automatically." actionLabel="Add Evidence" onAction={() => setOpen(true)} />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Control</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Reviewer</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">File</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {e.title}
                      {e.review_notes && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">“{e.review_notes}”</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{(e.type || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {e.control_title ? (
                        <span className="flex items-center gap-1"><Link2 className="w-3 h-3 text-primary" />{e.control_title}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {e.reviewer_name ? (
                        <div>
                          <div className="text-foreground/80">{e.reviewer_name}</div>
                          {e.reviewed_at && <div>{e.reviewed_at}</div>}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">{e.file_url ? <a href={e.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-xs"><ExternalLink className="w-3 h-3" />{e.file_name || "View"}</a> : <span className="text-muted-foreground text-xs">—</span>}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.status === "pending_review" && (
                          <button onClick={() => openReview(e)} title="Review" className="p-1.5 rounded hover:bg-muted text-primary"><CheckSquare className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => handleEdit(e)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Evidence" : "Add Evidence"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{evidenceTypes.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Related Control</Label>
              <Select value={form.control_id || "__none__"} onValueChange={(v) => {
                if (v === "__none__") { setForm({ ...form, control_id: "", control_title: "" }); return; }
                const ctl = controls.find(c => c.id === v);
                setForm({ ...form, control_id: v, control_title: ctl?.title || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Select control..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None —</SelectItem>
                  {controls.map(c => <SelectItem key={c.id} value={c.id}>{c.control_id ? `[${c.control_id}] ` : ""}{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Collected Date</Label><Input type="date" value={form.collected_date} onChange={(e) => setForm({ ...form, collected_date: e.target.value })} /></div>
              <div><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></div>
            </div>
            <div>
              <Label>File</Label>
              <div className="mt-1">
                {form.file_url ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{form.file_name || "Uploaded"}</span>
                    <button onClick={() => setForm({ ...form, file_url: "", file_name: "" })} className="text-xs text-destructive hover:underline">Remove</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Click to upload evidence file"}</span>
                    <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">New uploads default to <span className="font-medium">Pending Review</span> and require compliance manager approval before being finalized.</p>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review / approval dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-primary" /> Formal Evidence Review</DialogTitle></DialogHeader>
          {reviewItem && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/40 border border-border p-3">
                <div className="font-medium text-foreground text-sm">{reviewItem.title}</div>
                {reviewItem.control_title && <div className="text-xs text-muted-foreground mt-0.5">Control: {reviewItem.control_title}</div>}
                {reviewItem.file_url && (
                  <a href={reviewItem.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
                    <ExternalLink className="w-3 h-3" /> {reviewItem.file_name || "View file"}
                  </a>
                )}
              </div>
              <div>
                <Label>Decision</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => setReviewDecision("approved")}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${reviewDecision === "approved" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setReviewDecision("rejected")}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${reviewDecision === "rejected" ? "border-red-500 bg-red-500/10 text-red-600" : "border-border text-muted-foreground hover:bg-muted"}`}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
              <div>
                <Label>{reviewDecision === "rejected" ? "Rejection reason *" : "Review notes"}</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                  placeholder={reviewDecision === "rejected" ? "Explain why this evidence is rejected..." : "Optional notes for the submitter..."}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setReviewOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={submitReview} disabled={submitting} className={reviewDecision === "rejected" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}>
                  {submitting ? "Saving..." : reviewDecision === "approved" ? "Approve evidence" : "Reject evidence"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Bulk Upload Evidence</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Drag and drop multiple files, map each to a control, then upload all at once. All uploads enter pending review.</p>
          <BulkUploadPanel controls={controls} onComplete={load} />
        </DialogContent>
      </Dialog>
    </div>
  );
}