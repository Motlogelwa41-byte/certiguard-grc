import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Shield, AlertTriangle, FileText, CheckSquare, ShieldAlert, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const iconMap = {
  Control: { icon: Shield, color: "text-blue-500 bg-blue-50" },
  Risk: { icon: AlertTriangle, color: "text-amber-500 bg-amber-50" },
  Policy: { icon: FileText, color: "text-purple-500 bg-purple-50" },
  Incident: { icon: ShieldAlert, color: "text-red-500 bg-red-50" },
  ComplianceTask: { icon: CheckSquare, color: "text-emerald-500 bg-emerald-50" },
};

const actionLabel = { create: "created", update: "updated", delete: "deleted", approve: "approved", import: "imported" };

export default function ActivityFeed() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AuditTrail.list("-created_date", 20)
      .then((d) => { setEntries(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground">Recent Activity</h3>
        <Link to="/audit-trail" className="text-xs text-primary hover:underline">View all</Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {entries.slice(0, 8).map((e) => {
            const meta = iconMap[e.entity_type] || { icon: Clock, color: "text-muted-foreground bg-muted" };
            const Icon = meta.icon;
            return (
              <div key={e.id} className="flex items-start gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${meta.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-foreground leading-snug">
                    <span className="font-medium">{e.performed_by_name || "System"}</span>
                    {" "}{actionLabel[e.action] || e.action}{" "}
                    <span className="font-medium">{e.entity_name || e.entity_type}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(e.created_date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}