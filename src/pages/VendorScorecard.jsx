import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, ShieldCheck, ShieldAlert, ShieldX, Clock, AlertTriangle, CheckCircle2, Building2, Loader2, RefreshCw, Globe } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const RISK_WEIGHT = { critical: 0, high: 15, medium: 28, low: 40 };
const STATUS_WEIGHT = { approved: 30, under_review: 18, pending_review: 12, inactive: 8, rejected: 0 };

function scoreVendor(v) {
  const risk = RISK_WEIGHT[v.risk_level] ?? 25;
  const status = STATUS_WEIGHT[v.status] ?? 10;
  const certs = (v.soc2_compliant ? 10 : 0) + (v.iso27001_compliant ? 10 : 0) + (v.gdpr_compliant ? 10 : 0);
  return Math.min(100, risk + status + certs);
}

function isOverdue(v) {
  if (!v.next_assessment_date) return false;
  return new Date(v.next_assessment_date) < new Date();
}

function band(score) {
  if (score >= 80) return { label: "Healthy", cls: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 50) return { label: "Watch", cls: "bg-amber-100 text-amber-700", bar: "bg-amber-500" };
  return { label: "Needs Attention", cls: "bg-red-100 text-red-700", bar: "bg-red-500" };
}

const RISK_BADGE = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700"
};
const STATUS_BADGE = {
  approved: "bg-emerald-100 text-emerald-700", under_review: "bg-blue-100 text-blue-700",
  pending_review: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700",
  inactive: "bg-muted text-muted-foreground"
};

export default function VendorScorecard() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [refreshingId, setRefreshingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await base44.entities.Vendor.list("-updated_date", 500);
        setVendors(data || []);
      } catch { setVendors([]); }
      setLoading(false);
    })();
  }, []);

  const handleRefreshRating = async (vendorId) => {
    setRefreshingId(vendorId);
    try {
      const res = await base44.functions.invoke("fetchVendorSecurityRating", { vendor_id: vendorId });
      const data = res.data || res;
      toast({
        title: `External rating: ${data.score}/100 (Grade ${data.grade})`,
        description: data.summary || "Security rating refreshed from threat intelligence.",
      });
      setVendors((prev) => prev.map((v) => v.id === vendorId ? {
        ...v,
        external_rating_score: data.score,
        external_rating_grade: data.grade,
        external_rating_fetched_at: new Date().toISOString(),
        external_rating_summary: data.summary,
      } : v));
    } catch (e) {
      toast({ title: "Rating fetch failed", description: e.message, variant: "destructive" });
    }
    setRefreshingId(null);
  };

  const scored = vendors.map(v => ({ ...v, _score: scoreVendor(v), _overdue: isOverdue(v) }));
  const needsAttention = scored.filter(v => v._score < 50 || v.status !== "approved" || v._overdue);
  const overdueCount = scored.filter(v => v._overdue).length;
  const criticalCount = scored.filter(v => v.risk_level === "critical").length;
  const approvedPct = vendors.length ? Math.round((scored.filter(v => v.status === "approved").length / vendors.length) * 100) : 0;
  const certGap = scored.filter(v => !(v.soc2_compliant || v.iso27001_compliant || v.gdpr_compliant)).length;

  const filtered = scored
    .filter(v => filter === "all" ? true : filter === "attention" ? (v._score < 50 || v._overdue) : filter === "overdue" ? v._overdue : filter === "critical" ? v.risk_level === "critical" : true)
    .filter(v => !query || (v.name || "").toLowerCase().includes(query.toLowerCase()) || (v.category || "").toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a._score - b._score);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Vendor Scorecard"
        subtitle="Compliance status and risk levels for every third-party partner — sorted by who needs immediate attention"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <Stat icon={Building2} label="Total vendors" value={vendors.length} tone="slate" />
        <Stat icon={AlertTriangle} label="Needs attention" value={needsAttention.length} tone="red" />
        <Stat icon={Clock} label="Overdue assessment" value={overdueCount} tone="amber" />
        <Stat icon={ShieldAlert} label="Critical risk" value={criticalCount} tone="red" />
        <Stat icon={CheckCircle2} label="Approved" value={`${approvedPct}%`} tone="emerald" />
        <Stat icon={ShieldX} label="No certifications" value={certGap} tone="amber" />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendors or category…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {[
            ["all", "All"], ["attention", "Needs Attention"], ["overdue", "Overdue"], ["critical", "Critical Risk"]
          ].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">
          No vendors match the current filters.
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Compliance</th>
                  <th className="px-4 py-3 font-semibold">Assessment</th>
                  <th className="px-4 py-3 font-semibold">Ext. Rating</th>
                  <th className="px-4 py-3 font-semibold">Scorecard</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const b = band(v._score);
                  return (
                    <tr key={v.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{v.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{(v.category || "other").replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${RISK_BADGE[v.risk_level] || "bg-muted text-muted-foreground"}`}>{v.risk_level || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[v.status] || "bg-muted text-muted-foreground"}`}>{(v.status || "—").replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Cert ok={v.soc2_compliant} label="SOC2" />
                          <Cert ok={v.iso27001_compliant} label="ISO" />
                          <Cert ok={v.gdpr_compliant} label="GDPR" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {v._overdue ? (
                          <span className="text-red-600 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Overdue</span>
                        ) : v.next_assessment_date ? (
                          <span className="text-muted-foreground">{v.next_assessment_date}</span>
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[150px]">
                        {v.external_rating_score > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs font-semibold text-foreground">{v.external_rating_score}/100</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                v.external_rating_grade === "A" || v.external_rating_grade === "B" ? "bg-emerald-100 text-emerald-700" :
                                v.external_rating_grade === "C" ? "bg-amber-100 text-amber-700" :
                                "bg-red-100 text-red-700"
                              }`}>{v.external_rating_grade}</span>
                            </div>
                            <button
                              onClick={() => handleRefreshRating(v.id)}
                              disabled={refreshingId === v.id}
                              className="text-[10px] text-primary hover:underline flex items-center gap-0.5 disabled:opacity-50"
                            >
                              {refreshingId === v.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                              Refresh
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRefreshRating(v.id)}
                            disabled={refreshingId === v.id}
                            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                          >
                            {refreshingId === v.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
                            Fetch rating
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${b.bar}`} style={{ width: `${v._score}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-foreground w-8 text-right">{v._score}</span>
                        </div>
                        <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.cls}`}>{b.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, tone }) {
  const tones = {
    slate: "text-slate-600", red: "text-red-600", amber: "text-amber-600", emerald: "text-emerald-600"
  };
  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <Icon className={`w-4 h-4 ${tones[tone] || tones.slate}`} />
        <span className={`text-2xl font-heading font-bold ${tones[tone] || tones.slate}`}>{value}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{label}</p>
    </div>
  );
}

function Cert({ ok, label }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
      ok ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground/60 line-through"
    }`} title={label}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <ShieldX className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}