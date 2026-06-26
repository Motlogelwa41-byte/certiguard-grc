import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileCheck, Plus, Pencil, Trash2, Search, Download, Upload } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import BulkImportModal from "@/components/shared/BulkImportModal";
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

const categories = ["access_control","data_protection","incident_response","change_management","risk_management","security_operations","business_continuity","network_security","physical_security","compliance","human_resources","asset_management"];
const defaultForm = { control_id: "", title: "", description: "", category: "access_control", status: "not_tested", severity: "medium", automation_status: "manual", owner_name: "", notes: "", framework_ids: [], framework_names: [] };

export default function Controls() {
  const [items, setItems] = useState([]);
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();

  const handleExport = () => exportToCsv(items, "controls", ["control_id", "title", "category", "status", "severity", "automation_status", "owner_name", "description"]);

  const importColumns = [
    { key: "control_id", label: "Control ID", required: true, example: "AC-001" },
    { key: "title", label: "Title", required: true, example: "Multi-Factor Authentication" },
    { key: "category", label: "Category", example: "access_control" },
    { key: "status", label: "Status", example: "not_tested" },
    { key: "severity", label: "Severity", example: "high" },
    { key: "owner_name", label: "Owner", example: "Jane Smith" },
    { key: "description", label: "Description", example: "Enforce MFA for all privileged users" },
  ];

  const importSampleRows = [
    { "Control ID": "AC-001", "Title": "Multi-Factor Authentication", "Category": "access_control", "Status": "passing", "Severity": "critical", "Owner": "Jane Smith", "Description": "Enforce MFA for all privileged users" },
    { "Control ID": "AC-002", "Title": "Password Complexity Policy", "Category": "access_control", "Status": "not_tested", "Severity": "high", "Owner": "IT Security", "Description": "Require strong passwords across all systems" },
    { "Control ID": "DP-001", "Title": "Data Encryption at Rest", "Category": "data_protection", "Status": "passing", "Severity": "critical", "Owner": "John Doe", "Description": "AES-256 encryption for all sensitive data" },
  ];

  const load = async () => {
    const [ctls, fws] = await Promise.all([base44.entities.Control.list(), base44.entities.Framework.list()]);
    setItems(ctls);
    setFrameworks(fws);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Control.update(editId, form);
      else await base44.entities.Control.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Control updated" : "Control created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ control_id: item.control_id || "", title: item.title || "", description: item.description || "", category: item.category || "access_control", status: item.status || "not_tested", severity: item.severity || "medium", automation_status: item.automation_status || "manual", owner_name: item.owner_name || "", notes: item.notes || "", framework_ids: item.framework_ids || [], framework_names: item.framework_names || [] });
    setEditId(item.id); setOpen(true);
  };

  const toggleFramework = (fw) => {
    const ids = form.framework_ids || [];
    const names = form.framework_names || [];
    if (ids.includes(fw.id)) {
      setForm({ ...form, framework_ids: ids.filter(id => id !== fw.id), framework_names: names.filter(n => n !== fw.name) });
    } else {
      setForm({ ...form, framework_ids: [...ids, fw.id], framework_names: [...names, fw.name] });
    }
  };

  const handleDelete = async (id) => { await base44.entities.Control.delete(id); load(); toast({ title: "Control deleted" }); };

  const filtered = items.filter((c) => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.control_id?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchCategory = filterCategory === "all" || c.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Controls" subtitle="Manage and monitor compliance controls" actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button>
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Control</Button>
        </div>
      } />
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search controls..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="passing">Passing</SelectItem>
            <SelectItem value="failing">Failing</SelectItem>
            <SelectItem value="not_tested">Not Tested</SelectItem>
            <SelectItem value="not_applicable">N/A</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={FileCheck} title="No controls yet" description="Add controls to track your compliance posture." actionLabel="Add Control" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No controls match your filters.</p>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ID</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Automation</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Owner</th>
                  <th className="text-right px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.control_id}</td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{(c.category || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.severity} /></td>
                    <td className="px-4 py-3"><StatusBadge status={c.automation_status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.owner_name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(c)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} entityName="Control" columns={importColumns} sampleRows={importSampleRows} onSuccess={load} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Control" : "Add Control"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Control ID</Label><Input value={form.control_id} onChange={(e) => setForm({ ...form, control_id: e.target.value })} placeholder="e.g. AC-001" /></div>
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} placeholder="Owner name" /></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Control title" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passing">Passing</SelectItem>
                    <SelectItem value="failing">Failing</SelectItem>
                    <SelectItem value="not_tested">Not Tested</SelectItem>
                    <SelectItem value="not_applicable">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Automation</Label>
              <Select value={form.automation_status} onValueChange={(v) => setForm({ ...form, automation_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automated">Automated</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="partially_automated">Partially Automated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            {frameworks.length > 0 && (
              <div>
                <Label>Frameworks</Label>
                <div className="mt-1.5 border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {frameworks.map(fw => {
                    const checked = (form.framework_ids || []).includes(fw.id);
                    return (
                      <label key={fw.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={checked} onChange={() => toggleFramework(fw)} className="rounded" />
                        <span className="text-sm">{fw.name}</span>
                        {fw.version && <span className="text-xs text-muted-foreground">v{fw.version}</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleSave} disabled={!form.title || !form.control_id}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}