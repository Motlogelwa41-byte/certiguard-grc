import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { Link } from "react-router-dom";
import { CATALOG, CATEGORIES, catalogEntry } from "@/lib/connectionsCatalog";
import StatusBadge from "@/components/shared/StatusBadge";
import { Plus, RefreshCw, Settings2, Trash2, CheckCircle2, AlertCircle, Link2, Zap, Wand2 } from "lucide-react";

const FREQ = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function healthColor(h) {
  if (h === "healthy") return "text-emerald-500";
  if (h === "warning") return "text-amber-500";
  if (h === "error") return "text-rose-500";
  return "text-muted-foreground";
}

export default function Connections() {
  const [connections, setConnections] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("all");
  const [configOpen, setConfigOpen] = useState(false);
  const [editing, setEditing] = useState(null); // existing connection or null for new
  const [form, setForm] = useState(null); // {service, name, config, controls_monitored, auto_collect, collect_frequency, secret_env_var}
  const [running, setRunning] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [conns, ctls] = await Promise.all([base44.entities.Connection.list(), base44.entities.Control.list("-updated_date", 500)]);
    setConnections(conns || []);
    setControls(ctls || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const connectionFor = (service) => connections.find((c) => c.service === service);

  const openNew = (entry) => {
    setEditing(null);
    setForm({
      service: entry.service,
      name: entry.label,
      config: "",
      secret_env_var: entry.secretHint ? entry.secretHint.split(" ")[0] : "",
      controls_monitored: [],
      auto_collect: true,
      collect_frequency: "daily",
    });
    setConfigOpen(true);
  };

  const openEdit = (conn) => {
    const entry = catalogEntry(conn.service);
    setEditing(conn);
    setForm({
      service: conn.service,
      name: conn.name,
      config: conn.config || "",
      secret_env_var: conn.secret_env_var || (entry?.secretHint ? entry.secretHint.split(" ")[0] : ""),
      controls_monitored: conn.controls_monitored || [],
      auto_collect: conn.auto_collect !== false,
      collect_frequency: conn.collect_frequency || "daily",
    });
    setConfigOpen(true);
  };

  const toggleControl = (id) => {
    setForm((f) => {
      const has = f.controls_monitored.includes(id);
      return { ...f, controls_monitored: has ? f.controls_monitored.filter((x) => x !== id) : [...f.controls_monitored, id] };
    });
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: form.name,
        service: form.service,
        category: catalogEntry(form.service)?.category || "cloud",
        auth_method: catalogEntry(form.service)?.authMethod || "manual",
        connector_type: catalogEntry(form.service)?.connectorType || "",
        config: form.config,
        secret_env_var: form.secret_env_var,
        controls_monitored: form.controls_monitored,
        control_count: form.controls_monitored.length,
        auto_collect: form.auto_collect,
        collect_frequency: form.collect_frequency,
        status: editing?.status || "needs_credentials",
        connected_by_name: editing?.connected_by_name || "",
      };
      if (editing) {
        await base44.entities.Connection.update(editing.id, payload);
        toast({ title: "Connection updated" });
      } else {
        await base44.entities.Connection.create({ ...payload, status: "needs_credentials" });
        toast({ title: "Connection added", description: "Configure credentials to begin collecting." });
      }
      setConfigOpen(false);
      setEditing(null);
      setForm(null);
      load();
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleDisconnect = async (conn) => {
    await base44.entities.Connection.update(conn.id, { status: "disconnected", health: "unknown" });
    load();
    toast({ title: "Connection disconnected" });
  };

  const handleDelete = async (conn) => {
    await base44.entities.Connection.delete(conn.id);
    load();
    toast({ title: "Connection removed" });
  };

  const toggleAuto = async (conn, enabled) => {
    try {
      await base44.entities.Connection.update(conn.id, { auto_collect: enabled });
      load();
      toast({ title: enabled ? "Auto-sync enabled" : "Auto-sync paused" });
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const runNow = async (conn) => {
    setRunning(conn.id);
    try {
      const res = await base44.functions.invoke("runConnectionMonitor", { connection_id: conn.id });
      const data = res?.data || res;
      if (data?.ok) {
        toast({ title: "Collection complete", description: `Status: ${(data.results?.[0] || {}).status || "ok"}` });
      } else {
        toast({ title: "Collection failed", description: data?.error, variant: "destructive" });
      }
      load();
    } catch (e) {
      toast({ title: "Collection failed", description: e.message, variant: "destructive" });
    }
    setRunning(null);
  };

  const filteredCatalog = activeCat === "all" ? CATALOG : CATALOG.filter((c) => c.category === activeCat);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Connections"
        subtitle="Connect source systems to automatically collect evidence and monitor controls"
        actions={<div className="flex items-center gap-2"><Link to="/onboarding"><Button size="sm"><Wand2 className="w-4 h-4 mr-1" /> Setup Wizard</Button></Link><Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button></div>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Connected" value={connections.filter((c) => c.status === "connected").length} icon={Link2} color="text-emerald-500" />
        <StatTile label="Needs Credentials" value={connections.filter((c) => c.status === "needs_credentials").length} icon={AlertCircle} color="text-amber-500" />
        <StatTile label="Error" value={connections.filter((c) => c.status === "error").length} icon={AlertCircle} color="text-rose-500" />
        <StatTile label="Evidence Collected" value={connections.reduce((s, c) => s + (c.evidence_collected_count || 0), 0)} icon={CheckCircle2} color="text-primary" />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>All ({CATALOG.length})</CatChip>
        {CATEGORIES.map((c) => {
          const count = CATALOG.filter((x) => x.category === c.id).length;
          return <CatChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.label} ({count})</CatChip>;
        })}
      </div>

      {/* Catalog grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredCatalog.map((entry) => {
          const conn = connectionFor(entry.service);
          const Icon = entry.icon;
          return (
            <div key={entry.service} className="bg-card rounded-2xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground leading-tight">{entry.label}</h3>
                    <p className="text-[11px] text-muted-foreground capitalize">{entry.category.replace(/_/g, " ")} · {entry.authMethod.replace(/_/g, " ")}</p>
                  </div>
                </div>
                {conn ? <StatusBadge status={conn.status} /> : <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">Not connected</span>}
              </div>

              <p className="text-sm text-muted-foreground mb-3 flex-1">{entry.description}</p>

              <div className="flex flex-wrap gap-1 mb-3">
                {entry.frameworks.map((fw) => (
                  <span key={fw} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{fw}</span>
                ))}
              </div>

              {conn && (
                <div className="text-xs space-y-1 mb-3 border-t border-border pt-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Controls monitored</span><span className="text-foreground font-medium">{conn.control_count || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Evidence collected</span><span className="text-foreground font-medium">{conn.evidence_collected_count || 0}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last sync</span><span className="text-foreground">{conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Health</span><span className={`flex items-center gap-1 font-medium ${healthColor(conn.health)}`}>{conn.health || "unknown"}</span></div>
                  {conn.last_error && <p className="text-rose-500 text-[11px] mt-1">{conn.last_error}</p>}
                  <div className="flex items-center justify-between pt-1.5 border-t border-border mt-1.5">
                    <span className="text-muted-foreground">Automated sync</span>
                    <Switch checked={conn.auto_collect !== false} onCheckedChange={(v) => toggleAuto(conn, v)} />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-auto">
                {conn ? (
                  <>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(conn)}><Settings2 className="w-3.5 h-3.5 mr-1" /> Configure</Button>
                    <Button size="sm" variant="outline" onClick={() => runNow(conn)} disabled={running === conn.id}>
                      {running === conn.id ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />} Run
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDisconnect(conn)}>Disconnect</Button>
                    <button onClick={() => handleDelete(conn)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                  </>
                ) : (
                  <Button size="sm" className="w-full" onClick={() => openNew(entry)}><Plus className="w-4 h-4 mr-1" /> Connect {entry.label}</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Configure dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Configure Connection" : `Connect ${catalogEntry(form?.service)?.label || ""}`}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div><Label>Connection Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>

              {catalogEntry(form.service)?.secretHint && (
                <div className="rounded-xl border border-amber-300/50 bg-amber-50/60 dark:bg-amber-900/10 p-3 text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> Credentials required</p>
                  <p className="text-xs text-muted-foreground mt-1">Add this secret in Dashboard → Secrets, then name it here:</p>
                  <Input className="mt-2 font-mono text-xs" value={form.secret_env_var} onChange={(e) => setForm({ ...form, secret_env_var: e.target.value })} placeholder="ENV_VAR_NAME" />
                  <p className="text-[11px] text-muted-foreground mt-1">Expected: {catalogEntry(form.service).secretHint}</p>
                </div>
              )}

              {catalogEntry(form.service)?.connectorType && (
                <div className="rounded-xl border border-emerald-300/50 bg-emerald-50/60 dark:bg-emerald-900/10 p-3 text-sm">
                  <p className="font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> OAuth connector available</p>
                  <p className="text-xs text-muted-foreground mt-1">Authorize the <code className="text-xs">{catalogEntry(form.service).connectorType}</code> connector in Dashboard → Integrations to enable live collection.</p>
                </div>
              )}

              <div><Label>Non-secret configuration (JSON or key=value)</Label><Textarea rows={3} className="font-mono text-xs" placeholder={form.service === "aws" ? '{"region":"af-south-1","account":"123456789012"}' : ""} value={form.config} onChange={(e) => setForm({ ...form, config: e.target.value })} /></div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Collection frequency</Label>
                  <Select value={form.collect_frequency} onValueChange={(v) => setForm({ ...form, collect_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQ.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                    <input type="checkbox" checked={form.auto_collect} onChange={(e) => setForm({ ...form, auto_collect: e.target.checked })} className="rounded" />
                    Auto-collect evidence
                  </label>
                </div>
              </div>

              <div>
                <Label>Controls to monitor ({form.controls_monitored.length})</Label>
                <p className="text-xs text-muted-foreground mb-2">Select the controls this connection collects evidence for.</p>
                <div className="border border-border rounded-lg max-h-44 overflow-y-auto p-2 space-y-1">
                  {controls.length === 0 && <p className="text-xs text-muted-foreground p-2">No controls available.</p>}
                  {controls.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-muted cursor-pointer">
                      <input type="checkbox" checked={form.controls_monitored.includes(c.id)} onChange={() => toggleControl(c.id)} className="rounded" />
                      <span className="text-foreground truncate">{c.control_id ? `[${c.control_id}] ` : ""}{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={!form.name}>{editing ? "Save Changes" : "Add Connection"}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
      <Icon className={`w-8 h-8 ${color}`} />
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

function CatChip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-muted"}`}>{children}</button>
  );
}