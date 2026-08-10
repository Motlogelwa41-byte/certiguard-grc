import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import StatusBadge from "@/components/shared/StatusBadge";
import { Plus, RefreshCw, Trash2, KeyRound, Users, ShieldCheck, AlertCircle, Loader2, Wifi, Lock, ShieldX, Copy, Webhook, Check } from "lucide-react";
import ProviderSetupGuide from "@/components/sso/ProviderSetupGuide";
import SSOSetupGuide from "@/components/sso/SSOSetupGuide";
import { Switch } from "@/components/ui/switch";

const TYPES = [
  { value: "azure_ad", label: "Microsoft Entra ID" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "onelogin", label: "OneLogin" },
  { value: "jumpcloud", label: "JumpCloud" },
  { value: "other", label: "Other (SCIM 2.0)" },
];

const emptyForm = { name: "", type: "azure_ad", scim_base_url: "", api_base_url: "", token_secret: "", saml_entrypoint: "", saml_metadata_url: "", saml_certificate: "", sso_issuer: "", domains: "", provision_new_users: false };

export default function SSOSettings() {
  const [idps, setIdps] = useState([]);
  const [dirUsers, setDirUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [syncing, setSyncing] = useState(null);
  const [testing, setTesting] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const { toast } = useToast();

  const testConnection = async (idp) => {
    setTesting(idp.id);
    try {
      const res = await base44.functions.invoke("testScimConnection", { idp_id: idp.id });
      const data = res?.data || res;
      if (data?.ok) toast({ title: "Connection verified", description: data.message, duration: 2500 });
      else toast({ title: "Connection failed", description: data?.error, variant: "destructive", duration: 4000 });
      load();
    } catch (e) {
      toast({ title: "Connection test failed", description: e.message, variant: "destructive", duration: 4000 });
    }
    setTesting(null);
  };

  const load = async () => {
    setLoading(true);
    const [i, u, ts] = await Promise.all([
      base44.entities.IdentityProvider.list("-updated_date", 50),
      base44.entities.DirectoryUser.list("-last_synced_at", 300),
      base44.entities.TenantSettings.list("-created_date", 5).catch(() => []),
    ]);
    setIdps(i || []);
    setDirUsers(u || []);
    if (ts && ts.length > 0) setTenantSettings(ts[0]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (idp) => { setEditing(idp); setForm({ ...emptyForm, name: idp.name, type: idp.type, scim_base_url: idp.scim_base_url || "", api_base_url: idp.api_base_url || "", token_secret: idp.token_secret || "", saml_entrypoint: idp.saml_entrypoint || "", saml_metadata_url: idp.saml_metadata_url || "", saml_certificate: idp.saml_certificate || "", sso_issuer: idp.sso_issuer || "", domains: (idp.domains || []).join(", "), provision_new_users: idp.provision_new_users || false }); setOpen(true); };

  const save = async () => {
    try {
      const payload = {
        name: form.name,
        type: form.type,
        scim_base_url: form.scim_base_url,
        api_base_url: form.api_base_url,
        token_secret: form.token_secret,
        saml_entrypoint: form.saml_entrypoint,
        saml_metadata_url: form.saml_metadata_url,
        saml_certificate: form.saml_certificate,
        sso_issuer: form.sso_issuer,
        domains: form.domains.split(",").map((d) => d.trim()).filter(Boolean),
        provision_new_users: form.provision_new_users,
        scim_enabled: true,
      };
      if (editing) { await base44.entities.IdentityProvider.update(editing.id, payload); toast({ title: "IdP updated" }); }
      else { await base44.entities.IdentityProvider.create({ ...payload, status: "active" }); toast({ title: "IdP added", description: "Add the token secret in Dashboard → Secrets." }); }
      setOpen(false); load();
    } catch (e) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const remove = async (idp) => { await base44.entities.IdentityProvider.delete(idp.id); load(); toast({ title: "IdP removed" }); };

  const sync = async (idp) => {
    setSyncing(idp.id);
    try {
      const res = await base44.functions.invoke("syncIdpDirectory", { idp_id: idp.id });
      const data = res?.data || res;
      if (data?.ok) toast({ title: "Directory synced", description: `${data.synced} users synced.` });
      else toast({ title: "Sync failed", description: data?.error, variant: "destructive" });
      load();
    } catch (e) { toast({ title: "Sync failed", description: e.message, variant: "destructive" }); }
    setSyncing(null);
  };

  const [copiedField, setCopiedField] = useState(null);
  const [generatingToken, setGeneratingToken] = useState(null);

  const SCIM_ENDPOINT_URL = "https://guard-trust-scale.base44.app/functions/scimEndpoint";

  const generateScimToken = async (idp) => {
    setGeneratingToken(idp.id);
    try {
      const token = `scim_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await base44.entities.IdentityProvider.update(idp.id, {
        scim_inbound_token: token,
        scim_inbound_url: SCIM_ENDPOINT_URL,
      });
      toast({ title: "SCIM token generated", description: "Copy the bearer token into your IdP SCIM configuration.", duration: 4000 });
      load();
    } catch (e) {
      toast({ title: "Failed to generate token", description: e.message, variant: "destructive" });
    }
    setGeneratingToken(null);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSecurity = async (field, value) => {
    setSavingSecurity(true);
    try {
      const payload = { [field]: value, updated_by_name: "admin" };
      if (tenantSettings?.id) {
        await base44.entities.TenantSettings.update(tenantSettings.id, payload);
      } else {
        const me = await base44.auth.me();
        const tenantId = me?.tenant_id || me?.data?.tenant_id;
        const created = await base44.entities.TenantSettings.create({ tenant_id: tenantId, ...payload });
        setTenantSettings(created);
      }
      setTenantSettings((prev) => ({ ...prev, [field]: value }));
      toast({ title: `${field === "require_sso" ? "SSO enforcement" : "MFA enforcement"} ${value ? "enabled" : "disabled"}` });
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSavingSecurity(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="SSO & Directory" subtitle="Configure OIDC identity providers and SCIM directory sync" actions={<Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add Provider</Button>} />

      {/* Security Enforcement Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldX className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Require SSO</h3>
                <p className="text-xs text-muted-foreground">Disable password login — force SSO authentication</p>
              </div>
            </div>
            <Switch
              checked={tenantSettings?.require_sso === true}
              onCheckedChange={(v) => toggleSecurity("require_sso", v)}
              disabled={savingSecurity}
            />
          </div>
          <p className="text-xs text-muted-foreground">When enabled, users must sign in via Google, Microsoft, or your enterprise IdP. Password-based login is hidden from the login page.</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-heading font-semibold text-foreground">Require MFA</h3>
                <p className="text-xs text-muted-foreground">Block access until MFA is enrolled</p>
              </div>
            </div>
            <Switch
              checked={tenantSettings?.require_mfa !== false}
              onCheckedChange={(v) => toggleSecurity("require_mfa", v)}
              disabled={savingSecurity}
            />
          </div>
          <p className="text-xs text-muted-foreground">When enabled, all users must confirm MFA enrollment before accessing the platform. Enforce MFA at your identity provider for full protection.</p>
        </div>
      </div>

      <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl p-4 mb-6 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm space-y-2">
          <p className="font-medium text-sky-900 dark:text-sky-200">SSO Login — OIDC (not SAML)</p>
          <p className="text-sky-700 dark:text-sky-300 text-xs">This platform uses <strong>OIDC / OAuth 2.0</strong> for single sign-on, not SAML. Users sign in via the <strong>Google</strong> or <strong>Microsoft</strong> buttons on the login page. For enterprise workspace SSO (Entra ID, Okta, Google Workspace), configure the OIDC callback URL in your Base44 dashboard → Settings → SSO.</p>
          <p className="text-sky-700 dark:text-sky-300 text-xs"><strong>OIDC Callback URL:</strong> <code className="bg-sky-100 dark:bg-sky-900/50 px-1.5 py-0.5 rounded text-[11px]">https://app.base44.com/api/apps/&#123;APP_ID&#125;/auth/sso/callback</code> — find your App ID in the editor URL.</p>
          <p className="text-sky-700 dark:text-sky-300 text-xs">The SCIM providers configured below handle <strong>user provisioning</strong> (auto-creating/updating app users from your IdP directory), which complements OIDC login.</p>
        </div>
      </div>

      <SSOSetupGuide />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatTile label="Providers" value={idps.length} icon={KeyRound} color="text-primary" />
        <StatTile label="Synced Users" value={dirUsers.length} icon={Users} color="text-emerald-500" />
        <StatTile label="Active" value={idps.filter((i) => i.status === "active").length} icon={ShieldCheck} color="text-emerald-500" />
      </div>

      <div className="space-y-3 mb-8">
        {idps.length === 0 && <div className="bg-card rounded-2xl border border-border p-8 text-center"><KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm text-muted-foreground mb-4">No identity providers configured. Add Entra ID, Google Workspace, or another SCIM 2.0 provider to enable SSO and SCIM provisioning.</p><Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Add your first provider</Button></div>}
        {idps.map((idp) => (
          <div key={idp.id} className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-primary" /></div>
                <div>
                  <h3 className="font-heading font-bold text-foreground">{idp.name}</h3>
                  <p className="text-[11px] text-muted-foreground capitalize">{idp.type.replace(/_/g, " ")} · {(idp.domains || []).join(", ") || "no domains"}</p>
                </div>
              </div>
              <StatusBadge status={idp.status} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
              <Meta label="Users" value={idp.user_count || 0} />
              <Meta label="Groups" value={idp.group_count || 0} />
              <Meta label="Last sync" value={idp.last_sync_at ? new Date(idp.last_sync_at).toLocaleString() : "—"} />
              <Meta label="SCIM" value={idp.scim_enabled ? "Enabled" : "Off"} />
            </div>
            {idp.last_error && <p className="text-rose-500 text-xs mb-3 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {idp.last_error}</p>}
            <div className="flex items-center gap-2 mb-4">
              <Button size="sm" variant="outline" onClick={() => openEdit(idp)}>Configure</Button>
              <Button size="sm" variant="outline" onClick={() => testConnection(idp)} disabled={testing === idp.id}>{testing === idp.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Wifi className="w-3.5 h-3.5 mr-1" />} Test</Button>
              <Button size="sm" onClick={() => sync(idp)} disabled={syncing === idp.id}>{syncing === idp.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />} Sync</Button>
              <Button size="sm" variant="ghost" onClick={() => remove(idp)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
            </div>

            {/* SCIM Inbound Endpoint */}
            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">SCIM Inbound Endpoint (Push Provisioning)</span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Endpoint URL</p>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 text-[11px] font-mono text-foreground bg-background border border-border rounded px-2 py-1 truncate">{SCIM_ENDPOINT_URL}</code>
                    <button onClick={() => copyToClipboard(SCIM_ENDPOINT_URL, `url-${idp.id}`)} className="p-1 rounded hover:bg-muted border border-border">
                      {copiedField === `url-${idp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
                {idp.scim_inbound_token ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Bearer Token</p>
                    <div className="flex items-center gap-1.5">
                      <code className="flex-1 text-[11px] font-mono text-foreground bg-background border border-border rounded px-2 py-1 truncate">{idp.scim_inbound_token}</code>
                      <button onClick={() => copyToClipboard(idp.scim_inbound_token, `token-${idp.id}`)} className="p-1 rounded hover:bg-muted border border-border">
                        {copiedField === `token-${idp.id}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No token generated yet. Click below to generate a bearer token for your IdP.</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => generateScimToken(idp)} disabled={generatingToken === idp.id}>
                  {generatingToken === idp.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1" />}
                  {idp.scim_inbound_token ? "Regenerate Token" : "Generate Token"}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">
                Configure your IdP (Okta, Entra ID, etc.) to push user changes to this endpoint. Use the Bearer token in the Authorization header. Operations: POST (create), GET ?id= (retrieve), PUT ?id= (update), PATCH ?id= (patch), DELETE ?id= (deactivate).
              </p>
            </div>
          </div>
        ))}
      </div>

      {dirUsers.length > 0 && (
        <div>
          <h2 className="text-lg font-heading font-semibold mb-3">Provisioned Directory ({dirUsers.length})</h2>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Provider</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Groups / Roles</th>
                    <th className="text-left p-3 font-medium">Last synced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dirUsers.slice(0, 100).map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium text-foreground">{u.full_name || "—"}</td>
                      <td className="p-3 text-muted-foreground">{u.email || "—"}</td>
                      <td className="p-3 text-muted-foreground">{u.idp_name || "—"}</td>
                      <td className="p-3"><StatusBadge status={u.status} /></td>
                      <td className="p-3 text-muted-foreground text-xs">{(u.groups || []).slice(0, 3).join(", ")}{(u.groups || []).length > 3 ? ` +${u.groups.length - 3}` : ""}</td>
                      <td className="p-3 text-muted-foreground text-xs">{u.last_synced_at ? new Date(u.last_synced_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Provider" : "Add Identity Provider"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Provider name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Corporate Identity Provider" /></div>
              <div><Label>Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <ProviderSetupGuide type={form.type} />
            <div><Label>SCIM base URL</Label><Input value={form.scim_base_url} onChange={(e) => setForm({ ...form, scim_base_url: e.target.value })} placeholder="https://tenant.scim.example/scim/v2" /></div>
            <div><Label>Token secret name</Label><Input value={form.token_secret} onChange={(e) => setForm({ ...form, token_secret: e.target.value })} placeholder="SCIM_BEARER_TOKEN" /><p className="text-xs text-muted-foreground mt-1">Add this secret in Dashboard → Secrets with the SCIM bearer token value.</p></div>
            <div><Label>SSO domains (comma-separated)</Label><Input value={form.domains} onChange={(e) => setForm({ ...form, domains: e.target.value })} placeholder="company.com, subsidiary.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SAML metadata URL</Label><Input value={form.saml_metadata_url} onChange={(e) => setForm({ ...form, saml_metadata_url: e.target.value })} /></div>
              <div><Label>SAML entry point</Label><Input value={form.saml_entrypoint} onChange={(e) => setForm({ ...form, saml_entrypoint: e.target.value })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.provision_new_users} onChange={(e) => setForm({ ...form, provision_new_users: e.target.checked })} className="rounded" /> Auto-provision new synced users as app users</label>
            <Button className="w-full" onClick={save} disabled={!form.name}>{editing ? "Save Changes" : "Add Provider"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }) {
  return <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"><Icon className={`w-8 h-8 ${color}`} /><div><p className="text-2xl font-bold text-foreground leading-none">{value}</p><p className="text-xs text-muted-foreground mt-1">{label}</p></div></div>;
}
function Meta({ label, value }) { return <div><p className="text-muted-foreground">{label}</p><p className="text-foreground font-medium truncate">{value}</p></div>; }