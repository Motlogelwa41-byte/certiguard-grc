import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, color }) {
  const colorMap = {
    blue: { ring: "ring-blue-500/20", glow: "from-blue-500/10", icon: "bg-blue-500/10 text-blue-400 border-blue-500/20", bar: "bg-blue-500" },
    green: { ring: "ring-emerald-500/20", glow: "from-emerald-500/10", icon: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", bar: "bg-emerald-500" },
    amber: { ring: "ring-amber-500/20", glow: "from-amber-500/10", icon: "bg-amber-500/10 text-amber-400 border-amber-500/20", bar: "bg-amber-500" },
    red: { ring: "ring-rose-500/20", glow: "from-rose-500/10", icon: "bg-rose-500/10 text-rose-400 border-rose-500/20", bar: "bg-rose-500" },
    purple: { ring: "ring-violet-500/20", glow: "from-violet-500/10", icon: "bg-violet-500/10 text-violet-400 border-violet-500/20", bar: "bg-violet-500" },
    slate: { ring: "ring-slate-500/20", glow: "from-slate-500/10", icon: "bg-slate-500/10 text-slate-400 border-slate-500/20", bar: "bg-slate-500" },
  };
  const s = colorMap[color] || colorMap.blue;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 ring-1 ${s.ring} transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${s.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-3xl font-heading font-bold text-foreground mt-1 tabular-nums">{value}</p>
          {trendLabel && (
            <div className="flex items-center gap-1 mt-1.5">
              {trend && (
                <span className={`inline-flex items-center ${trend === "up" ? "text-emerald-500" : trend === "down" ? "text-rose-500" : "text-muted-foreground"}`}>
                  <TrendIcon className="w-3 h-3" />
                </span>
              )}
              <p className={`text-xs font-medium ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-rose-600" : "text-muted-foreground"}`}>
                {trendLabel}
              </p>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border ${s.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`absolute bottom-0 left-0 h-0.5 w-full ${s.bar} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    </div>
  );
}