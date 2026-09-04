import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, ShieldCheck, Award, FileText, Activity, AlertTriangle,
  CheckCircle2, Clock, XCircle, Loader2, Zap, Star, TrendingUp,
  FileBadge, Lock, RefreshCw, Eye, Plus
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const CERT_TYPE_LABELS = {
  soc2_type1: "SOC 2 Type I", soc2_type2: "SOC 2 Type II", soc3: "SOC 3",
  iso27001: "ISO 27001", iso27017: "ISO 27017", iso27018: "ISO 27018",
  iso22301: "ISO 22301", iso27701: "ISO 27701", pci_dss: "PCI DSS",
  hipaa: "HIPAA", gdpr: "GDPR", fedramp_low: "FedRAMP Low",
  fedramp_moderate: "FedRAMP Moderate", fedramp_high: "FedRAMP High",
  cmmc_l1: "CMMC L1", cmmc_l2: "CMMC L2", cmmc_l3: "CMMC L3",
  nist_csf: "NIST CSF", csa_star_l1: "CSA STAR L1", csa_star_l2: "CSA STAR L2",
  csa_star_l3: "CSA STAR L3", tisax: "TISAX", cyberessentials: "Cyber Essentials",
  cyberessentials_plus: "Cyber Essentials+", king_iv: "King IV", popia: "POPIA", other: "Other"
};

