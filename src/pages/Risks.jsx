import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, Plus, Pencil, Trash2, Search, Download, Upload } from "lucide-react";
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

const riskCategories = ["operational","technical","compliance","financial","strategic","reputational","third_party"];
const defaultForm = { risk_id: "", title: "", description: "", category: "operational", likelihood: 3, impact: 3, status: "open", treatment: "mitigate", owner_name: "", mitigation_plan: "", due_date: "", related_control_ids: [] };

export default function Risks() {
  const [items, setItems] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
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
      if (editId) await base44.entities.Risk.update(editId, data);
      else await base44.entities.Risk.create(data);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Risk updated" : "Risk created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ risk_id: item.risk_id || "", title: item.title || "", description: item.description || "", category: item.category || "operational", likelihood: item.likelihood || 3, impact: item.impact || 3, status: item.status || "open", treatment: item.treatment || "mitigate", owner_name: item.owner_name || "", mitigation_plan: item.mitigation_plan || "", due_date: item.due_date || "", related_control_ids: item.related_control_ids || [] });
    setEditId(item.id); setOpen(true);
  };

  const toggleControl = (ctlId) => {
    const ids = form.related_control_ids || [];
    setForm({ ...form, related_control_ids: ids.includes(ctlId) ? ids.filter(id => id !== ctlId) : [...ids, ctlId] });
  };

  const handleDelete = async (id) => { await base44.entities.Risk.delete(id); load(); toast({ title: "Risk deleted" }); };

  const filtered = items.filter((r) => {
    const matchSearch = !search || r.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getRiskColor = (score) => {
    if (score >= 20) return "bg-red-500";
    if (score >= 12) return "bg-orange-500";
    if (score >= 6) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Risk Register" subtitle="Identify, assess, and manage organizational risks" actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button>
          <Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Risk</Button>
        </div>
      } />

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
                      <div key={`${impact}-${likelihood}`} className={`aspect-square rounded-md flex items-center justify-center text-xs font-bold text-white relative ${getRiskColor(score)} ${risksInCell.length > 0 ? 'ring-2 ring-foreground/20' : 'opacity-60'}`}>
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

      {items.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No risks identified" description="Add risks to your register to start tracking." actionLabel="Add Risk" onAction={() => setOpen(true)} />
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No risks match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const score = (r.likelihood || 1) * (r.impact || 1);
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {r.risk_id && <span className="text-xs font-mono text-muted-foreground">{r.risk_id}</span>}
                      <StatusBadge status={r.status} />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-sm">{r.title}</h3>
                  </div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${getRiskColor(score)}`}>
                    {score}
                  </div>
                </div>
                {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Likelihood: </span><span className="font-semibold">{r.likelihood}/5</span></div>
                  <div><span className="text-muted-foreground">Impact: </span><span className="font-semibold">{r.impact}/5</span></div>
                  <div><span className="text-muted-foreground">Treatment: </span><span className="font-semibold capitalize">{r.treatment}</span></div>
                  <div><span className="text-muted-foreground">Category: </span><span className="font-semibold capitalize">{(r.category || "").replace(/_/g, " ")}</span></div>
                </div>
                {r.related_control_ids?.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{r.related_control_ids.length} control{r.related_control_ids.length > 1 ? "s" : ""} linked</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>{r.owner_name || "Unassigned"}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(r)} className="p-1 rounded hover:bg-muted"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-muted text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BulkImportModal open={importOpen} onOpenChange={setImportOpen} entityName="Risk" columns={importColumns} sampleRows={importSampleRows} onSuccess={load} />

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
              <div><Label>Likelihood (1-5)</Label><Input type="number" min="1" max="5" value={form.likelihood} onChange={(e) => setForm({ ...form, likelihood: parseInt(e.target.value) || 1 })} /></div>
              <div><Label>Impact (1-5)</Label><Input type="number" min="1" max="5" value={form.impact} onChange={(e) => setForm({ ...form, impact: parseInt(e.target.value) || 1 })} /></div>
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