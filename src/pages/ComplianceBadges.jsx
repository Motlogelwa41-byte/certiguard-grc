import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award, Loader2, Copy, Check, ExternalLink, Code2, Shield, Globe, Zap
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

export default function ComplianceBadges() {
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [copied, setCopied] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.RegulatoryFramework.list("-created_date", 100).catch(() => []);
      setFrameworks(data || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.base44.com';
  const badgeApiUrl = `${appOrigin}/api/functions/getComplianceBadgeData`;

  const getEmbedCode = (format) => {
    const frameworkParam = selectedFramework !== 'all' ? `&framework=${selectedFramework}` : '';
    if (format === 'iframe') {
      return `<iframe src="${badgeApiUrl}?format=widget${frameworkParam}" width="320" height="400" frameborder="0" scrolling="no" style="border:none;overflow:hidden;"></iframe>`;
    }
    if (format === 'script') {
      return `<script src="${badgeApiUrl}?format=widget${frameworkParam}"></script>`;
    }
    if (format === 'badge') {
      return `<img src="${badgeApiUrl}?format=badge${frameworkParam}" alt="Compliance Status" />`;
    }
    if (format === 'json') {
      return `<script>fetch("${badgeApiUrl}?format=json${frameworkParam}").then(r=>r.json()).then(d=>console.log(d));</script>`;
    }
    return '';
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const certifiedCount = frameworks.filter(f => f.status === 'active').length;

  return (
    <div>
      <PageHeader
        title="Live Embeddable Compliance Badges"
        subtitle="Generate embeddable badges and widgets that show live compliance status on your marketing website — always reflecting real-time certification and control status"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Available Frameworks" value={frameworks.length} icon={Shield} color="blue" trendLabel="Badge-ready" />
        <StatCard label="Active Frameworks" value={certifiedCount} icon={Award} color="green" trendLabel="Certified status" />
        <StatCard label="Embed Formats" value={4} icon={Code2} color="purple" trendLabel="Iframe, Script, Badge, JSON" />
        <StatCard label="Update Frequency" value="Live" icon={Zap} color="amber" trendLabel="Real-time data" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration + Preview */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Badge Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Framework to Display</label>
                <select value={selectedFramework} onChange={(e) => setSelectedFramework(e.target.value)} className="w-full px-3 py-2 rounded-md border border-input bg-transparent text-sm">
                  <option value="all">All Frameworks (Widget)</option>
                  {frameworks.map(f => <option key={f.id} value={f.code}>{f.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Live Preview</h3>
            <div className="flex flex-col items-center gap-4">
              {/* Widget Preview */}
              <div className="border border-border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 w-full">
                <p className="text-xs text-muted-foreground mb-2 text-center">Widget Preview</p>
                <div className="flex justify-center">
                  <div style={{ width: 320 }}>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                      <div className="bg-[#0A2463] p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#3E92CC] rounded-md flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-white text-sm font-bold">CertiGuard GRC</span>
                        </div>
                        <span className="text-slate-400 text-xs">Live Status</span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-500">Overall Compliance</span>
                          <span className="text-xl font-bold text-[#0A2463]">87%</span>
                        </div>
                        {frameworks.slice(0, 4).map(f => (
                          <div key={f.id} className="flex items-center gap-2 py-1.5 border-t border-slate-100 dark:border-slate-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex-1">{f.name}</span>
                            <span className="text-xs text-emerald-600 font-semibold">Active</span>
                            <span className="text-xs text-slate-500">90%</span>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-[10px] text-slate-400">Powered by CertiGuard GRC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badge Preview */}
              <div className="border border-border rounded-lg p-4 bg-slate-50 dark:bg-slate-900 w-full">
                <p className="text-xs text-muted-foreground mb-2 text-center">SVG Badge Preview</p>
                <div className="flex justify-center">
                  <div className="inline-flex items-center rounded-md overflow-hidden" style={{ height: 20 }}>
                    <div className="bg-slate-700 text-white text-[11px] font-semibold px-2 py-0.5 flex items-center h-full">SOC2</div>
                    <div className="bg-emerald-600 text-white text-[11px] font-semibold px-2 py-0.5 flex items-center h-full">CERTIFIED</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Embed Codes */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Embed Codes</h3>

            <Tabs defaultValue="iframe">
              <TabsList className="mb-3">
                <TabsTrigger value="iframe">Iframe Widget</TabsTrigger>
                <TabsTrigger value="badge">SVG Badge</TabsTrigger>
                <TabsTrigger value="script">Script Tag</TabsTrigger>
                <TabsTrigger value="json">JSON API</TabsTrigger>
              </TabsList>

              <TabsContent value="iframe">
                <EmbedCodeBox id="iframe" code={getEmbedCode('iframe')} onCopy={copyToClipboard} copied={copied} />
                <p className="text-xs text-muted-foreground mt-2">Best for marketing sites — shows a full compliance widget with all framework statuses.</p>
              </TabsContent>

              <TabsContent value="badge">
                <EmbedCodeBox id="badge" code={getEmbedCode('badge')} onCopy={copyToClipboard} copied={copied} />
                <p className="text-xs text-muted-foreground mt-2">Compact SVG badge — perfect for footers, email signatures, or partner pages.</p>
              </TabsContent>

              <TabsContent value="script">
                <EmbedCodeBox id="script" code={getEmbedCode('script')} onCopy={copyToClipboard} copied={copied} />
                <p className="text-xs text-muted-foreground mt-2">Injects the widget inline — no iframe needed. Auto-resizes to container.</p>
              </TabsContent>

              <TabsContent value="json">
                <EmbedCodeBox id="json" code={getEmbedCode('json')} onCopy={copyToClipboard} copied={copied} />
                <p className="text-xs text-muted-foreground mt-2">REST API endpoint returning live JSON — for custom integrations and dashboards.</p>
              </TabsContent>
            </Tabs>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">Public Endpoint</p>
                <p className="text-xs text-blue-600 dark:text-blue-500">The badge endpoint is publicly accessible — no authentication required. Data updates in real-time as your compliance status changes. Cache is set to 5 minutes for performance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmbedCodeBox({ id, code, onCopy, copied }) {
  return (
    <div className="relative">
      <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 text-xs rounded-lg p-3 pr-10 overflow-x-auto font-mono whitespace-pre-wrap break-all">
        {code}
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7 text-slate-400 hover:text-white"
        onClick={() => onCopy(code, id)}
      >
        {copied === id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}