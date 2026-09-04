import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye, RefreshCw, AlertTriangle, ShieldCheck, Loader2, Globe,
  Users, Sparkles, CheckCircle2, XCircle, Search
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const CATEGORY_META = {
  ai_tool: { label: "AI Tool", icon: Sparkles, color: "bg-purple-100 text-purple-700" },
  productivity: { label: "Productivity", icon: Globe, color: "bg-blue-100 text-blue-700" },
  communication: { label: "Communication", icon: Globe, color: "bg-cyan-100 text-cyan-700" },
  developer_tool: { label: "Developer", icon: Globe, color: "bg-indigo-100 text-indigo-700" },
  design: { label: "Design", icon: Globe, color: "bg-pink-100 text-pink-700" },
  analytics: { label: "Analytics", icon: Globe, color: "bg-emerald-100 text-emerald-700" },
  crm: { label: "CRM", icon: Globe, color: "bg-orange-100 text-orange-700" },
  marketing: { label: "Marketing", icon: Globe, color: "bg-rose-100 text-rose-700" },
  hr: { label: "HR", icon: Globe, color: "bg-teal-100 text-teal-700" },
  finance: { label: "Finance", icon: Globe, color: "bg-green-100 text-green-700" },
  project_management: { label: "Project Mgmt", icon: Globe, color: "bg-slate-100 text-slate-700" },
  file_storage: { label: "File Storage", icon: Globe, color: "bg-amber-100 text-amber-700" },
  other: { label: "Other", icon: Globe, color: "bg-slate-100 text-slate-600" },
};

const RISK_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700",
};

const VETTING_STATUS_META = {
  unvetted: { label: "Unvetted", color: "bg-red-100 text-red-700", icon: XCircle },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700", icon: Eye },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  blocked: { label: "Blocked", color: "bg-red-100 text-red-700", icon: XCircle },
  retired: { label: "Retired", color: "bg-slate-100 text-slate-600", icon: XCircle },
};

