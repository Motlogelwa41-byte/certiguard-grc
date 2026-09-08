import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Download, ShieldCheck, AlertTriangle, ArrowRight, FileCheck, FileX, Clock, FileText, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { exportBdpaReport } from "@/lib/bdpaReportExport";

export default function BDPAComplianceReport() {
  const { toast } = useToast();
  const [framework, setFramework] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [orgName, setOrgName] = useState("Organization");

  useEffect(() => {
    Promise.all([
      base44.entities.RegulatoryFramework.filter({ code: "BDPA" }).catch(() => []),
      base44.entities.FrameworkRequirement.list("-created_date", 200).catch(() => []),
      base44.entities.Control.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
      base44.entities.ComplianceTask.list("-updated_date", 200).catch(() => []),
      base44.entities.AuditFinding.list("-updated_date", 100).catch(() => []),
      base44.entities.TenantSettings.list("-created_date", 1).catch(() => []),
      base44.entities.Tenant.list("-created_date", 1).catch(() => []),
    ]).then(([fw, reqs, ctrls, ev, tks, fnd, settings, tenants]) => {
      const bdpa = (fw || [])[0] || null;
      setFramework(bdpa);
      setRequirements(reqs || []);
      setControls(ctrls || []);
      setEvidence(ev || []);
      setTasks(tks || []);
      setFindings(fnd || []);
      const s = (settings || [])[0];
      const t = (tenants || [])[0];
      setOrgName(s?.brand_display_name || t?.name || "Organization");
      setLoading(false);
    });
  }, []);

  // Match data to BDPA framework
  const bdpaData = useMemo(() => {
    const fwId = framework?.id;
    const fwName = framework?.name || "Botswana Data Protection Act";
    const matchFw = (item) => {
      if (fwId && (item.framework_id === fwId || item.framework_name === fwName)) return true;
      if (item.framework_ids?.includes(fwId)) return true;
      if (item.framework_names?.some((n) => n?.toLowerCase().includes("data protection"))) return true;
      if (item.linked_framework_ids?.includes(fwId)) return true;
      return false;
    };
    return {
      requirements: fwId ? requirements.filter(matchFw) : [],
      controls: controls.filter((c) =>
        c.framework_ids?.includes(fwId) ||
        c.framework_names?.some((n) => n?.toLowerCase().includes("data protection"))
      ),
      evidence: evidence.filter(matchFw),
      tasks: fwId ? tasks.filter((t) => t.related_framework_id === fwId) : [],
      findings: findings.filter((f) =>
        f.linked_framework_ids?.includes(fwId) ||
        f.framework_name?.toLowerCase().includes("data protection")
      ),
    };
  }, [framework, requirements, controls, evidence, tasks, findings]);

  const passingControls = bdpaData.controls.filter((c) => c.status === "passing").length;
  const failingControls = bdpaData.controls.filter((c) => c.status === "failing").length;
  const notTested = bdpaData.controls.filter((c) => c.status === "not_tested").length;
  const approvedEvidence = bdpaData.evidence.filter((e) => e.status === "approved").length;
  const openTasks = bdpaData.tasks.filter((t) => !["completed"].includes(t.status)).length;
  const openFindings = bdpaData.findings.filter((f) => ["open", "in_remediation"].includes(f.status)).length;
  const readiness = bdpaData.controls.length > 0 ? Math.round((passingControls / bdpaData.controls.length) * 100) : 0;

  const handleExport = () => {
    setExporting(true);
    try {
      exportBdpaReport({
        framework,
        requirements: bdpaData.requirements,
        controls: bdpaData.controls,
        evidence: bdpaData.evidence,
        tasks: bdpaData.tasks,
        findings: bdpaData.findings,
        orgName,
      });
      toast({ title: "PDF exported", description: "BDPA compliance report saved for regulator submission." });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    { label: "Readiness", value: `${readiness}%`, icon: ShieldCheck, color: readiness >= 75 ? "text-emerald-600" : readiness >= 50 ? "text-amber-600" : "text-red-600", bg: readiness >= 75 ? "bg-emerald-50" : readiness >= 50 ? "bg-amber-50" : "bg-red-50" },
    { label: "Controls Passing", value: `${passingControls}/${bdpaData.controls.length}`, icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Controls Failing", value: `${failingControls}`, icon: FileX, color: failingControls > 0 ? "text-red-600" : "text-muted-foreground", bg: failingControls > 0 ? "bg-red-50" : "bg-muted" },
    { label: "Not Tested", value: `${notTested}`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Evidence Approved", value: `${approvedEvidence}/${bdpaData.evidence.length}`, icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Open Tasks", value: `${openTasks}`, icon: Clock, color: openTasks > 0 ? "text-amber-600" : "text-muted-foreground", bg: openTasks > 0 ? "bg-amber-50" : "bg-muted" },
    { label: "Open Findings", value: `${openFindings}`, icon: AlertTriangle, color: openFindings > 0 ? "text-red-600" : "text-emerald-600", bg: openFindings > 0 ? "bg-red-50" : "bg-emerald-50" },
    { label: "Requirements Tracked", value: `${bdpaData.requirements.length}/${framework?.total_requirements || 42}`, icon: FileText, color: "text-primary", bg: "bg-primary/5" },
  ];

  return (
    <div>
      <PageHeader
        title="BDPA Compliance Report"
        subtitle="Botswana Data Protection Act (Act No. 8 of 2018) — regulator-ready compliance status and evidence"
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Generating…" : "Export PDF for Regulator"}
          </button>
        }
      />

      {/* Framework info banner */}
      {framework ? (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">{framework.name}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{framework.description}</p>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                <span><strong className="text-foreground">Version:</strong> {framework.version}</span>
                <span><strong className="text-foreground">Authority:</strong> {framework.authority}</span>
                <span><strong className="text-foreground">Effective:</strong> {framework.effective_date}</span>
                <span><strong className="text-foreground">Requirements:</strong> {framework.total_requirements}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground">BDPA framework not found in your library</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Import the Botswana Data Protection Act from the SADC Frameworks Library to start tracking compliance.
              </p>
              <Link to="/sadc-frameworks" className="inline-flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90">
                Import from SADC Library <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`border border-border rounded-xl p-4 ${s.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold font-heading ${s.color}`}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Requirements checklist */}
      {bdpaData.requirements.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">DPA Requirements Checklist</h3>
          <div className="space-y-2">
            {bdpaData.requirements.map((req, i) => {
              const status = req.status || req.compliance_status || "not_assessed";
              const statusColor = status === "compliant" ? "text-emerald-600 bg-emerald-50" : status === "non_compliant" ? "text-red-600 bg-red-50" : status === "partial" ? "text-amber-600 bg-amber-50" : "text-muted-foreground bg-muted";
              return (
                <div key={req.id || i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor} uppercase`}>{status.replace("_", " ")}</span>
                  <span className="text-xs font-mono text-muted-foreground">{req.reference || req.requirement_id || req.clause || `R${i + 1}`}</span>
                  <span className="text-sm text-foreground flex-1">{req.title || req.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls summary */}
      {bdpaData.controls.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4">Mapped Controls ({bdpaData.controls.length})</h3>
          <div className="space-y-2">
            {bdpaData.controls.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  c.status === "passing" ? "text-emerald-600 bg-emerald-50" :
                  c.status === "failing" ? "text-red-600 bg-red-50" :
                  "text-muted-foreground bg-muted"
                }`}>{c.status || "not_tested"}</span>
                <span className="text-xs font-mono text-muted-foreground">{c.control_id}</span>
                <span className="text-sm text-foreground flex-1">{c.title}</span>
                {c.owner_name && <span className="text-xs text-muted-foreground">{c.owner_name}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}