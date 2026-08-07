import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { SADC_LIBRARY } from "@/lib/sadcLibrary";
import { Shield, FileCheck, AlertTriangle, Clock, CheckCircle, XCircle, GraduationCap, Award, BookOpen, Download } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useToast } from "@/components/ui/use-toast";
import { exportEvidencePack } from "@/lib/exportEvidencePack";

const TARGET_IDS = ["hrdc_bw", "bqa_bw"];
const TARGET_LIBS = SADC_LIBRARY.filter((l) => TARGET_IDS.includes(l.id));

const STATUS_COLORS = {
  passing: "text-emerald-600 bg-emerald-50 border-emerald-200",
  failing: "text-rose-600 bg-rose-50 border-rose-200",
  not_tested: "text-slate-500 bg-slate-50 border-slate-200",
  not_applicable: "text-blue-500 bg-blue-50 border-blue-200",
};

export default function HRDCBQAReport() {
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState("hrdc");

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
      base44.entities.Evidence.list().catch(() => []),
      base44.entities.FrameworkRequirement.list().catch(() => []),
    ]).then(([f, c, e, r]) => {
      setFrameworks(f || []);
      setControls(c || []);
      setEvidence(e || []);
      setRequirements(r || []);
      setLoading(false);
    });
  }, []);

  // Match imported frameworks to the library entries by name
  const matched = useMemo(() => {
    return TARGET_LIBS.map((lib) => {
      const fw = frameworks.find(
        (f) => f.name?.toLowerCase() === lib.name.toLowerCase() || f.name?.toLowerCase().includes(lib.name.toLowerCase())
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
      return { lib, framework: fw, controls: fwControls, evidence: fwEvidence, requirements: fwReqs };
    });
  }, [frameworks, controls, evidence, requirements]);

  const active = matched.find((m) => m.lib.id === activeTab) || matched[0];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportEvidencePack();
      toast({ title: "PDF report generated", description: "Full compliance status exported for auditors." });
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
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${m.framework.status === "certified" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                imported
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Library metadata card */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 flex items-center justify-center shrink-0">
            {active.lib.id === "hrdc_bw" ? <GraduationCap className="w-7 h-7 text-blue-600" /> : <Award className="w-7 h-7 text-emerald-600" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-heading font-bold text-foreground">{active.lib.full_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{active.lib.description}</p>
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{active.lib.authority}</strong></span>
              <span>Version: {active.lib.version}</span>
              <span>Category: {active.lib.category}</span>
              <span>{active.lib.controls_count} controls</span>
              {active.lib.mandatory && <span className="text-red-600 font-semibold">⚠ Mandatory</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Import status */}
      {!active.framework ? (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-foreground">{active.lib.name} not yet imported</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Import this framework from the SADC Frameworks Library to start tracking compliance against {active.lib.name} requirements.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <SummaryCard icon={Shield} label="Readiness" value={`${active.framework.readiness_score || 0}%`} color="blue" />
            <SummaryCard icon={CheckCircle} label="Passing" value={active.controls.filter((c) => c.status === "passing").length} sub={`${active.controls.length} total`} color="green" />
            <SummaryCard icon={XCircle} label="Failing" value={active.controls.filter((c) => c.status === "failing").length} color="red" />
            <SummaryCard icon={FileCheck} label="Evidence" value={active.evidence.length} sub={`${active.evidence.filter((e) => e.status === "approved").length} approved`} color="purple" />
          </div>

          {/* Key requirements checklist */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Key Requirements ({active.lib.key_requirements.length})
            </h3>
            <div className="space-y-2">
              {active.lib.key_requirements.map((req, i) => {
                const matchedReq = active.requirements[i];
                const matchedCtrl = active.controls[i];
                const status = matchedCtrl?.status || "not_tested";
                return (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">{active.lib.id.split("_")[0].toUpperCase()}-{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-sm text-foreground flex-1">{req}</span>
                    {status === "passing" ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : status === "failing" ? (
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.not_tested}`}>
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls detail */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Control Status Detail</h3>
            {active.controls.length > 0 ? (
              <div className="space-y-2">
                {active.controls.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{c.control_id || "—"}</span>
                    <span className="text-sm text-foreground flex-1 truncate">{c.title}</span>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No controls mapped yet.</p>
            )}
          </div>

          {/* Evidence */}
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-heading font-semibold text-foreground mb-4">Linked Evidence</h3>
            {active.evidence.length > 0 ? (
              <div className="space-y-2">
                {active.evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{e.title}</span>
                    <span className="text-xs text-muted-foreground">{e.control_title || e.control_id || "—"}</span>
                    <StatusBadge status={e.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No evidence linked to {active.lib.name} yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-500/10",
    green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10",
    red: "text-rose-600 bg-rose-50 dark:bg-rose-500/10",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-500/10",
  };
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color] || colors.blue}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-heading font-bold text-foreground">{value}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}