import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Smartphone, Laptop, ShieldCheck, ShieldAlert, Search, Lock, Unlock, Wifi, WifiOff, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

export default function MdmDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    base44.entities.ITAsset.list("-updated_date", 500)
      .then((d) => setAssets(d || []))
      .catch(() => toast({ title: "Failed to load devices", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const devices = useMemo(() => {
    return assets.filter((a) =>
      a.asset_type === "mobile" ||
      a.category === "mobile_device" ||
      a.category === "laptop" ||
      a.category === "desktop"
    );
  }, [assets]);

  const filtered = useMemo(() => {
    let list = devices;
    if (filterStatus === "lost_stolen") list = list.filter((d) => d.status === "lost" || d.status === "stolen");
    else if (filterStatus === "non_compliant") list = list.filter((d) => d.encryption_status === "not_encrypted" || !d.agent_installed || d.patch_level === "critical" || d.patch_level === "outdated");
    else if (filterStatus === "compliant") list = list.filter((d) => d.encryption_status === "encrypted" && d.agent_installed && (d.patch_level === "current" || d.patch_level === "unknown"));

    const q = search.toLowerCase();
    if (q) list = list.filter((d) =>
      d.asset_name?.toLowerCase().includes(q) ||
      d.hostname?.toLowerCase().includes(q) ||
      d.assigned_to_name?.toLowerCase().includes(q) ||
      d.serial_number?.toLowerCase().includes(q)
    );
    return list;
  }, [devices, search, filterStatus]);

  const stats = useMemo(() => {
    const total = devices.length;
    const encrypted = devices.filter((d) => d.encryption_status === "encrypted").length;
    const agentInstalled = devices.filter((d) => d.agent_installed).length;
    const patched = devices.filter((d) => d.patch_level === "current").length;
    const lostStolen = devices.filter((d) => d.status === "lost" || d.status === "stolen").length;
    return {
      total,
      encryptedPct: total ? Math.round((encrypted / total) * 100) : 0,
      agentPct: total ? Math.round((agentInstalled / total) * 100) : 0,
      patchedPct: total ? Math.round((patched / total) * 100) : 0,
      lostStolen,
    };
  }, [devices]);

  const handleLostDevice = async (device, action) => {
    try {
      await base44.entities.ITAsset.update(device.id, { status: action === "lock" ? "lost" : "stolen" });
      setAssets((prev) => prev.map((d) => d.id === device.id ? { ...d, status: action === "lock" ? "lost" : "stolen" } : d));
      toast({ title: `Device marked as ${action === "lock" ? "lost" : "stolen"}`, description: `${device.asset_name} — remote lock/wipe initiated via MDM` });
    } catch (e) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader title="MDM / Device Management" subtitle="Device inventory, compliance status, and lost-device response" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Devices" value={stats.total} icon={Smartphone} color="text-primary" />
        <StatCard label="Encrypted" value={`${stats.encryptedPct}%`} icon={Lock} color="text-emerald-600" />
        <StatCard label="Agent Installed" value={`${stats.agentPct}%`} icon={ShieldCheck} color="text-blue-600" />
        <StatCard label="Patched" value={`${stats.patchedPct}%`} icon={RefreshCw} color="text-violet-600" />
        <StatCard label="Lost / Stolen" value={stats.lostStolen} icon={ShieldAlert} color={stats.lostStolen > 0 ? "text-rose-600" : "text-muted-foreground"} />
      </div>

      {/* Lost/stolen alert */}
      {stats.lostStolen > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-rose-700">{stats.lostStolen} device(s) reported lost or stolen</p>
            <p className="text-xs text-rose-600">Initiate remote lock/wipe via MDM and revoke access tokens immediately.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search devices..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg w-fit">
          {[
            { v: "all", label: "All" },
            { v: "compliant", label: "Compliant" },
            { v: "non_compliant", label: "Non-Compliant" },
            { v: "lost_stolen", label: "Lost / Stolen" },
          ].map((f) => (
            <button key={f.v} onClick={() => setFilterStatus(f.v)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${filterStatus === f.v ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Device</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Assigned To</th>
                <th className="text-left px-4 py-3">Encryption</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">MDM Agent</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Patch</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Last Seen</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">No devices found.</td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.asset_type === "mobile" || d.category === "mobile_device" ? <Smartphone className="w-4 h-4 text-muted-foreground" /> : <Laptop className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-foreground">{d.asset_name || "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">{d.manufacturer} {d.model} · {d.os_type || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{d.assigned_to_name || "—"}</td>
                  <td className="px-4 py-3">
                    {d.encryption_status === "encrypted" ? <Badge className="bg-emerald-100 text-emerald-700 border-0"><Lock className="w-3 h-3 mr-1" />Encrypted</Badge>
                      : d.encryption_status === "not_encrypted" ? <Badge className="bg-rose-100 text-rose-700 border-0"><Unlock className="w-3 h-3 mr-1" />Not Encrypted</Badge>
                      : <Badge variant="secondary">Unknown</Badge>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {d.agent_installed ? <span className="text-xs text-emerald-600 flex items-center gap-1"><Wifi className="w-3 h-3" />{d.agent_type || "MDM"}</span>
                      : <span className="text-xs text-rose-600 flex items-center gap-1"><WifiOff className="w-3 h-3" />No Agent</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs ${d.patch_level === "current" ? "text-emerald-600" : d.patch_level === "outdated" || d.patch_level === "critical" ? "text-rose-600" : "text-muted-foreground"}`}>
                      {d.patch_level || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{d.last_seen || "—"}</td>
                  <td className="px-4 py-3">
                    {d.status === "lost" || d.status === "stolen" ? <Badge className="bg-rose-100 text-rose-700 border-0">{d.status}</Badge>
                      : d.status === "in_service" ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Active</Badge>
                      : <Badge variant="secondary">{d.status}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {d.status !== "lost" && d.status !== "stolen" && d.status !== "retired" && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleLostDevice(d, "lock")} className="text-xs h-7">Mark Lost</Button>
                        <Button size="sm" variant="outline" onClick={() => handleLostDevice(d, "wipe")} className="text-xs h-7 text-rose-600 border-rose-300">Mark Stolen</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}