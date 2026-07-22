import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, Search, Download, Upload, Trash2 } from "lucide-react";
import RiskAppetitePanel from "@/components/risks/RiskAppetitePanel";
import { exportToCsv } from "@/lib/exportCsv";
import BulkImportModal from "@/components/shared/BulkImportModal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import { useToast } from "@/components/ui/use-toast";
import { logAuditTrail } from "@/lib/auditLogger";
import { useAuth } from "@/lib/AuthContext";
import RiskCardDetail from "@/components/risks/RiskCardDetail";
import RiskAcceptanceDialog from "@/components/risks/RiskAcceptanceDialog";
import BulkActionBar from "@/components/shared/BulkActionBar";
import Can from "@/components/shared/Can";
import { useRBAC } from "@/lib/useRBAC";

const riskCategories = ["operational","technical","compliance","financial","strategic","reputational","third_party"];
const defaultForm = { risk_id: "", title: "", description: "", category: "operational", likelihood: 3, impact: 3, status: "open", treatment: "mitigate", owner_name: "", mitigation_plan: "", due_date: "", related_control_ids: [], tolerance_justification: "" };

export default function Risks() {
  const { user } = useAuth();
  const { can } = useRBAC();
  const [items, setItems] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");
  const [acceptRisk, setAcceptRisk] = useState(null);
  const { toast } = useToast();

  const handleExport = () => exportToCsv(items, "risks", ["risk_id", "title", "category", "status", "likelihood", "impact", "risk_score", "treatment", "owner_name"]);

  const importColumns = [
    { key: "risk_id", label: "Risk ID", example: "RSK-001" },
    { key: "title", label: "Title", required: true, example: "Unauthorised Data Access" },
    { key: "category", label: "Category", example: "technical" },
    { key: "status", label: "Status", example: "open" },
    { key: "likelihood", label: "Likelihood", example: "3", transform: (v) => parseInt(v) || 3 },
    { key: "impact", label: "Impact", example: "4", transform: (v) => parseInt(v) || 3 },
    { key: "treatment", label: "Treatment", example: "mitigate" },
    { key: "owner_name", label: "Owner", example: "Risk Manager" },
  ];

  const importSampleRows = [
    { "Risk ID": "RSK-001", "Title": "Unauthorised Data Access", "Category": "technical", "Status": "open", "Likelihood": "4", "Impact": "5", "Treatment": "mitigate", "Owner": "CISO" },
    { "Risk ID": "RSK-002", "Title": "Third-Party Vendor Breach", "Category": "third_party", "Status": "mitigating", "Likelihood": "3", "Impact": "4", "Treatment": "transfer", "Owner": "Risk Manager" },
    { "Risk ID": "RSK-003", "Title": "Regulatory Non-Compliance", "Category": "compliance", "Status": "open", "Likelihood": "2", "Impact": "5", "Treatment": "mitigate", "Owner": "Compliance Officer" },
  ];

  const load = async () => {
    const [risks, ctls] = await Promise.all([base44.entities.Risk.list(), base44.entities.Control.list()]);
    setItems(risks);
    setControls(ctls);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const data = { ...form, risk_score: form.likelihood * form.impact };
      if (editId) {
        const before = items.find(i => i.id === editId);
        await base44.entities.Risk.update(editId, data);
        await logAuditTrail({ action: "update", entity_type: "Risk", entity_id: editId, entity_name: form.title, before, after: data, user, severity: "info" });
      } else {
        const created = await base44.entities.Risk.create(data);
        await logAuditTrail({ action: "create", entity_type: "Risk", entity_id: created?.id, entity_name: form.title, after: data, user, severity: "info" });
      }
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Risk updated" : "Risk created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ risk_id: item.risk_id || "", title: item.title || "", description: item.description || "", category: item.category || "operational", likelihood: item.likelihood || 3, impact: item.impact || 3, status: item.status || "open", treatment: item.treatment || "mitigate", owner_name: item.owner_name || "", mitigation_plan: item.mitigation_plan || "", due_date: item.due_date || "", related_control_ids: item.related_control_ids || [], tolerance_justification: item.tolerance_justification || "" });
    setEditId(item.id); setOpen(true);
  };

  const toggleControl = (ctlId) => {
    const ids = form.related_control_ids || [];
    setForm({ ...form, related_control_ids: ids.includes(ctlId) ? ids.filter(id => id !== ctlId) : [...ids, ctlId] });
  };

  const handleDelete = async (id) => {
    const item = items.find(i => i.id === id);
    await base44.entities.Risk.delete(id);
    await logAuditTrail({ action: "delete", entity_type: "Risk", entity_id: id, entity_name: item?.title, before: item, user, severity: "warning" });
    load(); toast({ title: "Risk deleted" });
  };

  const filtered = items.filter((r) => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };
  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, status: bulkStatus }));
    await base44.entities.Risk.bulkUpdate(updates);
    await logAuditTrail({ action: "update", entity_type: "Risk", entity_name: `${selected.size} risks`, after: { status: bulkStatus }, user, severity: "info" });
    setSelected(new Set()); setBulkStatus(""); load();
    toast({ title: `${updates.length} risks updated` });
  };
  const applyBulkOwner = async () => {
    if (!bulkOwner.trim() || selected.size === 0) return;
    const updates = [...selected].map(id => ({ id, owner_name: bulkOwner.trim() }));
    await base44.entities.Risk.bulkUpdate(updates);
    await logAuditTrail({ action: "update", entity_type: "Risk", entity_name: `${selected.size} risks`, after: { owner_name: bulkOwner.trim() }, user, severity: "info" });
    setSelected(new Set()); setBulkOwner(""); load();
    toast({ title: `${updates.length} risks reassigned` });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected risks? This cannot be undone.`)) return;
    await base44.entities.Risk.deleteMany({ id: { $in: [...selected] } });
    await logAuditTrail({ action: "delete", entity_type: "Risk", entity_name: `${selected.size} risks`, user, severity: "warning" });
    const count = selected.size;
    setSelected(new Set()); load();
    toast({ title: `${count} risks deleted` });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Risk Register" subtitle="Identify, assess, and manage organizational risks" actions={
        <div className="flex items-center gap-2">
          <Can permission="reports:export"><Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button></Can>
          <Can permission="risks:write"><Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button></Can>
          <Can permission="risks:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Risk</Button></Can>
        </div>
      } />

      {/* Risk Appetite Thresholds */}
      {items.length > 0 && <RiskAppetitePanel risks={items} />}

      {/* Risk Heatmap */}
      {items.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Risk Heatmap</h3>
          <div className="flex gap-6 items-start">
            <div className="text-xs text-muted-foreground font-medium -rotate-90 self-center whitespace-nowrap">IMPACT →</div>
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1">
                {[5,4,3,2,1].map((impact) => 
                  [1,2,3,4,5].map((likelihood) => {
                    const score = impact * likelihood;
                    const risksInCell = items.filter(r => r.likelihood === likelihood && r.impact === impact);
                    return (
                      <div key={`${impact}-${likelihood}`} className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold text-white relative ${score >= 20 ? "bg-red-500" : score >= 12 ? "bg-orange-500" : score >= 6 ? "bg-amber-500" : "bg-emerald-500"} ${risksInCell.length > 0 ? 'ring-2 ring-foreground/20' : 'opacity-60'}`}>
                        {risksInCell.length > 0 && risksInCell.length}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-xs text-muted-foreground font-medium text-center mt-2">LIKELIHOOD →</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="mitigating">Mitigating</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <BulkActionBar selectedCount={selected.size} onClear={() => setSelected(new Set())}>
        <Select value={bulkStatus} onValueChange={setBulkStatus}>
          <SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="mitigating">Mitigating</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="transferred">Transferred</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="secondary" onClick={applyBulkStatus} disabled={!bulkStatus}>Apply Status</Button>
        <Input value={bulkOwner} onChange={(e) => setBulkOwner(e.target.value)} placeholder="Assign owner" className="w-[160px] h-8" />
        <Button size="sm" variant="secondary" onClick={applyBulkOwner} disabled={!bulkOwner.trim()}>Assign Owner</Button>
        <Can permission="risks:delete"><Button size="sm" variant="destructive" onClick={bulkDelete}><Trash2 className="w-4 h-4 mr-1" />Delete</Button></Can>
      </BulkActionBar>

      {items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No risks identified" description="Add risks to your register to start tracking." actionLabel="Add Risk" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No risks match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <div key={r.id} className={`relative rounded-xl ${selected.has(r.id) ? "ring-2 ring-primary" : ""}`}>
              <div className="absolute top-2 right-2 z-10">
                <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSelect(r.id)} className="w-4 h-4 rounded" aria-label={`Select ${r.title}`} />
              </div>
              <RiskCardDetail
                r={r}
                allControls={controls}
                onEdit={can("risks:write") ? handleEdit : null}
                onDelete={can("risks:delete") ? handleDelete : null}
                onAccept={can("risks:write") ? (r) => setAcceptRisk(r) : null}
              />
            </div>
          ))}
        </div>
      )}

      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} entityName="Risk" columns={importColumns} sampleRows={importSampleRows} onSuccess={load} />

      <RiskAcceptanceDialog risk={acceptRisk} open={!!acceptRisk} onOpenChange={(o) => !o && setAcceptRisk(null)} onAccepted={load} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Risk" : "Add Risk"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Risk ID</Label><Input value={form.risk_id} onChange={(e) => setForm({ ...form, risk_id: e.target.value })} placeholder="e.g. RSK-001" /></div>
              <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            </div>
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{riskCategories.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="mitigating">Mitigating</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="transferred">Transferred</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Likelihood (1-5)</Label>
                <Select value={String(form.likelihood)} onValueChange={(v) => setForm({ ...form, likelihood: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Impact (1-5)</Label>
                <Select value={String(form.impact)} onValueChange={(v) => setForm({ ...form, impact: parseInt(v) })}>
                  <SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger>
                  <SelectContent>{[1,2,3,4,5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Treatment</Label>
                <Select value={form.treatment} onValueChange={(v) => setForm({ ...form, treatment: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mitigate">Mitigate</SelectItem>
                    <SelectItem value="accept">Accept</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="avoid">Avoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div><Label>Mitigation Plan</Label><Textarea value={form.mitigation_plan} onChange={(e) => setForm({ ...form, mitigation_plan: e.target.value })} rows={3} /></div>
            <div>
              <Label>Tolerance Justification</Label>
              <Textarea
                value={form.tolerance_justification || ""}
                onChange={(e) => setForm({ ...form, tolerance_justification: e.target.value })}
                rows={2}
                placeholder="Required if risk exceeds company tolerance — explain why it's accepted..."
              />
            </div>
            {controls.length > 0 && (
              <div>
                <Label>Linked Controls (Mitigating)</Label>
                <div className="mt-1.5 border border-border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {controls.map(ctl => {
                    const checked = (form.related_control_ids || []).includes(ctl.id);
                    return (
                      <label key={ctl.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                        <input type="checkbox" checked={checked} onChange={() => toggleControl(ctl.id)} className="rounded" />
                        <span className="text-sm">{ctl.control_id ? <span className="font-mono text-xs text-muted-foreground mr-1">{ctl.control_id}</span> : null}{ctl.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={handleSave} disabled={!form.title}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}