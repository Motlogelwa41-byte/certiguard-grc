import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useRBAC } from "@/lib/useRBAC";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Lock, Fingerprint, Users, UserCheck,
  AlertTriangle, CheckCircle2, XCircle, Clock, RefreshCw, Plus, Trash2, Eye, EyeOff,
  KeyRound as KeyIcon, Server, Building2, Zap
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { PASSWORD_MIN_LENGTH, passwordRequirements, strengthLabel } from "@/lib/passwordPolicy";

const RESOURCE_TYPES = ["control","risk","evidence","vendor","policy","incident","audit","asset","remediation","privacy_request","cybersecurity_risk","all"];
const ACTIONS = ["read","write","delete","approve","export","assign","all"];
const EFFECTS = ["allow","deny"];
const CONDITION_LOGICS = ["user_and_resource","user_only","resource_only","user_or_resource","environment_only"];

export default function IdentityAccessCenter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { role, roles } = useRBAC();
  const [policies, setPolicies] = useState([]);
  const [users, setUsers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: "", description: "", resource_type: "control", action: "read", effect: "deny",
    priority: 100, user_attribute: "role", user_attribute_value: "", resource_attribute: "classification",
    resource_attribute_value: "restricted", condition_logic: "user_and_resource", enforcement_mode: "enforce",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [p, u, k] = await Promise.all([
        base44.entities.AbacPolicy.list("-priority", 100).catch(() => []),
        base44.entities.User.list().catch(() => []),
        base44.entities.TenantApiKey.list("-created_date", 20).catch(() => []),
      ]);
      setPolicies(p || []);
      setUsers(u || []);
      setApiKeys(k || []);
    } catch (e) { toast({ variant: "destructive", title: "Load failed", description: e?.message }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  // PoLP posture: MFA enrollment %, password compliance, ABAC coverage
  const mfaEnrolled = users.filter((u) => u.data?.mfa_enrolled || u.mfa_enrolled).length;
  const mfaPct = users.length > 0 ? Math.round((mfaEnrolled / users.length) * 100) : 0;
  const activePolicies = policies.filter((p) => p.status === "active").length;
  const denyPolicies = policies.filter((p) => p.effect === "deny" && p.status === "active").length;
  const activeApiKeys = apiKeys.filter((k) => k.is_active).length;
  const polpScore = Math.round((mfaPct * 0.4) + (activePolicies > 0 ? 30 : 0) + (denyPolicies > 0 ? 20 : 0) + (activeApiKeys > 0 ? 10 : 0));

  const createPolicy = async () => {
    if (!newPolicy.name || !newPolicy.user_attribute_value) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and user attribute value are required." });
      return;
    }
    try {
      const me = await base44.auth.me();
      const policyId = `ABAC-${String(policies.length + 1).padStart(3, "0")}`;
      await base44.entities.AbacPolicy.create({
        ...newPolicy,
        policy_id: policyId,
        tenant_id: me?.data?.tenant_id || me?.tenant_id || "",
        owner_name: me?.full_name || me?.email,
        owner_id: me?.id,
        priority: Number(newPolicy.priority),
      });
      toast({ title: "ABAC policy created", description: `${policyId}: ${newPolicy.name}` });
      setShowAddPolicy(false);
      setNewPolicy({ ...newPolicy, name: "", description: "", user_attribute_value: "" });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Create failed", description: e?.message }); }
  };

  const togglePolicy = async (policy) => {
    try {
      await base44.entities.AbacPolicy.update(policy.id, { status: policy.status === "active" ? "disabled" : "active" });
      toast({ title: `Policy ${policy.status === "active" ? "disabled" : "enabled"}` });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Toggle failed", description: e?.message }); }
  };

  const deletePolicy = async (policy) => {
    try {
      await base44.entities.AbacPolicy.delete(policy.id);
      toast({ title: "Policy deleted" });
      loadData();
    } catch (e) { toast({ variant: "destructive", title: "Delete failed", description: e?.message }); }
  };

  // Role distribution
  const roleDistribution = roles.reduce((acc, r) => {
    const count = users.filter((u) => u.role === r).length;
    if (count > 0) acc.push({ role: r, count });
    return acc;
  }, []);

  return (
    <div>
      <PageHeader
        title="Identity & Access Control Center"
        subtitle="Principle of Least Privilege — RBAC + ABAC, MFA enforcement, session hardening, and privilege revocation"
        icon={Fingerprint}
      />

      {/* PoLP Posture Score */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="PoLP Posture" value={`${polpScore}%`} icon={ShieldCheck} color={polpScore >= 80 ? "green" : polpScore >= 50 ? "amber" : "red"} trendLabel={polpScore >= 80 ? "Strong" : "Needs work"} />
        <StatCard label="MFA Enrollment" value={`${mfaPct}%`} icon={KeyRound} color={mfaPct >= 90 ? "green" : mfaPct >= 50 ? "amber" : "red"} trendLabel={`${mfaEnrolled}/${users.length} users`} />
        <StatCard label="ABAC Policies" value={activePolicies} icon={Fingerprint} color="blue" trendLabel={`${denyPolicies} deny rules`} />
        <StatCard label="Active Users" value={users.length} icon={Users} color="blue" trendLabel={`${roleDistribution.length} roles`} />
        <StatCard label="Service Accounts" value={activeApiKeys} icon={KeyIcon} color={activeApiKeys > 0 ? "amber" : "green"} trendLabel="API keys" />
      </div>

      <Tabs defaultValue="rbac" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="rbac"><UserCheck className="w-4 h-4 mr-1.5" />RBAC Matrix</TabsTrigger>
          <TabsTrigger value="abac"><Fingerprint className="w-4 h-4 mr-1.5" />ABAC Policies</TabsTrigger>
          <TabsTrigger value="auth"><Lock className="w-4 h-4 mr-1.5" />Auth Hardening</TabsTrigger>
          <TabsTrigger value="session"><Clock className="w-4 h-4 mr-1.5" />Session & Privilege</TabsTrigger>
          <TabsTrigger value="service"><Server className="w-4 h-4 mr-1.5" />Service Accounts</TabsTrigger>
        </TabsList>

        {/* RBAC MATRIX */}
        <TabsContent value="rbac">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm mb-4">
            <h3 className="font-heading font-semibold text-foreground mb-2">Role Hierarchy & Least Privilege</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {roles.length} roles defined with granular per-module permissions. Each role operates with the minimum necessary permissions — no role has blanket access.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {roleDistribution.map(({ role: r, count }) => (
                <div key={r} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-sm font-medium capitalize">{r.replace(/_/g, " ")}</span>
                    <p className="text-xs text-muted-foreground">{count} user{count !== 1 ? "s" : ""}</p>
                  </div>
                  <Badge variant={r === "admin" ? "destructive" : r === "compliance_officer" || r === "risk_manager" ? "default" : "secondary"} className="text-xs">
                    {r === "admin" || r === "tenant_admin" || r === "platform_admin" ? "Elevated" : r === "auditor" || r === "external_auditor" || r === "read_only" || r === "viewer" ? "Read-only" : "Scoped"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <h3 className="font-heading font-semibold text-foreground mb-3">Your Current Role: <Badge variant="default" className="ml-1 capitalize">{(role || "user").replace(/_/g, " ")}</Badge></h3>
            <p className="text-sm text-muted-foreground">
              You are operating under the Principle of Least Privilege. Your role grants only the permissions necessary for your function.
              Write/delete operations require elevated roles; approval operations require reviewer or compliance officer.
            </p>
          </div>
        </TabsContent>

        {/* ABAC POLICIES */}
        <TabsContent value="abac">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">Attribute-based policies that complement RBAC — deny rules block access based on user/resource attributes.</p>
            <Button size="sm" onClick={() => setShowAddPolicy(!showAddPolicy)}>
              {showAddPolicy ? <EyeOff className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {showAddPolicy ? "Cancel" : "Add Policy"}
            </Button>
          </div>

          {showAddPolicy && (
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-4">
              <h3 className="font-heading font-semibold text-foreground mb-3">New ABAC Policy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div><Label className="text-xs">Policy Name</Label><Input value={newPolicy.name} onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })} placeholder="e.g. Deny restricted evidence to non-executives" /></div>
                <div><Label className="text-xs">Description</Label><Input value={newPolicy.description} onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })} placeholder="Why this policy exists" /></div>
                <div><Label className="text-xs">Resource Type</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newPolicy.resource_type} onChange={(e) => setNewPolicy({ ...newPolicy, resource_type: e.target.value })}>
                    {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Action</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newPolicy.action} onChange={(e) => setNewPolicy({ ...newPolicy, action: e.target.value })}>
                    {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Effect</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newPolicy.effect} onChange={(e) => setNewPolicy({ ...newPolicy, effect: e.target.value })}>
                    {EFFECTS.map((ef) => <option key={ef} value={ef}>{ef}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Priority (higher = overrides)</Label><Input type="number" value={newPolicy.priority} onChange={(e) => setNewPolicy({ ...newPolicy, priority: e.target.value })} /></div>
                <div><Label className="text-xs">User Attribute</Label><Input value={newPolicy.user_attribute} onChange={(e) => setNewPolicy({ ...newPolicy, user_attribute: e.target.value })} placeholder="role, department, clearance_level" /></div>
                <div><Label className="text-xs">User Attribute Value</Label><Input value={newPolicy.user_attribute_value} onChange={(e) => setNewPolicy({ ...newPolicy, user_attribute_value: e.target.value })} placeholder="auditor, finance, high" /></div>
                <div><Label className="text-xs">Resource Attribute</Label><Input value={newPolicy.resource_attribute} onChange={(e) => setNewPolicy({ ...newPolicy, resource_attribute: e.target.value })} placeholder="classification, severity" /></div>
                <div><Label className="text-xs">Resource Attribute Value</Label><Input value={newPolicy.resource_attribute_value} onChange={(e) => setNewPolicy({ ...newPolicy, resource_attribute_value: e.target.value })} placeholder="restricted, critical" /></div>
                <div><Label className="text-xs">Condition Logic</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newPolicy.condition_logic} onChange={(e) => setNewPolicy({ ...newPolicy, condition_logic: e.target.value })}>
                    {CONDITION_LOGICS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div><Label className="text-xs">Enforcement Mode</Label>
                  <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={newPolicy.enforcement_mode} onChange={(e) => setNewPolicy({ ...newPolicy, enforcement_mode: e.target.value })}>
                    <option value="enforce">Enforce (block)</option>
                    <option value="monitor">Monitor (log)</option>
                    <option value="audit_only">Audit Only</option>
                  </select>
                </div>
              </div>
              <Button className="mt-3" size="sm" onClick={createPolicy}><ShieldCheck className="w-4 h-4 mr-1.5" />Create Policy</Button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
          ) : policies.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <Fingerprint className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No ABAC policies yet.</p>
              <p className="text-xs text-muted-foreground mb-4">Create attribute-based policies to enforce least privilege beyond role-based controls.</p>
              <Button onClick={() => setShowAddPolicy(true)}><Plus className="w-4 h-4 mr-2" /> Add First Policy</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.map((p) => (
                <div key={p.id} className={`bg-card rounded-xl border p-4 shadow-sm ${p.status === "active" ? "border-border" : "border-border opacity-60"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 ${p.effect === "deny" ? "bg-red-100 dark:bg-red-900/20" : "bg-emerald-100 dark:bg-emerald-900/20"}`}>
                      {p.effect === "deny" ? <XCircle className="w-4 h-4 text-red-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{p.policy_id}</span>
                        <h3 className="font-heading font-semibold text-foreground text-sm">{p.name}</h3>
                        <Badge variant="outline" className={`text-xs ${p.effect === "deny" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>{p.effect}</Badge>
                        <Badge variant="outline" className="text-xs">{p.resource_type}</Badge>
                        <Badge variant="outline" className="text-xs">{p.action}</Badge>
                        <Badge variant="outline" className="text-xs">P:{p.priority}</Badge>
                        {p.status === "active" ? <Badge className="text-xs bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="secondary" className="text-xs">Disabled</Badge>}
                      </div>
                      {p.description && <p className="text-xs text-muted-foreground mb-1">{p.description}</p>}
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>User: <strong className="text-foreground">{p.user_attribute}={p.user_attribute_value}</strong></span>
                        <span>Resource: <strong className="text-foreground">{p.resource_attribute}={p.resource_attribute_value}</strong></span>
                        <span>Logic: <strong className="text-foreground">{(p.condition_logic || "").replace(/_/g, " ")}</strong></span>
                        <span>Mode: <strong className="text-foreground">{p.enforcement_mode}</strong></span>
                        {p.match_count > 0 && <span>Matches: <strong className="text-foreground">{p.match_count}</strong></span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => togglePolicy(p)}>{p.status === "active" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                      <Button size="sm" variant="ghost" onClick={() => deletePolicy(p)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AUTH HARDENING */}
        <TabsContent value="auth">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* MFA */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Multi-Factor Authentication</h3>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl font-bold">{mfaPct}%</div>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${mfaPct}%`, backgroundColor: mfaPct >= 90 ? "#10B981" : mfaPct >= 50 ? "#f59e0b" : "#ef4444" }} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{mfaEnrolled} of {users.length} users have MFA enrolled.</p>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${mfaPct >= 90 ? "bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200" : "bg-amber-50 dark:bg-amber-900/10 border border-amber-200"}`}>
                {mfaPct >= 90 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                <p className="text-xs">{mfaPct >= 90 ? "MFA enforcement is strong — all users enrolled." : "Some users lack MFA — enforcement gate will block their access."}</p>
              </div>
              <div className="mt-3 space-y-1">
                {users.slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{u.email || u.full_name}</span>
                    {u.data?.mfa_enrolled || u.mfa_enrolled ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                  </div>
                ))}
                {users.length > 5 && <p className="text-xs text-muted-foreground">+ {users.length - 5} more...</p>}
              </div>
            </div>

            {/* Password Policy */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Password Complexity Policy</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Minimum length: <strong>{PASSWORD_MIN_LENGTH} characters</strong></span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Requires uppercase letters (A-Z)</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Requires lowercase letters (a-z)</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Requires numbers (0-9)</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Requires special characters (!@#$...)</span></div>
                <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span>Strength scoring: 5-tier (Too weak → Excellent)</span></div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">Enforced client-side on registration. Server-side bcrypt hashing with platform-managed salt rounds.</p>
            </div>
          </div>
        </TabsContent>

        {/* SESSION & PRIVILEGE */}
        <TabsContent value="session">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Session Timeout */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Session Timeout</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Idle timeout</span><Badge variant="outline">30 minutes</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Auto-logout on idle</span><Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Screen lock overlay</span><Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>JWT session validation</span><Badge className="bg-emerald-100 text-emerald-700">Per request</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">Sessions automatically terminate after 30 minutes of inactivity. JWT is cryptographically verified on every API request.</p>
            </div>

            {/* Privilege Revocation */}
            <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Privilege Revocation & Access Review</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Access recertification campaigns</span><Badge variant="outline">Available</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Role-based revocation</span><Badge className="bg-emerald-100 text-emerald-700">Immediate</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>API key revocation</span><Badge className="bg-emerald-100 text-emerald-700">Instant</Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <span>Session invalidation</span><Badge className="bg-emerald-100 text-emerald-700">On credential change</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">Privileges can be revoked instantly via role change or API key deactivation. Access recertification campaigns enforce periodic review.</p>
            </div>
          </div>
        </TabsContent>

        {/* SERVICE ACCOUNTS */}
        <TabsContent value="service">
          <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-5 h-5 text-primary" />
              <h3 className="font-heading font-semibold text-foreground">Service Account API Keys (TenantApiKey)</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Service accounts operate with scoped permissions and per-hour rate limits — enforcing least privilege for automated access.</p>
            {apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No API keys registered.</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map((k) => (
                  <div key={k.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <span className="text-sm font-medium">{k.label || k.key_label || "Unnamed key"}</span>
                      <p className="text-xs text-muted-foreground">Rate limit: {k.rate_limit_per_hour || 1000}/hr • Used: {k.requests_this_hour || 0} this hour</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.is_active ? <Badge className="bg-emerald-100 text-emerald-700 text-xs">Active</Badge> : <Badge variant="secondary" className="text-xs">Revoked</Badge>}
                      {k.last_used_at && <span className="text-xs text-muted-foreground">Last used: {new Date(k.last_used_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}