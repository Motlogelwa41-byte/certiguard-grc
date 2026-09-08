import React from "react";
import { BookOpen, CheckCircle, XCircle, Clock, AlertCircle, Link2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const STATUS_COLORS = {
  passing: "text-emerald-600 bg-emerald-50 border-emerald-200",
  failing: "text-rose-600 bg-rose-50 border-rose-200",
  not_tested: "text-slate-500 bg-slate-50 border-slate-200",
  not_applicable: "text-blue-500 bg-blue-50 border-blue-200",
};

// Smart matching: find a control whose title/description references the requirement text
function matchControl(reqText, controls) {
  if (!reqText || !controls) return null;
  const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  const target = norm(reqText);
  if (!target) return null;
  // exact-ish title match first
  let best = null;
  let bestScore = 0;
  for (const c of controls) {
    const title = norm(c.title);
    const desc = norm(c.description);
    let score = 0;
    if (title === target) score = 100;
    else if (title.includes(target) || target.includes(title)) score = 80;
    else if (desc.includes(target)) score = 60;
    else {
      // keyword overlap
      const reqWords = target.split(" ").filter((w) => w.length > 3);
      const hits = reqWords.filter((w) => title.includes(w) || desc.includes(w)).length;
      if (reqWords.length > 0) score = Math.round((hits / reqWords.length) * 40);
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 40 ? best : null;
}

export default function RequirementChecklist({ lib, controls, evidence, requirements }) {
  const prefix = lib.id.split("_")[0].toUpperCase();

  return (
    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        Key Requirements ({lib.key_requirements.length})
      </h3>
      <div className="space-y-1">
        {lib.key_requirements.map((req, i) => {
          const matchedReq = requirements.find(
            (r) => (r.title || "").toLowerCase().includes(req.toLowerCase()) ||
                   (r.description || "").toLowerCase().includes(req.toLowerCase())
          );
          const matchedCtrl = matchControl(req, controls) || (matchedReq && controls.find((c) => c.id === matchedReq.control_id));
          const status = matchedCtrl?.status || "not_tested";
          const ctrlEvidence = matchedCtrl
            ? evidence.filter((e) => e.control_id === matchedCtrl.id || e.control_title === matchedCtrl.title)
            : [];
          const code = `${prefix}-${String(i + 1).padStart(2, "0")}`;

          return (
            <div key={i} className="py-3 border-b border-border last:border-0">
              <div className="flex items-start gap-3">
                <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 mt-0.5">{code}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{req}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {matchedCtrl ? (
                      <>
                        <span className="text-[11px] text-muted-foreground">Owner: {matchedCtrl.owner_name || "Unassigned"}</span>
                        {matchedCtrl.last_tested && (
                          <span className="text-[11px] text-muted-foreground">· Last tested: {matchedCtrl.last_tested}</span>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                          <Link2 className="w-3 h-3" /> {ctrlEvidence.length} evidence
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] text-amber-600 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" /> Not yet mapped to a control
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {status === "passing" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : status === "failing" ? (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.not_tested}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}