import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { IdCard, Plus, Search, Trash2, Pencil, CheckCircle2, XCircle, Clock, ShieldCheck, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const CHECK_TYPES = ["identity_verification", "criminal_record", "credit_check", "employment_verification", "education_verification", "reference_check", "drug_screen", "security_clearance", "right_to_work", "comprehensive"];
const CHECK_STATUSES = ["pending", "in_progress", "completed", "failed", "expired", "not_required"];
const RESULTS = ["pass", "fail", "conditional", "pending", "not_applicable"];
const EMPLOYMENT_TYPES = ["employee", "contractor", "vendor", "intern", "consultant"];
const CLEARANCE_LEVELS = ["none", "baseline", "confidential", "secret", "top_secret", "not_applicable"];

export default function BackgroundChecks() {
  const { toast } = useToast();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterResult, setFilterResult] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    base44.entities.BackgroundCheck.list("-updated_date", 500)
      .then((d) => setChecks(d || []))
      .catch(() => toast({ title: "Failed to load background checks", variant: "destructive" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = checks;
    if (filterStatus !== "all") list = list.filter((c) => c.check_status === filterStatus);
    if (filterResult !== "all") list = list.filter((c) => c.result === filterResult);
    const q = search.toLowerCase();
    if (q) list = list.filter((c) =>
      c.check_id?.toLowerCase().includes(q) ||
      c.employee_name?.toLowerCase().includes(q) ||
      c.employee_email?.toLowerCase().includes(q) ||
      c.department?.toLowerCase().includes(q) ||
      c.role_title?.toLowerCase().includes(q)
    );
    return list;
  }, [checks, search, filterStatus, filterResult]);

  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return {
      total: checks.length,
      completed: checks.filter((c) => c.check_status === "completed").length,
      pending: checks.filter((c) => c.check_status === "pending" || c.check_status === "in_progress").length,
      failed: checks.filter((c) => c.result === "fail" || c.check_status === "failed").length,
      expiringSoon: checks.filter((c) => c.re_verification_due_date && new Date(c.re_verification_due_date) <= in30Days).length,
    };
  }, [checks]);

  const openCreate = () => {
    setEditing(null);
    setForm({ check_id: `BG-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`, employee_name: "", employee_id: "", employee_email: "", department: "", role_title: "", employment_type: "employee", check_type: "comprehensive", check_status: "pending", check_provider: "", check_initiated_date: new Date().toISOString().slice(0, 10), completion_date: "", result: "pending", result_details: "", security_clearance_level: "none", clearance_expiry_date: "", clearance_granted_by: "", nda_signed: false, nda_signed_date: "", nda_document_url: "", right_to_work_verified: false, right_to_work_expiry: "", re_verification_due_date: "", re_verification_frequency_months: 36, document_url: "", notes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c) => { setEditing(c); setForm({ ...c }); setDialogOpen(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await base44.entities.BackgroundCheck.update(editing.id, form);
        toast({ title: "Background check updated" });
      } else {
        await base44.entities.BackgroundCheck.create(form);
        toast({ title: "Background check created" });
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (c) => {
    if (!confirm("Delete this background check record?")) return;
    try {
      await base44.entities.BackgroundCheck.delete(c.id);
      toast({ title: "Record deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="Background Checks & Employee Screening" subtitle="Pre-employment screening, NDAs, security clearances — SOC 2 CC1 and FSCA/SARB compliance"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4" /> Add Check</Button>} />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatBox label="Total Checks" value={stats.total} icon={IdCard} />
        <StatBox label="Completed" value={stats.completed} color="text-emerald-600" icon={CheckCircle2} />
        <StatBox label="Pending" value={stats.pending} color="text-amber-600" icon={Clock} />
        <StatBox label="Failed" value={stats.failed} color="text-rose-600" icon={XCircle} />
        <StatBox label="Expiring Soon" value={stats.expiringSoon} color="text-amber-600" icon={Clock} />
      </div>

      {stats.failed > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-700">{stats.failed} background check(s) have failed</p>
            <p className="text-xs text-rose-600">Failed checks may require HR action — review results and determine next steps.</p>
          </div>
        </div>
      )}

      {stats.expiringSoon > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-700">{stats.expiringSoon} background check(s) need re-verification within 30 days</p>
            <p className="text-xs text-amber-600">Schedule re-verification before expiry to maintain compliance.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search background checks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Statuses</option>
            {CHECK_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
          <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="text-xs bg-transparent border-0 outline-none px-2 py-1.5 rounded-md cursor-pointer">
            <option value="all">All Results</option>
            {RESULTS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Check Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Clearance</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">NDA</th>
                <th className="text-left px-4 py-3 hidden xl:table-cell">Re-Verify Due</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No background checks found.</td></tr>}
              {filtered.map((c) => {
                const expiringSoon = c.re_verification_due_date && new Date(c.re_verification_due_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{c.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{c.role_title} · {c.department}</p>
                      <p className="text-xs text-muted-foreground">{c.check_id}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary">{c.check_type?.replace(/_/g, " ")}</Badge></td>
                    <td className="px-4 py-3">
                      <Badge className={
                        c.check_status === "completed" ? "bg-emerald-100 text-emerald-700 border-0" :
                        c.check_status === "failed" || c.check_status === "expired" ? "bg-rose-100 text-rose-700 border-0" :
                        c.check_status === "in_progress" ? "bg-blue-100 text-blue-700 border-0" :
                        "bg-amber-100 text-amber-700 border-0"
                      }>{c.check_status?.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {c.result === "pass" ? <Badge className="bg-emerald-100 text-emerald-700 border-0"><CheckCircle2 className="w-3 h-3 mr-1" />Pass</Badge>
                        : c.result === "fail" ? <Badge className="bg-rose-100 text-rose-700 border-0"><XCircle className="w-3 h-3 mr-1" />Fail</Badge>
                        : c.result === "conditional" ? <Badge className="bg-amber-100 text-amber-700 border-0">Conditional</Badge>
                        : <span className="text-xs text-muted-foreground">{c.result}</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.security_clearance_level && c.security_clearance_level !== "none" && c.security_clearance_level !== "not_applicable" ?
                        <Badge className="bg-violet-100 text-violet-700 border-0"><ShieldCheck className="w-3 h-3 mr-1" />{c.security_clearance_level}</Badge>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {c.nda_signed ? <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Signed</Badge>
                        : <Badge className="bg-rose-100 text-rose-700 border-0 text-xs">Not Signed</Badge>}
                    </td>
                    <td className="px-4 py-3 text-xs hidden xl:table-cell">
                      <span className={expiringSoon ? "text-amber-600 font-medium" : "text-muted-foreground"}>{c.re_verification_due_date || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="w-3.5 h-3.5 text-rose-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Background Check" : "New Background Check"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check ID</Label><Input value={form.check_id || ""} onChange={(e) => setForm({ ...form, check_id: e.target.value })} /></div>
              <div>
                <Label>Employment Type</Label>
                <Select value={form.employment_type} onValueChange={(v) => setForm({ ...form, employment_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employee Name</Label><Input value={form.employee_name || ""} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} /></div>
              <div><Label>Employee Email</Label><Input type="email" value={form.employee_email || ""} onChange={(e) => setForm({ ...form, employee_email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Department</Label><Input value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div><Label>Role / Title</Label><Input value={form.role_title || ""} onChange={(e) => setForm({ ...form, role_title: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Check Type</Label>
                <Select value={form.check_type} onValueChange={(v) => setForm({ ...form, check_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHECK_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Check Status</Label>
                <Select value={form.check_status} onValueChange={(v) => setForm({ ...form, check_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CHECK_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Check Provider</Label><Input value={form.check_provider || ""} onChange={(e) => setForm({ ...form, check_provider: e.target.value })} placeholder="e.g. MIE, LexisNexis, HireRight, internal HR" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Initiated Date</Label><Input type="date" value={form.check_initiated_date || ""} onChange={(e) => setForm({ ...form, check_initiated_date: e.target.value })} /></div>
              <div><Label>Completion Date</Label><Input type="date" value={form.completion_date || ""} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} /></div>
              <div>
                <Label>Result</Label>
                <Select value={form.result} onValueChange={(v) => setForm({ ...form, result: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RESULTS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Result Details</Label><Textarea value={form.result_details || ""} onChange={(e) => setForm({ ...form, result_details: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Security Clearance Level</Label>
                <Select value={form.security_clearance_level} onValueChange={(v) => setForm({ ...form, security_clearance_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CLEARANCE_LEVELS.map((l) => <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Clearance Expiry</Label><Input type="date" value={form.clearance_expiry_date || ""} onChange={(e) => setForm({ ...form, clearance_expiry_date: e.target.value })} /></div>
            </div>
            <div><Label>Clearance Granted By</Label><Input value={form.clearance_granted_by || ""} onChange={(e) => setForm({ ...form, clearance_granted_by: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="nda_signed" checked={form.nda_signed} onChange={(e) => setForm({ ...form, nda_signed: e.target.checked })} className="rounded" />
                <Label htmlFor="nda_signed" className="text-sm cursor-pointer">NDA Signed</Label>
              </div>
              <div><Label>NDA Signed Date</Label><Input type="date" value={form.nda_signed_date || ""} onChange={(e) => setForm({ ...form, nda_signed_date: e.target.value })} /></div>
            </div>
            <div><Label>NDA Document URL</Label><Input value={form.nda_document_url || ""} onChange={(e) => setForm({ ...form, nda_document_url: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 pt-6">
                <input type="checkbox" id="rtw" checked={form.right_to_work_verified} onChange={(e) => setForm({ ...form, right_to_work_verified: e.target.checked })} className="rounded" />
                <Label htmlFor="rtw" className="text-sm cursor-pointer">Right to Work Verified</Label>
              </div>
              <div><Label>Right to Work Expiry</Label><Input type="date" value={form.right_to_work_expiry || ""} onChange={(e) => setForm({ ...form, right_to_work_expiry: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Re-Verification Due</Label><Input type="date" value={form.re_verification_due_date || ""} onChange={(e) => setForm({ ...form, re_verification_due_date: e.target.value })} /></div>
              <div><Label>Re-Verify Freq (months)</Label><Input type="number" value={form.re_verification_frequency_months || 36} onChange={(e) => setForm({ ...form, re_verification_frequency_months: +e.target.value })} /></div>
            </div>
            <div><Label>Document URL</Label><Input value={form.document_url || ""} onChange={(e) => setForm({ ...form, document_url: e.target.value })} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatBox({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}