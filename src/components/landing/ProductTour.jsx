import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileCheck, AlertTriangle, FileText, Lock, ArrowRight, X, CheckCircle2 } from "lucide-react";

const TOUR_STEPS = [
  {
    icon: ShieldCheck,
    title: "Compliance Frameworks",
    description: "CertiGuard supports SOC 2, ISO 27001, NIST CSF, POPIA, GDPR, and SADC regional frameworks — all in one tenant-isolated platform. Activate the frameworks your bank auditor requires and map controls automatically.",
    color: "text-primary",
  },
  {
    icon: FileCheck,
    title: "Controls & Testing",
    description: "Each control is tracked from design through testing to evidence. Automated tests run continuously, and control effectiveness scores update in real time so your auditor always sees the current posture.",
    color: "text-emerald-600",
  },
  {
    icon: AlertTriangle,
    title: "Risk Management",
    description: "Identify, score, and mitigate risks using qualitative matrices or FAIR-based quantitative analysis. Residual risk is auto-calculated from control effectiveness, with appetite bands and tolerance thresholds.",
    color: "text-amber-600",
  },
  {
    icon: FileText,
    title: "Evidence Collection",
    description: "Upload, version, and hash-stamp evidence files. Each upload is cryptographically verified and linked to a control. The evidence ledger gives your auditor a tamper-evident chain of custody.",
    color: "text-blue-600",
  },
  {
    icon: Lock,
    title: "Privacy & DPO",
    description: "Manage DSARs, DPIAs, ROPA, consent records, and breach notifications from a single DPO Command Center. SLA countdowns ensure you never miss a regulatory deadline.",
    color: "text-purple-600",
  },
  {
    icon: CheckCircle2,
    title: "Auditor-Ready Reports",
    description: "Generate board-ready reports, audit readiness summaries, and executive briefings in one click. Share a secure auditor portal with read-only access to controls, policies, and the evidence ledger.",
    color: "text-rose-600",
  },
];

export default function ProductTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const startTour = () => {
    setStep(0);
    setOpen(true);
  };

  const next = () => {
    if (step < TOUR_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setOpen(false);
    }
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      <button
        onClick={startTour}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-foreground bg-primary/90 hover:bg-primary rounded-lg px-3.5 py-1.5 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5" /> Start Tour
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Progress bar */}
            <div className="flex gap-1.5 px-6 pt-5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className={`w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4`}>
                <current.icon className={`w-7 h-7 ${current.color}`} />
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-muted-foreground">Step {step + 1} of {TOUR_STEPS.length}</span>
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2">{current.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 pb-6">
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={prev}>
                    Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Skip tour
                </Button>
                <Button size="sm" onClick={next}>
                  {isLast ? (
                    <>Get Started <ArrowRight className="w-4 h-4" /></>
                  ) : (
                    <>Next <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}