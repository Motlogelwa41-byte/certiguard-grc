import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Cloud, Building2, Users, AlertTriangle, CheckCircle2, Lock, KeyRound, RefreshCw, Download, ShieldCheck, ShieldAlert, XCircle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { SHARED_RESPONSIBILITY_ITEMS, RESPONSIBILITY_MODEL_META, CATEGORY_LABELS } from "@/lib/sharedResponsibility";

const MODEL_ICON = { provider_managed: Cloud, shared: Users, tenant_managed: Building2 };
const STATUS_COLOR = {
  configured: "bg-emerald-100 text-emerald-700 border-emerald-200",
  partially_configured: "bg-amber-100 text-amber-700 border-amber-200",
  not_configured: "bg-red-100 text-red-700 border-red-200",
  not_applicable: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function SharedResponsibilityDashboard() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [tenantCtx, setTenantCtx] = useState(null);
  const [validating, setValidating] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SharedResponsibilityItem.list("-updated_date", 100).catch(() => []);
      setItems(data || []);
    } catch (e) {
      toast({ variant: "destructive", title: "Failed to load", description: e?.message });
    }
    setLoading(false);
  }, [toast]);

  const validateTenant = useCallback(async () => {
    setValidating(true);
    try {
      const res = await base44.functions.invoke("validateTenantContext", {});
      const data = res?.data || res;
      setTenantCtx(data);
      if (data?.valid) {
        toast({ title: "Tenant context verified", description: `Bound to ${data.tenant_context?.tenant_name} — JWT validated, RLS enforced.` });
      } else {
        toast({ variant: "destructive", title: "Tenant validation failed", description: data?.error });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Validation error", description: e?.message });
    }
    setValidating(false);
  }, [toast]);

  useEffect(() => { loadData(); validateTenant(); }, [loadData, validateTenant]);

  const handleImport = async () => {
    setImporting(true);
    try {
      const me = await base44.auth.me();
      const tenantId = me?.data?.tenant_id || me?.tenant_id || "";
      const toCreate = SHARED_RESPONSIBILITY_ITEMS.map((item) => ({
        ...item,
        tenant_id: tenantId,
        last_reviewed: new Date().toISOString().slice(0, 10),
      }));
      await base44.entities.SharedResponsibilityItem.bulkCreate(toCreate);
      toast({ title: "Shared responsibility matrix imported", description: `${toCreate.length} items created from the CSR model library.` });
      loadData();
    } catch (e) {
      toast({ variant: "destructive", title: "Import failed", description: e?.message });
    }
    setImporting(false);
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.responsibility_model === filter);
  const providerCount = items.filter((i) => i.responsibility_model === "provider_managed").length;
  const sharedCount = items.filter((i) => i.responsibility_model === "shared").length;
  const tenantCount = items.filter((i) => i.responsibility_model === "tenant_managed").length;
  const gaps = items.filter((i) => i.gap_identified).length;
  const configuredPct = items.length > 0
    ? Math.round(items.filter((i) => i.tenant_status === "configured" || i.tenant_status === "not_applicable").length / items.length * 100)
    : 0;

  return (
    <div>
      <PageHeader
        title="Shared Responsibility Dashboard"
        subtitle="Dynamic matrix segregating cloud provider (Base44) controls from tenant-managed configurations"
        icon={Shield}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={validateTenant} disabled={validating}>
              {validating ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <KeyRound className="w-4 h-4 mr-1.5" />}
              Validate Tenant Context
            </Button>
            {items.length === 0 && (
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                Import Matrix
              </Button>
            )}
          </div>
        }
      />

      {/* Tenant Context Validation Banner */}
      {tenantCtx && (
        <div className={`mb-6 rounded-xl border p-4 ${tenantCtx.valid ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-red-200 bg-red-50/50 dark:bg-red-900/10"}`}>
          <div className="flex items-start gap-3">
            {tenantCtx.valid ? <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" /> : <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {tenantCtx.valid ? "Tenant Boundary Cryptographically Verified" : "Tenant Boundary Validation Failed"}
              </p>
              {tenantCtx.valid && tenantCtx.tenant_context && (
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Tenant: <strong className="text-foreground">{tenantCtx.tenant_context.tenant_name}</strong></span>
                  <span>Tier: <strong className="text-foreground capitalize">{tenantCtx.tenant_context.subscription_tier}</strong></span>
                  <span>Entity: <strong className="text-foreground capitalize">{tenantCtx.tenant_context.entity_type}</strong></span>
                  {tenantCtx.security_checks && (
                    <>
                      <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> JWT: {tenantCtx.security_checks.jwt_verified ? "✓" : "✗"}</span>
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> RLS: {tenantCtx.security_checks.rls_enforced ? "✓" : "✗"}</span>
                      <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Bound: {tenantCtx.security_checks.session_tenant_bound ? "✓" : "✗"}</span>
                    </>
                  )}
                </div>
              )}
              {!tenantCtx.valid && <p className="text-xs text-red-600 mt-1">{tenantCtx.error}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Provider-Managed" value={providerCount} icon={Cloud} color="blue" trendLabel="Base44 / Cloud" />
        <StatCard label="Shared" value={sharedCount} icon={Users} color="amber" trendLabel="Joint responsibility" />
        <StatCard label="Tenant-Managed" value={tenantCount} icon={Building2} color="green" trendLabel="Your controls" />
        <StatCard label="Config Coverage" value={`${configuredPct}%`} icon={CheckCircle2} color={configuredPct >= 80 ? "green" : "amber"} />
        <StatCard label="Gaps Identified" value={gaps} icon={AlertTriangle} color={gaps > 0 ? "red" : "green"} />
      </div>

      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="matrix">Responsibility Matrix</TabsTrigger>
          <TabsTrigger value="provider">Provider Controls</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Controls</TabsTrigger>
          <TabsTrigger value="gaps">Gaps & Remediation</TabsTrigger>
        </TabsList>

        {/* MATRIX TAB */}
        <TabsContent value="matrix">
          <div className="flex gap-2 mb-4">
            {["all", "provider_managed", "shared", "tenant_managed"].map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
                {f === "all" ? "All Items" : RESPONSIBILITY_MODEL_META[f]?.label || f}
              </Button>
            ))}
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Shield className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No shared responsibility items yet.</p>
              <Button onClick={handleImport} disabled={importing}><Download className="w-4 h-4 mr-2" /> Import Shared Responsibility Matrix</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const Icon = MODEL_ICON[item.responsibility_model] || Shield;
                const meta = RESPONSIBILITY_MODEL_META[item.responsibility_model] || {};
                return (
                  <div key={item.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 p-2.5 rounded-lg bg-primary/10">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-heading font-semibold text-foreground">{item.control_area}</h3>
                          <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                          <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                          {item.gap_identified && <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Gap</Badge>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                          <div className="text-sm">
                            <p className="text-xs font-semibold text-blue-600 mb-0.5">Provider Responsibility</p>
                            <p className="text-muted-foreground text-xs">{item.provider_responsibility}</p>
                          </div>
                          <div className="text-sm">
                            <p className="text-xs font-semibold text-emerald-600 mb-0.5">Tenant Responsibility</p>
                            <p className="text-muted-foreground text-xs">{item.tenant_responsibility}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-muted-foreground">Tenant status:</span>
                          <Badge variant="outline" className={`text-xs ${STATUS_COLOR[item.tenant_status] || ""}`}>{(item.tenant_status || "").replace(/_/g, " ")}</Badge>
                          {item.framework_reference && <span className="text-xs text-muted-foreground">• {item.framework_reference}</span>}
                        </div>
                        {item.gap_notes && (
                          <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200">
                            <p className="text-xs text-red-700 dark:text-red-400"><AlertTriangle className="w-3 h-3 inline mr-1" />{item.gap_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* PROVIDER CONTROLS TAB */}
        <TabsContent value="provider">
          <p className="text-sm text-muted-foreground mb-4">Controls fully managed by Base44 / Cloud infrastructure — no tenant action required</p>
          <div className="space-y-3">
            {items.filter((i) => i.responsibility_model === "provider_managed").map((item) => {
              let controls = []; try { controls = JSON.parse(item.provider_controls || "[]"); } catch { controls = []; }
              return (
                <div key={item.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <h3 className="font-heading font-semibold text-foreground text-sm">{item.control_area}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{item.provider_responsibility}</p>
                  <div className="flex flex-wrap gap-2">
                    {controls.map((c, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/10">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-blue-500" />{c.control}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
            {items.filter((i) => i.responsibility_model === "provider_managed").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Import the matrix to see provider controls.</p>
            )}
          </div>
        </TabsContent>

        {/* TENANT CONTROLS TAB */}
        <TabsContent value="tenant">
          <p className="text-sm text-muted-foreground mb-4">Controls the tenant organization must configure and manage</p>
          <div className="space-y-3">
            {items.filter((i) => i.responsibility_model === "tenant_managed" || i.responsibility_model === "shared").map((item) => {
              let controls = []; try { controls = JSON.parse(item.tenant_controls || "[]"); } catch { controls = []; }
              return (
                <div key={item.id} className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-heading font-semibold text-foreground text-sm">{item.control_area}</h3>
                    <Badge variant="outline" className={`text-xs ${STATUS_COLOR[item.tenant_status] || ""}`}>{(item.tenant_status || "").replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{item.tenant_responsibility}</p>
                  <div className="space-y-1.5">
                    {controls.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {c.status === "configured" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : c.status === "not_configured" ? <XCircle className="w-3.5 h-3.5 text-red-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                        <span className="text-foreground">{c.control}</span>
                        <span className="text-muted-foreground capitalize">— {c.status?.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {items.filter((i) => i.responsibility_model === "tenant_managed" || i.responsibility_model === "shared").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Import the matrix to see tenant controls.</p>
            )}
          </div>
        </TabsContent>

        {/* GAPS TAB */}
        <TabsContent value="gaps">
          <p className="text-sm text-muted-foreground mb-4">Identified gaps in tenant responsibility coverage — requires remediation</p>
          {items.filter((i) => i.gap_identified).length === 0 ? (
            <div className="flex items-center gap-2 p-6 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">No gaps identified — all tenant responsibilities are configured.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.filter((i) => i.gap_identified).map((item) => (
                <div key={item.id} className="bg-card rounded-xl border border-red-200 bg-red-50/30 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-heading font-semibold text-foreground text-sm">{item.control_area}</h3>
                      <p className="text-xs text-red-700 dark:text-red-400 mt-1">{item.gap_notes}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[item.category] || item.category}</Badge>
                        <Badge variant="outline" className={`text-xs ${STATUS_COLOR[item.tenant_status] || ""}`}>{(item.tenant_status || "").replace(/_/g, " ")}</Badge>
                        {item.framework_reference && <span className="text-xs text-muted-foreground">{item.framework_reference}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}