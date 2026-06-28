import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Zap, FileText, ShieldAlert, MessageSquare, Loader2, Copy, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/components/ui/use-toast";

const TABS = [
  { id: "risk", label: "AI Risk Advisor", icon: ShieldAlert, color: "text-red-500" },
  { id: "policy", label: "Policy Generator", icon: FileText, color: "text-blue-500" },
  { id: "controls", label: "Control Suggestions", icon: Zap, color: "text-amber-500" },
  { id: "incident", label: "Incident Root Cause", icon: Brain, color: "text-purple-500" },
  { id: "chat", label: "Compliance Q&A", icon: MessageSquare, color: "text-emerald-500" },
];

const FRAMEWORKS = ["SOC 2", "ISO 27001", "NIST CSF", "POPIA", "GDPR", "PCI DSS", "HIPAA", "BOCRA", "RBZ Guidelines", "King IV"];

export default function AIHub() {
  const [activeTab, setActiveTab] = useState("risk");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Risk Advisor state
  const [riskScenario, setRiskScenario] = useState("");
  const [riskIndustry, setRiskIndustry] = useState("financial_services");

  // Policy Generator state
  const [policyType, setPolicyType] = useState("Information Security Policy");
  const [companyName, setCompanyName] = useState("");
  const [companyContext, setCompanyContext] = useState("");

  // Control Suggestions state
  const [framework, setFramework] = useState("SOC 2");
  const [existingControls, setExistingControls] = useState("");

  // Incident Root Cause state
  const [incidentDesc, setIncidentDesc] = useState("");
  const [incidentType, setIncidentType] = useState("security_breach");

  // Chat state
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runRiskAdvisor = async () => {
    if (!riskScenario.trim()) return;
    setLoading(true); setResult("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior GRC risk analyst. Analyze the following risk scenario for a ${riskIndustry.replace(/_/g, " ")} organization and provide:

1. **Risk Rating** (Critical/High/Medium/Low) with justification
2. **Likelihood Score** (1-5) and **Impact Score** (1-5) → Overall Risk Score
3. **Key Risk Drivers** (bullet list)
4. **Immediate Mitigation Steps** (numbered, actionable)
5. **Long-term Controls to Implement**
6. **Relevant Frameworks** that address this risk (SOC 2, ISO 27001, POPIA, etc.)
7. **Residual Risk** after mitigation

Scenario: ${riskScenario}

Be specific, practical, and reference SADC regulatory context where relevant.`
    });
    setResult(res); setLoading(false);
  };

  const runPolicyGenerator = async () => {
    if (!companyName.trim()) return;
    setLoading(true); setResult("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a comprehensive, production-ready **${policyType}** for ${companyName}.

Company context: ${companyContext || "A mid-sized organization operating in the SADC region."}

The policy must include:
1. **Purpose & Scope**
2. **Policy Statement**
3. **Roles & Responsibilities** (specific role names)
4. **Policy Requirements** (detailed, numbered)
5. **Procedures** (step-by-step)
6. **Compliance & Enforcement**
7. **Review & Update Schedule**
8. **Related Policies & Standards**
9. **Definitions & Glossary**
10. **Approval signature block**

Format in professional Markdown. Reference relevant frameworks (ISO 27001, SOC 2, POPIA as applicable). Make it ready to use immediately.`
    });
    setResult(res); setLoading(false);
  };

  const runControlSuggestions = async () => {
    setLoading(true); setResult("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a GRC controls expert. For the **${framework}** framework, identify the top 15 most critical controls that organizations commonly miss or implement poorly.

Existing controls already in place: ${existingControls || "None specified"}

For each recommended control provide:
- **Control ID & Name**
- **Why it's critical** (1-2 sentences)
- **Implementation guidance** (3-5 bullet points)
- **Evidence required** for audit
- **Automation opportunity** (can this be automated?)
- **Priority**: Critical / High / Medium

Focus on gaps. Format as a structured, actionable list. Include SADC-specific regulatory considerations where relevant.`
    });
    setResult(res); setLoading(false);
  };

  const runIncidentRootCause = async () => {
    if (!incidentDesc.trim()) return;
    setLoading(true); setResult("");
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior incident response analyst. Perform a structured root cause analysis for this ${incidentType.replace(/_/g, " ")} incident:

Incident Description: ${incidentDesc}

Provide:
1. **Root Cause Analysis** (5 Whys methodology)
2. **Contributing Factors** (technical, process, human)
3. **Attack/Failure Timeline** (reconstruct if possible)
4. **Affected Systems & Data Classification**
5. **Immediate Containment Actions** (already taken or recommended)
6. **Eradication Steps** (numbered)
7. **Recovery Plan**
8. **Lessons Learned** (top 5)
9. **Preventive Controls to Implement**
10. **Regulatory Notification Requirements** (POPIA, GDPR, sector-specific)
11. **MTTR Benchmark** (how long similar incidents typically take to resolve)

Be detailed and technical. Format with clear headers.`
    });
    setResult(res); setLoading(false);
  };

  const runChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput;
    setChatInput("");
    const newHistory = [...chatHistory, { role: "user", content: userMsg }];
    setChatHistory(newHistory);
    setLoading(true);

    const historyContext = newHistory.slice(-6).map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`).join("\n\n");

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert GRC (Governance, Risk & Compliance) consultant with deep knowledge of SOC 2, ISO 27001, NIST CSF, POPIA, GDPR, PCI DSS, and SADC regional regulations including BOCRA, RBZ guidelines, and King IV.

Answer compliance questions clearly, cite specific framework requirements, and give practical actionable advice.

Conversation history:
${historyContext}

Answer the latest user question thoroughly and practically. If referencing specific controls or clauses, cite them.`
    });

    setChatHistory([...newHistory, { role: "assistant", content: res }]);
    setLoading(false);
  };

  const tab = TABS.find(t => t.id === activeTab);

  return (
    <div>
      <PageHeader title="AI Compliance Hub" subtitle="AI-powered GRC tools — risk analysis, policy generation, control recommendations & more" />

      {/* Tab Bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setResult(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                activeTab === t.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              <Icon className={`w-4 h-4 ${activeTab === t.id ? "text-primary-foreground" : t.color}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-6 ${activeTab === "chat" ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"}`}>
        {/* Input Panel */}
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            {tab && React.createElement(tab.icon, { className: `w-5 h-5 ${tab.color}` })}
            {tab?.label}
          </h3>

          {activeTab === "risk" && (
            <>
              <div>
                <Label>Industry</Label>
                <Select value={riskIndustry} onValueChange={setRiskIndustry}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial_services">Financial Services</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="government">Government</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="telecommunications">Telecommunications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Describe the risk scenario</Label>
                <Textarea
                  value={riskScenario}
                  onChange={(e) => setRiskScenario(e.target.value)}
                  rows={6}
                  placeholder="e.g. A third-party payroll vendor has suffered a ransomware attack. They have access to our employee PII and payroll data. We have no SLA for incident notification..."
                />
              </div>
              <Button className="w-full" onClick={runRiskAdvisor} disabled={loading || !riskScenario.trim()}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : "Analyze Risk"}
              </Button>
            </>
          )}

          {activeTab === "policy" && (
            <>
              <div>
                <Label>Policy Type</Label>
                <Select value={policyType} onValueChange={setPolicyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Information Security Policy","Data Privacy Policy","Acceptable Use Policy","Access Control Policy","Incident Response Policy","Business Continuity Policy","Change Management Policy","Vendor Management Policy","Remote Work Policy","Password Policy","Encryption Policy","Data Retention Policy"].map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Company / Organization Name</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Acme Financial Services Ltd" />
              </div>
              <div>
                <Label>Company Context (optional)</Label>
                <Textarea value={companyContext} onChange={(e) => setCompanyContext(e.target.value)} rows={3} placeholder="e.g. 150-person fintech company in Zimbabwe, regulated by RBZ, processes customer payment data..." />
              </div>
              <Button className="w-full" onClick={runPolicyGenerator} disabled={loading || !companyName.trim()}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Policy...</> : "Generate Policy"}
              </Button>
            </>
          )}

          {activeTab === "controls" && (
            <>
              <div>
                <Label>Target Framework</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FRAMEWORKS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Controls already implemented (optional)</Label>
                <Textarea value={existingControls} onChange={(e) => setExistingControls(e.target.value)} rows={5} placeholder="e.g. MFA enforced, annual pen testing, firewall rules, DLP solution, SOC monitoring..." />
              </div>
              <Button className="w-full" onClick={runControlSuggestions} disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Suggestions...</> : "Suggest Missing Controls"}
              </Button>
            </>
          )}

          {activeTab === "incident" && (
            <>
              <div>
                <Label>Incident Type</Label>
                <Select value={incidentType} onValueChange={setIncidentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["security_breach","data_leak","phishing","malware","unauthorized_access","denial_of_service","insider_threat","ransomware","supply_chain","other"].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Describe the incident</Label>
                <Textarea value={incidentDesc} onChange={(e) => setIncidentDesc(e.target.value)} rows={6} placeholder="e.g. On June 15, our monitoring system detected unusual outbound traffic from a finance workstation. Investigation revealed malware had been installed via a phishing email 3 weeks prior. Customer payment records may have been exfiltrated..." />
              </div>
              <Button className="w-full" onClick={runIncidentRootCause} disabled={loading || !incidentDesc.trim()}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Incident...</> : "Run Root Cause Analysis"}
              </Button>
            </>
          )}

          {activeTab === "chat" && (
            <div className="space-y-4">
              {/* Chat history */}
              <div className="bg-muted/40 rounded-lg p-4 space-y-4 min-h-[300px] max-h-[500px] overflow-y-auto">
                {chatHistory.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-12">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Ask anything about GRC, compliance frameworks, regulations, controls, or best practices.
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground"}`}>
                      {msg.role === "assistant"
                        ? <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">{msg.content}</ReactMarkdown>
                        : msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-card border border-border rounded-xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && runChat()}
                  placeholder="Ask a compliance question..."
                  disabled={loading}
                />
                <Button onClick={runChat} disabled={loading || !chatInput.trim()}>Send</Button>
              </div>
              {chatHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setChatHistory([])}>Clear Chat</Button>
              )}
            </div>
          )}
        </div>

        {/* Output Panel (not for chat) */}
        {activeTab !== "chat" && (
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-foreground">AI Output</h3>
              {result && (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <><CheckCheck className="w-3.5 h-3.5 mr-1 text-green-500" />Copied</> : <><Copy className="w-3.5 h-3.5 mr-1" />Copy</>}
                </Button>
              )}
            </div>
            {loading && (
              <div className="flex items-center justify-center h-48">
                <div className="text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">AI is analyzing...</p>
                </div>
              </div>
            )}
            {!loading && !result && (
              <div className="flex items-center justify-center h-48 text-center text-muted-foreground text-sm">
                <div>
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Fill in the form and click the button to get AI-powered insights.
                </div>
              </div>
            )}
            {!loading && result && (
              <div className="prose prose-sm max-w-none dark:prose-invert overflow-y-auto max-h-[600px]">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}