import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, ExternalLink, ShieldCheck, KeyRound, Webhook, Lock, Users } from "lucide-react";

const OIDC_CALLBACK = "https://app.base44.com/api/apps/{APP_ID}/auth/sso/callback";
const SCIM_ENDPOINT = "https://guard-trust-scale.base44.app/functions/scimEndpoint";

export default function SSOSetupGuide() {
  const [copied, setCopied] = useState(null);

  const copy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)} className="p-1 rounded hover:bg-muted border border-border flex-shrink-0">
      {copied === id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );

  const Step = ({ num, icon: Icon, title, children }) => (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{num}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className="w-3.5 h-3.5 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        </div>
        <div className="text-xs text-muted-foreground space-y-1.5">{children}</div>
      </div>
    </div>
  );

  const CodeLine = ({ text, id }) => (
    <div className="flex items-center gap-1.5 bg-background border border-border rounded px-2 py-1">
      <code className="flex-1 text-[11px] font-mono text-foreground truncate">{text}</code>
      <CopyBtn text={text} id={id} />
    </div>
  );

  return (
    <div className="bg-card rounded-2xl border border-border p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-heading font-bold text-foreground">SSO Setup Guide</h3>
        <span className="text-xs text-muted-foreground">— follow these steps to connect your identity provider</span>
      </div>

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="google">Google Workspace</TabsTrigger>
          <TabsTrigger value="azure">Microsoft Entra ID</TabsTrigger>
          <TabsTrigger value="general">SCIM / Other</TabsTrigger>
        </TabsList>

        {/* Google Workspace */}
        <TabsContent value="google" className="space-y-4">
          <Step num={1} icon={KeyRound} title="Create Google OAuth Client">
            <p>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">Google Cloud Console → Credentials <ExternalLink className="w-3 h-3" /></a></p>
            <p>Click <strong>Create Credentials → OAuth Client ID</strong> → Application type: <strong>Web Application</strong></p>
          </Step>
          <Step num={2} icon={ShieldCheck} title="Add Authorized Redirect URI">
            <p>Paste this exact URL under <strong>Authorized Redirect URIs</strong>:</p>
            <CodeLine text={OIDC_CALLBACK} id="google-callback" />
            <p className="text-[10px]">Replace <code>{`{APP_ID}`}</code> with your app ID from the editor URL.</p>
          </Step>
          <Step num={3} icon={KeyRound} title="Copy Client ID & Secret">
            <p>After creating, copy the <strong>Client ID</strong> and <strong>Client Secret</strong>.</p>
            <p>Go to <strong>Dashboard → Settings → SSO</strong> in Base44 and paste them into the Google provider config.</p>
          </Step>
          <Step num={4} icon={Users} title="Restrict to Your Domain (Optional)">
            <p>In Google Cloud Console → <strong>OAuth Consent Screen</strong> → set User Type to <strong>Internal</strong>.</p>
            <p>This restricts login to your workspace users only.</p>
          </Step>
          <Step num={5} icon={Webhook} title="Enable SCIM Auto-Provisioning (Optional)">
            <p>Add a Google Workspace provider below, then click <strong>Generate Token</strong> on the provider card.</p>
            <p>Configure SCIM in Google Admin Console using this endpoint:</p>
            <CodeLine text={SCIM_ENDPOINT} id="google-scim" />
          </Step>
        </TabsContent>

        {/* Microsoft Entra ID */}
        <TabsContent value="azure" className="space-y-4">
          <Step num={1} icon={KeyRound} title="Register an App in Entra ID">
            <p>Go to <a href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-primary inline-flex items-center gap-0.5 hover:underline">Azure Portal → App Registrations <ExternalLink className="w-3 h-3" /></a></p>
            <p>Click <strong>New Registration</strong> → Name: <code>EthicalEdge GRC</code></p>
            <p>Supported account types: <strong>Accounts in this organizational directory only</strong></p>
          </Step>
          <Step num={2} icon={ShieldCheck} title="Set Redirect URI">
            <p>Under <strong>Redirect URI</strong>, select <strong>Web</strong> and paste:</p>
            <CodeLine text={OIDC_CALLBACK} id="azure-callback" />
            <p className="text-[10px]">Replace <code>{`{APP_ID}`}</code> with your app ID from the editor URL.</p>
          </Step>
          <Step num={3} icon={KeyRound} title="Create Client Secret">
            <p>Go to <strong>Certificates & Secrets → New Client Secret</strong>.</p>
            <p>Copy the <strong>secret value</strong> (shown only once!) and the <strong>Application (client) ID</strong>.</p>
            <p>Paste both into Base44 SSO settings for the Microsoft provider.</p>
          </Step>
          <Step num={4} icon={Webhook} title="Configure SCIM Provisioning (Optional)">
            <p>Go to <strong>Enterprise Applications → your app → Provisioning</strong>.</p>
            <p>Set mode to <strong>Automatic</strong> and enter the SCIM endpoint:</p>
            <CodeLine text={SCIM_ENDPOINT} id="azure-scim" />
            <p>Use the bearer token generated from the provider card below.</p>
            <p>Map attributes: <code>userName</code>, <code>emails</code>, <code>displayName</code>, <code>active</code>.</p>
          </Step>
        </TabsContent>

        {/* General SCIM */}
        <TabsContent value="general" className="space-y-4">
          <Step num={1} icon={Webhook} title="SCIM 2.0 Inbound Endpoint">
            <p>Your SCIM inbound endpoint for push-based user provisioning:</p>
            <CodeLine text={SCIM_ENDPOINT} id="general-scim" />
          </Step>
          <Step num={2} icon={KeyRound} title="Authentication">
            <p>Add a provider below and click <strong>Generate Token</strong> to create a bearer token.</p>
            <p>Your IdP must send: <code className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px]">Authorization: Bearer {`{token}`}</code></p>
          </Step>
          <Step num={3} icon={Users} title="Supported SCIM Operations">
            <div className="grid grid-cols-1 gap-1">
              <p><strong>POST</strong> — Create user</p>
              <p><strong>GET</strong> — Retrieve user (by ID or list all)</p>
              <p><strong>PUT</strong> — Full update</p>
              <p><strong>PATCH</strong> — Partial update</p>
              <p><strong>DELETE</strong> — Deactivate user</p>
            </div>
          </Step>
          <Step num={4} icon={Lock} title="Enforce SSO Platform-Wide">
            <p>After testing, toggle <strong>Require SSO</strong> above to hide password login.</p>
            <p>Toggle <strong>Require MFA</strong> to block access until MFA is enrolled.</p>
          </Step>
        </TabsContent>
      </Tabs>
    </div>
  );
}