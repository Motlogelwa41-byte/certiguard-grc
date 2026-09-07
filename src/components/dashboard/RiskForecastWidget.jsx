import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function RiskForecastWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("predictRiskScore", {})
      .then((res) => setData(res.data || res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">AI Risk Forecast</h3>
        </div>
        <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      </div>
    );
  }

  if (!data || !data.prediction) return null;

  const pred = data.prediction;
  const TrendIcon = pred.trend === "increasing" ? TrendingUp : pred.trend === "decreasing" ? TrendingDown : Minus;
  const trendColor = pred.trend === "increasing" ? "text-rose-600" : pred.trend === "decreasing" ? "text-emerald-600" : "text-muted-foreground";
  const scoreColor = pred.predicted_score >= 70 ? "text-rose-600" : pred.predicted_score >= 40 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">AI Risk Forecast</h3>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">90-day prediction</span>
      </div>
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Predicted Risk Score</p>
          <p className={`text-3xl font-heading font-bold ${scoreColor}`}>{pred.predicted_score || 0}</p>
        </div>
        <div className="flex-1">
          <div className={`flex items-center gap-1.5 mb-2 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium capitalize">{pred.trend || "stable"}</span>
          </div>
          <p className="text-xs text-muted-foreground">Confidence: {pred.confidence || 0}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Current: {data.current_score}% compliance</p>
        </div>
      </div>
      {pred.key_factors && pred.key_factors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Key Factors</p>
          <ul className="space-y-1">
            {pred.key_factors.slice(0, 3).map((f, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {pred.recommendation && (
        <div className="mt-3 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-foreground">{pred.recommendation}</p>
        </div>
      )}
    </div>
  );
}