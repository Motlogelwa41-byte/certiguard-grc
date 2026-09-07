import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, Rocket, Shield,
  FileCheck, Plug, Users, Play, Loader2, Sparkles,
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Organization Profile", icon: Rocket, description: "Set up your organization details and compliance scope" },
  { id: 2, title: "Select Frameworks", icon: Shield, description: "Choose which compliance frameworks to track" },
  { id: 3, title: "Import Controls", icon: FileCheck, description: "Bring in your control library from templates or CSV" },
  { id: 4, title: "Connect Integrations", icon: Plug, description: "Link cloud and security tools for automated evidence" },
  { id: 5, title: "Invite Team", icon: Users, description: "Add your compliance team members" },
  { id: 6, title: "First Compliance Run", icon: Play, description: "Run your initial compliance check and see your score" },
];

export default function UnifiedOnboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ frameworks: 0, controls: 0, connections: 0, users: 1 });

  useEffect(() => {
    // Load saved progress from user data
    const saved = user?.data?.onboarding_progress;
    if (saved) {
      setCompleted(saved.completed || []);
      setCurrentStep(saved.currentStep || 1);
    }

    // Fetch current stats to show progress
    Promise.all([
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Control.list().catch(() => []),
      base44.entities.Connection.list().catch(() => []),
    ]).then(([f, c, conn]) => {
      setStats({
        frameworks: (f || []).length,
        controls: (c || []).length,
        connections: (conn || []).filter((x) => x.status === "connected").length,
        users: 1,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const saveProgress = async (step) => {
    const newCompleted = completed.includes(step) ? completed : [...completed, step];
    setCompleted(newCompleted);
    try {
      await base44.auth.updateMe({
        data: { ...(user?.data || {}), onboarding_progress: { completed: newCompleted, currentStep: step + 1 } },
      });
    } catch (_) {}
  };

  const handleNext = () => {
    saveProgress(currentStep);
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleStepClick = (stepId) => {
    setCurrentStep(stepId);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const progressPct = Math.round((completed.length / STEPS.length) * 100);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Guided Onboarding
        </div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Welcome to CertiGuard</h1>
        <p className="text-sm text-muted-foreground mt-1">Get your compliance program running in 6 simple steps</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{progressPct}% complete</span>
          <span className="text-xs text-muted-foreground">{completed.length} of {STEPS.length} steps</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, i) => {
          const isDone = completed.includes(step.id);
          const isCurrent = currentStep === step.id;
          const Icon = step.icon;
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => handleStepClick(step.id)}
                className={`flex flex-col items-center gap-1.5 transition-all ${isCurrent ? "scale-105" : "opacity-60 hover:opacity-100"}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isDone ? "bg-emerald-500 text-white" :
                  isCurrent ? "bg-primary text-primary-foreground ring-4 ring-primary/20" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`text-xs font-medium whitespace-nowrap ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                  {step.title}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${completed.includes(step.id) ? "bg-emerald-500" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          {currentStep === 1 && <Step1Profile stats={stats} />}
          {currentStep === 2 && <Step2Frameworks stats={stats} />}
          {currentStep === 3 && <Step3Controls stats={stats} />}
          {currentStep === 4 && <Step4Integrations stats={stats} />}
          {currentStep === 5 && <Step5Team />}
          {currentStep === 6 && <Step6ComplianceRun stats={stats} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {currentStep < STEPS.length ? (
          <Button onClick={handleNext}>
            Mark Complete & Continue <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Link to="/">
            <Button>
              <CheckCircle2 className="w-4 h-4 mr-1" /> Go to Dashboard
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

function Step1Profile({ stats }) {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Organization Profile</h2>
      <p className="text-sm text-muted-foreground mb-4">Configure your organization's compliance scope, jurisdictions, and base currency.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/tenant-settings" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Rocket className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Configure Tenant Settings</p>
          <p className="text-xs text-muted-foreground mt-0.5">Set jurisdictions, currency, risk appetite</p>
        </Link>
        <Link to="/white-label" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Sparkles className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Brand Your Platform</p>
          <p className="text-xs text-muted-foreground mt-0.5">Customize logo, colors, and display name</p>
        </Link>
      </div>
    </div>
  );
}

function Step2Frameworks({ stats }) {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Select Compliance Frameworks</h2>
      <p className="text-sm text-muted-foreground mb-4">Choose which frameworks to track. You currently have {stats.frameworks} framework(s) active.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/frameworks" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Shield className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Browse Framework Library</p>
          <p className="text-xs text-muted-foreground mt-0.5">SOC 2, ISO 27001, NIST, POPIA, SADC</p>
        </Link>
        <Link to="/framework-templates" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <FileCheck className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Apply Framework Template</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pre-built control sets for quick setup</p>
        </Link>
      </div>
    </div>
  );
}

function Step3Controls({ stats }) {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Import Controls</h2>
      <p className="text-sm text-muted-foreground mb-4">You have {stats.controls} controls. Import more from templates or CSV.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/control-libraries" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <FileCheck className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Import Control Library</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pre-mapped controls for each framework</p>
        </Link>
        <Link to="/controls" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <ArrowRight className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Manage Controls</p>
          <p className="text-xs text-muted-foreground mt-0.5">Add, edit, or bulk import via CSV</p>
        </Link>
      </div>
    </div>
  );
}

function Step4Integrations({ stats }) {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Connect Integrations</h2>
      <p className="text-sm text-muted-foreground mb-4">You have {stats.connections} integration(s) connected. Connect more for automated evidence collection.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/connections" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Plug className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Connect Cloud & Security Tools</p>
          <p className="text-xs text-muted-foreground mt-0.5">AWS, Azure, GitHub, Defender, CrowdStrike</p>
        </Link>
        <Link to="/cloud-evidence" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Sparkles className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Cloud Evidence Collector</p>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-collect evidence from integrations</p>
        </Link>
      </div>
    </div>
  );
}

function Step5Team() {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Invite Your Team</h2>
      <p className="text-sm text-muted-foreground mb-4">Add compliance officers, risk managers, and auditors to collaborate.</p>
      <Link to="/users" className="block p-4 rounded-xl border border-border hover:border-primary transition-colors">
        <Users className="w-5 h-5 text-primary mb-2" />
        <p className="text-sm font-medium text-foreground">Invite Team Members</p>
        <p className="text-xs text-muted-foreground mt-0.5">Assign roles: admin, compliance officer, risk manager, auditor</p>
      </Link>
    </div>
  );
}

function Step6ComplianceRun({ stats }) {
  return (
    <div>
      <h2 className="text-lg font-heading font-semibold text-foreground mb-2">Run Your First Compliance Check</h2>
      <p className="text-sm text-muted-foreground mb-4">With {stats.controls} controls and {stats.frameworks} frameworks, you're ready to calculate your compliance score.</p>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/compliance-runs" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <Play className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">Run Compliance Check</p>
          <p className="text-xs text-muted-foreground mt-0.5">Calculate your current compliance score</p>
        </Link>
        <Link to="/" className="p-4 rounded-xl border border-border hover:border-primary transition-colors">
          <CheckCircle2 className="w-5 h-5 text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">View Dashboard</p>
          <p className="text-xs text-muted-foreground mt-0.5">See your compliance posture at a glance</p>
        </Link>
      </div>
    </div>
  );
}