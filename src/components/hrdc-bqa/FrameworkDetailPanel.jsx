import React from "react";
import { GraduationCap, Award, Landmark, FileText, Building2, Calendar, Link2 } from "lucide-react";
import RequirementChecklist from "./RequirementChecklist";
import GapRemediationPanel from "./GapRemediationPanel";
import ComplianceTimeline from "./ComplianceTimeline";
import StatusBadge from "@/components/shared/StatusBadge";
import { FileCheck } from "lucide-react";

// Botswana-specific regulatory context per framework
const BW_CONTEXT = {
  hrdc_bw: {
    trainingLevy: "0.2% of annual payroll",
    levyReturn: "Annual return due 30 June",
    accreditationCycle: "Annual re-registration",
    oversightBody: "HRDC Botswana — Ministry of Education & Skills Development",
    scope: "Training providers, workplace learning, skills planning, industry training committees",
    applicableTo: "All employers paying the Training Levy; training providers seeking accreditation; workplaces with internship/apprenticeship programmes",
    legislation: "HRDC Act No. 17 of 2013 (as amended)",
    internationalAlignment: ["ISO 29993 (Learning services)", "ILO TVET", "UNESCO TVET Strategy"],
  },
  bqa_bw: {
    trainingLevy: null,
    nqfLevels: "NQF Levels 1–10",
    accreditationCycle: "5-year accreditation cycle with annual QA review",
    oversightBody: "BQA Botswana — under the Ministry of Education & Skills Development",
    scope: "National Qualifications Framework, qualification accreditation, provider quality assurance, foreign qualification evaluation",
    applicableTo: "Higher education institutions, TVET providers, professional bodies, workplace learning providers, foreign qualification holders",
    legislation: "BQA Act No. 24 of 2013 (as amended)",
    internationalAlignment: ["European Qualifications Framework (EQF)", "Australian Qualifications Framework (AQF)", "UNESCO Recognition Convention"],
  },
};

function ContextRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default function FrameworkDetailPanel({ item }) {
  const { lib, framework, controls, evidence, requirements, tasks, findings, audits } = item;
  const ctx = BW_CONTEXT[lib.id] || {};
  const isHrdc = lib.id === "hrdc_bw";

  return (
    <>
      {/* Enhanced metadata + Botswana context */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/10 to-emerald-500/10 flex items-center justify-center shrink-0">
            {isHrdc ? <GraduationCap className="w-7 h-7 text-blue-600" /> : <Award className="w-7 h-7 text-emerald-600" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-heading font-bold text-foreground">{lib.full_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{lib.description}</p>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{lib.authority}</strong></span>
              <span>· Version: {lib.version}</span>
              <span>· {lib.controls_count} controls</span>
              {lib.mandatory && <span className="text-red-600 font-semibold">· ⚠ Mandatory</span>}
            </div>
          </div>
        </div>

        {/* Botswana-specific regulatory context */}
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-1 pt-3 border-t border-border">
          <ContextRow icon={Landmark} label="Oversight Body" value={ctx.oversightBody || lib.authority} />
          <ContextRow icon={FileText} label="Legislation" value={ctx.legislation || lib.version} />
          <ContextRow icon={Building2} label="Scope" value={ctx.scope || lib.category} />
          <ContextRow icon={Calendar} label="Accreditation Cycle" value={ctx.accreditationCycle || "—"} />
          {isHrdc && ctx.trainingLevy && (
            <ContextRow icon={FileText} label="Training Levy" value={`${ctx.trainingLevy} — ${ctx.levyReturn}`} />
          )}
          {!isHrdc && ctx.nqfLevels && (
            <ContextRow icon={Award} label="NQF Levels" value={ctx.nqfLevels} />
          )}
          <ContextRow icon={Building2} label="Applicable To" value={ctx.applicableTo || "—"} />
          <ContextRow icon={Link2} label="International Alignment" value={(ctx.internationalAlignment || lib.related_international || []).join(", ")} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Readiness</p>
          <p className="text-2xl font-heading font-bold text-blue-600 mt-1">{framework.readiness_score || 0}%</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Passing</p>
          <p className="text-2xl font-heading font-bold text-emerald-600 mt-1">{controls.filter((c) => c.status === "passing").length}</p>
          <p className="text-[11px] text-muted-foreground">of {controls.length} controls</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Failing</p>
          <p className="text-2xl font-heading font-bold text-rose-600 mt-1">{controls.filter((c) => c.status === "failing").length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Evidence</p>
          <p className="text-2xl font-heading font-bold text-purple-600 mt-1">{evidence.length}</p>
          <p className="text-[11px] text-muted-foreground">{evidence.filter((e) => e.status === "approved").length} approved</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">Open Actions</p>
          <p className="text-2xl font-heading font-bold text-amber-600 mt-1">{(tasks || []).filter((t) => t.status !== "completed").length}</p>
          <p className="text-[11px] text-muted-foreground">{(tasks || []).filter((t) => t.status === "overdue" || (t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")).length} overdue</p>
        </div>
      </div>

      {/* Requirement checklist */}
      <RequirementChecklist lib={lib} controls={controls} evidence={evidence} requirements={requirements} />

      {/* Gap & remediation */}
      <GapRemediationPanel framework={framework} controls={controls} tasks={tasks} findings={findings} />

      {/* Timeline */}
      <ComplianceTimeline libId={lib.id} tasks={tasks} audits={audits} />

      {/* Controls detail */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Control Status Detail ({controls.length})</h3>
        {controls.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {controls.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{c.control_id || "—"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{c.title}</p>
                  {c.owner_name && <p className="text-[11px] text-muted-foreground">Owner: {c.owner_name}</p>}
                </div>
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
        <h3 className="font-heading font-semibold text-foreground mb-4">Linked Evidence ({evidence.length})</h3>
        {evidence.length > 0 ? (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {evidence.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <FileCheck className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{e.title}</p>
                  <p className="text-[11px] text-muted-foreground">{e.control_title || e.control_id || "—"}</p>
                </div>
                {e.collected_date && <span className="text-[11px] text-muted-foreground shrink-0">{e.collected_date}</span>}
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No evidence linked to {lib.name} yet.</p>
        )}
      </div>
    </>
  );
}