import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, X, ExternalLink, CalendarClock } from "lucide-react";

export default function RegulatoryAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    base44.entities.RegulatoryAlert
      .filter({ is_active: true }, "-created_date", 10)
      .then((rows) => {
        if (mounted) {
          setAlerts(rows || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    // Real-time subscription: update banner when new alerts arrive
    const unsubscribe = base44.entities.RegulatoryAlert.subscribe((event) => {
      if (event.type === "create" && event.data?.is_active) {
        setAlerts((prev) => [event.data, ...prev].slice(0, 10));
      } else if (event.type === "update" && event.data?.is_active === false) {
        setAlerts((prev) => prev.filter((a) => a.id !== event.data.id));
      } else if (event.type === "delete") {
        setAlerts((prev) => prev.filter((a) => a.id !== event.data.id));
      }
    });

    return () => {
      mounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const dismiss = async (alert) => {
    try {
      await base44.entities.RegulatoryAlert.update(alert.id, {
        is_active: false,
        dismissed_at: new Date().toISOString(),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    } catch (e) {
      // still remove from UI
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
    }
  };

  if (loading || alerts.length === 0) return null;

  const priorityStyles = {
    critical: "bg-red-50 border-red-300 text-red-900",
    high: "bg-orange-50 border-orange-300 text-orange-900",
    medium: "bg-amber-50 border-amber-300 text-amber-900",
    low: "bg-slate-50 border-slate-300 text-slate-700",
  };

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((alert) => {
        const style = priorityStyles[alert.priority] || priorityStyles.high;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-sm ${style}`}
          >
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{alert.title}</span>
                {alert.framework_code && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/60 font-mono">
                    {alert.framework_code}
                  </span>
                )}
                {alert.priority && (
                  <span className="text-xs uppercase font-bold tracking-wide">
                    {alert.priority}
                  </span>
                )}
              </div>
              {alert.message && (
                <p className="text-sm mt-0.5 opacity-90">{alert.message}</p>
              )}
              <div className="flex items-center gap-4 mt-1 text-xs opacity-75">
                {alert.compliance_deadline && (
                  <span className="flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" />
                    Deadline: {alert.compliance_deadline}
                  </span>
                )}
                {alert.source_url && (
                  <a
                    href={alert.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Source
                  </a>
                )}
              </div>
            </div>
            <button
              onClick={() => dismiss(alert)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              title="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}