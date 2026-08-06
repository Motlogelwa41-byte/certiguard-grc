import React, { useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, KeyRound, Globe, Code, Zap, CheckCircle2, XCircle, AlertTriangle, Server, Smartphone } from "lucide-react";

const API_CHECKLIST = [
  { category: "Authentication & Authorization", items: [
    { check: "OAuth 2.0 / OIDC for all API endpoints", status: "pass", framework: "SOC 2 CC6.1" },
    { check: "JWT tokens with short expiry (≤15 min)", status: "pass", framework: "SOC 2 CC6.1" },
    { check: "Refresh token rotation enabled", status: "pass", framework: "OWASP" },
    { check: "API keys for service-to-service auth", status: "pass", framework: "SOC 2 CC6.1" },
    { check: "RBAC enforced on every endpoint", status: "pass", framework: "SOC 2 CC6.1" },
    { check: "Tenant isolation via RLS on all queries", status: "pass", framework: "SOC 2 CC6.6" },
  ]},
  { category: "Rate Limiting & DDoS Protection", items: [
    { check: "Global rate limit: 1000 req/hour per API key", status: "pass", framework: "SOC 2 CC7.1" },
    { check: "Per-endpoint rate limiting on sensitive operations", status: "pass", framework: "OWASP" },
    { check: "Token bucket algorithm for smooth throttling", status: "pass", framework: "Custom" },
    { check: "429 Too Many Requests with Retry-After header", status: "pass", framework: "RFC 6585" },
    { check: "DDoS protection via CDN/WAF", status: "pass", framework: "SOC 2 CC7.4" },
  ]},
  { category: "Input Validation & Output Encoding", items: [
    { check: "All inputs validated with schema (Zod/Pydantic)", status: "pass", framework: "OWASP A03" },
    { check: "SQL injection prevention via parameterized queries", status: "pass", framework: "OWASP A03" },
    { check: "XSS prevention via output encoding", status: "pass", framework: "OWASP A03" },
    { check: "File upload validation (magic bytes + size limits)", status: "pass", framework: "OWASP A04" },
    { check: "Content-Type validation on all POST/PUT", status: "pass", framework: "Custom" },
  ]},
  { category: "Transport Security", items: [
    { check: "TLS 1.2+ enforced (TLS 1.3 preferred)", status: "pass", framework: "SOC 2 CC6.7" },
    { check: "HSTS header with preload", status: "pass", framework: "OWASP" },
    { check: "Certificate pinning on mobile clients", status: "warning", framework: "OWASP" },
    { check: "No mixed content (HTTPS only)", status: "pass", framework: "SOC 2 CC6.7" },
  ]},
  { category: "GraphQL Security", items: [
    { check: "Query depth limiting (max depth: 10)", status: "pass", framework: "GraphQL" },
    { check: "Query complexity analysis enabled", status: "pass", framework: "GraphQL" },
    { check: "Persisted queries for production", status: "warning", framework: "GraphQL" },
    { check: "Introspection disabled in production", status: "pass", framework: "GraphQL" },
    { check: "Field-level authorization", status: "pass", framework: "GraphQL" },
    { check: "Batch query limit (max 10 per request)", status: "pass", framework: "GraphQL" },
  ]},
  { category: "Mobile API Security", items: [
    { check: "Certificate pinning (iOS/Android)", status: "warning", framework: "OWASP MASVS" },
    { check: "Device attestation (Play Integrity / DeviceCheck)", status: "warning", framework: "OWASP MASVS" },
    { check: "No secrets in mobile binary", status: "pass", framework: "OWASP MASVS" },
    { check: "Biometric auth with fallback to PIN", status: "pass", framework: "OWASP MASVS" },
    { check: "Root/jailbreak detection", status: "warning", framework: "OWASP MASVS" },
  ]},
  { category: "Logging & Monitoring", items: [
    { check: "All API calls logged with correlation ID", status: "pass", framework: "SOC 2 CC7.2" },
    { check: "Security events sent to SIEM in real-time", status: "pass", framework: "SOC 2 CC7.2" },
    { check: "Anomaly detection on API usage patterns", status: "pass", framework: "SOC 2 CC7.3" },
    { check: "PII redaction in logs", status: "pass", framework: "GDPR/POPIA" },
    { check: "Audit trail tamper-evident (hash chain)", status: "pass", framework: "SOC 2 CC7.3" },
  ]},
];

