import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, ArrowRight, Globe, Lock, ShieldAlert, Database } from "lucide-react";

const statusColors = {
  active: "bg-emerald-100 text-emerald-700",
  review_needed: "bg-amber-100 text-amber-700",
  deprecated: "bg-slate-100 text-slate-700",
  blocked: "bg-red-100 text-red-700",
};

const legalBasisLabels = {
  consent: "Consent",
  contract: "Contract",
  legal_obligation: "Legal Obligation",
  vital_interest: "Vital Interest",
  public_task: "Public Task",
  legitimate_interest: "Legitimate Interest",
};

export default function PrivacyDataMapping() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    flow_name: "", source_system: "", destination_system: "", data_categories: "[]",
    data_subjects: "[]", processing_purpose: "", legal_basis: "consent",
    retention_period_days: 365, cross_border_transfer: false, transfer_destination_country: "",
    safeguards: "", encryption_in_transit: true, encryption_at_rest: true,
    dpia_required: false, dpia_completed: false, owner_name: "", status: "active", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DataFlowMap.list("-updated_date", 200);
      setFlows(data || []);
    } catch (e) {
      toast({ title: "Failed to load data flows", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = flows.filter(f => !search || f.flow_name?.toLowerCase().includes(search.toLowerCase()) || f.source_system?.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    setForm({ flow_name: "", source_system: "", destination_system: "", data_categories: "[]", data_subjects: "[]", processing_purpose: "", legal_basis: "consent", retention_period_days: 365, cross_border_transfer: false, transfer_destination_country: "", safeguards: "", encryption_in_transit: true, encryption_at_rest: true, dpia_required: false, dpia_completed: false, owner_name: "", status: "active", notes: "" });
    setShowForm(true);
  };

  const openEdit = (flow) => { setEditing(flow); setForm({ ...flow }); setShowForm(true); };

  const save = async () => {
    try {
      if (editing) {
        await base44.entities.DataFlowMap.update(editing.id, form);
        toast({ title: "Data flow updated" });
      } else {
        await base44.entities.DataFlowMap.create(form);
        toast({ title: "Data flow created" });
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (id) => {
    try { await base44.entities.DataFlowMap.delete(id); toast({ title: "Flow deleted" }); load(); }
    catch (e) { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const parseCategories = (str) => {
    try { return JSON.parse(str || "[]"); } catch { return []; }
  };

  const stats = {
    total: flows.length,
    crossBorder: flows.filter(f => f.cross_border_transfer).length,
    dpiaRequired: flows.filter(f => f.dpia_required).length,
    reviewNeeded: flows.filter(f => f.status === "review_needed").length,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Privacy Data Flow Mapping"
        subtitle="GDPR Article 30 / POPIA Section 17 — data flow inventory, cross-border transfer tracking & DPIA management"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Data Flow</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Data Flows" value={stats.total} icon={Database} color="blue" />
        <StatCard label="Cross-Border" value={stats.crossBorder} icon={Globe} color="amber" />
        <StatCard label="DPIA Required" value={stats.dpiaRequired} icon={ShieldAlert} color="red" />
        <StatCard label="Review Needed" value={stats.reviewNeeded} icon={Lock} color="purple" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search data flows..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No data flows mapped. Click "Add Data Flow" to start your GDPR/POPIA Article 30 inventory.</p>
          ) : (
            <div className="space-y-3 p-4">
              {filtered.map(f => {
                const cats = parseCategories(f.data_categories);
                return (
                  <div key={f.id} className="p-4 rounded-lg border hover:bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{f.flow_name}</span>
                          <Badge className={`text-xs ${statusColors[f.status] || ""}`}>{f.status?.replace(/_/g, " ")}</Badge>
                          {f.cross_border_transfer && <Badge variant="outline" className="text-xs text-amber-600"><Globe className="h-3 w-3 mr-1" />Cross-border</Badge>}
                          {f.dpia_required && !f.dpia_completed && <Badge variant="outline" className="text-xs text-red-600"><ShieldAlert className="h-3 w-3 mr-1" />DPIA needed</Badge>}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span className="px-2 py-0.5 rounded bg-muted text-xs">{f.source_system || "—"}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                          <span className="px-2 py-0.5 rounded bg-muted text-xs">{f.destination_system || "—"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cats.map((c, i) => <Badge key={i} variant="outline" className="text-xs">{c}</Badge>)}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>Basis: {legalBasisLabels[f.legal_basis] || f.legal_basis}</span>
                          <span>Retention: {f.retention_period_days || 0} days</span>
                          {f.encryption_in_transit && <span className="text-emerald-600">🔒 In transit</span>}
                          {f.encryption_at_rest && <span className="text-emerald-600">🔒 At rest</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Data Flow" : "Add Data Flow"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2"><Label>Flow Name *</Label><Input value={form.flow_name} onChange={(e) => setForm({ ...form, flow_name: e.target.value })} /></div>
            <div><Label>Source System *</Label><Input placeholder="e.g. CRM, HR system" value={form.source_system} onChange={(e) => setForm({ ...form, source_system: e.target.value })} /></div>
            <div><Label>Destination System *</Label><Input placeholder="e.g. Cloud storage, API" value={form.destination_system} onChange={(e) => setForm({ ...form, destination_system: e.target.value })} /></div>
            <div className="col-span-2"><Label>Data Categories (comma-separated)</Label><Input placeholder="pii, financial, health, credentials" value={parseCategories(form.data_categories).join(", ")} onChange={(e) => setForm({ ...form, data_categories: JSON.stringify(e.target.value.split(",").map(s => s.trim()).filter(Boolean)) })} /></div>
            <div className="col-span-2"><Label>Processing Purpose</Label><Input value={form.processing_purpose} onChange={(e) => setForm({ ...form, processing_purpose: e.target.value })} /></div>
            <div><Label>Legal Basis</Label>
              <Select value={form.legal_basis} onValueChange={(v) => setForm({ ...form, legal_basis: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(legalBasisLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Retention (days)</Label><Input type="number" value={form.retention_period_days} onChange={(e) => setForm({ ...form, retention_period_days: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["active", "review_needed", "deprecated", "blocked"].map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><Label>Transfer Destination Country</Label><Input value={form.transfer_destination_country} onChange={(e) => setForm({ ...form, transfer_destination_country: e.target.value })} /></div>
            <div><Label>Safeguards</Label><Input placeholder="SCCs, BCRs, adequacy decision" value={form.safeguards} onChange={(e) => setForm({ ...form, safeguards: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-4 pt-2 flex-wrap">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.cross_border_transfer} onChange={(e) => setForm({ ...form, cross_border_transfer: e.target.checked })} /> Cross-border transfer</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.encryption_in_transit} onChange={(e) => setForm({ ...form, encryption_in_transit: e.target.checked })} /> Encrypted in transit</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.encryption_at_rest} onChange={(e) => setForm({ ...form, encryption_at_rest: e.target.checked })} /> Encrypted at rest</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.dpia_required} onChange={(e) => setForm({ ...form, dpia_required: e.target.checked })} /> DPIA required</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.dpia_completed} onChange={(e) => setForm({ ...form, dpia_completed: e.target.checked })} /> DPIA completed</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.flow_name || !form.source_system || !form.destination_system}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}