export default function ShadowITDiscovery() {
  const { toast } = useToast();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ShadowITApp.list("-risk_score", 100).catch(() => []);
      setApps(data || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("discoverShadowIT", {});
      const data = res?.data || res;
      toast({ title: "Shadow IT scan completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Scan failed", description: e?.message }); }
    setScanning(false);
  };

  const unvettedApps = apps.filter(a => !a.vetted);
  const highRiskApps = apps.filter(a => a.risk_level === "high" || a.risk_level === "critical");
  const aiTools = apps.filter(a => a.app_category === "ai_tool");
  const vettedApps = apps.filter(a => a.vetted);

  return (
    <div>
      <PageHeader
        title="Shadow IT Discovery"
        subtitle="Discover unsanctioned SaaS apps and AI tools employees are using via identity provider logs — flag unvetted vendors automatically"
        actions={
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
            Run Shadow IT Scan
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total Apps" value={apps.length} icon={Globe} color="blue" trendLabel="Discovered" />
        <StatCard label="Unvetted" value={unvettedApps.length} icon={AlertTriangle} color={unvettedApps.length > 0 ? "red" : "green"} trendLabel="Need review" />
        <StatCard label="High Risk" value={highRiskApps.length} icon={ShieldCheck} color={highRiskApps.length > 0 ? "red" : "green"} trendLabel="Critical exposure" />
        <StatCard label="AI Tools" value={aiTools.length} icon={Sparkles} color="blue" trendLabel="AI/LLM apps" />
        <StatCard label="Vetted" value={vettedApps.length} icon={CheckCircle2} color="green" trendLabel="Approved" />
      </div>

      <Tabs defaultValue="unvetted" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="unvetted"><AlertTriangle className="w-4 h-4 mr-1.5" />Unvetted ({unvettedApps.length})</TabsTrigger>
          <TabsTrigger value="highrisk"><ShieldCheck className="w-4 h-4 mr-1.5" />High Risk ({highRiskApps.length})</TabsTrigger>
          <TabsTrigger value="ai"><Sparkles className="w-4 h-4 mr-1.5" />AI Tools ({aiTools.length})</TabsTrigger>
          <TabsTrigger value="all"><Globe className="w-4 h-4 mr-1.5" />All Apps ({apps.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unvetted">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {unvettedApps.length === 0 ? (
                <EmptyState icon={CheckCircle2} title="All apps vetted" desc="Run a shadow IT scan to discover unsanctioned apps employees are using." />
              ) : (
                unvettedApps.map((app) => <ShadowITAppCard key={app.id} app={app} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="highrisk">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {highRiskApps.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No high-risk apps" desc="High-risk shadow IT apps will appear here when discovered." />
              ) : (
                highRiskApps.map((app) => <ShadowITAppCard key={app.id} app={app} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {aiTools.length === 0 ? (
                <EmptyState icon={Sparkles} title="No AI tools discovered" desc="AI tools (ChatGPT, Claude, Gemini, etc.) will appear here when employees use them via SSO." />
              ) : (
                aiTools.map((app) => <ShadowITAppCard key={app.id} app={app} />)
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {apps.length === 0 ? (
                <EmptyState icon={Globe} title="No apps discovered yet" desc="Run a shadow IT scan to discover unsanctioned SaaS apps and AI tools." />
              ) : (
                apps.map((app) => <ShadowITAppCard key={app.id} app={app} />)
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ShadowITAppCard({ app }) {
  const catMeta = CATEGORY_META[app.app_category] || CATEGORY_META.other;
  const CatIcon = catMeta.icon;
  const vettingMeta = VETTING_STATUS_META[app.vetting_status] || VETTING_STATUS_META.unvetted;
  const VetIcon = vettingMeta.icon;
  let users = [];
  try { users = JSON.parse(app.discovered_users || '[]'); } catch (_) {}
  let departments = [];
  try { departments = JSON.parse(app.departments_using || '[]'); } catch (_) {}

  return (
    <div className={`bg-card rounded-xl border p-4 shadow-sm ${!app.vetted ? 'border-red-200 dark:border-red-800' : 'border-border'}`}>
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-lg shrink-0 ${catMeta.color}`}>
          <CatIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono text-muted-foreground">{app.app_id}</span>
            <h3 className="text-sm font-semibold text-foreground">{app.app_name}</h3>
            <Badge className={`text-xs ${catMeta.color}`}>{catMeta.label}</Badge>
            <Badge className={`text-xs ${RISK_COLOR[app.risk_level] || RISK_COLOR.medium}`}>{app.risk_level}</Badge>
            <Badge variant="outline" className="text-xs">Score: {app.risk_score}/100</Badge>
            <Badge className={`text-xs ${vettingMeta.color}`}><VetIcon className="w-3 h-3 mr-1" />{vettingMeta.label}</Badge>
            {app.vendor_matched && <Badge className="bg-emerald-100 text-emerald-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />In Vendor Inventory</Badge>}
          </div>
          {app.app_url && (
            <a href={app.app_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mb-1 inline-block">{app.app_url}</a>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Users: <strong className="text-foreground">{app.user_count}</strong></span>
            <span>Source: <strong className="text-foreground">{app.discovery_source?.replace(/_/g, ' ')}</strong></span>
            <span>Data Access: <strong className="text-foreground">{app.data_access_level?.replace(/_/g, ' ')}</strong></span>
            {departments.length > 0 && <span>Depts: <strong className="text-foreground">{departments.join(', ')}</strong></span>}
            {app.first_seen && <span>First seen: <strong className="text-foreground">{new Date(app.first_seen).toLocaleDateString()}</strong></span>}
            {app.last_seen && <span>Last seen: <strong className="text-foreground">{new Date(app.last_seen).toLocaleDateString()}</strong></span>}
          </div>
          {users.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Discovered Users ({users.length})</p>
              <div className="flex flex-wrap gap-1.5">
                {users.slice(0, 5).map((u, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{u.name || u.email}{u.department ? ` · ${u.department}` : ''}</Badge>
                ))}
                {users.length > 5 && <span className="text-xs text-muted-foreground">+{users.length - 5} more</span>}
              </div>
            </div>
          )}
          {app.security_alert_id && (
            <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />Security Alert Created
            </div>
          )}
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