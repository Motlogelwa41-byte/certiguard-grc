import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, Plus, Wand2, Copy, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { policyTemplates as libraryTemplates } from "@/lib/policyTemplatesLibrary";

const TEMPLATES = [
  {
    id: "iso27001-isms",
    name: "Information Security Management Policy",
    framework: "ISO 27001",
    category: "information_security",
    description: "Comprehensive ISMS policy aligned to ISO 27001:2022 Annex A controls.",
    tags: ["ISO 27001", "ISMS", "Security"],
    sections: ["1. Purpose & Scope", "2. Policy Statement", "3. Roles & Responsibilities", "4. Risk Assessment Process", "5. Control Objectives", "6. Review & Compliance"],
    content: `1. PURPOSE & SCOPE
This Information Security Management Policy establishes the framework for protecting [ORGANIZATION NAME]'s information assets. It applies to all employees, contractors, and third parties who access company systems and data.

2. POLICY STATEMENT
[ORGANIZATION NAME] is committed to maintaining the confidentiality, integrity, and availability of all information assets in accordance with ISO 27001:2022.

3. ROLES & RESPONSIBILITIES
- Chief Information Security Officer (CISO): Overall accountability for information security
- IT Security Team: Implementation and monitoring of controls
- All Staff: Compliance with this policy and reporting of incidents
- Data Owners: Classification and protection of their data assets

4. RISK ASSESSMENT PROCESS
A formal risk assessment shall be conducted [ANNUALLY / SEMI-ANNUALLY] or when significant changes occur. Risks shall be evaluated using the organization's risk matrix and treated per the Risk Treatment Plan.

5. CONTROL OBJECTIVES
- Access Control: Restrict access to information on a need-to-know basis
- Cryptography: Encrypt sensitive data in transit and at rest using AES-256 / TLS 1.3
- Physical Security: Protect physical premises and equipment
- Incident Management: Detect, report, and respond to security incidents within [X] hours

6. REVIEW & COMPLIANCE
This policy shall be reviewed annually by the CISO and approved by [BOARD / EXECUTIVE TEAM]. Non-compliance may result in disciplinary action.

Version: [VERSION] | Owner: [OWNER NAME] | Next Review: [DATE]`
  },
  {
    id: "popia-data-privacy",
    name: "Data Privacy & Protection Policy",
    framework: "POPIA / GDPR",
    category: "data_privacy",
    description: "Privacy policy meeting POPIA (South Africa) and GDPR requirements for data subject rights.",
    tags: ["POPIA", "GDPR", "Privacy", "SADC"],
    sections: ["1. Introduction", "2. Lawful Basis", "3. Data Subject Rights", "4. Data Retention", "5. Cross-border Transfers", "6. Breach Notification"],
    content: `1. INTRODUCTION
[ORGANIZATION NAME] (the "Responsible Party") processes personal information in compliance with the Protection of Personal Information Act 4 of 2013 (POPIA) and applicable data protection laws.

2. LAWFUL BASIS FOR PROCESSING
We process personal information only where:
- Consent has been obtained from the data subject
- Processing is necessary for a legal obligation
- Processing is required for a legitimate interest of the organization

3. DATA SUBJECT RIGHTS
Data subjects have the right to:
- Access their personal information held by [ORGANIZATION NAME]
- Request correction of inaccurate data
- Request deletion of data (right to be forgotten)
- Object to processing
- Lodge a complaint with the Information Regulator (South Africa)

4. DATA RETENTION
Personal information is retained only for as long as necessary:
- Employee records: [X] years post-employment
- Customer records: [X] years post-contract
- Financial data: [X] years (statutory requirement)

5. CROSS-BORDER TRANSFERS
Personal information shall only be transferred outside South Africa where the recipient country provides an adequate level of protection or where contractual safeguards are in place.

6. BREACH NOTIFICATION
In the event of a data breach, [ORGANIZATION NAME] shall:
- Notify the Information Regulator within 72 hours of discovery
- Notify affected data subjects without undue delay

Version: [VERSION] | Information Officer: [NAME] | Next Review: [DATE]`
  },
  {
    id: "access-control",
    name: "Access Control Policy",
    framework: "ISO 27001 / SOC 2",
    category: "access_control",
    description: "Role-based access control policy covering provisioning, review, and revocation.",
    tags: ["Access Control", "IAM", "SOC 2", "ISO 27001"],
    sections: ["1. Purpose", "2. Access Provisioning", "3. Privileged Access", "4. Access Reviews", "5. Termination"],
    content: `1. PURPOSE
This policy defines the principles for managing user access to [ORGANIZATION NAME]'s systems, applications, and data to prevent unauthorized access.

2. ACCESS PROVISIONING
- All access requests must be submitted via [TICKETING SYSTEM] and approved by the user's manager and the IT Security team
- Access shall be granted using the principle of least privilege
- User accounts shall be unique — shared accounts are prohibited
- Multi-factor authentication (MFA) is mandatory for all systems

3. PRIVILEGED ACCESS MANAGEMENT
- Administrative access requires secondary approval from the CISO
- Privileged accounts shall not be used for day-to-day activities
- All privileged sessions shall be logged and monitored
- Privileged access credentials shall be stored in an approved PAM vault

4. PERIODIC ACCESS REVIEWS
- User access rights shall be reviewed [QUARTERLY / SEMI-ANNUALLY]
- Access reviews shall be conducted by system owners and documented
- Unused accounts inactive for [90] days shall be automatically disabled

5. TERMINATION & ROLE CHANGES
- Access shall be revoked within [4] hours of employee termination
- Role changes shall trigger an access recertification within [5] business days

Version: [VERSION] | Owner: [OWNER NAME] | Next Review: [DATE]`
  },
  {
    id: "incident-response",
    name: "Incident Response Policy",
    framework: "NIST CSF / ISO 27001",
    category: "incident_response",
    description: "End-to-end incident response lifecycle from detection to post-incident review.",
    tags: ["Incident Response", "NIST", "ISO 27001"],
    sections: ["1. Purpose", "2. Classification", "3. Response Phases", "4. Communication", "5. Post-Incident Review"],
    content: `1. PURPOSE
This policy establishes procedures for identifying, containing, eradicating, and recovering from information security incidents at [ORGANIZATION NAME].

2. INCIDENT CLASSIFICATION
| Severity | Definition | Response SLA |
|----------|-----------|--------------|
| Critical | Active breach, data exfiltration | 1 hour |
| High | Ransomware, system compromise | 4 hours |
| Medium | Phishing, unauthorized access attempt | 24 hours |
| Low | Policy violation, suspicious activity | 72 hours |

3. RESPONSE PHASES
Phase 1 — Detection & Analysis: Monitor alerts via [SIEM TOOL], triage within [X] minutes
Phase 2 — Containment: Isolate affected systems, preserve evidence
Phase 3 — Eradication: Remove threat, patch vulnerabilities
Phase 4 — Recovery: Restore systems, verify integrity
Phase 5 — Post-Incident: Conduct root cause analysis within [5] business days

4. COMMUNICATION PLAN
- Internal: Escalate to CISO within [1] hour of confirmed incident
- Regulatory: Notify relevant authorities within [72] hours (POPIA / GDPR)
- External: Customer notification as required by contractual obligations

5. POST-INCIDENT REVIEW
A lessons-learned meeting shall be held within [10] business days of incident closure. Findings shall be documented and actioned.

Version: [VERSION] | Owner: [CISO NAME] | Next Review: [DATE]`
  },
  {
    id: "bcp",
    name: "Business Continuity Policy",
    framework: "ISO 22301 / King V",
    category: "business_continuity",
    description: "BCP/DR policy aligned to ISO 22301 and King V governance requirements.",
    tags: ["BCP", "DR", "ISO 22301", "King V", "SADC"],
    sections: ["1. Policy Objective", "2. BIA", "3. Recovery Objectives", "4. Plan Activation", "5. Testing"],
    content: `1. POLICY OBJECTIVE
[ORGANIZATION NAME] shall maintain the ability to continue critical business functions during and after a disruptive event, in compliance with ISO 22301 and King V governance principles.

2. BUSINESS IMPACT ANALYSIS (BIA)
A BIA shall be conducted [ANNUALLY] to identify:
- Critical business processes and their dependencies
- Maximum Tolerable Period of Disruption (MTPD)
- Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for each process

3. RECOVERY OBJECTIVES
| Process | RTO | RPO |
|---------|-----|-----|
| Core Banking / Revenue Systems | [X] hours | [X] hours |
| Customer-Facing Services | [X] hours | [X] hours |
| Internal Operations | [X] hours | [X] hours |

4. PLAN ACTIVATION
The BCP is activated when a disruptive event prevents normal operations for more than [X] hours. Activation authority rests with [CEO / CISO / BCM TEAM LEAD].

5. TESTING & EXERCISES
- Tabletop exercises: [SEMI-ANNUALLY]
- Partial failover tests: [ANNUALLY]
- Full DR simulation: [EVERY 2 YEARS]
- Results shall be documented and gaps remediated within [90] days

Version: [VERSION] | BCM Owner: [NAME] | Next Review: [DATE]`
  },
  {
    id: "acceptable-use",
    name: "Acceptable Use Policy",
    framework: "General / SOC 2",
    category: "acceptable_use",
    description: "AUP covering employee use of company systems, internet, email, and devices.",
    tags: ["AUP", "SOC 2", "HR", "Acceptable Use"],
    sections: ["1. Scope", "2. Permitted Use", "3. Prohibited Activities", "4. Monitoring", "5. Consequences"],
    content: `1. SCOPE
This Acceptable Use Policy (AUP) applies to all employees, contractors, and authorized users of [ORGANIZATION NAME]'s information technology resources, including computers, networks, email, and cloud services.

2. PERMITTED USE
Company technology resources are provided for business purposes. Incidental personal use is permitted provided it does not:
- Interfere with job responsibilities
- Consume excessive bandwidth or storage
- Violate any other provision of this policy

3. PROHIBITED ACTIVITIES
Users must not:
- Access, transmit, or store illegal content
- Attempt to bypass security controls or access unauthorized systems
- Install unauthorized software or shadow IT tools
- Share credentials or allow others to use their accounts
- Conduct personal business activities using company resources

4. MONITORING & PRIVACY
[ORGANIZATION NAME] reserves the right to monitor all activity on company systems. Users have no expectation of privacy when using company resources. All monitoring activities comply with applicable privacy laws.

5. CONSEQUENCES OF VIOLATION
Violations of this policy may result in:
- Immediate suspension of system access
- Disciplinary action up to and including termination
- Civil or criminal prosecution where applicable

Version: [VERSION] | Owner: [HR / IT SECURITY] | Next Review: [DATE]`
  },
].concat(libraryTemplates.map(t => ({
  id: t.id,
  name: t.title,
  framework: t.frameworks.join(" / "),
  category: t.category,
  description: `Pre-built ${t.frameworks.join(", ")} policy template.`,
  tags: t.frameworks.slice(0, 3),
  sections: (t.content.match(/## (.+)/g) || ["Policy Content"]).map(s => s.replace("## ", "")),
  content: t.content.replace(/^## /gm, "").replace(/\n\n\n/g, "\n\n"),
})));

const FRAMEWORKS = ["All", "ISO 27001", "SOC 2", "POPIA / GDPR", "NIST CSF", "ISO 22301", "King V", "General", "PCI DSS", "COSO ERM"];

export default function PolicyTemplates() {
  const [filterFramework, setFilterFramework] = useState("All");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [cloneForm, setCloneForm] = useState({ title: "", owner_name: "" });
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ framework: "", companyName: "", industry: "" });
  const [generating, setGenerating] = useState(false);
  const [created, setCreated] = useState(false);
  const { toast } = useToast();

  const filtered = TEMPLATES.filter(t => filterFramework === "All" || t.framework.includes(filterFramework.replace(" / GDPR", "").replace(" CSF", "")));

  const handlePreview = (t) => { setSelectedTemplate(t); setPreviewOpen(true); };

  const handleUseTemplate = (t) => {
    setSelectedTemplate(t);
    setCloneForm({ title: t.name, owner_name: "" });
    setCloneOpen(true);
  };

  const handleClone = async () => {
    try {
      await base44.entities.Policy.create({
        title: cloneForm.title,
        category: selectedTemplate.category,
        status: "draft",
        version: "1.0",
        owner_name: cloneForm.owner_name,
        content: selectedTemplate.content,
        description: selectedTemplate.description,
        acknowledgment_required: true,
      });
      setCloneOpen(false);
      setCreated(true);
      toast({ title: "Policy created from template", description: "Find it in the Policies page." });
      setTimeout(() => setCreated(false), 3000);
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleAiGenerate = async () => {
    if (!aiForm.framework || !aiForm.companyName) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional, detailed ${aiForm.framework} compliance policy for a company called "${aiForm.companyName}" in the ${aiForm.industry || "technology"} industry. 
        
        Include:
        1. Purpose & Scope
        2. Policy Statement
        3. Roles & Responsibilities
        4. Key Requirements (specific to ${aiForm.framework})
        5. Compliance & Review
        
        Use [PLACEHOLDER] format for company-specific values that need to be filled in.
        Make it production-ready for a GRC compliance platform.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            content: { type: "string" },
            category: { type: "string" }
          }
        }
      });

      await base44.entities.Policy.create({
        title: result.title || `${aiForm.framework} Policy — ${aiForm.companyName}`,
        content: result.content,
        category: result.category || "information_security",
        status: "draft",
        version: "1.0",
        description: `AI-generated ${aiForm.framework} policy for ${aiForm.companyName}`,
        acknowledgment_required: true,
      });

      setAiOpen(false);
      toast({ title: "AI policy generated!", description: "Review and customize it in the Policies page." });
    } catch (e) {
      toast({ title: "Generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  return (
    <div>
      <PageHeader
        title="Policy Templates"
        subtitle="Start from a pre-built template or generate one with AI"
        actions={
          <Button size="sm" onClick={() => setAiOpen(true)}>
            <Wand2 className="w-4 h-4 mr-1" /> AI Generate Policy
          </Button>
        }
      />

      {/* Framework Filter */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {FRAMEWORKS.map(f => (
          <button
            key={f}
            onClick={() => setFilterFramework(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filterFramework === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(t => (
          <div key={t.id} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{t.framework}</span>
            </div>
            <div>
              <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{t.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {t.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{t.sections.length} sections</span> · {t.sections[0].replace(/^\d+\. /, "")} and more
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(t)}>Preview</Button>
              <Button size="sm" className="flex-1" onClick={() => handleUseTemplate(t)}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Use Template
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedTemplate.framework}</span>
                {selectedTemplate.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
                ))}
              </div>
              <div className="bg-muted/50 rounded-lg p-4 max-h-[50vh] overflow-y-auto">
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">{selectedTemplate.content}</pre>
              </div>
              <Button className="w-full" onClick={() => { setPreviewOpen(false); handleUseTemplate(selectedTemplate); }}>
                <Copy className="w-4 h-4 mr-1" /> Use This Template
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clone/Use Dialog */}
      <Dialog open={cloneOpen} onOpenChange={setCloneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Policy from Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Policy Title</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm mt-1.5"
                value={cloneForm.title}
                onChange={e => setCloneForm({ ...cloneForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Owner Name</Label>
              <input
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm mt-1.5"
                value={cloneForm.owner_name}
                onChange={e => setCloneForm({ ...cloneForm, owner_name: e.target.value })}
                placeholder="e.g. John Smith, CISO"
              />
            </div>
            <p className="text-xs text-muted-foreground">The policy will be created as a <strong>Draft</strong>. Customize placeholders in the Policies page.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCloneOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleClone} disabled={!cloneForm.title}>
                {created ? <><CheckCircle className="w-4 h-4 mr-1" /> Created!</> : "Create Policy"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generate Dialog */}
      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Wand2 className="w-5 h-5 text-primary" /> AI Policy Generator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Compliance Framework</Label>
              <Select value={aiForm.framework} onValueChange={v => setAiForm({ ...aiForm, framework: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select framework..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISO 27001:2022">ISO 27001:2022</SelectItem>
                  <SelectItem value="SOC 2 Type II">SOC 2 Type II</SelectItem>
                  <SelectItem value="POPIA">POPIA (South Africa)</SelectItem>
                  <SelectItem value="GDPR">GDPR</SelectItem>
                  <SelectItem value="NIST CSF 2.0">NIST CSF 2.0</SelectItem>
                  <SelectItem value="ISO 22301">ISO 22301 BCP</SelectItem>
                  <SelectItem value="King V">King V Governance</SelectItem>
                  <SelectItem value="PCI DSS v4">PCI DSS v4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organization Name</Label>
              <Input className="mt-1.5" value={aiForm.companyName} onChange={e => setAiForm({ ...aiForm, companyName: e.target.value })} placeholder="e.g. Acme Corp" />
            </div>
            <div>
              <Label>Industry <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input className="mt-1.5" value={aiForm.industry} onChange={e => setAiForm({ ...aiForm, industry: e.target.value })} placeholder="e.g. Financial Services, Healthcare" />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">The AI will generate a customized, production-ready policy draft and save it to your Policies page.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAiOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAiGenerate} disabled={!aiForm.framework || !aiForm.companyName || generating}>
                {generating ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating…</> : <><Wand2 className="w-4 h-4 mr-1" /> Generate</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}