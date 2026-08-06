import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, ShieldX, Check, X, Clock, AlertCircle, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const EXCEPTION_TYPES = ["temporary_waiver", "permanent_exception", "compensating_control", "risk_acceptance", "deviation"];
const APPROVER_ROLES = ["chief_risk_officer", "managing_director", "ciso", "compliance_officer", "board_risk_committee"];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  under_review: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-slate-200 text-slate-600",
  revoked: "bg-red-100 text-red-700",
};

export default function PolicyExceptions() {
  const [items, setItems] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({});
  const [approveData, setApproveData] = useState({ approval_comments: "", approval_signature: "" });
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.PolicyException.list("-created_date", 500),
      base44.entities.Policy.list("-created_date", 200),
      base44.entities.Control.list("-created_date", 200),
    ]).then(([ex, p, c]) => {
      setItems(ex || []);
      setPolicies(p || []);
      setControls(c || []);
    }).catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const blankForm = () => ({
    title: "", description: "", justification: "", exception_type: "temporary_waiver",
    linked_policy_id: "", linked_control_id: "", compensating_controls: "",
    residual_risk_assessment: "", effective_date: "", expiration_date: "",
    approver_role: "chief_risk_officer", notes: "",
  });

  const openCreate = () => { setEditing(null); setFormData(blankForm()); setFormOpen(true); };
  const openEdit = (item) => { setEditing(item); setFormData({ ...blankForm(), ...item }); setFormOpen(true); };

  const handleSave = async () => {
    if (!formData.title || !formData.justification || !formData.expiration_date) {
      toast({ title: "Title, justification, and expiration date are required", variant: "destructive" });
      return;
    }
    try {
      const user = await base44.auth.me();
      const policyName = policies.find((p) => p.id === formData.linked_policy_id)?.title || "";
      const controlName = controls.find((c) => c.id === formData.linked_control_id)?.title || "";
      const payload = {
        ...formData,
        linked_policy_title: policyName,
        linked_control_title: controlName,
        exception_id: editing?.exception_id || `EX-${new Date().getFullYear()}-${String(items.length + 1).padStart(3, "0")}`,
        requested_by_name: editing?.requested_by_name || user?.full_name || user?.email || "Unknown",
        requested_by_id: editing?.requested_by_id || user?.id,
        requested_at: editing?.requested_at || new Date().toISOString(),
        status: editing?.status || "pending",
      };
      if (editing?.id) {
        await base44.entities.PolicyException.update(editing.id, payload);
      } else {
        await base44.entities.PolicyException.create(payload);
      }
      setFormOpen(false);
      load();
      toast({ title: "Exception request saved" });
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleApprove = async (item, approved) => {
    if (approved && !approveData.approval_signature) {
      toast({ title: "Typed signature required for approval", variant: "destructive" });
      return;
    }
    try {
      const user = await base44.auth.me();
      await base44.entities.PolicyException.update(item.id, {
        status: approved ? "approved" : "rejected",
        approver_name: user?.full_name || user?.email || "Unknown",
        approver_id: user?.id,
        approved_at: new Date().toISOString(),
        approval_signature: approved ? approveData.approval_signature : "",
        approval_comments: approveData.approval_comments,
        rejection_reason: approved ? "" : approveData.approval_comments,
      });
      setApproveOpen(null);
      setApproveData({ approval_comments: "", approval_signature: "" });
      load();
      toast({ title: `Exception ${approved ? "approved" : "rejected"}` });
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete exception "${item.title}"?`)) return;
    await base44.entities.PolicyException.delete(item.id);
    load();
    toast({ title: "Exception deleted" });
  };

  const filtered = items.filter((i) => !search || `${i.title} ${i.description} ${i.exception_id}`.toLowerCase().includes(search.toLowerCase()));
  const pending = items.filter((i) => i.status === "pending").length;
  const approved = items.filter((i) => i.status === "approved").length;
  const expired = items.filter((i) => i.status === "expired" || (i.expiration_date && new Date(i.expiration_date) < new Date())).length;

  return (
    <div>
      <PageHeader title="Policy Exceptions & Waivers" subtitle="Formal governance mechanism for temporary departures from security or compliance baselines"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4" /> New Exception</Button>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Exceptions" value={items.length} icon={ShieldX} color="blue" />
        <StatCard label="Pending Review" value={pending} icon={Clock} color={pending ? "amber" : "slate"} />
        <StatCard label="Approved" value={approved} icon={Check} color={approved ? "green" : "slate"} />
        <StatCard label="Expired" value={expired} icon={AlertCircle} color={expired ? "red" : "slate"} />
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search exceptions…" className="pl-9 max-w-md" />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <ShieldX className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No policy exceptions recorded. Create a formal exception request for review.</p>
          <Button onClick={openCreate}><Plus className="w-4 h-4" /> New Exception</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isExpired = item.expiration_date && new Date(item.expiration_date) < new Date();
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{item.exception_id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLES[item.status] || "bg-slate-100"}`}>{(item.status || "").replace(/_/g, " ")}</span>
                        {isExpired && item.status === "approved" && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">expired</span>}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{item.justification}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {item.linked_policy_title && <span>📋 {item.linked_policy_title}</span>}
                        {item.linked_control_title && <span>✓ {item.linked_control_title}</span>}
                        <span>👤 {item.requested_by_name || "Unknown"}</span>
                        <span>📅 Expires: {item.expiration_date || "—"}</span>
                        <span>🔑 Approver: {(item.approver_role || "").replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => { setApproveOpen(item); setApproveData({ approval_comments: "", approval_signature: "" }); }}>
                          <Check className="w-3.5 h-3.5" /> Review & Approve
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(item)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Exception" : "Request Policy Exception"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Title *</Label><Input value={formData.title || ""} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Temporary MFA waiver for legacy ERP" /></div>
            <div><Label>Justification *</Label><Textarea value={formData.justification || ""} onChange={(e) => setFormData({ ...formData, justification: e.target.value })} rows={3} placeholder="Business justification for the departure" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Exception Type</Label>
                <Select value={formData.exception_type} onValueChange={(v) => setFormData({ ...formData, exception_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EXCEPTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Required Approver Role</Label>
                <Select value={formData.approver_role} onValueChange={(v) => setFormData({ ...formData, approver_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{APPROVER_ROLES.map((r) => <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Linked Policy</Label>
                <Select value={formData.linked_policy_id || "none"} onValueChange={(v) => setFormData({ ...formData, linked_policy_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select policy…" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Linked Control</Label>
                <Select value={formData.linked_control_id || "none"} onValueChange={(v) => setFormData({ ...formData, linked_control_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="Select control…" /></SelectTrigger><SelectContent><SelectItem value="none">— None —</SelectItem>{controls.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Effective Date</Label><Input type="date" value={formData.effective_date || ""} onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })} /></div>
              <div><Label>Expiration Date *</Label><Input type="date" value={formData.expiration_date || ""} onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })} /></div>
            </div>
            <div><Label>Compensating Controls</Label><Textarea value={formData.compensating_controls || ""} onChange={(e) => setFormData({ ...formData, compensating_controls: e.target.value })} rows={2} placeholder="Mitigating controls in place" /></div>
            <div><Label>Residual Risk Assessment</Label><Textarea value={formData.residual_risk_assessment || ""} onChange={(e) => setFormData({ ...formData, residual_risk_assessment: e.target.value })} rows={2} placeholder="Assessment of risk introduced" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Submit"} Exception</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Exception — {approveOpen?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Justification</p>
              <p>{approveOpen?.justification}</p>
            </div>
            <div><Label>Review Comments</Label><Textarea value={approveData.approval_comments} onChange={(e) => setApproveData({ ...approveData, approval_comments: e.target.value })} rows={2} /></div>
            <div><Label>Typed Signature (for approval) *</Label><Input value={approveData.approval_signature} onChange={(e) => setApproveData({ ...approveData, approval_signature: e.target.value })} placeholder="Type your full name to sign off" /></div>
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleApprove(approveOpen, false)}><X className="w-4 h-4" /> Reject</Button>
            <Button onClick={() => handleApprove(approveOpen, true)}><Check className="w-4 h-4" /> Approve & Sign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}