import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Pencil, Trash2, Search, Eye, CheckSquare, Download, Upload, PenLine, History, Send, AlertCircle, CheckCircle2, Globe } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import BulkImportModal from "@/components/shared/BulkImportModal";
import BulkActionBar from "@/components/shared/BulkActionBar";
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
import PolicyApprovalDialog from "@/components/policies/PolicyApprovalDialog";
import PolicyVersionHistory from "@/components/policies/PolicyVersionHistory";
import Can from "@/components/shared/Can";

const policyCategories = ["information_security","data_privacy","acceptable_use","access_control","incident_response","business_continuity","change_management","vendor_management","human_resources","physical_security"];
const defaultForm = { title: "", description: "", content: "", category: "information_security", status: "draft", version: "1.0", owner_name: "", acknowledgment_required: true, next_review_date: "" };

const APPROVAL_STATUS_COLORS = {
  draft: "text-slate-500",
  in_review: "text-amber-600",
  pending_approval: "text-blue-600",
  approved: "text-emerald-600",
  rejected: "text-red-600",
  archived: "text-slate-400",
};

export default function Policies() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPolicy, setViewPolicy] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [approvalPolicy, setApprovalPolicy] = useState(null);
  const [historyPolicy, setHistoryPolicy] = useState(null);
  const { toast } = useToast();

  const handleExport = () => exportToCsv(items, "policies", ["title", "category", "status", "version", "owner_name", "next_review_date"]);

  const importColumns = [
    { key: "title", label: "Title", required: true, example: "Information Security Policy" },
    { key: "category", label: "Category", example: "information_security" },
    { key: "status", label: "Status", example: "draft" },
    { key: "version", label: "Version", example: "1.0" },
    { key: "owner_name", label: "Owner", example: "CISO" },
    { key: "description", label: "Description", example: "Defines security controls and responsibilities" },
  ];

  const importSampleRows = [
    { "Title": "Information Security Policy", "Category": "information_security", "Status": "approved", "Version": "2.1", "Owner": "CISO", "Description": "Defines security controls and responsibilities" },
    { "Title": "Data Privacy Policy", "Category": "data_privacy", "Status": "draft", "Version": "1.0", "Owner": "DPO", "Description": "POPIA and GDPR compliance requirements" },
    { "Title": "Acceptable Use Policy", "Category": "acceptable_use", "Status": "approved", "Version": "1.3", "Owner": "HR Manager", "Description": "Rules for use of company IT resources" },
  ];

  const load = () => base44.entities.Policy.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, status: bulkStatus }));
    await base44.entities.Policy.bulkUpdate(updates);
    setSelected(new Set()); setBulkStatus(""); load();
    toast({ title: `${updates.length} policies updated` });
  };
  const applyBulkOwner = async () => {
    if (!bulkOwner.trim() || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, owner_name: bulkOwner.trim() }));
    await base44.entities.Policy.bulkUpdate(updates);
    setSelected(new Set()); setBulkOwner(""); load();
    toast({ title: `${updates.length} policies reassigned` });
  };
  const applyBulkCategory = async () => {
    if (!bulkCategory || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, category: bulkCategory }));
    await base44.entities.Policy.bulkUpdate(updates);
    setSelected(new Set()); setBulkCategory(""); load();
    toast({ title: `${updates.length} policies updated` });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected policies? This cannot be undone.`)) return;
    const count = selected.size;
    await base44.entities.Policy.deleteMany({ id: { $in: [...selected] } });
    setSelected(new Set()); load();
    toast({ title: `${count} policies deleted` });
  };

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

  const handlePublish = async (policy) => {
    try {
      await base44.entities.Policy.update(policy.id, { status: "published", published_at: new Date().toISOString() });
      load();
      toast({ title: "Policy published", description: `"${policy.title}" is now live for acknowledgment.` });
    } catch (e) { toast({ title: "Failed to publish", description: e.message, variant: "destructive" }); }
  };

  const handleSendAckRequests = async (policy) => {
    if (!window.confirm(`Send acknowledgment requests to all users for "${policy.title}" (v${policy.version})?`)) return;
    try {
      const users = await base44.entities.User.list();
      let sent = 0;
      for (const u of users) {
        try {
          await base44.integrations.Core.SendEmail({
            to: u.email,
            subject: `Policy Acknowledgment Required: ${policy.title} (v${policy.version})`,
            body: `Hello ${u.full_name || u.email},\n\nAn updated policy requires your acknowledgment:\n\nTitle: ${policy.title}\nVersion: v${policy.version}\nCategory: ${(policy.category || "").replace(/_/g, " ")}\n\nPlease log in to CertiGuard and acknowledge this policy by visiting the Policy Acknowledgments page.\n\nThank you,\nCertiGuard GRC Platform`,
          });
          sent++;
        } catch (e) { console.error(`Failed to send to ${u.email}:`, e); }
      }
      await base44.entities.Policy.update(policy.id, { ack_requests_sent_at: new Date().toISOString() });
      toast({ title: "Acknowledgment requests sent", description: `${sent} of ${users.length} users notified.` });
    } catch (e) { toast({ title: "Failed to send requests", description: e.message, variant: "destructive" }); }
  };

  const getApprovalProgress = (policy) => {
    try {
      const steps = JSON.parse(policy.approval_workflow || "[]");
      if (steps.length === 0) return null;
      const approved = steps.filter(s => s.status === "approved").length;
      return { approved, total: steps.length };
    } catch { return null; }
  };

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
            <Can permission="reports:export"><Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button></Can>
            <Can permission="policies:write"><Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button></Can>
            <Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Policy</Button></Can>
          </div>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      <BulkActionBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="pending_approval">Pending Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkStatus} disabled={!bulkStatus}>Apply Status</Button>
        <Select value={bulkCategory} onValueChange={setBulkCategory}>
          <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Set category" /></SelectTrigger>
          <SelectContent>{policyCategories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkCategory} disabled={!bulkCategory}>Apply Category</Button>
        <Input value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} placeholder="Assign owner" className="w-[160px] h-8" />
        <Button size="sm" variant="secondary" onClick={applyBulkOwner} disabled={!bulkOwner.trim()}>Assign Owner</Button>
        <Can permission="policies:delete"><Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Delete</Button></Can>
      </BulkActionBar>

      {items.length === 0 ? (
        <EmptyState icon={FileText} title="No policies yet" description="Create policies to define your organization's compliance posture." actionLabel="Add Policy" onAction={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const progress = getApprovalProgress(p);
            const isRejected = p.status === "rejected";
            return (
              <div key={p.id} className={`bg-card rounded-xl border p-5 flex flex-col gap-3 ${selected.has(p.id) ? "ring-2 ring-primary " : ""}${isRejected ? "border-red-300 dark:border-red-800" : "border-border"}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} className="w-4 h-4 mt-0.5 rounded shrink-0" aria-label={`Select ${p.title}`} />
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">{p.title}</h3>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{(p.category || "").replace(/_/g, " ")}</p>
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {isRejected && p.rejection_reason && (
                  <div className="flex items-start gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {p.rejection_reason}
                  </div>
                )}

                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Version: </span><span className="font-semibold">v{p.version || "1.0"}</span></div>
                  <div><span className="text-muted-foreground">Owner: </span><span className="font-semibold">{p.owner_name || "—"}</span></div>
                </div>

                {/* Approval progress */}
                {progress && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Approval progress</span>
                      <span className={`font-semibold ${APPROVAL_STATUS_COLORS[p.status] || ""}`}>{progress.approved}/{progress.total} signed</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${p.status === "rejected" ? "bg-red-500" : p.status === "approved" ? "bg-emerald-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.round((progress.approved / progress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                  <span className="text-muted-foreground">{p.acknowledgment_required ? "Ack required" : "No ack needed"}</span>
                  <div className="flex items-center gap-1">
                    {p.status === "approved" && (
                      <Can permission="policies:approve"><button onClick={() => handlePublish(p)} className="p-1 rounded hover:bg-muted" title="Publish for acknowledgment"><Globe className="w-3.5 h-3.5 text-teal-600" /></button></Can>
                    )}
                    {p.status === "published" && p.acknowledgment_required && (
                      <Can permission="notifications:send"><button onClick={() => handleSendAckRequests(p)} className="p-1 rounded hover:bg-muted" title="Send Acknowledgment Requests"><Send className="w-3.5 h-3.5 text-blue-500" /></button></Can>
                    )}
                    <button onClick={() => { setViewPolicy(p); setViewOpen(true); }} className="p-1 rounded hover:bg-muted" title="View"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => { setHistoryPolicy(p); }} className="p-1 rounded hover:bg-muted" title="Version History"><History className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <Can permission="policies:approve"><button onClick={() => { setApprovalPolicy(p); }} className="p-1 rounded hover:bg-muted" title="Approval Workflow"><PenLine className="w-3.5 h-3.5 text-blue-500" /></button></Can>
                    <Can permission="policies:write"><button onClick={() => handleEdit(p)} className="p-1 rounded hover:bg-muted" title="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
                    <Can permission="policies:delete"><button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></Can>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} entityName="Policy" columns={importColumns} sampleRows={importSampleRows} onSuccess={load} />

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
                {viewPolicy.approved_by && <span className="text-xs text-emerald-600">✓ Approved by {viewPolicy.approved_by}</span>}
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
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
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

      {/* Approval Workflow Dialog */}
      {approvalPolicy && (
        <PolicyApprovalDialog
          policy={approvalPolicy}
          open={!!approvalPolicy}
          onOpenChange={(v) => { if (!v) setApprovalPolicy(null); }}
          onUpdated={() => { load(); setApprovalPolicy(null); }}
        />
      )}

      {/* Version History Dialog */}
      {historyPolicy && (
        <PolicyVersionHistory
          policy={historyPolicy}
          open={!!historyPolicy}
          onOpenChange={(v) => { if (!v) setHistoryPolicy(null); }}
          onUpdated={() => { load(); setHistoryPolicy(null); }}
        />
      )}
    </div>
  );
}