const CERT_STATUS_META = {
  valid: { label: "Valid", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  expiring: { label: "Expiring", color: "bg-amber-100 text-amber-700", icon: Clock },
  expired: { label: "Expired", color: "bg-red-100 text-red-700", icon: XCircle },
  revoked: { label: "Revoked", color: "bg-red-100 text-red-700", icon: XCircle },
  pending_verification: { label: "Pending", color: "bg-blue-100 text-blue-700", icon: Clock },
  not_applicable: { label: "N/A", color: "bg-slate-100 text-slate-600", icon: Clock },
};

const BIA_TIER_META = {
  tier1_critical: { label: "Tier 1 — Critical", color: "bg-red-100 text-red-700" },
  tier2_high: { label: "Tier 2 — High", color: "bg-orange-100 text-orange-700" },
  tier3_moderate: { label: "Tier 3 — Moderate", color: "bg-amber-100 text-amber-700" },
  tier4_low: { label: "Tier 4 — Low", color: "bg-emerald-100 text-emerald-700" },
};

const RISK_LEVEL_COLOR = {
  critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700", low: "bg-emerald-100 text-emerald-700",
};

export default function VendorRiskCenter() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState([]);
  const [bias, setBias] = useState([]);
  const [certs, setCerts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [v, b, c, ct] = await Promise.all([
        base44.entities.Vendor.list("-risk_score", 100).catch(() => []),
        base44.entities.VendorBIA.list("-assessment_date", 100).catch(() => []),
        base44.entities.VendorCertification.list("-created_date", 100).catch(() => []),
        base44.entities.Contract.list("-created_date", 100).catch(() => []),
      ]);
      setVendors(v || []);
      setBias(b || []);
      setCerts(c || []);
      setContracts(ct || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runMonitor = async () => {
    setScanning(true);
    try {
      const res = await base44.functions.invoke("runVendorComplianceMonitor", {});
      const data = res?.data || res;
      toast({ title: "Vendor compliance monitor completed", description: data.message });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Monitor failed", description: e?.message }); }
    setScanning(false);
  };

  // Stats
  const criticalSuppliers = bias.filter(b => b.critical_supplier).length;
  const validCerts = certs.filter(c => c.status === "valid").length;
  const expiringCerts = certs.filter(c => c.status === "expiring").length;
  const expiredCerts = certs.filter(c => c.status === "expired").length;
  const contractsWithSecurity = contracts.filter(c => c.security_requirements_embedded).length;
  const criticalVendors = vendors.filter(v => v.risk_level === "critical" || v.risk_level === "high").length;

  return (
    <div>
      <PageHeader
        title="Supply Chain & Vendor Risk Center"
        subtitle="Business impact assessments, critical supplier identification, third-party certification ingestion, and continuous vendor compliance monitoring"
        actions={
          <Button onClick={runMonitor} disabled={scanning}>
            {scanning ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
            Run Compliance Monitor
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Critical Suppliers" value={criticalSuppliers} icon={Star} color={criticalSuppliers > 0 ? "red" : "green"} trendLabel="BIA-flagged" />
        <StatCard label="Valid Certs" value={validCerts} icon={Award} color="green" trendLabel={`${certs.length} total`} />
        <StatCard label="Expiring/Expired" value={expiringCerts + expiredCerts} icon={AlertTriangle} color={expiringCerts + expiredCerts > 0 ? "amber" : "green"} trendLabel={`${expiredCerts} expired`} />
        <StatCard label="Security Contracts" value={contractsWithSecurity} icon={FileBadge} color="blue" trendLabel={`${contracts.length} total`} />
        <StatCard label="High-Risk Vendors" value={criticalVendors} icon={ShieldCheck} color={criticalVendors > 0 ? "red" : "green"} trendLabel={`${vendors.length} total`} />
      </div>

      <Tabs defaultValue="critical" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="critical"><Star className="w-4 h-4 mr-1.5" />Critical Suppliers ({criticalSuppliers})</TabsTrigger>
          <TabsTrigger value="bia"><Activity className="w-4 h-4 mr-1.5" />Business Impact Assessments ({bias.length})</TabsTrigger>
          <TabsTrigger value="certs"><Award className="w-4 h-4 mr-1.5" />Security Certifications ({certs.length})</TabsTrigger>
          <TabsTrigger value="contracts"><FileText className="w-4 h-4 mr-1.5" />Contract Security ({contracts.length})</TabsTrigger>
          <TabsTrigger value="vendors"><Building2 className="w-4 h-4 mr-1.5" />Vendor Posture ({vendors.length})</TabsTrigger>
        </TabsList>

        {/* CRITICAL SUPPLIERS */}
        <TabsContent value="critical">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {criticalSuppliers === 0 ? (
                <EmptyState icon={Star} title="No critical suppliers identified" desc="Run the compliance monitor or complete BIAs — vendors with a BIA score ≥ 70 are auto-flagged as critical suppliers." />
              ) : (
                bias.filter(b => b.critical_supplier).map((bia) => {
                  const vendor = vendors.find(v => v.id === bia.vendor_id);
                  return (
                    <div key={bia.id} className="bg-card rounded-xl border border-red-200 dark:border-red-800 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-lg shrink-0 bg-red-100 dark:bg-red-900/20">
                          <Star className="w-5 h-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{bia.bia_id}</span>
                            <h3 className="text-sm font-semibold text-foreground">{bia.vendor_name}</h3>
                            <Badge className="bg-red-100 text-red-700 text-xs"><Star className="w-3 h-3 mr-1" />Critical Supplier</Badge>
                            <Badge variant="outline" className="text-xs">{BIA_TIER_META[bia.criticality_tier]?.label || bia.criticality_tier}</Badge>
                            <Badge variant="outline" className="text-xs">BIA Score: {bia.bia_score}/100 ({bia.bia_grade})</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{bia.title}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div><span className="text-muted-foreground">Process:</span> <strong className="text-foreground">{bia.business_process_impacted || "—"}</strong></div>
                            <div><span className="text-muted-foreground">RTO:</span> <strong className="text-foreground">{bia.rto_hours}h</strong></div>
                            <div><span className="text-muted-foreground">RPO:</span> <strong className="text-foreground">{bia.rpo_hours}h</strong></div>
                            <div><span className="text-muted-foreground">Dependency:</span> <strong className="text-foreground">{bia.dependency_type?.replace(/_/g, " ")}</strong></div>
                            <div><span className="text-muted-foreground">Financial Impact:</span> <strong className="text-foreground">{bia.financial_impact_annual?.toLocaleString() || "—"}</strong></div>
                            <div><span className="text-muted-foreground">Data Sensitivity:</span> <strong className="text-foreground">{bia.data_sensitivity}</strong></div>
                            <div><span className="text-muted-foreground">Replacement:</span> <strong className="text-foreground">{bia.replacement_difficulty?.replace(/_/g, " ")}</strong></div>
                            <div><span className="text-muted-foreground">Assessor:</span> <strong className="text-foreground">{bia.assessor_name || "—"}</strong></div>
                          </div>
                          {vendor && (
                            <div className="mt-2 pt-2 border-t border-border flex items-center gap-3 text-xs">
                              <span className="text-muted-foreground">Vendor Risk:</span>
                              <Badge className={`text-xs ${RISK_LEVEL_COLOR[vendor.risk_level] || RISK_LEVEL_COLOR.medium}`}>{vendor.risk_level}</Badge>
                              <span className="text-muted-foreground">Score: <strong className="text-foreground">{vendor.risk_score}/100 ({vendor.risk_grade})</strong></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        {/* BIA */}
        <TabsContent value="bia">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {bias.length === 0 ? (
                <EmptyState icon={Activity} title="No Business Impact Assessments" desc="Create a BIA for each vendor to identify critical suppliers and assess business impact." />
              ) : (
                bias.map((bia) => (
                  <div key={bia.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${bia.critical_supplier ? "bg-red-100 dark:bg-red-900/20" : "bg-muted"}`}>
                        <Activity className={`w-5 h-5 ${bia.critical_supplier ? "text-red-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{bia.bia_id}</span>
                          <h3 className="text-sm font-semibold text-foreground">{bia.vendor_name}</h3>
                          <Badge variant="outline" className="text-xs">{BIA_TIER_META[bia.criticality_tier]?.label || bia.criticality_tier}</Badge>
                          <Badge variant="outline" className="text-xs">Score: {bia.bia_score}/100 ({bia.bia_grade})</Badge>
                          {bia.critical_supplier && <Badge className="bg-red-100 text-red-700 text-xs"><Star className="w-3 h-3 mr-1" />Critical</Badge>}
                          <Badge className={`text-xs ${bia.status === "approved" ? "bg-emerald-100 text-emerald-700" : bia.status === "completed" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{bia.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">{bia.title}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Process: <strong className="text-foreground">{bia.business_process_impacted || "—"}</strong></span>
                          <span>RTO: <strong className="text-foreground">{bia.rto_hours}h</strong></span>
                          <span>RPO: <strong className="text-foreground">{bia.rpo_hours}h</strong></span>
                          <span>Impact: <strong className="text-foreground">{bia.operational_impact}</strong></span>
                          <span>Dependency: <strong className="text-foreground">{bia.dependency_type?.replace(/_/g, " ")}</strong></span>
                          {bia.assessment_date && <span>Assessed: <strong className="text-foreground">{new Date(bia.assessment_date).toLocaleDateString()}</strong></span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </TabsContent>

        {/* CERTIFICATIONS */}
        <TabsContent value="certs">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {certs.length === 0 ? (
                <EmptyState icon={Award} title="No certifications ingested" desc="Upload third-party security certifications (SOC 2, ISO 27001, PCI DSS, etc.) to track validity and expiry." />
              ) : (
                certs.map((cert) => {
                  const stMeta = CERT_STATUS_META[cert.status] || CERT_STATUS_META.pending_verification;
                  const StIcon = stMeta.icon;
                  return (
                    <div key={cert.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${cert.status === "valid" ? "bg-emerald-100 dark:bg-emerald-900/20" : cert.status === "expiring" ? "bg-amber-100 dark:bg-amber-900/20" : cert.status === "expired" ? "bg-red-100 dark:bg-red-900/20" : "bg-muted"}`}>
                          <Award className={`w-5 h-5 ${cert.status === "valid" ? "text-emerald-600" : cert.status === "expiring" ? "text-amber-600" : cert.status === "expired" ? "text-red-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-muted-foreground">{cert.cert_id}</span>
                            <h3 className="text-sm font-semibold text-foreground">{cert.vendor_name}</h3>
                            <Badge variant="outline" className="text-xs">{CERT_TYPE_LABELS[cert.certification_type] || cert.certification_type}</Badge>
                            <Badge className={`text-xs ${stMeta.color}`}><StIcon className="w-3 h-3 mr-1" />{stMeta.label}</Badge>
                            {cert.verified && <Badge className="bg-blue-100 text-blue-700 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Verified</Badge>}
                          </div>
                          <p className="text-xs font-medium text-foreground mb-1">{cert.certification_name}</p>
                          {cert.scope_summary && <p className="text-xs text-muted-foreground mb-1">{cert.scope_summary}</p>}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Body: <strong className="text-foreground">{cert.certifying_body || "—"}</strong></span>
                            {cert.issue_date && <span>Issued: <strong className="text-foreground">{new Date(cert.issue_date).toLocaleDateString()}</strong></span>}
                            {cert.expiry_date && <span>Expires: <strong className="text-foreground">{new Date(cert.expiry_date).toLocaleDateString()}</strong></span>}
                            {cert.months_to_expiry > 0 && <span>Months to expiry: <strong className="text-foreground">{cert.months_to_expiry}</strong></span>}
                            {cert.document_url && <a href={cert.document_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline"><Eye className="w-3 h-3" />View document</a>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        {/* CONTRACT SECURITY */}
        <TabsContent value="contracts">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {contracts.length === 0 ? (
                <EmptyState icon={FileText} title="No contracts" desc="Add vendor contracts and embed security requirements, SLA terms, and breach notification clauses." />
              ) : (
                contracts.map((contract) => {
                  let slaReqs = {};
                  try { slaReqs = JSON.parse(contract.sla_security_requirements || '{}'); } catch (_) {}
                  let securityClauses = [];
                  try { securityClauses = JSON.parse(contract.security_clauses || '[]'); } catch (_) {}
                  return (
                    <div key={contract.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${contract.security_requirements_embedded ? "bg-emerald-100 dark:bg-emerald-900/20" : "bg-muted"}`}>
                          <FileText className={`w-5 h-5 ${contract.security_requirements_embedded ? "text-emerald-600" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {contract.contract_id && <span className="text-xs font-mono text-muted-foreground">{contract.contract_id}</span>}
                            <h3 className="text-sm font-semibold text-foreground">{contract.title}</h3>
                            <Badge variant="outline" className="text-xs">{contract.contract_type?.toUpperCase()}</Badge>
                            <Badge className={`text-xs ${contract.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{contract.status}</Badge>
                            {contract.security_requirements_embedded ? (
                              <Badge className="bg-emerald-100 text-emerald-700 text-xs"><Lock className="w-3 h-3 mr-1" />Security Embedded</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-amber-600"><AlertTriangle className="w-3 h-3 mr-1" />No Security Clauses</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">Counterparty: <strong className="text-foreground">{contract.counterparty}</strong>{contract.linked_vendor_name ? ` (${contract.linked_vendor_name})` : ""}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {contract.breach_notification_sla_hours && <div><span className="text-muted-foreground">Breach SLA:</span> <strong className="text-foreground">{contract.breach_notification_sla_hours}h</strong></div>}
                            {contract.right_to_audit !== undefined && <div><span className="text-muted-foreground">Right to Audit:</span> <strong className="text-foreground">{contract.right_to_audit ? "Yes" : "No"}</strong></div>}
                            {contract.subprocessor_approved !== undefined && <div><span className="text-muted-foreground">Subprocessors:</span> <strong className="text-foreground">{contract.subprocessor_approved ? "Approved" : "Pending"}</strong></div>}
                            {contract.termination_for_noncompliance && <div><span className="text-muted-foreground">Term. for Non-Compliance:</span> <strong className="text-foreground">Yes</strong></div>}
                            {slaReqs.uptime_pct && <div><span className="text-muted-foreground">Uptime SLA:</span> <strong className="text-foreground">{slaReqs.uptime_pct}%</strong></div>}
                            {slaReqs.incident_response_sla_hours && <div><span className="text-muted-foreground">IR SLA:</span> <strong className="text-foreground">{slaReqs.incident_response_sla_hours}h</strong></div>}
                            {slaReqs.patching_sla_days && <div><span className="text-muted-foreground">Patching SLA:</span> <strong className="text-foreground">{slaReqs.patching_sla_days}d</strong></div>}
                            {slaReqs.dr_rto_hours && <div><span className="text-muted-foreground">DR RTO:</span> <strong className="text-foreground">{slaReqs.dr_rto_hours}h</strong></div>}
                          </div>
                          {securityClauses.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Security Clauses ({securityClauses.length})</p>
                              <div className="flex flex-wrap gap-1.5">
                                {securityClauses.slice(0, 5).map((cl, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">{cl.title || cl.clause_id || `Clause ${i+1}`}</Badge>
                                ))}
                                {securityClauses.length > 5 && <span className="text-xs text-muted-foreground">+{securityClauses.length - 5} more</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>

        {/* VENDOR POSTURE */}
        <TabsContent value="vendors">
          {loading ? <Spinner /> : (
            <div className="space-y-3">
              {vendors.length === 0 ? (
                <EmptyState icon={Building2} title="No vendors" desc="Add vendors to begin tracking their compliance posture." />
              ) : (
                vendors.map((vendor) => {
                  const vendorCerts = certs.filter(c => c.vendor_id === vendor.id);
                  const vendorBia = bias.find(b => b.vendor_id === vendor.id);
                  return (
                    <div key={vendor.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${vendor.risk_level === "critical" ? "bg-red-100 dark:bg-red-900/20" : vendor.risk_level === "high" ? "bg-orange-100 dark:bg-orange-900/20" : vendor.risk_level === "medium" ? "bg-amber-100 dark:bg-amber-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"}`}>
                          <Building2 className={`w-5 h-5 ${vendor.risk_level === "critical" ? "text-red-600" : vendor.risk_level === "high" ? "text-orange-600" : vendor.risk_level === "medium" ? "text-amber-600" : "text-emerald-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="text-sm font-semibold text-foreground">{vendor.name}</h3>
                            <Badge variant="outline" className="text-xs">{vendor.category?.replace(/_/g, " ")}</Badge>
                            <Badge className={`text-xs ${RISK_LEVEL_COLOR[vendor.risk_level] || RISK_LEVEL_COLOR.medium}`}>{vendor.risk_level}</Badge>
                            <Badge variant="outline" className="text-xs">Score: {vendor.risk_score}/100 ({vendor.risk_grade})</Badge>
                            {vendorBia?.critical_supplier && <Badge className="bg-red-100 text-red-700 text-xs"><Star className="w-3 h-3 mr-1" />Critical</Badge>}
                            <Badge className={`text-xs ${vendor.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{vendor.status}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>Certs: <strong className="text-foreground">{vendorCerts.filter(c => c.status === "valid").length} valid</strong></span>
                            <span>SOC 2: <strong className="text-foreground">{vendor.soc2_compliant ? "✓" : "✗"}</strong></span>
                            <span>ISO 27001: <strong className="text-foreground">{vendor.iso27001_compliant ? "✓" : "✗"}</strong></span>
                            <span>GDPR: <strong className="text-foreground">{vendor.gdpr_compliant ? "✓" : "✗"}</strong></span>
                            <span>Data Access: <strong className="text-foreground">{vendor.data_access}</strong></span>
                            {vendor.last_risk_assessment && <span>Last assessed: <strong className="text-foreground">{new Date(vendor.last_risk_assessment).toLocaleDateString()}</strong></span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Spinner() {
  return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <Icon className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-md mx-auto">{desc}</p>
    </div>
  );
}