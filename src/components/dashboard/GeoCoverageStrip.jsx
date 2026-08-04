import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Globe2, MapPin, ChevronRight, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const FRAMEWORK_BADGES = [
  { code: "SOC 2", label: "SOC 2" },
  { code: "ISO 27001", label: "ISO 27001" },
  { code: "NIST CSF", label: "NIST CSF" },
  { code: "POPIA", label: "POPIA" },
  { code: "SADC", label: "SADC Model Law" },
  { code: "GDPR", label: "GDPR" },
  { code: "COSO ERM", label: "COSO ERM" },
];

const SADC_NATIONS = 16;

export default function GeoCoverageStrip() {
  const [frameworks, setFrameworks] = useState([]);
  const [jurisdictions, setJurisdictions] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.RegulatoryFramework.list().catch(() => []),
      base44.entities.TenantSettings.list().catch(() => []),
    ]).then(([fws, settings]) => {
      setFrameworks(fws);
      const js = settings?.[0]?.active_jurisdictions;
      if (Array.isArray(js) && js.length > 0) setJurisdictions(js);
    });
  }, []);

  if (dismissed) return null;

  const activeCount = frameworks.length;

  return (
    <div className="mb-6 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/5 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <Globe2 className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-heading font-semibold text-foreground">
                Global GRC with native SADC &amp; African regulatory coverage
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                <MapPin className="w-3 h-3" /> {SADC_NATIONS} SADC nations
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">
              {activeCount > 0
                ? `${activeCount} regulatory framework${activeCount === 1 ? "" : "s"} active`
                : "Activate frameworks to track compliance across jurisdictions"}
              {jurisdictions.length > 0 && ` · ${jurisdictions.join(", ")}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 flex-wrap">
            {FRAMEWORK_BADGES.map((fw) => (
              <span
                key={fw.code}
                className="text-[10px] font-medium text-muted-foreground bg-muted/60 border border-border rounded-md px-2 py-0.5"
              >
                {fw.label}
              </span>
            ))}
          </div>
          <Link
            to="/sadc-frameworks"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
          >
            Explore <ChevronRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}