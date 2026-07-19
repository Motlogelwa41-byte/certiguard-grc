import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/shared/StatusBadge";
import { Plus, RefreshCw, Trash2, Bug, Upload, Download, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Cloud } from "lucide-react";

const SOURCES = ["security_hub", "guardduty", "nessus", "qualys", "crowdstrike", "defender", "rapid7", "tenable", "snipe", "other"];
const SEVERITIES = ["critical", "high", "medium", "low", "info"];
const STATUSES = ["open", "in_progress", "remediated", "accepted", "false_positive"];

const sevColor = (s) => ({ critical: "text-rose-500", high: "text-orange-500", medium: "text-amber-500", low: "text-sky-500", info: "text-muted-foreground" }[s] || "text-muted-foreground");

export default function Vulnerabilities() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fSource, setFSource] = useState("all");
  const [fSev, setFSev] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [q, setQ] = useState("");
  const [triage, setTriage] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [hubSyncing, setHubSyncing] = useState(false);
  const [sel, setSel] = useState([]);
  const [controls, setControls] = useState([]);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [f, ctls] = await Promise.all([
      base44.entities.SecurityFinding.list("-created_date", 500),
      base44.entities.Control.list("-updated_date", 500),
    ]);
    setControls(ctls || []);
    const now = new Date();
    const enriched = (f || []).map((x) => ({ ...x, sla_breached: x.status === "open" && x.due_date && new Date(x.due_date) < now }));
    setFindings(enriched);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = findings.filter((f) =>
    (fSource === "all" || f.source === fSource) &&
    (fSev === "all" || f.severity === fSev) &&
    (fStatus === "all" || f.status === fStatus) &&
    (!q || (f.title + f.asset + f.cve + (f.finding_id || "")).toLowerCase().includes(q.toLowerCase()))
  );

  const counts = {
    critical: findings.filter((f) => f.severity === "critical" && f.status !== "remediated" && f.status !== "false_positive").length,
    high: findings.filter((f) => f.severity === "high" && f.status !== "remediated" && f.status !== "false_positive").length,
    open: findings.filter((f) => f.status === "open").length,
    breached: findings.filter((f) => f.sla_breached).length,
  };
  const SEV_COLORS = { critical: "#e11d48", high: "#f97316", medium: "#f59e0b", low: "#0ea5e9", info: "#94a3b8" };
  const severityData = SEVERITIES.map((s) => ({ key: s, name: s, value: findings.filter((f) => f.severity === s).length }));
  const statusData = STATUSES.map((s) => ({ name: s.replace(/_/g, " "), value: findings.filter((f) => f.status === s).length }));

  const saveTriage = async () => {
    try {
      const linkedIds = Array.isArray(triage.linked_control_ids) ? triage.linked_control_ids : [];
      const linkedNames = linkedIds.map((id) => { const c = controls.find((x) => x.id === id); return c ? c.title : ""; }).filter(Boolean);
      const updates = { status: triage.status, owner_name: triage.owner_name, due_date: triage.due_date, notes: triage.notes, linked_control_ids: linkedIds, linked_control_names: linkedNames, remediated_date: triage.status === "remediated" ? new Date().toISOString().slice(0, 10) : triage.remediated_date };
      await base44.entities.SecurityFinding.update(triage.id, updates);
      toast({ title: "Finding updated" });
      setTriage(null); load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const parsed = JSON.parse(importText);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const res = await base44.functions.invoke("ingestSecurityFindings", { findings: list });
      const data = res?.data || res;
      if (data?.ok) { toast({ title: "Findings imported", description: `${data.count} findings ingested.` }); setImportOpen(false); setImportText(""); load(); }
      else toast({ title: "Import failed", description: data?.error, variant: "destructive" });
    } catch (e) { toast({ title: "Invalid JSON or error", description: e.message, variant: "destructive" }); }
    setImporting(false);
  };

  const bulkUpdate = async (status) => {
    if (!sel.length) return;
    await Promise.all(sel.map((id) => base44.entities.SecurityFinding.update(id, { status, remediated_date: status === "remediated" ? new Date().toISOString().slice(0, 10) : undefined })));
    toast({ title: `${sel.length} findings → ${status}` });
    setSel([]); load();
  };

  const remove = async (f) => { await base44.entities.SecurityFinding.delete(f.id); load(); toast({ title: "Finding deleted" }); };

  const syncHub = async () => {
    setHubSyncing(true);
    try {
      const res = await base44.functions.invoke("syncAwsSecurityHub", {});
      const data = res?.data || res;
      if (data?.ok) { toast({ title: "Security Hub synced", description: `${data.count} findings pulled from AWS Security Hub.` }); load(); }
      else toast({ title: "Sync failed", description: data?.error, variant: "destructive" });
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    setHubSyncing(false);
  };

  const exportCsv = () => {
    const rows = [["finding_id", "source", "title", "severity", "status", "asset", "cve", "due_date", "owner", "sla_hours"]];
    filtered.forEach((f) => rows.push([f.finding_id, f.source, `"${(f.title || "").replace(/"/g, '""')}"`, f.severity, f.status, f.asset, f.cve, f.due_date, f.owner_name, f.sla_hours]));
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "security_findings.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Security Findings" subtitle="Ingest and triage CSPM, vulnerability scanner, and EDR findings with SLA tracking"
        actions={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={syncHub} disabled={hubSyncing}>{hubSyncing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Cloud className="w-4 h-4 mr-1" />} Security Hub</Button><Button size="sm" variant="outline" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4 mr-1" /> Import</Button><Button size="sm" variant="outline" onClick={exportCsv}><Download className="w-4 h-4 mr-1" /> Export</Button></div>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Critical open" value={counts.critical} icon={ShieldAlert} color="text-rose-500" />
        <StatTile label="High open" value={counts.high} icon={AlertTriangle} color="text-orange-500" />
        <StatTile label="Total open" value={counts.open} icon={Bug} color="text-amber-500" />
        <StatTile label="SLA breached" value={counts.breached} icon={AlertTriangle} color="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Findings by severity</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {severityData.map((d) => <Cell key={d.key} fill={SEV_COLORS[d.key]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            {severityData.map((d) => <span key={d.key} className="text-[11px] flex items-center gap-1.5 capitalize"><span className="w-2.5 h-2.5 rounded-full" style={{ background: SEV_COLORS[d.key] }} />{d.name} ({d.value})</span>)}
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-heading font-semibold mb-3">Findings by status</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input placeholder="Search findings…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <Select value={fSource} onValueChange={setFSource}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All sources</SelectItem>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
        <Select value={fSev} onValueChange={setFSev}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All severities</SelectItem>{SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent></Select>
        <Select value={fStatus} onValueChange={setFStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
        {sel.length > 0 && <div className="flex gap-2 ml-auto"><Button size="sm" variant="outline" onClick={() => bulkUpdate("in_progress")}>Mark In Progress</Button><Button size="sm" variant="outline" onClick={() => bulkUpdate("accepted")}>Accept</Button><Button size="sm" onClick={() => bulkUpdate("remediated")}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Remediate</Button></div>}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center"><Bug className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground">No findings match. Import findings from a scanner or cloud source to get started.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="p-3 w-8"><input type="checkbox" checked={sel.length === filtered.length && filtered.length > 0} onChange={(e) => setSel(e.target.checked ? filtered.map((f) => f.id) : [])} className="rounded" /></th>
                  <th className="text-left p-3 font-medium">Finding</th>
                  <th className="text-left p-3 font-medium">Source</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Asset</th>
                  <th className="text-left p-3 font-medium">Due</th>
                  <th className="text-left p-3 font-medium">Owner</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((f) => (
                  <tr key={f.id} className={`hover:bg-muted/30 ${f.sla_breached ? "bg-rose-50/40 dark:bg-rose-900/10" : ""}`}>
                    <td className="p-3"><input type="checkbox" checked={sel.includes(f.id)} onChange={(e) => setSel((s) => e.target.checked ? [...s, f.id] : s.filter((x) => x !== f.id))} className="rounded" /></td>
                    <td className="p-3"><p className="font-medium text-foreground">{f.title}</p><p className="text-xs text-muted-foreground">{f.finding_id}{f.cve ? ` · ${f.cve}` : ""}</p></td>
                    <td className="p-3 text-muted-foreground capitalize">{f.source.replace(/_/g, " ")}</td>
                    <td className={`p-3 font-medium capitalize ${sevColor(f.severity)}`}>{f.severity}</td>
                    <td className="p-3"><StatusBadge status={f.status} /></td>
                    <td className="p-3 text-muted-foreground text-xs">{f.asset || "—"}</td>
                    <td className="p-3 text-xs"><span className={f.sla_breached ? "text-rose-500 font-medium" : "text-muted-foreground"}>{f.due_date || "—"}</span>{f.sla_breached && <span className="block text-[10px] text-rose-500">SLA breached</span>}</td>
                    <td className="p-3 text-muted-foreground text-xs">{f.owner_name || "—"}</td>
                    <td className="p-3"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setTriage(f)}>Triage</Button><button onClick={() => remove(f)} className="p-1.5 rounded hover:bg-muted"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Triage dialog */}
      <Dialog open={!!triage} onOpenChange={(o) => !o && setTriage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Triage Finding</DialogTitle></DialogHeader>
          {triage && (
            <div className="space-y-4">
              <div><p className="font-medium text-foreground">{triage.title}</p><p className="text-xs text-muted-foreground mt-1">{triage.description}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Status</Label><Select value={triage.status} onValueChange={(v) => setTriage({ ...triage, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Owner</Label><Input value={triage.owner_name || ""} onChange={(e) => setTriage({ ...triage, owner_name: e.target.value })} /></div>
              </div>
              <div><Label>Due date</Label><Input type="date" value={triage.due_date || ""} onChange={(e) => setTriage({ ...triage, due_date: e.target.value })} /></div>
              <div>
                <Label>Linked compliance controls ({(triage.linked_control_ids || []).length})</Label>
                <div className="border border-border rounded-lg max-h-40 overflow-y-auto p-2 space-y-1">
                  {controls.length === 0 && <p className="text-xs text-muted-foreground p-1">No controls available.</p>}
                  {controls.map((c) => {
                    const on = (triage.linked_control_ids || []).includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 text-xs py-0.5 px-1 rounded hover:bg-muted cursor-pointer">
                        <input type="checkbox" checked={on} onChange={() => setTriage((t) => ({ ...t, linked_control_ids: on ? (t.linked_control_ids || []).filter((x) => x !== c.id) : [...(t.linked_control_ids || []), c.id] }))} className="rounded" />
                        <span className="text-foreground truncate">{c.control_id ? `[${c.control_id}] ` : ""}{c.title}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div><Label>Notes</Label><Textarea rows={3} value={triage.notes || ""} onChange={(e) => setTriage({ ...triage, notes: e.target.value })} /></div>
              <Button className="w-full" onClick={saveTriage}>Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import Findings</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Paste a JSON array of findings. Each: {"{ source, title, severity, asset, cve, resource_id, description }"}.</p>
          <Textarea rows={10} className="font-mono text-xs" placeholder={'[{ "source": "security_hub", "title": "Public S3 bucket", "severity": "high", "asset": "s3://my-bucket" }]'} value={importText} onChange={(e) => setImportText(e.target.value)} />
          <Button className="w-full" onClick={doImport} disabled={importing || !importText}>{importing ? "Importing…" : "Import findings"}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }) {
  return <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"><Icon className={`w-8 h-8 ${color}`} /><div><p className="text-2xl font-bold text-foreground leading-none">{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></div></div>;
}