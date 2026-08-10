import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Shield, TrendingUp, AlertCircle } from "lucide-react";
import { useTenant } from "@/lib/TenantContext";

export default function PlanUsage() {
  const { tenant } = useTenant();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("checkPlanLimits", {})
      .then((res) => {
        const d = res?.data || res;
        if (d && !d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!data) return null;

  const userPct = data.users.cap >= 999999 ? 0 : Math.round((data.users.count / data.users.cap) * 100);
  const fwPct = data.frameworks.cap >= 999999 ? 0 : Math.round((data.frameworks.count / data.frameworks.cap) * 100);
  const userNear = userPct >= 80 && data.users.cap < 999999;
  const fwNear = fwPct >= 80 && data.frameworks.cap < 999999;

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-heading font-semibold text-foreground">Plan Usage</h3>
        <span className="ml-auto text-xs text-muted-foreground capitalize">{data.tier} · {data.subscription_status}</span>
      </div>
      <div className="space-y-4">
        <UsageBar icon={Users} label="Users" count={data.users.count} cap={data.users.cap} pct={userPct} near={userNear} />
        <UsageBar icon={Shield} label="Frameworks" count={data.frameworks.count} cap={data.frameworks.cap} pct={fwPct} near={fwNear} />
      </div>
      {data.trial_ends_at && data.subscription_status === "trial" && (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5" />
          Trial ends {new Date(data.trial_ends_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

function UsageBar({ icon: Icon, label, count, cap, pct, near }) {
  const unlimited = cap >= 999999;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className={`font-medium ${near ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
          {count} / {unlimited ? "∞" : cap}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(pct, 100)}%`,
              backgroundColor: pct >= 90 ? "#ef4444" : pct >= 80 ? "#f59e0b" : "#10b981",
            }}
          />
        </div>
      )}
    </div>
  );
}