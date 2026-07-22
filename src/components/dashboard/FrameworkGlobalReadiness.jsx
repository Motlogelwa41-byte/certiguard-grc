import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, Activity } from "lucide-react";

export default function FrameworkGlobalReadiness() {
  const [frameworks, setFrameworks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Framework.list()
      .then((d) => setFrameworks(d))
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = base44.entities.Framework.subscribe((event) => {
      setFrameworks((prev) => {
        if (event.type === "create") return [...prev, event.data];
        if (event.type === "update") return prev.map((f) => (f.id === event.data.id ? { ...f, ...event.data } : f));
        if (event.type === "delete") return prev.filter((f) => f.id !== event.data.id);
        return prev;
      });
    });
    return unsub;
  }, []);

  const active = frameworks.filter((f) => f.status && f.status !== "not_started");
  const list = active.length ? active : frameworks;
  const globalScore = list.length
    ? Math.round(list.reduce((s, f) => s + (f.readiness_score || 0), 0) / list.length)
    : 0;
  const certified = frameworks.filter((f) => f.status === "certified").length;

  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (globalScore / 100) * circ;
  const color = globalScore >= 80 ? "hsl(var(--success))" : globalScore >= 60 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const label = globalScore >= 80 ? "Audit Ready" : globalScore >= 60 ? "On Track" : "Needs Attention";

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">Global Readiness</h3>
            <p className="text-xs text-muted-foreground">Across all active regulatory frameworks · live</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
          <Activity className="w-3 h-3" /> Real-time
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="shrink-0">
            <svg width={140} height={140} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
              <circle
                cx="60" cy="60" r={radius} fill="none"
                stroke={color} strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
              <text x="60" y="56" textAnchor="middle" fontSize="22" fontWeight="700" fill="currentColor" className="fill-foreground">{globalScore}%</text>
              <text x="60" y="72" textAnchor="middle" fontSize="9" fill="currentColor" className="fill-muted-foreground">{label}</text>
            </svg>
          </div>
          <div className="flex-1 w-full">
            <div className="flex items-center gap-5 mb-3">
              <div className="text-sm">
                <span className="text-2xl font-bold text-foreground">{list.length}</span>{" "}
                <span className="text-muted-foreground">active</span>
              </div>
              <div className="text-sm">
                <span className="text-2xl font-bold text-success">{certified}</span>{" "}
                <span className="text-muted-foreground">certified</span>
              </div>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
              {list.length === 0 && (
                <p className="text-sm text-muted-foreground">No active frameworks yet.</p>
              )}
              {list.slice(0, 6).map((f) => {
                const pct = f.readiness_score || 0;
                const c = pct >= 80 ? "hsl(var(--success))" : pct >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
                return (
                  <div key={f.id} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-foreground w-32 truncate">{f.name}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: c }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}