import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Server, Database, FileText, RefreshCw, Plus, Link2,
  CheckCircle2, AlertCircle, Eye, Activity, Settings, ExternalLink
} from "lucide-react";

export default function DataCenterIntegrations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [testing, setTesting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [form, setForm] = useState({
    integration_id: "",
    platform: "confluence_dc",
    instance_name: "",
    base_url: "",
    auth_method: "pat",
    username: "",
    auto_sync_enabled: false,
    sync_frequency: "daily",
    track_access_events: true
  });

  const load = useCallback(async () => {
    try {
      const data = await base44.functions.syncDataCenterIntegration({ action: "list_integrations" });
      setIntegrations(data.integrations || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load integrations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = (platform) => {
    setForm({
      integration_id: `DCI-${Date.now().toString().slice(-6)}`,
      platform,
      instance_name: "",
      base_url: "",
      auth_method: "pat",
      username: "",
      auto_sync_enabled: false,
      sync_frequency: "daily",
      track_access_events: true
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!form.instance_name || !form.base_url) {
      toast({ title: "Name and URL required", variant: "destructive" });
      return;
    }
    try {
      await base44.entities.DataCenterIntegration.create(form);
      toast({ title: "Integration created" });
      setShowDialog(false);
      load();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const testConnection = async (integration) => {
    setTesting(integration.id);
    try {
      const result = await base44.functions.syncDataCenterIntegration({
        action: "test_connection",
        integration_id: integration.id,
        platform: integration.platform
      });
      if (result.connected) {
        toast({ title: "Connection successful", description: `Connected to ${integration.platform === "confluence_dc" ? "Confluence" : "Jira"} Data Center` });
      } else {
        toast({ title: "Connection failed", description: result.error, variant: "destructive" });
      }
      load();
    } catch (err) {
      toast({ title: "Connection error", description: err.message, variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const syncNow = async (integration) => {
    setSyncing(integration.id);
    try {
      const result = await base44.functions.syncDataCenterIntegration({
        action: "sync",
        integration_id: integration.id
      });
      toast({
        title: "Sync complete",
        description: result.total_spaces != null
          ? `${result.total_spaces} spaces, ${result.total_pages} pages synced`
          : `${result.total_projects} projects, ${result.total_issues} issues synced`
      });
      load();
    } catch (err) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  const toggleAutoSync = async (integration, value) => {
    await base44.entities.DataCenterIntegration.update(integration.id, { auto_sync_enabled: value });
    load();
  };

  const remove = async (integration) => {
    if (!confirm(`Remove "${integration.instance_name}"?`)) return;
    await base44.entities.DataCenterIntegration.delete(integration.id);
    toast({ title: "Integration removed" });
    load();
  };

  const statusColor = (status) => {
    const map = {
      connected: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      error: "bg-red-500/10 text-red-400 border-red-500/20",
      disconnected: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      syncing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      pending: "bg-amber-500/10 text-amber-400 border-amber-500/20"
    };
    return map[status] || map.pending;
  };

  const parseSpaces = (json) => {
    try { return JSON.parse(json || "[]"); } catch { return []; }
  };

  const confluenceInts = integrations.filter(i => i.platform === "confluence_dc");
  const jiraInts = integrations.filter(i => i.platform === "jira_dc");

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Data Center Integrations"
        subtitle="Sync documentation and track access from self-hosted Confluence and Jira instances"
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Integrations" value={integrations.length} icon={Server} color="blue" />
        <StatCard label="Connected" value={integrations.filter(i => i.sync_status === "connected").length} icon={CheckCircle2} color="green" />
        <StatCard label="Pages Synced" value={integrations.reduce((s, i) => s + (i.total_pages_synced || 0), 0)} icon={FileText} color="purple" />
        <StatCard label="Access Events" value={integrations.reduce((s, i) => s + (i.access_events_tracked || 0), 0)} icon={Eye} color="amber" />
      </div>

      <Tabs defaultValue="confluence">
        <TabsList>
          <TabsTrigger value="confluence"><Database className="w-4 h-4 mr-2" />Confluence DC</TabsTrigger>
          <TabsTrigger value="jira"><Server className="w-4 h-4 mr-2" />Jira DC</TabsTrigger>
        </TabsList>

        <TabsContent value="confluence" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreate("confluence_dc")}><Plus className="w-4 h-4 mr-2" />Add Confluence DC</Button>
          </div>
          {confluenceInts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">No Confluence Data Center integrations configured.</p>
                <p className="text-xs text-muted-foreground mb-4">Requires CONFLUENCE_DC_BASE_URL, CONFLUENCE_DC_TOKEN, and CONFLUENCE_DC_USERNAME secrets.</p>
                <Button onClick={() => openCreate("confluence_dc")}><Plus className="w-4 h-4 mr-2" />Connect Instance</Button>
              </CardContent>
            </Card>
          ) : (
            confluenceInts.map(int => (
              <Card key={int.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        {int.instance_name}
                        <Badge className={statusColor(int.sync_status)}>{int.sync_status}</Badge>
                      </CardTitle>
                      <a href={int.base_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 mt-1">
                        {int.base_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => testConnection(int)} disabled={testing === int.id}>
                        {testing === int.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Link2 className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => syncNow(int)} disabled={syncing === int.id}>
                        {syncing === int.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-1.5">Sync</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(int)}>Remove</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Spaces</p>
                      <p className="text-xl font-bold">{int.total_spaces || 0}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Pages Synced</p>
                      <p className="text-xl font-bold">{int.total_pages_synced || 0}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Access Events</p>
                      <p className="text-xl font-bold">{int.access_events_tracked || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={int.auto_sync_enabled} onCheckedChange={v => toggleAutoSync(int, v)} />
                      <Label>Auto-sync ({int.sync_frequency})</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={int.track_access_events} onCheckedChange={v => base44.entities.DataCenterIntegration.update(int.id, { track_access_events: v })} />
                      <Label>Track access events</Label>
                    </div>
                  </div>
                  {int.last_sync_at && (
                    <p className="text-xs text-muted-foreground">Last synced: {new Date(int.last_sync_at).toLocaleString()}</p>
                  )}
                  {int.last_error && (
                    <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 inline mr-1" />{int.last_error}
                    </div>
                  )}
                  {parseSpaces(int.spaces_synced).length > 0 && (
                    <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Synced Spaces:</p>
                      {parseSpaces(int.spaces_synced).slice(0, 10).map(s => (
                        <div key={s.space_key} className="flex items-center justify-between text-xs border-b border-border/50 pb-1">
                          <span className="font-medium">{s.space_name} ({s.space_key})</span>
                          <span className="text-muted-foreground">{s.page_count} pages</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="jira" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openCreate("jira_dc")}><Plus className="w-4 h-4 mr-2" />Add Jira DC</Button>
          </div>
          {jiraInts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Server className="w-12 h-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-2">No Jira Data Center integrations configured.</p>
                <p className="text-xs text-muted-foreground mb-4">Requires JIRA_DC_BASE_URL and JIRA_DC_TOKEN secrets.</p>
                <Button onClick={() => openCreate("jira_dc")}><Plus className="w-4 h-4 mr-2" />Connect Instance</Button>
              </CardContent>
            </Card>
          ) : (
            jiraInts.map(int => (
              <Card key={int.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-400" />
                        {int.instance_name}
                        <Badge className={statusColor(int.sync_status)}>{int.sync_status}</Badge>
                      </CardTitle>
                      <a href={int.base_url} target="_blank" rel="noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 mt-1">
                        {int.base_url} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => testConnection(int)} disabled={testing === int.id}>
                        {testing === int.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Link2 className="w-4 h-4" />}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => syncNow(int)} disabled={syncing === int.id}>
                        {syncing === int.id ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        <span className="ml-1.5">Sync</span>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(int)}>Remove</Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Projects</p>
                      <p className="text-xl font-bold">{int.total_spaces || 0}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Issues Synced</p>
                      <p className="text-xl font-bold">{int.total_issues_synced || 0}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-xs text-muted-foreground">Access Events</p>
                      <p className="text-xl font-bold">{int.access_events_tracked || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={int.auto_sync_enabled} onCheckedChange={v => toggleAutoSync(int, v)} />
                      <Label>Auto-sync ({int.sync_frequency})</Label>
                    </div>
                  </div>
                  {int.last_sync_at && (
                    <p className="text-xs text-muted-foreground mt-2">Last synced: {new Date(int.last_sync_at).toLocaleString()}</p>
                  )}
                  {int.last_error && (
                    <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2 text-xs text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 inline mr-1" />{int.last_error}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect {form.platform === "confluence_dc" ? "Confluence" : "Jira"} Data Center</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Instance Name</Label>
              <Input value={form.instance_name} onChange={e => setForm({ ...form, instance_name: e.target.value })} placeholder="e.g. Corporate Confluence" />
            </div>
            <div>
              <Label>Base URL</Label>
              <Input value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} placeholder="https://confluence.yourcompany.com" />
            </div>
            <div>
              <Label>Username (optional, for Basic auth)</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="admin@company.com" />
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Configure secrets in Settings: {form.platform === "confluence_dc" ? "CONFLUENCE_DC_BASE_URL, CONFLUENCE_DC_TOKEN" : "JIRA_DC_BASE_URL, JIRA_DC_TOKEN"}
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.auto_sync_enabled} onCheckedChange={v => setForm({ ...form, auto_sync_enabled: v })} />
              <Label>Enable auto-sync</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.track_access_events} onCheckedChange={v => setForm({ ...form, track_access_events: v })} />
              <Label>Track document access events for audit evidence</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}