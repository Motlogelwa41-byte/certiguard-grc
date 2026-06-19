import React from "react";

export default function StatCard({ label, value, icon: Icon, trend, trendLabel, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    purple: "bg-purple-50 text-purple-600",
    slate: "bg-slate-100 text-slate-600",
  };
  const iconStyle = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconStyle}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-heading font-bold text-foreground mt-0.5">{value}</p>
        {trendLabel && (
          <p className={`text-xs font-medium mt-1 ${
            trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-muted-foreground"
          }`}>
            {trendLabel}
          </p>
        )}
      </div>
    </div>
  );
}