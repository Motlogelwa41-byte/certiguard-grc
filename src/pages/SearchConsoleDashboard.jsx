import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import {
  Search, MousePointerClick, Eye, TrendingUp, MapPin,
  RefreshCw, ExternalLink, FileText, AlertCircle, Loader2
} from "lucide-react";

export default function SearchConsoleDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(28);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("fetchSearchConsoleData", { days });
      setData(res?.data || res);
    } catch (e) {
      toast({ title: "Failed to load search data", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  if (!data.connected) {
    return (
      <div>
        <PageHeader title="Google Search Console" subtitle="Search performance & indexing status" />
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground/30" />
          <h2 className="text-xl font-heading font-bold">Not Connected</h2>
          <p className="text-muted-foreground max-w-md">{data.message}</p>
        </div>
      </div>
    );
  }

  if (data.message && !data.totals) {
    return (
      <div>
        <PageHeader title="Google Search Console" subtitle="Search performance & indexing status" />
        <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
          <AlertCircle className="w-16 h-16 text-amber-400" />
          <h2 className="text-xl font-heading font-bold">No Sites Found</h2>
          <p className="text-muted-foreground max-w-md">{data.message}</p>
          <Button asChild>
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Open Google Search Console
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const { totals, topQueries, topPages, sitemaps, site, period } = data;

  return (
    <div>
      <PageHeader
        title="Google Search Console"
        subtitle={`${site} · Last ${period.days} days (${period.start} → ${period.end})`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm border border-border rounded-lg px-3 py-2 bg-card"
            >
              <option value={7}>Last 7 days</option>
              <option value={28}>Last 28 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <Button size="sm" variant="outline" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-1" /> Open GSC
              </a>
            </Button>
          </div>
        }
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={MousePointerClick} label="Total Clicks" value={totals.clicks.toLocaleString()} color="text-blue-600" />
        <StatCard icon={Eye} label="Impressions" value={totals.impressions.toLocaleString()} color="text-purple-600" />
        <StatCard icon={TrendingUp} label="Avg CTR" value={`${totals.ctr}%`} color="text-emerald-600" />
        <StatCard icon={MapPin} label="Avg Position" value={totals.avgPosition} color="text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Search Queries */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Top Search Queries
          </h2>
          {topQueries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No search data yet. This usually means your site is new or hasn't been indexed.</p>
          ) : (
            <div className="space-y-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Query</th>
                    <th className="text-right py-2 font-medium w-20">Clicks</th>
                    <th className="text-right py-2 font-medium w-24">Impr.</th>
                    <th className="text-right py-2 font-medium w-16">CTR</th>
                    <th className="text-right py-2 font-medium w-16">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map((q, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 font-medium truncate max-w-[200px]">{q.query}</td>
                      <td className="py-2 text-right">{q.clicks}</td>
                      <td className="py-2 text-right text-muted-foreground">{q.impressions}</td>
                      <td className="py-2 text-right">{q.ctr}%</td>
                      <td className="py-2 text-right text-muted-foreground">{q.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Pages */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Top Pages
          </h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No page data yet.</p>
          ) : (
            <div className="space-y-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-2 font-medium">Page</th>
                    <th className="text-right py-2 font-medium w-20">Clicks</th>
                    <th className="text-right py-2 font-medium w-24">Impr.</th>
                    <th className="text-right py-2 font-medium w-16">CTR</th>
                    <th className="text-right py-2 font-medium w-16">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map((p, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 truncate max-w-[200px]">
                        <a href={p.page} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                        </a>
                      </td>
                      <td className="py-2 text-right">{p.clicks}</td>
                      <td className="py-2 text-right text-muted-foreground">{p.impressions}</td>
                      <td className="py-2 text-right">{p.ctr}%</td>
                      <td className="py-2 text-right text-muted-foreground">{p.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sitemaps */}
      {sitemaps && sitemaps.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 mt-6">
          <h2 className="font-heading text-lg font-bold mb-4">Sitemap Status</h2>
          <div className="space-y-2">
            {sitemaps.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${s.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-sm font-medium">{s.path}</span>
                </div>
                <div className="flex items-center gap-6 text-xs text-muted-foreground">
                  <span>Submitted: {s.submitted || '—'}</span>
                  <span>Indexed: {s.indexed || '—'}</span>
                  <span>Last downloaded: {s.lastDownloaded ? new Date(s.lastDownloaded).toLocaleDateString('en-ZA') : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topQueries.length === 0 && topPages.length === 0 && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mt-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>No search data yet.</strong> Your sitemap is submitted but Google hasn't collected enough data. This typically takes 1-2 weeks after indexing begins. Make sure your domain is verified in Google Search Console and your sitemap is submitted.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}