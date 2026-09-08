import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { SADC_LIBRARY } from "@/lib/sadcLibrary";
import { Download, AlertTriangle, ArrowRight, MapPin } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { exportEvidencePack } from "@/lib/exportEvidencePack";
import OverviewCards from "@/components/hrdc-bqa/OverviewCards";
import FrameworkDetailPanel from "@/components/hrdc-bqa/FrameworkDetailPanel";

const TARGET_IDS = ["hrdc_bw", "bqa_bw"];
const TARGET_LIBS = SADC_LIBRARY.filter((l) => TARGET_IDS.includes(l.id));

export default function HRDCBQAReport() {
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [findings, setFindings] = useState([]);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("hrdc_bw");

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
      base44.entities.FrameworkRequirement.list().catch(() => []),
      base44.entities.ComplianceTask.list("-updated_date", 200).catch(() => []),
      base44.entities.AuditFinding.list("-updated_date", 100).catch(() => []),
      base44.entities.Audit.list("-updated_date", 50).catch(() => []),
    ]).then(([f, c, e, r, t, af, a]) => {
      setFrameworks(f || []);
      setControls(c || []);
      setEvidence(e || []);
      setRequirements(r || []);
      setTasks(t || []);
      setFindings(af || []);
      setAudits(a || []);
      setLoading(false);
    });
  }, []);

  const matched = useMemo(() => {
    return TARGET_LIBS.map((lib) => {
      const fw = frameworks.find(
        (f) => f.name?.toLowerCase() === lib.name.toLowerCase() ||
               f.name?.toLowerCase().includes(lib.name.toLowerCase())
      );
      const fwControls = fw
        ? controls.filter((c) => c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name))
        : [];
      const fwEvidence = fw
        ? evidence.filter((e) => e.framework_id === fw.id || e.framework_name === fw.name)
        : [];
      const fwReqs = fw
        ? requirements.filter((r) => r.framework_id === fw.id || r.framework_name === fw.name)
        : [];
      const fwTasks = fw
        ? tasks.filter((t) => t.related_framework_id === fw.id)
        : [];
      const fwFindings = fw
        ? findings.filter((f) => f.linked_framework_ids?.includes(fw.id) || f.framework_name === fw.name)
        : [];
      const fwAudits = fw
        ? audits.filter((a) => a.framework_id === fw.id || a.framework_name === fw.name)
        : [];
      return { lib, framework: fw, controls: fwControls, evidence: fwEvidence, requirements: fwReqs, tasks: fwTasks, findings: fwFindings, audits: fwAudits };
    });
  }, [frameworks, controls, evidence, requirements, tasks, findings, audits]);

  const active = matched.find((m) => m.lib.id === activeTab) || matched[0];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEvidencePack();
      toast({ title: "PDF report generated", description: "HRDC & BQA compliance status exported for auditors." });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="HRDC & BQA Compliance Report"
        subtitle="Dedicated tracking view for Botswana's Human Resources Development Council and Botswana Qualifications Authority standards"
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? "Generating…" : "Export PDF"}
          </button>
        }
      />

      {/* Botswana banner */}
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4 text-primary" />
        <span>Botswana regulatory compliance — {TARGET_LIBS.length} mandatory frameworks tracked</span>
      </div>

      {/* Combined overview */}
      <OverviewCards matched={matched} />

      {/* Framework selector tabs */}
      <div className="flex gap-2 mb-6">
        {matched.map((m) => (
          <button
            key={m.lib.id}
            onClick={() => setActiveTab(m.lib.id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeTab === m.lib.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-muted"
            }`}
          >
            <span className="text-base">{m.lib.flag}</span>
            {m.lib.name}
            {m.framework && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                imported
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Active framework detail or import CTA */}
      {!active.framework ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-foreground">{active.lib.name} not yet imported</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Import this framework from the SADC Frameworks Library to start tracking compliance against {active.lib.name} requirements, map controls, attach evidence, and generate audit-ready reports.
              </p>
              <Link
                to="/sadc-frameworks"
                className="inline-flex items-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2 hover:bg-primary/90 transition-colors"
              >
                Import from SADC Library <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <FrameworkDetailPanel item={active} />
      )}
    </div>
  );
}