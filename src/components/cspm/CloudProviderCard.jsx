import React from "react";
import { Cloud, CheckCircle2, AlertCircle, Link2 } from "lucide-react";

const PROVIDER_META = {
  aws: { name: "AWS", icon: Cloud, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  azure: { name: "Azure", icon: Cloud, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  gcp: { name: "GCP", icon: Cloud, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
};

export default function CloudProviderCard({ provider, connected, findingsCount, criticalCount, onSync, syncing }) {
  const meta = PROVIDER_META[provider] || PROVIDER_META.aws;
  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border p-5 ${connected ? "border-border bg-card" : "border-dashed border-border bg-muted/30"}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${meta.bg} border ${meta.border}`}>
            <Icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-foreground">{meta.name}</h3>
            <p className="text-xs text-muted-foreground">Security Posture</p>
          </div>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Connected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" /> Not connected
          </span>
        )}
      </div>

      {connected ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-2xl font-heading font-bold text-foreground">{findingsCount}</div>
            <div className="text-[11px] text-muted-foreground">Open findings</div>
          </div>
          <div>
            <div className="text-2xl font-heading font-bold text-foreground">{criticalCount}</div>
            <div className="text-[11px] text-muted-foreground">Critical</div>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your {meta.name} account in Connections to start ingesting posture findings.
          </p>
          <a href="/connections" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <Link2 className="w-3.5 h-3.5" /> Go to Connections
          </a>
        </div>
      )}

      {connected && onSync && (
        <button
          onClick={onSync}
          disabled={syncing}
          className="mt-4 w-full inline-flex items-center justify-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-lg px-3 py-2 transition-colors"
        >
          {syncing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Syncing…
            </>
          ) : (
            "Sync findings"
          )}
        </button>
      )}
    </div>
  );
}