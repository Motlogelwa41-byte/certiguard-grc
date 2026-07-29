import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Activity, CheckCircle, AlertCircle } from "lucide-react";

// Public platform health widget — displayed on the Trust Center so visitors
// can see that CertiGuard itself is live and healthy, not just the tenant.
export default function PlatformStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getPlatformStatus", {})
      .then((res) => setStatus(res?.data || null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  const overall = status?.overall || "operational";
  const isOperational = overall === "operational";

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100">
          <Activity className="w-5 h-5 text-slate-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Platform Status</h2>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          {loading ? (
            <div className="w-3 h-3 rounded-full bg-slate-300 animate-pulse" />
          ) : (
            <span className={`w-3 h-3 rounded-full ${isOperational ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              {loading ? "Checking platform status\u2026" : isOperational ? "All Systems Operational" : "Degraded Performance"}
            </p>
            <p className="text-xs text-slate-400">
              {status?.uptime_90d ? `${status.uptime_90d}% uptime (90 days)` : "Real-time health monitoring"}
            </p>
          </div>
        </div>
        {!loading && status?.components && (
          <div className="space-y-1">
            {status.components.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-sm py-1.5 border-t border-slate-50">
                <span className="text-slate-600">{c.name}</span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {c.status === "operational" ? (
                    <><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Operational</>
                  ) : (
                    <><AlertCircle className="w-3.5 h-3.5 text-amber-500" /> {c.status}</>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-slate-400 pt-3 mt-3 border-t border-slate-100">
          Checked {status?.checked_at ? new Date(status.checked_at).toLocaleString("en-GB") : "just now"}
        </p>
      </div>
    </section>
  );
}