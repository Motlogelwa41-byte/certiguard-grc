import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Pencil, Trash2, Calculator, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FairAnalysisForm from "@/components/privacy/FairAnalysisForm";
import { computeFair, formatZAR, EXPOSURE_STYLE } from "@/lib/fairModel";
import { convertCurrency, formatCurrency, CURRENCIES } from "@/lib/currencyRates";

export default function RiskQuantification() {
  const [items, setItems] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState("ZAR");
  const { toast } = useToast();

  const fmtMoney = (zarAmount) => {
    const converted = convertCurrency(zarAmount, "ZAR", displayCurrency);
    return formatCurrency(converted, displayCurrency);
  };

  const load = () => {
    setLoading(true);
    Promise.all([
      base44.entities.RiskQuantification.list("-created_date", 500),
      base44.entities.Risk.list("-created_date", 200),
    ]).then(([d, rs]) => { setItems(d || []); setRisks(rs || []); })
      .catch(() => toast({ title: "Failed to load", variant: "destructive" }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleDelete = async (a) => {
    if (!confirm(`Delete FAIR analysis "${a.scenario_name}"?`)) return;
    await base44.entities.RiskQuantification.delete(a.id);
    load();
    toast({ title: "Analysis deleted" });
  };

  const filtered = items.filter((a) => !search || `${a.risk_title} ${a.scenario_name}`.toLowerCase().includes(search.toLowerCase()));
  const totalALE = useMemo(() => items.reduce((s, a) => s + (a.ale_avg || 0), 0), [items]);
  const criticalCount = items.filter((a) => a.exposure_rating === "critical").length;
  const highCount = items.filter((a) => a.exposure_rating === "high").length;

  return (
    <div>
      <PageHeader title="Risk Quantification (FAIR)" subtitle="Monetary loss quantification using the FAIR model — multi-currency support"
        actions={<div className="flex items-center gap-2">
          <select value={displayCurrency} onChange={(e) => setDisplayCurrency(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
          </select>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New analysis</Button>
        </div>} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Analyses" value={items.length} icon={Calculator} color="blue" />
        <StatCard label={`Aggregate ALE (${displayCurrency})`} value={fmtMoney(totalALE)} icon={Calculator} color="slate" />
        <StatCard label="High exposure" value={highCount} icon={Calculator} color={highCount ? "amber" : "slate"} />
        <StatCard label="Critical exposure" value={criticalCount} icon={Calculator} color={criticalCount ? "red" : "slate"} />
      </div>
      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search analyses…" className="pl-9 max-w-md" />
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calculator className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No FAIR analyses yet. Quantify a risk scenario into annualized loss expectancy.</p>
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="w-4 h-4" /> New analysis</Button>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Scenario</th>
                  <th className="text-left px-4 py-3">Risk</th>
                  <th className="text-left px-4 py-3">TEF</th>
                  <th className="text-left px-4 py-3">LEF</th>
                  <th className="text-left px-4 py-3">Loss mag (avg)</th>
                  <th className="text-left px-4 py-3">ALE (avg)</th>
                  <th className="text-left px-4 py-3">Exposure</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-3"><span className="font-medium">{a.scenario_name}</span><div className="text-xs text-muted-foreground">{a.threat_agent || ""}</div></td>
                    <td className="px-4 py-3 text-muted-foreground">{a.risk_title}</td>
                    <td className="px-4 py-3 capitalize">{a.tef_level} <span className="text-xs text-muted-foreground">({a.tef_value})</span></td>
                    <td className="px-4 py-3">{(a.lef || 0).toFixed(2)}/yr</td>
                    <td className="px-4 py-3">{fmtMoney(a.loss_magnitude_avg)}</td>
                    <td className="px-4 py-3 font-semibold">{fmtMoney(a.ale_avg)}<div className="text-xs text-muted-foreground font-normal">{fmtMoney(a.ale_min)}–{fmtMoney(a.ale_max)}</div></td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${EXPOSURE_STYLE[a.exposure_rating] || EXPOSURE_STYLE.low}`}>{a.exposure_rating}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setFormOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(a)}><Trash2 className="w-4 h-4 text-red-600" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <FairAnalysisForm open={formOpen} onOpenChange={setFormOpen} editing={editing} risks={risks} onSaved={load} />
    </div>
  );
}