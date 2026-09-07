import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Building2, Edit3, Users, Shield, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    workspace_id: "",
    name: "",
    description: "",
    workspace_type: "business_unit",
    head_name: "",
    color: "#3B82F6",
    status: "active",
    notes: ""
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Workspace.list("-created_date", 100);
      setWorkspaces(data);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ workspace_id: `WS-${Date.now().toString().slice(-6)}`, name: "", description: "", workspace_type: "business_unit", head_name: "", color: "#3B82F6", status: "active", notes: "" });
    setFormOpen(true);
  };

  const openEdit = (ws) => {
    setEditing(ws);
    setForm({ workspace_id: ws.workspace_id, name: ws.name, description: ws.description || "", workspace_type: ws.workspace_type || "business_unit", head_name: ws.head_name || "", color: ws.color || "#3B82F6", status: ws.status || "active", notes: ws.notes || "" });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    try {
      if (editing) {
        await base44.entities.Workspace.update(editing.id, form);
        toast({ title: "Workspace updated" });
      } else {
        await base44.entities.Workspace.create(form);
        toast({ title: "Workspace created" });
      }
      setFormOpen(false);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (ws) => {
    if (!confirm(`Delete workspace "${ws.name}"?`)) return;
    try {
      await base44.entities.Workspace.delete(ws.id);
      toast({ title: "Workspace deleted" });
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader
        title="Workspaces & Business Units"
        subtitle="Segment controls, risks, and compliance by business unit for multi-division organizations"
        actions={<Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> New Workspace</Button>}
      />

      {workspaces.length === 0 ? (
        <EmptyState icon={Building2} title="No workspaces yet" description="Create business units to segment your GRC data by division, department, or product line." actionLabel="New Workspace" onAction={openCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((ws) => (
            <div key={ws.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ws.color}20`, border: `1px solid ${ws.color}40` }}>
                    <Building2 className="w-5 h-5" style={{ color: ws.color }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{ws.name}</h3>
                    <p className="text-xs text-muted-foreground">{ws.workspace_id}</p>
                  </div>
                </div>
                <StatusBadge status={ws.status} />
              </div>
              {ws.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ws.description}</p>}
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="bg-muted/40 rounded-lg p-2">
                  <Shield className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{ws.control_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Controls</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <AlertTriangle className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{ws.risk_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Risks</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <Users className="w-3.5 h-3.5 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-bold">{ws.member_count || 0}</p>
                  <p className="text-[10px] text-muted-foreground">Members</p>
                </div>
              </div>
              {ws.head_name && <p className="text-xs text-muted-foreground mb-2">Head: <span className="font-medium text-foreground">{ws.head_name}</span></p>}
              <div className="flex gap-1 pt-2 border-t border-border">
                <Button size="sm" variant="ghost" className="flex-1" onClick={() => openEdit(ws)}><Edit3 className="w-3.5 h-3.5 mr-1" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => remove(ws)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Workspace" : "New Workspace"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Workspace Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Retail Banking" />
            </div>
            <div>
              <Label>Workspace ID</Label>
              <Input value={form.workspace_id} onChange={(e) => setForm({ ...form, workspace_id: e.target.value })} placeholder="WS-001" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="What does this business unit do?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.workspace_type} onValueChange={(v) => setForm({ ...form, workspace_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business_unit">Business Unit</SelectItem>
                    <SelectItem value="department">Department</SelectItem>
                    <SelectItem value="division">Division</SelectItem>
                    <SelectItem value="subsidiary">Subsidiary</SelectItem>
                    <SelectItem value="product_line">Product Line</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>BU Head</Label>
                <Input value={form.head_name} onChange={(e) => setForm({ ...form, head_name: e.target.value })} placeholder="Name" />
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <Input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-16 p-1" />
                  <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="flex-1" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}