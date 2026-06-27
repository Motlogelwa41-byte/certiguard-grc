import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Users, GraduationCap, CheckCircle, AlertTriangle, Clock,
  Shield, TrendingUp, Award, Search, Plus, Mail, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { base44 as b44 } from "@/api/base44Client";

// ─── Static employee compliance records (entity: Training is source of truth) ──

const SOC2_CONTROLS = [
  "Background checks completed",
  "Security awareness training",
  "Acceptable use policy signed",
  "Code of conduct acknowledged",
  "NDA / confidentiality agreement",
  "Access provisioning reviewed",
  "Annual security training renewal",
  "Offboarding checklist completed",
];

const defaultEmployee = {
  name: "", email: "", role: "", department: "",
  background_check: false, security_training: false,
  policy_acknowledged: false, nda_signed: false,
  access_reviewed: false, start_date: "",
  training_due_date: "", notes: "",
};

// We store employees as Training records with category="role_based" and a special tag
// Actually we use a separate entity — let's use ComplianceTask as a lightweight store
// Better: we use a real entity. We'll use Training with category=role_based to track per-person.
// Most compliant approach: dedicated Employee entity. Since we can't add one mid-flight,
// we'll use base44.entities.User (read-only) plus Training records per person.

// For simplicity and immediate value, we store employee compliance in Training records
// where title = employee name, type = "document" (used as employee marker), 
// category = "role_based", and use description as JSON blob for compliance fields.

function parseEmployee(t) {
  let extra = {};
  try { extra = JSON.parse(t.description || "{}"); } catch {}
  return {
    id: t.id,
    name: t.title || "",
    email: extra.email || "",
    role: extra.role || "",
    department: extra.department || "",
    background_check: !!extra.background_check,
    security_training: !!t.completed_count,
    policy_acknowledged: !!extra.policy_acknowledged,
    nda_signed: !!extra.nda_signed,
    access_reviewed: !!extra.access_reviewed,
    start_date: extra.start_date || "",
    training_due_date: t.due_date || "",
    notes: extra.notes || "",
    assignee_count: t.assignee_count || 1,
    completed_count: t.completed_count || 0,
  };
}

function toTrainingRecord(emp) {
  const extra = {
    email: emp.email, role: emp.role, department: emp.department,
    background_check: emp.background_check, policy_acknowledged: emp.policy_acknowledged,
    nda_signed: emp.nda_signed, access_reviewed: emp.access_reviewed,
    start_date: emp.start_date, notes: emp.notes,
  };
  const checks = [emp.background_check, emp.security_training, emp.policy_acknowledged, emp.nda_signed, emp.access_reviewed];
  const completed = checks.filter(Boolean).length;
  return {
    title: emp.name,
    description: JSON.stringify(extra),
    category: "role_based",
    type: "document",
    status: "active",
    mandatory: true,
    assignee_count: 1,
    completed_count: emp.security_training ? 1 : 0,
    due_date: emp.training_due_date,
    duration_minutes: 0,
    renewal_period_months: 12,
  };
}

const DEPARTMENTS = ["Engineering", "Finance", "HR", "Legal", "Operations", "Sales", "IT", "Marketing", "Executive", "Other"];

