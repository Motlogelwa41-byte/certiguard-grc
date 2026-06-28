import React, { useState } from "react";
import { Settings, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEFAULT_THRESHOLDS = { low: 6, medium: 12, high: 19 };

export default function RiskAppetitePanel({ risks }) {
  const [thresholds, setThresholds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("riskAppetiteThresholds")) || DEFAULT_THRESHOLDS; }
    catch { return DEFAULT_THRESHOLDS; }
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(thresholds);

  const save = () => {
    const t = { low: parseInt(draft.low) || 6, medium: parseInt(draft.medium) || 12, high: parseInt(draft.high) || 19 };
    setThresholds(t);
    localStorage.setItem("riskAppetiteThresholds", JSON.stringify(t));
    setEditing(false);
  };

  const classify = (score) => {
    if (score <= thresholds.low) return "low";
    if (score <= thresholds.medium) return "medium";
    if (score <= thresholds.high) return "high";
    return "critical";
  };

  const buckets = { low: [], medium: [], high: [], critical: [] };
  risks.forEach(r => { const cat = classify(r.risk_score || r.likelihood * r.impact || 0); buckets[cat].push(r); });

  const bands = [
    { key: "low", label: "Within Appetite", color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", icon: ShieldCheck, range: `Score 1–${thresholds.low}` },
    { key: "medium", label: "Tolerance Zone", color: "bg-amber-400", textColor: "text-amber-700", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", icon: Shield, range: `Score ${thresholds.low + 1}–${thresholds.medium}` },
    { key: "high", label: "Above Appetite", color: "bg-orange-500", textColor: "text-orange-700", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", icon: ShieldAlert, range: `Score ${thresholds.medium + 1}–${thresholds.high}` },
    { key: "critical", label: "Unacceptable", color: "bg-red-500", textColor: "text-red-700", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", icon: ShieldAlert, range: `Score ${thresholds.high + 1}–25` },
  ];

  const total = risks.length || 1;

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Risk Appetite Thresholds</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Categorize risks against your compliance risk tolerance</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDraft(thresholds); setEditing(!editing); }}>
          <Settings className="w-3.5 h-3.5 mr-1" /> Configure
        </Button>
      </div>

      {editing && (
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">Set max score for each band (Risk Score = Likelihood × Impact, max 25)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-emerald-700">Low / Within Appetite</Label>
              <Input type="number" min="1" max="24" value={draft.low} onChange={e => setDraft({ ...draft, low: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-amber-700">Medium / Tolerance Zone</Label>
              <Input type="number" min="2" max="24" value={draft.medium} onChange={e => setDraft({ ...draft, medium: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-orange-700">High / Above Appetite</Label>
              <Input type="number" min="3" max="24" value={draft.high} onChange={e => setDraft({ ...draft, high: e.target.value })} className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={save}>Save Thresholds</Button>
          </div>
        </div>
      )}

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-16 mb-4">
        {bands.map(band => {
          const pct = Math.round((buckets[band.key].length / total) * 100);
          return (
            <div key={band.key} className="flex-1 flex flex-col items-center justify-end gap-1">
              <span className="text-xs font-bold text-muted-foreground">{buckets[band.key].length}</span>
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${band.color}`}
                style={{ height: `${Math.max(pct, 4)}%` }}
                title={`${band.label}: ${buckets[band.key].length} risk(s)`}
              />
            </div>
          );
        })}
      </div>

      {/* Legend + detail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {bands.map(band => {
          const Icon = band.icon;
          const count = buckets[band.key].length;
          return (
            <div key={band.key} className={`rounded-lg border p-3 ${band.bg} ${band.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-3.5 h-3.5 ${band.textColor}`} />
                <span className={`text-xs font-semibold ${band.textColor}`}>{band.label}</span>
              </div>
              <p className={`text-xl font-bold ${band.textColor}`}>{count}</p>
              <p className="text-xs text-muted-foreground">{band.range}</p>
              {count > 0 && (
                <div className="mt-1.5 space-y-0.5">
                  {buckets[band.key].slice(0, 2).map(r => (
                    <p key={r.id} className="text-xs text-muted-foreground truncate">• {r.title}</p>
                  ))}
                  {count > 2 && <p className="text-xs text-muted-foreground">+{count - 2} more</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}