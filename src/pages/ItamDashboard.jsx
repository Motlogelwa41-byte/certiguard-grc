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
import { Laptop, Server, Plus, Pencil, Trash2, Shield, Lock, Search } from "lucide-react";

const statusColors = {
  in_service: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_deploy: "bg-blue-100 text-blue-700 border-blue-200",
  repair: "bg-amber-100 text-amber-700 border-amber-200",
  retired: "bg-slate-100 text-slate-700 border-slate-200",
  lost: "bg-red-100 text-red-700 border-red-200",
  stolen: "bg-red-100 text-red-700 border-red-200",
  in_storage: "bg-slate-100 text-slate-700 border-slate-200",
};

const encColors = {
  encrypted: "text-emerald-500", not_encrypted: "text-red-500", partial: "text-amber-500", unknown: "text-muted-foreground",
};

export default function ItamDashboard() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    asset_name: "", asset_type: "hardware", category: "laptop", manufacturer: "", model: "",
    serial_number: "", hostname: "", ip_address: "", location: "", assigned_to_name: "",
    status: "pending_deploy", classification: "internal", encryption_status: "unknown",
    patch_level: "unknown", agent_installed: false, notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ITAsset.list("-updated_date", 200);
      setAssets(data || []);
    } catch (e) {
      toast({ title: "Failed to load assets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter(a => {
    const matchSearch = !search || (a.asset_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.hostname?.toLowerCase().includes(search.toLowerCase()) || a.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      a.assigned_to_name?.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === "all" || a.asset_type === filterType;
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const openAdd = () => {
    setEditing(null);
    setForm({ asset_name: "", asset_type: "hardware", category: "laptop", manufacturer: "", model: "", serial_number: "", hostname: "", ip_address: "", location: "", assigned_to_name: "", status: "pending_deploy", classification: "internal", encryption_status: "unknown", patch_level: "unknown", agent_installed: false, notes: "" });
    setShowForm(true);
  };

  const openEdit = (asset) => {
    setEditing(asset);
    setForm({ ...asset });
    setShowForm(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await base44.entities.ITAsset.update(editing.id, form);
        toast({ title: "Asset updated" });
      } else {
        await base44.entities.ITAsset.create(form);
        toast({ title: "Asset created" });
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (id) => {
    try {
      await base44.entities.ITAsset.delete(id);
      toast({ title: "Asset deleted" });
      load();
    } catch (e) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const stats = {
    total: assets.length,
    inService: assets.filter(a => a.status === "in_service").length,
    encrypted: assets.filter(a => a.encryption_status === "encrypted").length,
    notEncrypted: assets.filter(a => a.encryption_status === "not_encrypted").length,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="IT Asset Management"
        subtitle="Track hardware, software, cloud, and network assets with classification and encryption status"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Asset</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Assets" value={stats.total} icon={Laptop} color="text-blue-500" />
        <StatCard label="In Service" value={stats.inService} icon={Server} color="text-emerald-500" />
        <StatCard label="Encrypted" value={stats.encrypted} icon={Lock} color="text-emerald-500" />
        <StatCard label="Not Encrypted" value={stats.notEncrypted} icon={Shield} color="text-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name, hostname, serial, or assignee..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="hardware">Hardware</SelectItem>
            <SelectItem value="software">Software</SelectItem>
            <SelectItem value="virtual">Virtual</SelectItem>
            <SelectItem value="cloud">Cloud</SelectItem>
            <SelectItem value="network">Network</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_service">In Service</SelectItem>
            <SelectItem value="pending_deploy">Pending Deploy</SelectItem>
            <SelectItem value="repair">Repair</SelectItem>
            <SelectItem value="in_storage">In Storage</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
            <SelectItem value="stolen">Stolen</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Asset table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No assets found. Click "Add Asset" to create one.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/50">
                    <th className="p-3 font-medium">Asset Name</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Assigned To</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Classification</th>
                    <th className="p-3 font-medium">Encryption</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium">{a.asset_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{a.hostname || a.serial_number || a.asset_tag}</div>
                      </td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{a.asset_type}</Badge></td>
                      <td className="p-3">{a.assigned_to_name || "—"}</td>
                      <td className="p-3">{a.location || "—"}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{a.classification}</Badge></td>
                      <td className="p-3"><span className={`text-xs font-medium ${encColors[a.encryption_status] || "text-muted-foreground"}`}>{a.encryption_status}</span></td>
                      <td className="p-3"><Badge className={`text-xs ${statusColors[a.status] || ""}`}>{a.status?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(a.id)}><Trash2 className="h-3.5 w-3.5 text-red-500" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Asset" : "Add IT Asset"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} /></div>
            <div><Label>Asset Type *</Label>
              <Select value={form.asset_type} onValueChange={(v) => setForm({ ...form, asset_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["hardware", "software", "virtual", "cloud", "network", "mobile"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["laptop", "desktop", "server", "router", "switch", "firewall", "saas_application", "database", "container", "vm", "mobile_device", "iot_device", "other"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Serial Number</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><Label>Hostname</Label><Input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} /></div>
            <div><Label>IP Address</Label><Input value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Assigned To</Label><Input value={form.assigned_to_name} onChange={(e) => setForm({ ...form, assigned_to_name: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["in_service", "pending_deploy", "repair", "in_storage", "retired", "lost", "stolen"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Classification</Label>
              <Select value={form.classification} onValueChange={(v) => setForm({ ...form, classification: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["public", "internal", "confidential", "restricted"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Encryption</Label>
              <Select value={form.encryption_status} onValueChange={(v) => setForm({ ...form, encryption_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["encrypted", "not_encrypted", "partial", "unknown"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Patch Level</Label>
              <Select value={form.patch_level} onValueChange={(v) => setForm({ ...form, patch_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["current", "outdated", "critical", "unknown"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.asset_name}>{editing ? "Update" : "Create"} Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}