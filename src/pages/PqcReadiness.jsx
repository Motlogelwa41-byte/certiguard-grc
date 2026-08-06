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
import { Lock, Plus, Pencil, Trash2, ShieldCheck, AlertTriangle, Atom, Search } from "lucide-react";

const statusColors = {
  quantum_safe: "bg-emerald-100 text-emerald-700 border-emerald-200",
  migration_planned: "bg-blue-100 text-blue-700 border-blue-200",
  migration_needed: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-red-100 text-red-700 border-red-200",
  unknown: "bg-slate-100 text-slate-700 border-slate-200",
};

const NIST_PQC_ALGOS = [
  { name: "CRYSTALS-Kyber (ML-KEM)", standard: "FIPS 203", use: "Key encapsulation / key exchange" },
  { name: "CRYSTALS-Dilithium (ML-DSA)", standard: "FIPS 204", use: "Digital signatures" },
  { name: "SPHINCS+ (SLH-DSA)", standard: "FIPS 205", use: "Stateless hash-based signatures" },
  { name: "FALCON", standard: "Round 4 candidate", use: "Compact digital signatures" },
  { name: "AES-256", standard: "Already quantum-safe", use: "Symmetric encryption (Grover's reduces to 128-bit)" },
];

export default function PqcReadiness() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    asset_name: "", crypto_algorithm: "", crypto_type: "asymmetric", usage_location: "",
    pqc_status: "unknown", pqc_replacement: "", nist_standard: "", priority: "medium",
    owner_name: "", migration_plan: "", target_migration_date: "", key_length_bits: 0,
    quantum_vulnerable: false, harvest_now_decrypt_later_risk: false, notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.PqcAsset.list("-updated_date", 200);
      setAssets(data || []);
    } catch (e) {
      toast({ title: "Failed to load PQC assets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = assets.filter(a => !search || a.asset_name?.toLowerCase().includes(search.toLowerCase()) || a.crypto_algorithm?.toLowerCase().includes(search.toLowerCase()));

  const openAdd = () => {
    setEditing(null);
    setForm({ asset_name: "", crypto_algorithm: "", crypto_type: "asymmetric", usage_location: "", pqc_status: "unknown", pqc_replacement: "", nist_standard: "", priority: "medium", owner_name: "", migration_plan: "", target_migration_date: "", key_length_bits: 0, quantum_vulnerable: false, harvest_now_decrypt_later_risk: false, notes: "" });
    setShowForm(true);
  };

  const openEdit = (asset) => { setEditing(asset); setForm({ ...asset }); setShowForm(true); };

  const save = async () => {
    try {
      if (editing) {
        await base44.entities.PqcAsset.update(editing.id, form);
        toast({ title: "PQC asset updated" });
      } else {
        await base44.entities.PqcAsset.create(form);
        toast({ title: "PQC asset created" });
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (id) => {
    try { await base44.entities.PqcAsset.delete(id); toast({ title: "Asset deleted" }); load(); }
    catch (e) { toast({ title: "Delete failed", variant: "destructive" }); }
  };

  const stats = {
    total: assets.length,
    quantumSafe: assets.filter(a => a.pqc_status === "quantum_safe").length,
    migrationNeeded: assets.filter(a => a.pqc_status === "migration_needed" || a.pqc_status === "critical").length,
    quantumVulnerable: assets.filter(a => a.quantum_vulnerable).length,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Post-Quantum Cryptography Readiness"
        subtitle="Track cryptographic assets and plan migration to NIST PQC standards (FIPS 203/204/205)"
        actions={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" /> Add Crypto Asset</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Crypto Assets" value={stats.total} icon={Lock} color="blue" />
        <StatCard label="Quantum Safe" value={stats.quantumSafe} icon={ShieldCheck} color="green" />
        <StatCard label="Migration Needed" value={stats.migrationNeeded} icon={AlertTriangle} color="amber" />
        <StatCard label="Quantum Vulnerable" value={stats.quantumVulnerable} icon={Atom} color="red" />
      </div>

      {/* NIST PQC Standards Reference */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Atom className="h-5 w-5" /> NIST PQC Standardized Algorithms</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {NIST_PQC_ALGOS.map((algo) => (
              <div key={algo.name} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{algo.name}</span>
                </div>
                <div className="text-xs text-muted-foreground">{algo.standard}</div>
                <div className="text-xs text-muted-foreground mt-1">{algo.use}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by asset name or algorithm..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Asset table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No crypto assets registered. Click "Add Crypto Asset" to inventory your cryptographic usage.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/50">
                    <th className="p-3 font-medium">Asset</th>
                    <th className="p-3 font-medium">Algorithm</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Usage</th>
                    <th className="p-3 font-medium">PQC Replacement</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Priority</th>
                    <th className="p-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/30">
                      <td className="p-3"><div className="font-medium">{a.asset_name}</div>{a.owner_name && <div className="text-xs text-muted-foreground">{a.owner_name}</div>}</td>
                      <td className="p-3 font-mono text-xs">{a.crypto_algorithm}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{a.crypto_type?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3 text-xs">{a.usage_location || "—"}</td>
                      <td className="p-3 text-xs">{a.pqc_replacement || "—"}</td>
                      <td className="p-3"><Badge className={`text-xs ${statusColors[a.pqc_status] || ""}`}>{a.pqc_status?.replace(/_/g, " ")}</Badge></td>
                      <td className="p-3"><Badge variant={a.priority === "critical" ? "destructive" : "outline"} className="text-xs">{a.priority}</Badge></td>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Crypto Asset" : "Add Cryptographic Asset"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Asset Name *</Label><Input value={form.asset_name} onChange={(e) => setForm({ ...form, asset_name: e.target.value })} /></div>
            <div><Label>Current Algorithm *</Label><Input placeholder="e.g. RSA-2048, ECC-P256" value={form.crypto_algorithm} onChange={(e) => setForm({ ...form, crypto_algorithm: e.target.value })} /></div>
            <div><Label>Crypto Type</Label>
              <Select value={form.crypto_type} onValueChange={(v) => setForm({ ...form, crypto_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["asymmetric", "symmetric", "hash", "key_exchange", "digital_signature", "tls_certificate", "code_signing", "ssh_key"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Usage Location</Label><Input placeholder="TLS, VPN, code signing, SSH..." value={form.usage_location} onChange={(e) => setForm({ ...form, usage_location: e.target.value })} /></div>
            <div><Label>PQC Status</Label>
              <Select value={form.pqc_status} onValueChange={(v) => setForm({ ...form, pqc_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["quantum_safe", "migration_planned", "migration_needed", "critical", "unknown"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>PQC Replacement</Label><Input placeholder="CRYSTALS-Kyber, AES-256..." value={form.pqc_replacement} onChange={(e) => setForm({ ...form, pqc_replacement: e.target.value })} /></div>
            <div><Label>NIST Standard</Label><Input placeholder="FIPS 203, FIPS 204..." value={form.nist_standard} onChange={(e) => setForm({ ...form, nist_standard: e.target.value })} /></div>
            <div><Label>Key Length (bits)</Label><Input type="number" value={form.key_length_bits} onChange={(e) => setForm({ ...form, key_length_bits: parseInt(e.target.value) || 0 })} /></div>
            <div><Label>Target Migration Date</Label><Input type="date" value={form.target_migration_date || ""} onChange={(e) => setForm({ ...form, target_migration_date: e.target.value })} /></div>
            <div><Label>Owner</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><Label>Migration Plan</Label><Input placeholder="hybrid, replace, sunset..." value={form.migration_plan} onChange={(e) => setForm({ ...form, migration_plan: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.quantum_vulnerable} onChange={(e) => setForm({ ...form, quantum_vulnerable: e.target.checked })} /> Quantum vulnerable (Shor's)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.harvest_now_decrypt_later_risk} onChange={(e) => setForm({ ...form, harvest_now_decrypt_later_risk: e.target.checked })} /> HNDL risk</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.asset_name || !form.crypto_algorithm}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}