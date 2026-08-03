import React, { useState } from "react";
import { Code, Key, Webhook, Database, Shield, Copy, Check, Lock, Zap } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/evidence/ingest",
    description: "Submit evidence via API key for automated collection.",
    auth: "X-API-Key header",
    body: `{ "title": "AWS IAM Review", "file_url": "https://...", "control_id": "UC-001" }`,
  },
  {
    method: "GET",
    path: "/api/v1/controls",
    description: "List all controls for the authenticated tenant.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "GET",
    path: "/api/v1/controls/:id",
    description: "Get a single control with mapped requirements.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "POST",
    path: "/api/v1/controls",
    description: "Create a new control.",
    auth: "Bearer token",
    body: `{ "control_id": "UC-042", "title": "MFA Enforcement", "category": "access_control" }`,
  },
  {
    method: "PATCH",
    path: "/api/v1/controls/:id",
    description: "Update an existing control.",
    auth: "Bearer token",
    body: `{ "status": "passing" }`,
  },
  {
    method: "GET",
    path: "/api/v1/risks",
    description: "List all risks with optional filters (status, category).",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "POST",
    path: "/api/v1/risks",
    description: "Register a new risk.",
    auth: "Bearer token",
    body: `{ "title": "Data breach risk", "category": "compliance", "likelihood": 4, "impact": 5 }`,
  },
  {
    method: "GET",
    path: "/api/v1/frameworks",
    description: "List all active compliance frameworks.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "GET",
    path: "/api/v1/frameworks/:id/requirements",
    description: "List requirements for a specific framework.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "GET",
    path: "/api/v1/evidence",
    description: "List evidence records with status filter.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "POST",
    path: "/api/v1/evidence/:id/approve",
    description: "Approve a pending evidence record (compliance_officer+).",
    auth: "Bearer token",
    body: `{ "review_notes": "Verified against AWS config" }`,
  },
  {
    method: "GET",
    path: "/api/v1/vendors",
    description: "List all vendors with risk levels.",
    auth: "Bearer token",
    body: null,
  },
  {
    method: "POST",
    path: "/api/v1/webhooks/regulatory",
    description: "Webhook endpoint for regulatory change notifications.",
    auth: "X-API-Key header",
    body: `{ "framework_code": "POPIA", "change_type": "amendment", "summary": "..." }`,
  },
  {
    method: "GET",
    path: "/api/v1/reports/readiness",
    description: "Generate a compliance readiness report (JSON or PDF).",
    auth: "Bearer token",
    body: null,
  },
];

const codeExamples = {
  curl: `curl -X GET https://api.certiguard.com/api/v1/controls \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
  javascript: `const res = await fetch("https://api.certiguard.com/api/v1/controls", {
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});
const data = await res.json();`,
  python: `import requests

res = requests.get(
    "https://api.certiguard.com/api/v1/controls",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
data = res.json()`,
};

export default function ApiDocs() {
  const [activeExample, setActiveExample] = useState("curl");
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="API Documentation"
        subtitle="REST API for automated evidence collection, control management, and reporting."
        actions={<Badge className="bg-emerald-100 text-emerald-700">v1.0</Badge>}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-5">
          <Key className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-heading font-semibold mb-1">Authentication</h3>
          <p className="text-sm text-muted-foreground">All requests require a Bearer token or API key. Generate keys in Settings → API Keys.</p>
        </Card>
        <Card className="p-5">
          <Shield className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-heading font-semibold mb-1">Rate Limits</h3>
          <p className="text-sm text-muted-foreground">100 requests/minute per tenant. Enterprise plans: 1,000 req/min.</p>
        </Card>
        <Card className="p-5">
          <Lock className="w-8 h-8 text-primary mb-3" />
          <h3 className="font-heading font-semibold mb-1">Security</h3>
          <p className="text-sm text-muted-foreground">All traffic over TLS 1.2+. Responses are tenant-scoped — no cross-tenant access.</p>
        </Card>
      </div>

      {/* Quick Start */}
      <Card className="p-6 mb-8">
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Quick Start
        </h2>
        <div className="flex gap-2 mb-4">
          {Object.keys(codeExamples).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveExample(lang)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeExample === lang ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              {lang === "curl" ? "cURL" : lang.charAt(0).toUpperCase() + lang.slice(1)}
            </button>
          ))}
        </div>
        <div className="relative">
          <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
            {codeExamples[activeExample]}
          </pre>
          <button
            onClick={() => copyToClipboard(codeExamples[activeExample], "quickstart")}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            {copied === "quickstart" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </Card>

      {/* Endpoints */}
      <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
        <Code className="w-5 h-5 text-primary" /> Endpoints
      </h2>
      <div className="space-y-3 mb-8">
        {endpoints.map((ep, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${ep.method === "GET" ? "bg-blue-100 text-blue-700" : ep.method === "POST" ? "bg-emerald-100 text-emerald-700" : ep.method === "PATCH" ? "bg-amber-100 text-amber-700" : "bg-purple-100 text-purple-700"}`}>
                {ep.method}
              </span>
              <div className="flex-1 min-w-0">
                <code className="text-sm font-mono text-foreground font-medium">{ep.path}</code>
                <p className="text-sm text-muted-foreground mt-1">{ep.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Auth:</span>
                  <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{ep.auth}</code>
                </div>
                {ep.body && (
                  <div className="mt-3">
                    <span className="text-xs text-muted-font mb-1 block">Request body:</span>
                    <pre className="bg-slate-900 text-slate-100 rounded p-3 text-xs font-mono overflow-x-auto">{ep.body}</pre>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Webhooks */}
      <Card className="p-6 mb-8">
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Webhook className="w-5 h-5 text-primary" /> Webhooks
        </h2>
        <p className="text-sm text-muted-foreground mb-4">CertiGuard can send real-time webhook notifications for compliance events. Configure webhook URLs in Settings → Webhooks.</p>
        <div className="space-y-2">
          {[
            { event: "control.status_changed", desc: "Fired when a control status changes (passing → failing, etc.)" },
            { event: "evidence.submitted", desc: "Fired when new evidence is uploaded" },
            { event: "evidence.approved", desc: "Fired when evidence is approved by a compliance officer" },
            { event: "risk.created", desc: "Fired when a new risk is registered" },
            { event: "risk.exceeds_tolerance", desc: "Fired when a risk score exceeds the tenant's tolerance threshold" },
            { event: "certification.expiring", desc: "Fired 60 days before a certification expires" },
            { event: "regulatory.change", desc: "Fired when a regulatory update affects an active framework" },
          ].map((w) => (
            <div key={w.event} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <code className="text-sm font-mono text-primary font-medium">{w.event}</code>
              <span className="text-sm text-muted-foreground">{w.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Data Models */}
      <Card className="p-6">
        <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Data Models
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Control", fields: "id, control_id, title, category, status, severity, owner_name, framework_ids" },
            { name: "Risk", fields: "id, title, category, likelihood, impact, risk_score, status, treatment, owner_name" },
            { name: "Evidence", fields: "id, title, file_url, control_id, type, status, collected_date, expiry_date" },
            { name: "Framework", fields: "id, name, version, status, readiness_score, total_controls, passing_controls" },
            { name: "Vendor", fields: "id, name, category, risk_level, status, soc2_compliant, iso27001_compliant" },
            { name: "Policy", fields: "id, title, category, status, version, owner_name, approved_by" },
          ].map((model) => (
            <div key={model.name} className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-heading font-semibold text-sm mb-2">{model.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{model.fields}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}