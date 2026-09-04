import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, Lock, KeyRound, RefreshCw, Eye, EyeOff, Fingerprint, Database,
  Cloud, Server, FileLock2, AlertTriangle, CheckCircle2, XCircle, Clock,
  Zap, Globe, Mail, Network, Hash, Layers, Cpu
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const AT_REST_CONTROLS = [
  { id: 1, area: "Database Volumes", standard: "AES-256-GCM", status: "enforced", desc: "All PostgreSQL database volumes encrypted at rest with transparent encryption." },
  { id: 2, area: "Object Storage (Evidence)", standard: "AES-256", status: "enforced", desc: "Evidence files and uploaded documents encrypted in object storage." },
  { id: 3, area: "Database Backups", standard: "AES-256", status: "enforced", desc: "Automated backups encrypted before transfer to cold storage." },
  { id: 4, area: "Audit Trail Records", standard: "SHA-256 Hash Chain", status: "enforced", desc: "Immutable audit log with hash-chained records for tamper detection." },
  { id: 5, area: "Evidence File Integrity", standard: "SHA-256", status: "enforced", desc: "Every uploaded evidence file is SHA-256 hashed and recorded in the AuditEvidenceLedger." },
  { id: 6, area: "Password Storage", standard: "bcrypt (cost 12)", status: "enforced", desc: "User passwords hashed with bcrypt — never stored in plaintext." },
  { id: 7, area: "PII Data Fields", standard: "AES-256 + Tokenization", status: "partially_enforced", desc: "PII fields protected via masking/tokenization rules — see Data Masking tab." },
];

const IN_TRANSIT_CONTROLS = [
  { id: 1, area: "Web Application", standard: "TLS 1.3", status: "enforced", desc: "All web traffic encrypted with TLS 1.3 — TLS 1.0/1.1 disabled." },
  { id: 2, area: "API Endpoints", standard: "HTTPS (TLS 1.3)", status: "enforced", desc: "All API requests require HTTPS — HTTP requests rejected at edge." },
  { id: 3, area: "Email (SMTP)", standard: "SMTP over TLS (STARTTLS)", status: "enforced", desc: "Outbound email encrypted via Gmail SMTP with TLS enforcement." },
  { id: 4, area: "File Transfer", standard: "SFTP / HTTPS", status: "enforced", desc: "Evidence ingestion via secure HTTPS upload — no plaintext FTP." },
  { id: 5, area: "OAuth/OIDC Tokens", standard: "JWT (RS256)", status: "enforced", desc: "Authentication tokens signed with RS256 — verified on every request." },
  { id: 6, area: "Slack Integration", standard: "HTTPS (TLS 1.2+)", status: "enforced", desc: "Slack webhook alerts sent over encrypted HTTPS." },
  { id: 7, area: "Google APIs", standard: "HTTPS (TLS 1.2+)", status: "enforced", desc: "Google Calendar, Drive, Gmail integrations use encrypted HTTPS." },
  { id: 8, area: "Certificate Pinning", standard: "HSTS + HPKP", status: "enforced", desc: "HTTP Strict Transport Security enforced — prevents protocol downgrade." },
];

