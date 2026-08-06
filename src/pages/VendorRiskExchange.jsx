import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Star, AlertTriangle, ShieldCheck, TrendingUp, Loader2 } from "lucide-react";

const gradeColors = {
  A: "bg-emerald-500 text-white",
  B: "bg-blue-500 text-white",
  C: "bg-amber-500 text-white",
  D: "bg-orange-500 text-white",
  F: "bg-red-500 text-white",
};

const tierColors = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function VendorRiskExchange() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoring, setScoring] = useState(null);
  const [scores, setScores] = useState({});
  const { toast } = useToast();

  const load = useCallback(async () => {
    try {
      const data = await base44.entities.Vendor.list("-updated_date", 200);
      setVendors(data || []);
    } catch (e) {
      toast({ title: "Failed to load vendors", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const scoreVendor = async (vendor) => {
    setScoring(vendor.id);
    try {
      const res = await base44.functions.invoke("scoreVendorRisk", { vendor_id: vendor.id });
      const data = res?.data || res;
      if (data.success) {
        setScores({ ...scores, [vendor.id]: data });
        toast({ title: `${vendor.name}: Grade ${data.grade} (${data.score}/100)` });
        load();
      } else {
        toast({ title: "Scoring failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Scoring failed", description: e.message, variant: "destructive" });
    } finally {
      setScoring(null);
    }
  };

  const scoreAll = async () => {
    for (const v of vendors) {
      await scoreVendor(v);
    }
  };

  const avgScore = vendors.filter(v => v.risk_score).length > 0
    ? Math.round(vendors.filter(v => v.risk_score).reduce((sum, v) => sum + v.risk_score, 0) / vendors.filter(v => v.risk_score).length)
    : 0;

  const stats = {
    total: vendors.length,
    highRisk: vendors.filter(v => v.risk_tier === "high" || v.risk_tier === "critical").length,
    lowRisk: vendors.filter(v => v.risk_tier === "low").length,
    avgScore,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Vendor Risk Exchange"
        subtitle="Automated vendor risk scoring engine — scores vendors from assessments, findings, certifications & contracts"
        actions={<Button onClick={scoreAll} disabled={scoring} variant="default"><RefreshCw className={`h-4 w-4 mr-2 ${scoring ? "animate-spin" : ""}`} /> Score All Vendors</Button>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Vendors" value={stats.total} icon={Star} color="blue" />
        <StatCard label="Avg Risk Score" value={stats.avgScore || "—"} icon={TrendingUp} color="purple" />
        <StatCard label="High/Critical Risk" value={stats.highRisk} icon={AlertTriangle} color="red" />
        <StatCard label="Low Risk" value={stats.lowRisk} icon={ShieldCheck} color="green" />
      </div>

      <Card>
        <CardHeader><CardTitle>Vendor Risk Scorecard</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>
          ) : vendors.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground">No vendors registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-muted/50">
                    <th className="p-3 font-medium">Vendor</th>
                    <th className="p-3 font-medium">Criticality</th>
                    <th className="p-3 font-medium">Risk Score</th>
                    <th className="p-3 font-medium">Grade</th>
                    <th className="p-3 font-medium">Tier</th>
                    <th className="p-3 font-medium">Last Assessed</th>
                    <th className="p-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <tr key={v.id} className="border-b hover:bg-muted/30">
                      <td className="p-3"><div className="font-medium">{v.name}</div>{v.category && <div className="text-xs text-muted-foreground">{v.category}</div>}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{v.criticality || "—"}</Badge></td>
                      <td className="p-3">{v.risk_score != null ? <span className="font-mono font-bold">{v.risk_score}</span> : "—"}</td>
                      <td className="p-3">{v.risk_grade ? <Badge className={gradeColors[v.risk_grade] || ""}>{v.risk_grade}</Badge> : "—"}</td>
                      <td className="p-3">{v.risk_tier ? <Badge className={tierColors[v.risk_tier] || ""}>{v.risk_tier}</Badge> : "—"}</td>
                      <td className="p-3 text-xs text-muted-foreground">{v.last_risk_assessment ? new Date(v.last_risk_assessment).toLocaleDateString() : "—"}</td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => scoreVendor(v)} disabled={scoring === v.id}>
                          {scoring === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Score"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring factors detail */}
      {Object.keys(scores).length > 0 && (
        <Card>
          <CardHeader><CardTitle>Latest Scoring Breakdown</CardTitle></CardHeader>
          <CardContent>
            {Object.entries(scores).map(([vid, s]) => (
              <div key={vid} className="mb-4 p-3 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={gradeColors[s.grade]}>{s.grade}</Badge>
                  <span className="font-medium">{s.vendor_name}</span>
                  <span className="text-sm text-muted-foreground">— Score: {s.score}/100, Tier: {s.risk_tier}</span>
                </div>
                {s.factors && s.factors.length > 0 ? (
                  <div className="space-y-1">
                    {s.factors.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">{f.factor}:</span>
                        <span>{f.detail}</span>
                        <Badge variant={f.penalty > 0 ? "destructive" : "default"} className="text-xs">
                          {f.penalty > 0 ? `-${f.penalty}` : `+${Math.abs(f.penalty)}`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-muted-foreground">No risk factors — clean profile.</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}