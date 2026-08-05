import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Building2, Plus, Pencil, Trash2, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Can from "@/components/shared/Can";
import { useToast } from "@/components/ui/use-toast";

const defaultForm = { name: "", description: "", parent_id: "", head_name: "", cost_center: "", location: "", risk_appetite_level: "moderate", status: "active", notes: "" };

export default function BusinessUnits() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = () => base44.entities.BusinessUnit.list().then((d) => { setItems(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (form.parent_id) {
        const parent = items.find((i) => i.id === form.parent_id);
        payload.parent_name = parent?.name || "";
      } else {
        payload.parent_id = "";
        payload.parent_name = "";
      }
      if (editId) await base44.entities.BusinessUnit.update(editId, payload);
      else await base44.entities.BusinessUnit.create(payload);
      setOpen(false); setForm(defaultForm); setEditId(null); load();
      toast({ title: editId ? "Business unit updated" : "Business unit created" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name || "", description: item.description || "", parent_id: item.parent_id || "", head_name: item.head_name || "", cost_center: item.cost_center || "", location: item.location || "", risk_appetite_level: item.risk_appetite_level || "moderate", status: item.status || "active", notes: item.notes || "" });
    setEditId(item.id); setOpen(true);
  };

  const handleDelete = async (id) => { await base44.entities.BusinessUnit.delete(id); load(); toast({ title: "Business unit deleted" }); };

  const filtered = items.filter((p) => !search || p.name?.toLowerCase().includes(search.toLowerCase()));

  // Build hierarchy view
  const rootUnits = filtered.filter((u) => !u.parent_id);
  const childrenOf = (parentId) => filtered.filter((u) => u.parent_id === parentId);

  const renderUnit = (unit, depth = 0) => (
    <div key={unit.id}>
      <div className={`bg-card rounded-xl border border-border p-4 flex items-center justify-between ${depth > 0 ? "ml-6 border-l-2 border-l-primary/30" : ""}`} style={{ marginLeft: depth > 0 ? depth * 24 : 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground text-sm">{unit.name}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {unit.head_name && <span>Head: {unit.head_name}</span>}
              {unit.cost_center && <span>· CC: {unit.cost_center}</span>}
              {unit.location && <span>· {unit.location}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground capitalize">{(unit.risk_appetite_level || "").replace(/_/g, " ")} appetite</span>
          <StatusBadge status={unit.status} />
          <Can permission="policies:write"><button onClick={() => handleEdit(unit)} className="p-1 rounded hover:bg-muted" title="Edit"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button></Can>
          <Can permission="admin:users"><button onClick={() => handleDelete(unit.id)} className="p-1 rounded hover:bg-muted text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button></Can>
        </div>
      </div>
      {childrenOf(unit.id).length > 0 && (
        <div className="mt-2 space-y-2">
          {childrenOf(unit.id).map((child) => renderUnit(child, depth + 1))}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Business Units"
        subtitle="Organizational hierarchy for scoped risk, compliance, and reporting"
        actions={<Can permission="policies:write"><Button size="sm" onClick={() => { setForm(defaultForm); setEditId(null); setOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Add Unit</Button></Can>}
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search business units..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Building2} title="No business units yet" description="Create organizational units to scope risk, controls, and KPIs/KRIs by department or division." actionLabel="Add Unit" onAction={() => setOpen(true)} />
      ) : (
        <div className="space-y-2">
          {rootUnits.map((unit) => renderUnit(unit))}
          {/* Show orphan units (parent not in filtered set) */}
          {filtered.filter((u) => u.parent_id && !items.find((p) => p.id === u.parent_id)).map((unit) => renderUnit(unit))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Business Unit" : "Add Business Unit"}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Finance, Engineering, Operations" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Parent Unit</Label>
                <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (root)</SelectItem>
                    {items.filter((i) => i.id !== editId).map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Head / Director</Label><Input value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cost Center</Label><Input value={form.cost_center} onChange={(e) => setForm({ ...form, cost_center: e.target.value })} /></div>
              <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Risk Appetite</Label>
                <Select value={form.risk_appetite_level} onValueChange={(v) => setForm({ ...form, risk_appetite_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="very_high">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <Button className="w-full" onClick={handleSave} disabled={!form.title && !form.name}>{editId ? "Update" : "Create"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}