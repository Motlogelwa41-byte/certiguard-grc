import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, ArrowRight, ArrowLeft, Check, Loader2, ListChecks } from "lucide-react";

const CATEGORIES = [
  { value: "access_control", label: "Access Control" },
  { value: "data_protection", label: "Data Protection" },
  { value: "incident_response", label: "Incident Response" },
  { value: "change_management", label: "Change Management" },
  { value: "risk_management", label: "Risk Management" },
  { value: "security_operations", label: "Security Operations" },
  { value: "business_continuity", label: "Business Continuity" },
  { value: "network_security", label: "Network Security" },
  { value: "physical_security", label: "Physical Security" },
  { value: "compliance", label: "Compliance" },
  { value: "human_resources", label: "Human Resources" },
  { value: "asset_management", label: "Asset Management" },
  { value: "governance", label: "Governance" },
  { value: "privacy", label: "Privacy" },
];

const emptyReq = { requirement_id: "", title: "", description: "", section: "", category: "access_control", is_mandatory: true };

export default function FrameworkBuilder({ open, onOpenChange, onCreated }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [fw, setFw] = useState({ name: "", version: "", description: "" });
  const [requirements, setRequirements] = useState([{ ...emptyReq }]);

  const reset = () => {
    setStep(1);
    setFw({ name: "", version: "", description: "" });
    setRequirements([{ ...emptyReq }]);
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const addReq = () => setRequirements([...requirements, { ...emptyReq }]);
  const removeReq = (i) => setRequirements(requirements.filter((_, idx) => idx !== i));
  const updateReq = (i, field, value) => {
    setRequirements(requirements.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const handleCreate = async () => {
    if (!fw.name) {
      toast({ title: "Framework name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Step 1: Create the framework via plan-guarded backend function
      const fwRes = await base44.functions.invoke("createFrameworkWithinPlan", {
        framework: {
          name: fw.name,
          version: fw.version || "1.0",
          description: fw.description,
          status: "not_started",
          readiness_score: 0,
          total_controls: 0,
          passing_controls: 0,
        },
      });
      const fwData = fwRes?.data || fwRes;
      if (fwData?.error) throw new Error(fwData.error);
      const frameworkId = fwData?.framework?.id || fwData?.id;
      if (!frameworkId) throw new Error("Framework created but no ID returned");

      // Step 2: Create requirements in bulk
      const validReqs = requirements.filter((r) => r.requirement_id && r.title);
      if (validReqs.length > 0) {
        const reqPayloads = validReqs.map((r, i) => ({
          framework_id: frameworkId,
          framework_name: fw.name,
          requirement_id: r.requirement_id,
          title: r.title,
          description: r.description || "",
          section: r.section || "",
          category: r.category,
          is_mandatory: r.is_mandatory,
          order_index: i,
        }));
        await base44.entities.FrameworkRequirement.bulkCreate(reqPayloads);
      }

      toast({
        title: "Framework created",
        description: `${fw.name} with ${validReqs.length} requirement${validReqs.length !== 1 ? "s" : ""}.`,
      });
      reset();
      onOpenChange(false);
      if (onCreated) onCreated();
    } catch (e) {
      toast({ title: "Error creating framework", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const canProceed = fw.name.trim().length > 0;
  const validReqCount = requirements.filter((r) => r.requirement_id && r.title).length;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Build Custom Framework</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              <span className={`text-xs ${step >= s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s === 1 ? "Details" : s === 2 ? "Requirements" : "Review"}
              </span>
              {s < 3 && <div className={`h-px flex-1 ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Framework metadata */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Framework name *</Label>
              <Input value={fw.name} onChange={(e) => setFw({ ...fw, name: e.target.value })} placeholder="e.g. Custom Security Framework" />
            </div>
            <div>
              <Label>Version</Label>
              <Input value={fw.version} onChange={(e) => setFw({ ...fw, version: e.target.value })} placeholder="e.g. 1.0" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={fw.description} onChange={(e) => setFw({ ...fw, description: e.target.value })} rows={3} placeholder="What does this framework cover?" />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceed}>
                Next: Add Requirements <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Add the clauses/requirements this framework covers.</p>
              <Button size="sm" variant="outline" onClick={addReq}><Plus className="w-3.5 h-3.5 mr-1" /> Add Requirement</Button>
            </div>
            {requirements.map((req, i) => (
              <div key={i} className="border border-border rounded-lg p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Requirement {i + 1}</span>
                  {requirements.length > 1 && (
                    <button onClick={() => removeReq(i)} className="p-1 rounded hover:bg-muted text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Clause ID *</Label>
                    <Input value={req.requirement_id} onChange={(e) => updateReq(i, "requirement_id", e.target.value)} placeholder="A.5.1" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Title *</Label>
                    <Input value={req.title} onChange={(e) => updateReq(i, "title", e.target.value)} placeholder="Access control policy" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={req.description} onChange={(e) => updateReq(i, "description", e.target.value)} rows={2} placeholder="Full text of the clause" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Section</Label>
                    <Input value={req.section} onChange={(e) => updateReq(i, "section", e.target.value)} placeholder="e.g. Organization of security" />
                  </div>
                  <div>
                    <Label className="text-xs">Category</Label>
                    <Select value={req.category} onValueChange={(v) => updateReq(i, "category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={() => setStep(3)}>Next: Review <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">{fw.name}</h3>
              </div>
              {fw.version && <p className="text-xs text-muted-foreground">Version {fw.version}</p>}
              {fw.description && <p className="text-sm text-muted-foreground">{fw.description}</p>}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{validReqCount} requirement{validReqCount !== 1 ? "s" : ""} to create:</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {requirements.filter((r) => r.requirement_id && r.title).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1.5 border-b border-border last:border-0">
                    <span className="font-mono font-medium text-foreground">{r.requirement_id}</span>
                    <span>{r.title}</span>
                    <span className="ml-auto text-muted-foreground/60 capitalize">{r.category.replace(/_/g, " ")}</span>
                  </div>
                ))}
                {validReqCount === 0 && <p className="text-xs text-muted-foreground italic">No requirements added — you can add them later.</p>}
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                {saving ? "Creating..." : "Create Framework"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}