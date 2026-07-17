import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Pencil, Trash2, Search, ExternalLink, ShieldCheck, Link2, X, ChevronDown, ChevronUp } from "lucide-react";
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
import BulkActionBar from "@/components/shared/BulkActionBar";
import { useToast } from "@/components/ui/use-toast";

const vendorCategories = ["cloud_infrastructure","saas","data_processor","consulting","managed_services","hardware","other"];
const defaultForm = {
  name: "", description: "", category: "saas", risk_level: "medium", status: "pending_review",
  contact_name: "", contact_email: "", website: "", contract_start: "", contract_end: "",
  data_access: "none", soc2_compliant: false, iso27001_compliant: false, gdpr_compliant: false,
  linked_control_ids: [], linked_control_names: [], compliance_notes: "", notes: ""
};

const riskColors = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-400",
  low: "border-l-emerald-500",
};

export default function Vendors() {
  const [items, setItems] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkRisk, setBulkRisk] = useState("");
  const { toast } = useToast();

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, status: bulkStatus }));
    await base44.entities.Vendor.bulkUpdate(updates);
    setSelected(new Set()); setBulkStatus(""); load();
    toast({ title: `${updates.length} vendors updated` });
  };
  const applyBulkRisk = async () => {
    if (!bulkRisk || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, risk_level: bulkRisk }));
    await base44.entities.Vendor.bulkUpdate(updates);
    setSelected(new Set()); setBulkRisk(""); load();
    toast({ title: `${updates.length} vendors updated` });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected vendors? This cannot be undone.`)) return;
    const count = selected.size;
    await base44.entities.Vendor.deleteMany({ id: { $in: [...selected] } });
    setSelected(new Set()); load();
    toast({ title: `${count} vendors deleted` });
  };

  const load = () =>
    Promise.all([base44.entities.Vendor.list(), base44.entities.Control.list()])
      .then(([v, c]) => { setItems(v); setControls(c); setLoading(false); });

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      if (editId) await base44.entities.Vendor.update(editId, form);
      else await base44.entities.Vendor.create(form);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Vendor updated" : "Vendor added" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || "", description: item.description || "", category: item.category || "saas",
      risk_level: item.risk_level || "medium", status: item.status || "pending_review",
      contact_name: item.contact_name || "", contact_email: item.contact_email || "",
      website: item.website || "", contract_start: item.contract_start || "",
      contract_end: item.contract_end || "", data_access: item.data_access || "none",
      soc2_compliant: !!item.soc2_compliant, iso27001_compliant: !!item.iso27001_compliant,
      gdpr_compliant: !!item.gdpr_compliant,
      linked_control_ids: item.linked_control_ids || [],
      linked_control_names: item.linked_control_names || [],
      compliance_notes: item.compliance_notes || "",
      notes: item.notes || ""
    });
    setEditId(item.id); setOpen(true);
  };

  const toggleControl = (ctl) => {
    const ids = form.linked_control_ids || [];
    const names = form.linked_control_names || [];
    if (ids.includes(ctl.id)) {
      setForm({ ...form, linked_control_ids: ids.filter(id => id !== ctl.id), linked_control_names: names.filter(n => n !== ctl.title) });
    } else {
      setForm({ ...form, linked_control_ids: [...ids, ctl.id], linked_control_names: [...names, ctl.title] });
    }
  };

  const handleDelete = async (id) => { await base44.entities.Vendor.delete(id); load(); toast({ title: "Vendor deleted" }); };

  const filtered = items.filter((v) => {
    const matchSearch = !search || v.name?.toLowerCase().includes(search.toLowerCase());
    const matchRisk = filterRisk === "all" || v.risk_level === filterRisk;
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchRisk && matchStatus;
  });

  // Summary stats
  const criticalCount = items.filter(v => v.risk_level === "critical").length;
  const highCount = items.filter(v => v.risk_level === "high").length;
  const pendingCount = items.filter(v => v.status === "pending_review" || v.status === "under_review").length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Vendor Risk Management"
        subtitle="Track third-party compliance status and link vendors to specific controls"
        actions={
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Add Vendor
          </Button>
        }
      />

      {/* Summary bar */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Vendors", value: items.length, color: "text-foreground" },
            { label: "Critical Risk", value: criticalCount, color: "text-red-600" },
            { label: "High Risk", value: highCount, color: "text-orange-500" },
            { label: "Pending Review", value: pendingCount, color: "text-amber-500" },
          ].map((s) => (
            <div key={s.label} className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Risk Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risk Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[150px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkStatus} disabled={!bulkStatus}>Apply Status</Button>
        <Select value={bulkRisk} onValueChange={setBulkRisk}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Set risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkRisk} disabled={!bulkRisk}>Apply Risk</Button>
        <Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
      </BulkActionBar>

      {items.length === 0 ? (
        <EmptyState icon={Building2} title="No vendors yet" description="Add vendors to start managing third-party risk." actionLabel="Add Vendor" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No vendors match your filters.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((v) => {
            const isExpanded = expandedId === v.id;
            const linkedCtls = controls.filter(c => (v.linked_control_ids || []).includes(c.id));
            return (
              <div key={v.id} className={`bg-card rounded-xl border border-border border-l-4 ${riskColors[v.risk_level] || "border-l-border"} overflow-hidden ${selected.has(v.id) ? "ring-2 ring-primary" : ""}`}>
                {/* Main row */}
                <div className="p-5 flex items-start gap-4">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleSelect(v.id)} className="w-4 h-4 mt-1 rounded shrink-0" aria-label={`Select ${v.name}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-foreground">{v.name}</h3>
                      <StatusBadge status={v.risk_level} />
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="text-xs text-muted-foreground capitalize mb-2">{(v.category || "").replace(/_/g, " ")} · Data access: {(v.data_access || "none").replace(/_/g, " ")}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {v.soc2_compliant && <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" />SOC 2</span>}
                      {v.iso27001_compliant && <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" />ISO 27001</span>}
                      {v.gdpr_compliant && <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" />GDPR</span>}
                      {linkedCtls.length > 0 && (
                        <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          <Link2 className="w-3 h-3" />{linkedCtls.length} control{linkedCtls.length > 1 ? "s" : ""} linked
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {v.website && (
                      <a href={v.website.startsWith("http") ? v.website : `https://${v.website}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-muted">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    )}
                    <button onClick={() => handleEdit(v)} className="p-1.5 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    <button onClick={() => setExpandedId(isExpanded ? null : v.id)} className="p-1.5 rounded hover:bg-muted ml-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/30 px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div><span className="text-muted-foreground block">Contact</span><span className="font-medium">{v.contact_name || "—"}</span></div>
                      <div><span className="text-muted-foreground block">Email</span><span className="font-medium">{v.contact_email || "—"}</span></div>
                      <div><span className="text-muted-foreground block">Contract Start</span><span className="font-medium">{v.contract_start || "—"}</span></div>
                      <div><span className="text-muted-foreground block">Contract End</span><span className="font-medium">{v.contract_end || "—"}</span></div>
                    </div>

                    {/* Linked Controls */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-primary" />Linked Controls</p>
                      {linkedCtls.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No controls linked. Edit this vendor to link relevant controls.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {linkedCtls.map((c) => (
                            <span key={c.id} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                              c.status === "passing" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              c.status === "failing" ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-muted text-muted-foreground border-border"
                            }`}>
                              {c.control_id && <span className="font-mono opacity-70">{c.control_id}</span>}
                              {c.title}
                              <span className={`w-1.5 h-1.5 rounded-full ${c.status === "passing" ? "bg-emerald-500" : c.status === "failing" ? "bg-red-500" : "bg-muted-foreground"}`} />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {v.compliance_notes && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Compliance Notes</p>
                        <p className="text-xs text-muted-foreground">{v.compliance_notes}</p>
                      </div>
                    )}
                    {v.description && (
                      <div>
                        <p className="text-xs font-semibold text-foreground mb-1">Description</p>
                        <p className="text-xs text-muted-foreground">{v.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Vendor" : "Add Vendor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{vendorCategories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Risk Level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
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
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></div>
              <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
            </div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." /></div>
            <div><Label>Data Access Level</Label>
              <Select value={form.data_access} onValueChange={(v) => setForm({ ...form, data_access: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="extensive">Extensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contract Start</Label><Input type="date" value={form.contract_start} onChange={(e) => setForm({ ...form, contract_start: e.target.value })} /></div>
              <div><Label>Contract End</Label><Input type="date" value={form.contract_end} onChange={(e) => setForm({ ...form, contract_end: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <Label>Compliance Certifications</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><Switch checked={form.soc2_compliant} onCheckedChange={(v) => setForm({ ...form, soc2_compliant: v })} /><span className="text-sm">SOC 2</span></div>
                <div className="flex items-center gap-2"><Switch checked={form.iso27001_compliant} onCheckedChange={(v) => setForm({ ...form, iso27001_compliant: v })} /><span className="text-sm">ISO 27001</span></div>
                <div className="flex items-center gap-2"><Switch checked={form.gdpr_compliant} onCheckedChange={(v) => setForm({ ...form, gdpr_compliant: v })} /><span className="text-sm">GDPR</span></div>
              </div>
            </div>

            {/* Control Linking */}
            {controls.length > 0 && (
              <div>
                <Label>Linked Controls</Label>
                <p className="text-xs text-muted-foreground mb-1.5">Select controls this vendor is responsible for or may impact</p>
                <div className="border border-border rounded-lg p-3 max-h-44 overflow-y-auto space-y-1.5">
                  {controls.map((ctl) => {
                    const checked = (form.linked_control_ids || []).includes(ctl.id);
                    return (
                      <label key={ctl.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={checked} onChange={() => toggleControl(ctl)} className="rounded" />
                        <span className="text-sm flex items-center gap-1.5">
                          {ctl.control_id && <span className="font-mono text-xs text-muted-foreground">{ctl.control_id}</span>}
                          {ctl.title}
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ctl.status === "passing" ? "bg-emerald-500" : ctl.status === "failing" ? "bg-red-500" : "bg-muted-foreground"}`} />
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div><Label>Compliance Notes</Label><Textarea value={form.compliance_notes} onChange={(e) => setForm({ ...form, compliance_notes: e.target.value })} placeholder="Vendor-specific compliance obligations, gaps, or observations..." rows={2} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editId ? "Update" : "Add"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}