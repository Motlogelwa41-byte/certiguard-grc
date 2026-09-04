import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Loader2, ExternalLink, Link2, CheckCircle2, AlertCircle,
  ArrowLeftRight, Building2, Clock, Plus
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const SYSTEM_META = {
  jira: { label: "Jira", color: "bg-blue-100 text-blue-700" },
  linear: { label: "Linear", color: "bg-indigo-100 text-indigo-700" },
  asana: { label: "Asana", color: "bg-rose-100 text-rose-700" },
  clickup: { label: "ClickUp", color: "bg-purple-100 text-purple-700" },
};

const SYNC_STATUS_META = {
  pending_create: { label: "Pending Create", color: "bg-amber-100 text-amber-700" },
  synced: { label: "Synced", color: "bg-emerald-100 text-emerald-700" },
  pending_update: { label: "Pending Update", color: "bg-blue-100 text-blue-700" },
  auto_closed: { label: "Auto-Closed", color: "bg-emerald-100 text-emerald-700" },
  manually_closed: { label: "Manually Closed", color: "bg-slate-100 text-slate-600" },
  error: { label: "Error", color: "bg-red-100 text-red-700" },
};

export default function RemediationSyncCenter() {
  const { toast } = useToast();
  const [syncs, setSyncs] = useState([]);
  const [remediationItems, setRemediationItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [syncData, remediationData] = await Promise.all([
        base44.entities.RemediationTicketSync.list("-created_date", 200).catch(() => []),
        base44.entities.RemediationItem.list("-created_date", 100).catch(() => []),
      ]);
      setSyncs(syncData || []);
      setRemediationItems((remediationData || []).filter(r => !r.status || r.status !== 'completed'));
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncRemediationTickets", { action: "sync_status" });
      const data = res?.data || res;
      toast({ title: "Two-way sync completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Sync failed", description: e?.message }); }
    setSyncing(false);
  };

  const createTicket = async (remediationId, system, projectKey) => {
    try {
      const res = await base44.functions.invoke("syncRemediationTickets", {
        action: "create_ticket",
        remediation_item_id: remediationId,
        external_system: system,
        project_key: projectKey || "GRC",
        auto_close: true,
      });
      const data = res?.data || res;
      toast({ title: "Ticket created", description: `${SYSTEM_META[system].label} ticket ${data.ticket?.key} created` });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Create failed", description: e?.message }); }
  };

  const activeSyncs = syncs.filter(s => s.sync_status === "synced" || s.sync_status === "pending_create" || s.sync_status === "pending_update");
  const autoClosed = syncs.filter(s => s.sync_status === "auto_closed");
  const errors = syncs.filter(s => s.sync_status === "error");

  return (
    <div>
      <PageHeader
        title="Two-Way Remediation Sync"
        subtitle="Sync remediation items with Jira, Linear, Asana, and ClickUp — create tickets from findings, and auto-close items when tickets are resolved externally"
        actions={
          <Button onClick={runSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Run Two-Way Sync
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Syncs" value={activeSyncs.length} icon={ArrowLeftRight} color="blue" trendLabel="Two-way linked" />
        <StatCard label="Auto-Closed" value={autoClosed.length} icon={CheckCircle2} color="green" trendLabel="From external resolution" />
        <StatCard label="Errors" value={errors.length} icon={AlertCircle} color={errors.length > 0 ? "red" : "green"} trendLabel="Need attention" />
        <StatCard label="Systems Connected" value={new Set(syncs.map(s => s.external_system)).size} icon={Building2} color="purple" trendLabel="Jira/Linear/Asana/ClickUp" />
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active"><ArrowLeftRight className="w-4 h-4 mr-1.5" />Active ({activeSyncs.length})</TabsTrigger>
          <TabsTrigger value="closed"><CheckCircle2 className="w-4 h-4 mr-1.5" />Auto-Closed ({autoClosed.length})</TabsTrigger>
          <TabsTrigger value="errors"><AlertCircle className="w-4 h-4 mr-1.5" />Errors ({errors.length})</TabsTrigger>
          <TabsTrigger value="create"><Plus className="w-4 h-4 mr-1.5" />Create Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {activeSyncs.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No active syncs" desc="Create a ticket from a remediation item to start two-way sync." />
              ) : (
                activeSyncs.map((sync) => <SyncCard key={sync.id} sync={sync} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {autoClosed.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No auto-closed items" desc="Remediation items auto-close when their external ticket is resolved." />
              ) : (
                autoClosed.map((sync) => <SyncCard key={sync.id} sync={sync} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="errors">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {errors.length === 0 ? (
                <EmptyState icon={AlertCircle} title="No errors" desc="Sync errors will appear here when external API calls fail." />
              ) : (
                errors.map((sync) => <SyncCard key={sync.id} sync={sync} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="create">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {remediationItems.length === 0 ? (
                <EmptyState icon={Plus} title="No open remediation items" desc="Open remediation items will appear here for ticket creation." />
              ) : (
                remediationItems.map((item) => (
                  <CreateTicketCard key={item.id} item={item} onCreate={createTicket} />
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SyncCard({ sync }) {
  const sysMeta = SYSTEM_META[sync.external_system] || SYSTEM_META.jira;
  const statusMeta = SYNC_STATUS_META[sync.sync_status] || SYNC_STATUS_META.synced;

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg shrink-0 bg-blue-100 text-blue-700">
          <ArrowLeftRight className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">{sync.sync_id}</span>
            <Badge className={`text-xs ${sysMeta.color}`}>{sysMeta.label}</Badge>
            <Badge className={`text-xs ${statusMeta.color}`}>{statusMeta.label}</Badge>
            {sync.external_ticket_key && (
              <Badge variant="outline" className="text-xs font-mono">{sync.external_ticket_key}</Badge>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">{sync.remediation_title}</h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {sync.external_status && <span>External Status: <strong className="text-foreground">{sync.external_status}</strong></span>}
            {sync.external_assignee && <span>Assignee: <strong className="text-foreground">{sync.external_assignee}</strong></span>}
            {sync.external_priority && <span>Priority: <strong className="text-foreground">{sync.external_priority}</strong></span>}
            {sync.last_synced_at && <span>Last Synced: <strong className="text-foreground">{new Date(sync.last_synced_at).toLocaleString()}</strong></span>}
          </div>
          {sync.auto_close_on_resolve && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="w-3 h-3" />Auto-close on resolve enabled
            </div>
          )}
          {sync.error_message && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/10 rounded text-xs text-red-600">
              <AlertCircle className="w-3 h-3 inline mr-1" />{sync.error_message}
            </div>
          )}
          {sync.external_ticket_url && (
            <a href={sync.external_ticket_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" />View in {sysMeta.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTicketCard({ item, onCreate }) {
  const [system, setSystem] = useState("jira");
  const [projectKey, setProjectKey] = useState("GRC");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    await onCreate(item.id, system, projectKey);
    setCreating(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-lg shrink-0 bg-amber-100 text-amber-700">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">{item.title || item.description || 'Remediation Item'}</h3>
          {item.description && <p className="text-xs text-muted-foreground mb-2">{item.description}</p>}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
            {item.priority && <span>Priority: <strong className="text-foreground">{item.priority}</strong></span>}
            {item.due_date && <span>Due: <strong className="text-foreground">{item.due_date}</strong></span>}
            {item.assigned_to && <span>Assigned: <strong className="text-foreground">{item.assigned_to}</strong></span>}
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Ticket System</label>
              <select value={system} onChange={(e) => setSystem(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-transparent text-sm">
                <option value="jira">Jira</option>
                <option value="linear">Linear</option>
                <option value="asana">Asana</option>
                <option value="clickup">ClickUp</option>
              </select>
            </div>
            {system === "jira" && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Project Key</label>
                <input value={projectKey} onChange={(e) => setProjectKey(e.target.value)} className="px-2 py-1.5 rounded-md border border-input bg-transparent text-sm w-24" />
              </div>
            )}
            <Button size="sm" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
              Create Ticket
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{desc}</p>
    </div>
  );
}