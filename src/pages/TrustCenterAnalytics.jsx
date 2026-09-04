import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Building2, FileCheck, Download, MessageSquare, Lock, Eye, Activity, RefreshCw, Mail, ExternalLink } from "lucide-react";

const ACTIVITY_ICONS = {
  page_view: Eye, document_view: FileCheck, document_download: Download,
  question_submitted: MessageSquare, nda_signed: Lock, nda_viewed: FileCheck,
  framework_viewed: Eye, badge_clicked: Activity, contact_form: Mail, access_requested: Users
};

export default function TrustCenterAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("processNdaRequest", { action: "get_analytics" });
      setData(res.data);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const summary = data?.summary || {};
  const accounts = (data?.accounts || []).filter(a =>
    !search || a.domain?.toLowerCase().includes(search.toLowerCase()) || a.company?.toLowerCase().includes(search.toLowerCase())
  );
  const activities = data?.recent_activities || [];

  return (
    <div>
      <PageHeader
        title="Trust Center Analytics"
        subtitle="Account-level visitor analytics — your Security CRM pipeline"
        actions={<Button size="sm" variant="outline" onClick={load}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Visitors" value={summary.total_visitors || 0} icon={Users} color="blue" />
        <StatCard label="Accounts" value={summary.total_accounts || 0} icon={Building2} color="purple" />
        <StatCard label="NDAs Signed" value={summary.nda_signed_count || 0} icon={Lock} color="green" />
        <StatCard label="Doc Downloads" value={summary.document_downloads || 0} icon={Download} color="amber" />
        <StatCard label="Questions" value={summary.questions_asked || 0} icon={MessageSquare} color="slate" />
        <StatCard label="Active Access" value={summary.active_access || 0} icon={Eye} color="red" />
      </div>

      {/* Account-Level Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <h3 className="font-heading font-semibold text-foreground">Prospect Accounts</h3>
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Company / Domain</th>
                <th className="text-left px-4 py-3 font-semibold">Visitors</th>
                <th className="text-left px-4 py-3 font-semibold">Visits</th>
                <th className="text-left px-4 py-3 font-semibold">NDA</th>
                <th className="text-left px-4 py-3 font-semibold">Docs Viewed</th>
                <th className="text-left px-4 py-3 font-semibold">Docs Downloaded</th>
                <th className="text-left px-4 py-3 font-semibold">Questions</th>
                <th className="text-left px-4 py-3 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {accounts.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">No visitor accounts yet. Share your Trust Center link to start collecting analytics.</td></tr>
              ) : accounts.map((acct, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{acct.company || acct.domain}</div>
                    <div className="text-xs text-muted-foreground">{acct.domain}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      {acct.visitors.slice(0, 2).map((v, j) => (
                        <div key={j} className="text-xs">
                          <span className="font-medium text-foreground">{v.name}</span>
                          <span className="text-muted-foreground"> · {v.title || '—'}</span>
                        </div>
                      ))}
                      {acct.visitors.length > 2 && <span className="text-xs text-muted-foreground">+{acct.visitors.length - 2} more</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums">{acct.total_visits}</td>
                  <td className="px-4 py-3">
                    {acct.nda_signed
                      ? <Badge className="bg-emerald-100 text-emerald-700 border-0">Signed</Badge>
                      : <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{acct.documents_viewed_count}</td>
                  <td className="px-4 py-3 tabular-nums">{acct.documents_downloaded_count}</td>
                  <td className="px-4 py-3 tabular-nums">{acct.questions_asked}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {acct.last_activity ? new Date(acct.last_activity).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-heading font-semibold text-foreground mb-4">Recent Activity</h3>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activities.map((act, i) => {
              const Icon = ACTIVITY_ICONS[act.activity_type] || Activity;
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{act.visitor_name || "Anonymous"}</span>
                      {act.visitor_company && <span className="text-muted-foreground"> · {act.visitor_company}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {act.activity_type.replace(/_/g, ' ')}
                      {act.activity_detail && ` — ${act.activity_detail}`}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {act.created_date ? new Date(act.created_date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}