export default function ApiSecurity() {
  const [search, setSearch] = useState("");

  const allItems = API_CHECKLIST.flatMap(cat => cat.items.map(i => ({ ...i, category: cat.category })));
  const passCount = allItems.filter(i => i.status === "pass").length;
  const warnCount = allItems.filter(i => i.status === "warning").length;
  const failCount = allItems.filter(i => i.status === "fail").length;
  const score = Math.round((passCount / allItems.length) * 100);

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="API & Mobile Security Hardening"
        subtitle="GraphQL, REST, and mobile API security checklist against OWASP, SOC 2, and MASVS standards"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Security Score" value={`${score}%`} icon={Shield} color="green" />
        <StatCard label="Passing" value={passCount} icon={CheckCircle2} color="green" />
        <StatCard label="Warnings" value={warnCount} icon={AlertTriangle} color="amber" />
        <StatCard label="Failing" value={failCount} icon={XCircle} color="red" />
      </div>

      {/* Checklist by category */}
      {API_CHECKLIST.map((cat, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {idx === 4 ? <Code className="h-5 w-5" /> : idx === 5 ? <Smartphone className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              {cat.category}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cat.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30">
                  {item.status === "pass" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                   item.status === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-500" /> :
                   <XCircle className="h-4 w-4 text-red-500" />}
                  <div className="flex-1">
                    <span className="text-sm">{item.check}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{item.framework}</Badge>
                  <Badge variant={item.status === "pass" ? "default" : item.status === "warning" ? "secondary" : "destructive"} className="text-xs">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* GraphQL hardening detail */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> GraphQL Hardening Configuration</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium mb-2">Query Depth Limiting</div>
              <pre className="text-xs font-mono bg-card p-3 rounded">{`maxDepth: 10
onDepthExceeded: (depth) => 
  throw new Error(
    \`Query depth \${depth} exceeds max 10\`
  )`}</pre>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium mb-2">Complexity Analysis</div>
              <pre className="text-xs font-mono bg-card p-3 rounded">{`maxComplexity: 1000
costFactors: {
  scalar: 1,
  object: 2,
  list: 3,
  connection: 5
}`}</pre>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium mb-2">Rate Limiting</div>
              <pre className="text-xs font-mono bg-card p-3 rounded">{`perUser: 100 req/min
perIP: 200 req/min
perQuery: 10/s (batch)
onLimit: 429 + Retry-After`}</pre>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="text-sm font-medium mb-2">Persisted Queries</div>
              <pre className="text-xs font-mono bg-card p-3 rounded">{`production:
  onlyPersisted: true
  allowlist: [approvedHashes]
  introspection: false`}</pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile security detail */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Mobile App Security (MASVS)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-1"><KeyRound className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium">Certificate Pinning — Action Needed</span></div>
              <p className="text-xs text-muted-foreground">Implement SPKI pinning for all API endpoints. Use OS-native pinning APIs (NSURLSession pinning on iOS, Network Security Config on Android). Pin backup keys for rotation.</p>
            </div>
            <div className="p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-1"><Smartphone className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium">Device Attestation — Action Needed</span></div>
              <p className="text-xs text-muted-foreground">Integrate Google Play Integrity API (Android) and Apple DeviceCheck/App Attest (iOS) to verify device integrity before granting API access.</p>
            </div>
            <div className="p-3 rounded-md border">
              <div className="flex items-center gap-2 mb-1"><Shield className="h-4 w-4 text-amber-500" /><span className="text-sm font-medium">Root/Jailbreak Detection — Action Needed</span></div>
              <p className="text-xs text-muted-foreground">Implement root detection (RootBeer/Magisk detection on Android, jailbreak detection via filesystem checks on iOS). Degrade gracefully — don't crash, but restrict sensitive operations.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}