export default function PeopleDashboard() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultEmployee);
  const [editId, setEditId] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    const records = await base44.entities.Training.filter({ category: "role_based", type: "document" });
    setEmployees((records || []).map(parseEmployee));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const record = toTrainingRecord(form);
    try {
      if (editId) {
        await base44.entities.Training.update(editId, record);
        toast({ title: "Employee record updated" });
      } else {
        await base44.entities.Training.create(record);
        toast({ title: "Employee added", description: `${form.name} added to compliance tracking.` });
      }
      setOpen(false); setForm(defaultEmployee); setEditId(null);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleEdit = (emp) => {
    setForm({ ...defaultEmployee, ...emp });
    setEditId(emp.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Training.delete(id);
    load();
    toast({ title: "Employee removed from tracking" });
  };

  const toggleCheck = async (emp, field) => {
    const updated = { ...emp, [field]: !emp[field] };
    const record = toTrainingRecord(updated);
    await base44.entities.Training.update(emp.id, record);
    load();
  };

  const sendReminder = async (emp) => {
    try {
      await base44.integrations.Core.SendEmail({
        to: emp.email,
        subject: "Action Required: Compliance Training Overdue",
        body: `Hi ${emp.name},\n\nThis is a reminder that you have outstanding compliance requirements.\n\nPlease complete the following as soon as possible:\n${
          [
            !emp.background_check && "• Background check",
            !emp.security_training && "• Security awareness training",
            !emp.policy_acknowledged && "• Policy acknowledgment",
            !emp.nda_signed && "• NDA / confidentiality agreement",
            !emp.access_reviewed && "• Access review",
          ].filter(Boolean).join("\n")
        }\n\nThank you,\nCompliance Team`,
      });
      toast({ title: "Reminder sent", description: `Email sent to ${emp.email}` });
    } catch (e) {
      toast({ title: "Failed to send reminder", description: e.message, variant: "destructive" });
    }
  };

  const score = (emp) => {
    const checks = [emp.background_check, emp.security_training, emp.policy_acknowledged, emp.nda_signed, emp.access_reviewed];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  const filtered = employees.filter(emp => {
    const matchSearch = !search || emp.name.toLowerCase().includes(search.toLowerCase()) || emp.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "all" || emp.department === deptFilter;
    return matchSearch && matchDept;
  });

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const fullyCompliant = employees.filter(e => score(e) === 100).length;
  const overdue = employees.filter(e => e.training_due_date && new Date(e.training_due_date) < new Date() && score(e) < 100).length;
  const avgScore = employees.length ? Math.round(employees.reduce((s, e) => s + score(e), 0) / employees.length) : 0;

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="People & Employee Compliance"
        subtitle="Track employee compliance status for SOC 2, ISO 27001 and SADC regulations"
        actions={
          <Button size="sm" onClick={() => { setForm(defaultEmployee); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Employee
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Employees", value: employees.length, icon: Users, color: "text-primary" },
          { label: "Fully Compliant", value: fullyCompliant, icon: CheckCircle, color: "text-emerald-500" },
          { label: "Overdue", value: overdue, icon: AlertTriangle, color: "text-red-500" },
          { label: "Avg Compliance", value: `${avgScore}%`, icon: TrendingUp, color: "text-blue-500" },
        ].map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* SOC 2 CC control banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">SOC 2 CC1.1 / CC6.2 — People Controls Coverage</p>
            <p className="text-xs text-blue-700 mt-0.5">This dashboard tracks the employee-level controls required by SOC 2 Trust Service Criteria: background checks, security training, policy acknowledgments, NDA, and access reviews.</p>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <p className="text-2xl font-bold text-blue-800">{avgScore}%</p>
            <p className="text-xs text-blue-600">overall score</p>
          </div>
        </div>
        <div className="mt-3 h-2 bg-blue-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all bg-blue-500" style={{ width: `${avgScore}%` }} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
          <option value="all">All Departments</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-xl">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No employees tracked yet.</p>
          <p className="text-sm mt-1">Add employees to start tracking their compliance status.</p>
          <Button size="sm" className="mt-4" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Employee</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bg Check</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Training</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Policy</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">NDA</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Access</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(emp => {
                  const sc = score(emp);
                  const isOverdue = emp.training_due_date && new Date(emp.training_due_date) < new Date() && sc < 100;
                  return (
                    <tr key={emp.id} className={`hover:bg-muted/30 transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {emp.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.department ? `${emp.department} · ` : ""}{emp.role || "No role"}</p>
                          </div>
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        </div>
                      </td>
                      {[
                        { field: "background_check", val: emp.background_check },
                        { field: "security_training", val: emp.security_training },
                        { field: "policy_acknowledged", val: emp.policy_acknowledged },
                        { field: "nda_signed", val: emp.nda_signed },
                        { field: "access_reviewed", val: emp.access_reviewed },
                      ].map(({ field, val }) => (
                        <td key={field} className="px-3 py-3 text-center">
                          <button onClick={() => toggleCheck(emp, field)} className="mx-auto block">
                            {val
                              ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                              : <XCircle className="w-5 h-5 text-muted-foreground/40" />
                            }
                          </button>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-sm font-bold ${sc === 100 ? "text-emerald-600" : sc >= 60 ? "text-amber-600" : "text-red-600"}`}>{sc}%</span>
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${sc}%`, backgroundColor: sc === 100 ? "#10b981" : sc >= 60 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {emp.email && sc < 100 && (
                            <button onClick={() => sendReminder(emp)} className="p-1.5 rounded hover:bg-muted" title="Send reminder">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                          )}
                          <button onClick={() => handleEdit(emp)} className="p-1.5 rounded hover:bg-muted" title="Edit">
                            <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(emp.id)} className="p-1.5 rounded hover:bg-muted text-destructive" title="Remove">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-department summary */}
      {departments.length > 1 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {departments.map(dept => {
            const deptEmps = employees.filter(e => e.department === dept);
            const deptAvg = deptEmps.length ? Math.round(deptEmps.reduce((s, e) => s + score(e), 0) / deptEmps.length) : 0;
            return (
              <div key={dept} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-foreground">{dept}</p>
                  <span className={`text-xs font-bold ${deptAvg === 100 ? "text-emerald-600" : deptAvg >= 60 ? "text-amber-600" : "text-red-600"}`}>{deptAvg}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-1">
                  <div className="h-full rounded-full" style={{ width: `${deptAvg}%`, backgroundColor: deptAvg === 100 ? "#10b981" : deptAvg >= 60 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <p className="text-xs text-muted-foreground">{deptEmps.length} employee{deptEmps.length !== 1 ? "s" : ""}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Employee Record" : "Add Employee"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="Jane Dube" /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="jane@company.com" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Role / Title</Label><Input value={form.role} onChange={e => setField("role", e.target.value)} placeholder="Software Engineer" /></div>
              <div><Label>Department</Label>
                <Select value={form.department} onValueChange={v => setField("department", v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setField("start_date", e.target.value)} /></div>
              <div><Label>Training Due Date</Label><Input type="date" value={form.training_due_date} onChange={e => setField("training_due_date", e.target.value)} /></div>
            </div>

            <div className="border border-border rounded-lg p-3 space-y-3">
              <p className="text-sm font-semibold text-foreground">Compliance Checklist</p>
              {[
                { key: "background_check", label: "Background check completed" },
                { key: "security_training", label: "Security awareness training completed" },
                { key: "policy_acknowledged", label: "Acceptable use / security policy signed" },
                { key: "nda_signed", label: "NDA / confidentiality agreement signed" },
                { key: "access_reviewed", label: "Access provisioning reviewed" },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!!form[item.key]} onChange={e => setField(item.key, e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-foreground">{item.label}</span>
                </label>
              ))}
            </div>

            <div><Label>Notes</Label><Input value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="Any additional compliance notes…" /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Update Record" : "Add Employee"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}