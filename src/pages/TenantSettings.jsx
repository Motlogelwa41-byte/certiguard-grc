import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTenant } from "@/lib/TenantContext";
import { Settings, Save, Shield, DollarSign, Globe } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useRBAC } from "@/lib/useRBAC";

const IMPACT_LABELS = [
  { level: 1, name: "Negligible" },
  { level: 2, name: "Minor" },
  { level: 3, name: "Moderate" },
  { level: 4, name: "Major" },
  { level: 5, name: "Catastrophic" },
];

const SADC_JURISDICTIONS = [
  "South Africa", "Botswana", "Angola", "Mozambique", "Zambia", "Zimbabwe",
  "Namibia", "Lesotho", "Eswatini", "Malawi", "Tanzania", "DRC",
  "Madagascar", "Mauritius", "Seychelles",
];

export default function TenantSettings() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { can } = useRBAC();
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [activeIds, setActiveIds] = useState([]);
  const [activeJurisdictions, setActiveJurisdictions] = useState([]);
  const [impactRanges, setImpactRanges] = useState({
    1: { min: 0, max: 10000 },
    2: { min: 10001, max: 50000 },
    3: { min: 50001, max: 250000 },
    4: { min: 250001, max: 1000000 },
    5: { min: 1000001, max: 5000000 },
  });
  const [appetiteLimit, setAppetiteLimit] = useState(500000);

  useEffect(() => {
    Promise.all([
      base44.entities.RegulatoryFramework.list().catch(() => []),
      base44.entities.TenantSettings.list().catch(() => []),
    ]).then(([fws, existing]) => {
      setFrameworks(fws || []);
      const s = existing?.[0];
      if (s) {
        setSettings(s);
        setActiveIds(s.active_framework_ids || []);
        setActiveJurisdictions(s.active_jurisdictions || []);
        if (s.impact_1_min !== undefined) {
          setImpactRanges({
            1: { min: s.impact_1_min, max: s.impact_1_max },
            2: { min: s.impact_2_min, max: s.impact_2_max },
            3: { min: s.impact_3_min, max: s.impact_3_max },
            4: { min: s.impact_4_min, max: s.impact_4_max },
            5: { min: s.impact_5_min, max: s.impact_5_max },
          });
        }
        if (s.risk_appetite_limit !== undefined) setAppetiteLimit(s.risk_appetite_limit);
      }
      setLoading(false);
    });
  }, []);

  const toggleFramework = (id) => {
    setActiveIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tenantId = tenant?.id || user?.data?.tenant_id || user?.tenant_id;
      const activeNames = frameworks
        .filter((f) => activeIds.includes(f.id))
        .map((f) => f.name);

      const data = {
        tenant_id: tenantId,
        active_framework_ids: activeIds,
        active_framework_names: activeNames,
        active_jurisdictions: activeJurisdictions,
        impact_1_min: impactRanges[1].min,
        impact_1_max: impactRanges[1].max,
        impact_2_min: impactRanges[2].min,
        impact_2_max: impactRanges[2].max,
        impact_3_min: impactRanges[3].min,
        impact_3_max: impactRanges[3].max,
        impact_4_min: impactRanges[4].min,
        impact_4_max: impactRanges[4].max,
        impact_5_min: impactRanges[5].min,
        impact_5_max: impactRanges[5].max,
        risk_appetite_limit: appetiteLimit,
        updated_by_name: user?.full_name || user?.email,
      };

      if (settings?.id) {
        await base44.entities.TenantSettings.update(settings.id, data);
      } else {
        const created = await base44.entities.TenantSettings.create(data);
        setSettings(created);
      }
      toast({ title: "Tenant settings saved" });
    } catch (e) {
      toast({ title: "Error saving settings", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  if (!can("admin:settings")) {
    return <div className="p-8 text-center text-muted-foreground">Admin access required to configure tenant settings.</div>;
  }

  return (
    <div>
      <PageHeader
        title="Tenant Settings"
        subtitle="Customize frameworks, impact monetary ranges, and risk appetite for your organization"
        actions={
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save Settings"}
          </Button>
        }
      />

      <div className="space-y-6 max-w-4xl">
        {/* Active Frameworks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-primary" /> Active Compliance Frameworks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Select the regulatory frameworks your organization is tracking. These will appear in tooltips and dashboards across the app.</p>
            {frameworks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No frameworks available. Add frameworks in the SADC Frameworks or Regulatory Frameworks pages.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {frameworks.map((f) => (
                  <label key={f.id} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <Checkbox checked={activeIds.includes(f.id)} onCheckedChange={() => toggleFramework(f.id)} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      {f.code && <p className="text-xs text-muted-foreground">{f.code} · {f.jurisdiction || "global"}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Jurisdictions — SADC Cross-Border Data Sovereignty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-primary" /> Active Jurisdictions (SADC Data Sovereignty)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Select the countries your organization operates in. Cross-border data transfers to countries outside this list (or without SADC adequacy agreements) will be automatically flagged as High Risk.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SADC_JURISDICTIONS.map((country) => {
                const checked = activeJurisdictions.includes(country);
                return (
                  <label key={country} className="flex items-center gap-2 p-2.5 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                    <Checkbox checked={checked} onCheckedChange={() => {
                      setActiveJurisdictions((prev) => prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country]);
                    }} />
                    <span className="text-sm text-foreground">{country}</span>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Impact Monetary Ranges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4 text-primary" /> Impact Scale — Monetary Ranges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Define custom monetary loss ranges for each impact level (1–5). These values customize risk tooltips and appetite calculations across the app.</p>
            <div className="space-y-3">
              {IMPACT_LABELS.map(({ level, name }) => (
                <div key={level} className="flex items-center gap-4 p-3 border border-border rounded-lg">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">{level}</div>
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">Impact {level}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Min ($)</Label>
                      <Input
                        type="number"
                        value={impactRanges[level].min}
                        onChange={(e) => setImpactRanges({ ...impactRanges, [level]: { ...impactRanges[level], min: parseFloat(e.target.value) || 0 } })}
                      />
                    </div>
                    <span className="text-muted-foreground mt-5">—</span>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Max ($)</Label>
                      <Input
                        type="number"
                        value={impactRanges[level].max}
                        onChange={(e) => setImpactRanges({ ...impactRanges, [level]: { ...impactRanges[level], max: parseFloat(e.target.value) || 0 } })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Appetite Limit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4 text-primary" /> Corporate Risk Appetite Limit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">The maximum acceptable loss exposure for your organization. Risks exceeding this limit will be flagged as above appetite across the app.</p>
            <div className="max-w-xs">
              <Label>Corporate Risk Appetite Limit ($)</Label>
              <Input
                type="number"
                value={appetiteLimit}
                onChange={(e) => setAppetiteLimit(parseFloat(e.target.value) || 0)}
                placeholder="e.g. 500000"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}