import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, Lock, Search, Eye, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PrivacyRequestForm from "@/components/privacy/PrivacyRequestForm";

export default function PrivacyRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [scanning, setScanning] = useState(false);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.PrivacyRequest.list("-created_date", 500)
      .then((d) => setItems(d || []))
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("handlePrivacyRequestSla", {});
      const d = res.data || res;
      toast({ title: "SLA scan complete", description: `${d.flagged || 0} flagged overdue · ${d.resolved || 0} cleared` });
      load();
    } catch (e) { toast({ title: "Scan failed", description: e.message, variant: "destructive" }); }
    finally { setScanning(false); }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete request from ${r.requester_name}?`)) return;
    await base44.entities.PrivacyRequest.delete(r.id);
    load();
    toast({ title: "Request deleted" });
  };

  const filtered = items.filter((r) => !search || `${r.requester_name} ${r.request_id} ${r.request_type}`.toLowerCase().includes(search.toLowerCase()));
  const open = items.filter((r) => !["closed", "rejected", "response_sent"].includes(r.status)).length;
  const overdue = items.filter((r) => r.sla_breached).length;

  return (
    <div>
      <PageHeader title="Privacy Requests (DSAR)" subtitle="Intake, route, and track data-subject requests with statutory SLA monitoring"
        actions={
          <>
            <Button variant="outline" onClick={scan} disabled={scanning}>{scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Scan SLAs</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New request</Button>
          </>
        } />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total" value={items.length} icon={Lock} color="blue" />
        <StatCard label="Open" value={open} icon={Lock} color={open ? "amber" : "slate"} />
        <StatCard label="Overdue" value={overdue} icon={Lock} color={overdue ? "red" : "slate"} />
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests…" className="pl-9 max-w-md" />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lock className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No privacy requests. Intake a data-subject access or erasure request to begin.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New request</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Request</th>
                  <th className="text-left px-4 py-3">Requester</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Due</th>
                  <th className="text-left px-4 py-3">SLA</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3"><Link to={`/privacy-requests/${r.id}`} className="font-medium hover:underline">{r.request_id}</Link></td>
                    <td className="px-4 py-3 text-muted-foreground">{r.requester_name}</td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">{(r.request_type || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.due_date || "—"}</td>
                    <td className="px-4 py-3">{r.sla_breached ? <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">BREACHED</span> : <span className="text-xs text-emerald-600">on track</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild><Link to={`/privacy-requests/${r.id}`}><Eye className="w-4 h-4" /></Link></Button>
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <PrivacyRequestForm open={formOpen} onOpenChange={setFormOpen} editing={editing} onSaved={load} />
    </div>
  );
}