const STATUS_META = {
  enforced: { label: "Enforced", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_enforced: { label: "Partial", color: "bg-amber-100 text-amber-700 border-amber-200", icon: AlertTriangle },
  not_enforced: { label: "Not Enforced", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

export default function CryptographyCommandCenter() {
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [k, r] = await Promise.all([
        base44.entities.CryptoKey.list("-created_date", 100).catch(() => []),
        base44.entities.DataProtectionRule.list("-created_date", 100).catch(() => []),
      ]);
      setKeys(k || []);
      setRules(r || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const rotateKey = async (keyId) => {
    setRotating(keyId);
    try {
      const res = await base44.functions.invoke("rotateCryptoKey", { action: "rotate", key_id: keyId });
      const data = res?.data || res;
      toast({ title: `Key rotated: ${keyId}`, description: `v${data.previous_version} → v${data.new_version} • Next rotation: ${new Date(data.next_rotation).toLocaleDateString()}` });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Rotation failed", description: e?.message }); }
    setRotating(null);
  };

  const revokeKey = async (keyId) => {
    try {
      await base44.functions.invoke("rotateCryptoKey", { action: "revoke", key_id: keyId, reason: "Manual revocation from Cryptography Command Center" });
      toast({ title: `Key revoked: ${keyId}`, variant: "destructive" });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Revocation failed", description: e?.message }); }
  };

  const activeKeys = keys.filter((k) => k.status === "active").length;
  const keysDueForRotation = keys.filter((k) => k.status === "active" && k.auto_rotation && k.next_rotation && new Date(k.next_rotation).getTime() <= Date.now()).length;
  const revokedKeys = keys.filter((k) => k.status === "revoked").length;
  const activeRules = rules.filter((r) => r.status === "active").length;
  const atRestEnforced = AT_REST_CONTROLS.filter((c) => c.status === "enforced").length;
  const inTransitEnforced = IN_TRANSIT_CONTROLS.filter((c) => c.status === "enforced").length;
  const cryptoScore = Math.round(((atRestEnforced / AT_REST_CONTROLS.length) * 40) + ((inTransitEnforced / IN_TRANSIT_CONTROLS.length) * 30) + (activeKeys > 0 ? 15 : 0) + (activeRules > 0 ? 15 : 0));

  return (
    <div>
      <PageHeader
        title="Cryptography & Data Protection Command Center"
        subtitle="AES-256 at rest, TLS 1.3 in transit, centralized KMS with automated key rotation, data masking & tokenization"
        icon={Lock}
      />

      {/* Posture Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Crypto Posture" value={`${cryptoScore}%`} icon={Shield} color={cryptoScore >= 80 ? "green" : "amber"} trendLabel={cryptoScore >= 80 ? "Strong" : "Needs attention"} />
        <StatCard label="Data at Rest" value={`${atRestEnforced}/${AT_REST_CONTROLS.length}`} icon={Database} color="green" trendLabel="AES-256 enforced" />
        <StatCard label="Data in Transit" value={`${inTransitEnforced}/${IN_TRANSIT_CONTROLS.length}`} icon={Globe} color="green" trendLabel="TLS 1.3 enforced" />
        <StatCard label="Active Keys" value={activeKeys} icon={KeyRound} color={keysDueForRotation > 0 ? "amber" : "green"} trendLabel={keysDueForRotation > 0 ? `${keysDueForRotation} due for rotation` : "All current"} />
        <StatCard label="Protection Rules" value={activeRules} icon={Fingerprint} color={activeRules > 0 ? "green" : "amber"} trendLabel="Masking & tokenization" />
      </div>

      <Tabs defaultValue="at-rest" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="at-rest"><Database className="w-4 h-4 mr-1.5" />Data at Rest</TabsTrigger>
          <TabsTrigger value="in-transit"><Globe className="w-4 h-4 mr-1.5" />Data in Transit</TabsTrigger>
          <TabsTrigger value="keys"><KeyRound className="w-4 h-4 mr-1.5" />Key Management (KMS)</TabsTrigger>
          <TabsTrigger value="masking"><Fingerprint className="w-4 h-4 mr-1.5" />Data Masking & Tokenization</TabsTrigger>
        </TabsList>

        {/* DATA AT REST */}
        <TabsContent value="at-rest">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Encryption at Rest — AES-256</h3>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{atRestEnforced}/{AT_REST_CONTROLS.length} Enforced</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AT_REST_CONTROLS.map((ctrl) => {
                const meta = STATUS_META[ctrl.status] || STATUS_META.not_enforced;
                const Icon = meta.icon;
                return (
                  <div key={ctrl.id} className="flex items-start gap-3 p-4 rounded-lg border border-border">
                    <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{ctrl.area}</h4>
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{ctrl.desc}</p>
                      <div className="flex items-center gap-1.5">
                        <FileLock2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{ctrl.standard}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* DATA IN TRANSIT */}
        <TabsContent value="in-transit">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Encryption in Transit — TLS 1.3</h3>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">{inTransitEnforced}/{IN_TRANSIT_CONTROLS.length} Enforced</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {IN_TRANSIT_CONTROLS.map((ctrl) => {
                const meta = STATUS_META[ctrl.status] || STATUS_META.not_enforced;
                const Icon = meta.icon;
                return (
                  <div key={ctrl.id} className="flex items-start gap-3 p-4 rounded-lg border border-border">
                    <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground">{ctrl.area}</h4>
                        <Badge variant="outline" className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{ctrl.desc}</p>
                      <div className="flex items-center gap-1.5">
                        <Network className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{ctrl.standard}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Secure Protocol Matrix */}
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-foreground mb-3">Secure Protocol Enforcement Matrix</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { proto: "HTTPS", icon: Globe, status: "enforced" },
                { proto: "TLS 1.3", icon: Lock, status: "enforced" },
                { proto: "SMTP over TLS", icon: Mail, status: "enforced" },
                { proto: "SFTP", icon: Server, status: "enforced" },
                { proto: "FTP (plaintext)", icon: XCircle, status: "disabled" },
                { proto: "HTTP (plaintext)", icon: XCircle, status: "disabled" },
                { proto: "TLS 1.0/1.1", icon: XCircle, status: "disabled" },
                { proto: "SSL 3.0", icon: XCircle, status: "disabled" },
              ].map((p) => {
                const isEnforced = p.status === "enforced";
                const Icon = p.icon;
                return (
                  <div key={p.proto} className={`flex items-center gap-2 p-3 rounded-lg border ${isEnforced ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10" : "border-red-200 bg-red-50/50 dark:bg-red-900/10"}`}>
                    <Icon className={`w-4 h-4 ${isEnforced ? "text-emerald-500" : "text-red-500"}`} />
                    <div>
                      <span className="text-sm font-medium">{p.proto}</span>
                      <p className={`text-xs ${isEnforced ? "text-emerald-600" : "text-red-600"}`}>{isEnforced ? "Allowed" : "Blocked"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* KEY MANAGEMENT */}
        <TabsContent value="keys">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">Centralized KMS — key inventory with automated rotation, versioning, and lifecycle management.</p>
            {keysDueForRotation > 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200"><AlertTriangle className="w-3 h-3 mr-1" />{keysDueForRotation} keys due for rotation</Badge>}
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : keys.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <KeyRound className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No crypto keys registered yet.</p>
              <p className="text-xs text-muted-foreground">Keys managed by the platform KMS will appear here once registered.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => {
                const isDue = key.status === "active" && key.auto_rotation && key.next_rotation && new Date(key.next_rotation).getTime() <= Date.now();
                const daysUntilRotation = key.next_rotation ? Math.floor((new Date(key.next_rotation).getTime() - Date.now()) / 86400000) : null;
                return (
                  <div key={key.id} className={`bg-card rounded-xl border p-4 shadow-sm ${isDue ? "border-amber-300" : "border-border"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${key.status === "active" ? "bg-primary/10" : "bg-muted"}`}>
                        <KeyRound className={`w-5 h-5 ${key.status === "active" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{key.key_id}</span>
                          <h3 className="font-heading font-semibold text-foreground text-sm">{key.name}</h3>
                          <Badge variant="outline" className="text-xs">{key.key_type}</Badge>
                          <Badge variant="outline" className="text-xs">{key.purpose.replace(/_/g, " ")}</Badge>
                          <Badge variant="outline" className="text-xs">v{key.version}</Badge>
                          {key.status === "active" ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">{key.status}</Badge>}
                          {key.auto_rotation && <Badge variant="outline" className="text-xs"><RefreshCw className="w-3 h-3 mr-1" />Auto</Badge>}
                          {isDue && <Badge className="bg-amber-100 text-amber-700 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Due for rotation</Badge>}
                        </div>
                        {key.description && <p className="text-xs text-muted-foreground mb-1">{key.description}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Algorithm: <strong className="text-foreground font-mono">{key.key_algorithm || key.key_type}</strong></span>
                          <span>KMS: <strong className="text-foreground">{(key.kms_provider || "").replace(/_/g, " ")}</strong></span>
                          {key.last_rotated && <span>Last rotated: <strong className="text-foreground">{new Date(key.last_rotated).toLocaleDateString()}</strong></span>}
                          {daysUntilRotation !== null && key.status === "active" && (
                            <span className={daysUntilRotation < 0 ? "text-amber-600" : ""}>
                              Next rotation: <strong className={daysUntilRotation < 0 ? "text-amber-600" : "text-foreground"}>{daysUntilRotation < 0 ? `${Math.abs(daysUntilRotation)}d overdue` : `${daysUntilRotation}d`}</strong>
                            </span>
                          )}
                          <span>Rotation: <strong className="text-foreground">every {key.rotation_frequency_days}d</strong></span>
                        </div>
                      </div>
                      {key.status === "active" && (
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => rotateKey(key.key_id)} disabled={rotating === key.key_id}>
                            {rotating === key.key_id ? <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
                            Rotate
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => revokeKey(key.key_id)}><EyeOff className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* DATA MASKING & TOKENIZATION */}
        <TabsContent value="masking">
          <p className="text-sm text-muted-foreground mb-4">PII protection rules — data masking, tokenization, anonymization, and pseudonymization for sensitive data fields.</p>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : rules.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Fingerprint className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No data protection rules configured.</p>
              <p className="text-xs text-muted-foreground">Configure masking and tokenization rules to protect PII across databases, APIs, exports, and reports.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg shrink-0 bg-primary/10">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{rule.rule_id}</span>
                        <h3 className="font-heading font-semibold text-foreground text-sm">{rule.name}</h3>
                        <Badge variant="outline" className="text-xs">{rule.data_category}</Badge>
                        <Badge variant="outline" className="text-xs">{rule.protection_method}</Badge>
                        {rule.is_reversible ? <Badge variant="outline" className="text-xs bg-blue-50">Reversible</Badge> : <Badge variant="outline" className="text-xs bg-slate-50">One-way</Badge>}
                        {rule.status === "active" ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">{rule.status}</Badge>}
                      </div>
                      {rule.description && <p className="text-xs text-muted-foreground mb-1">{rule.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Fields: <strong className="text-foreground font-mono">{rule.field_pattern}</strong></span>
                        <span>Format: <strong className="text-foreground font-mono">{rule.masking_format}</strong></span>
                        <span>Scope: <strong className="text-foreground">{(rule.enforcement_scope || "").replace(/_/g, " ")}</strong></span>
                        {rule.regulatory_reference && <span>Reg: <strong className="text-foreground">{rule.regulatory_reference}</strong></span>}
                        {rule.tokenization_vault && <span><Layers className="w-3 h-3 inline mr-1" />Vault-backed</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}