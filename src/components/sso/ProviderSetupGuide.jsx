import React, { useState } from "react";
import { ChevronDown, ExternalLink, Copy, Check } from "lucide-react";

const GUIDES = {
  azure_ad: {
    label: "Microsoft Entra ID",
    docs: "https://learn.microsoft.com/en-us/entra/identity/app-provisioning/use-scim-to-provision-users-and-groups",
    steps: [
      { step: "Register the app", text: "In Entra ID → Enterprise applications → New application → Non-gallery application. Name it \"CertiGuard GRC\"." },
      { step: "Configure provisioning", text: "Open the app → Provisioning → Set mode to Automatic. Set Tenant URL to your SCIM base URL (e.g. https://api.base44.com/scim/v2)." },
      { step: "Generate secret token", text: "Under Provisioning → Admin Credentials, generate a secret token. Copy it — this is your SCIM bearer token." },
      { step: "Add the token as a secret", text: "Go to Dashboard → Settings → Secrets and add a secret named SCIM_BEARER_TOKEN with the token value. Then enter SCIM_BEARER_TOKEN in the Token secret name field here." },
      { step: "Map attributes", text: "Under Mappings, ensure email, displayName, and active are mapped. Optionally map groups for role-based provisioning." },
      { step: "Enable SAML SSO", text: "Under Single sign-on → SAML, upload metadata. Copy the Login URL into SAML entry point and Metadata URL into SAML metadata URL here." },
    ],
  },
  google_workspace: {
    label: "Google Workspace",
    docs: "https://support.google.com/a/answer/1063680",
    steps: [
      { step: "Enable SCIM", text: "In Google Admin Console → Apps → Web and mobile apps → Add app → Search for SCIM. Configure the SCIM base URL." },
      { step: "Generate credentials", text: "Under the app's Auto-provisioning settings, generate an OAuth bearer token. Copy it." },
      { step: "Add the token as a secret", text: "Go to Dashboard → Settings → Secrets and add a secret named SCIM_BEARER_TOKEN with the token value. Enter SCIM_BEARER_TOKEN in the Token secret name field here." },
      { step: "Map user attributes", text: "Ensure Primary email, First name, Last name, and Status are mapped in the attribute mapping section." },
      { step: "Enable SSO", text: "In Google Admin → Security → Set up single sign-on. Copy the SSO URL and Entity ID into the SAML fields here." },
    ],
  },
  onelogin: {
    label: "OneLogin",
    docs: "https://onelogin.service-now.com/kb_view_customer.do?sysparm_article=KB001037871",
    steps: [
      { step: "Add SCIM app", text: "In OneLogin → Apps → Add Apps → search for SCIM. Configure the SCIM base URL." },
      { step: "Generate API credentials", text: "Under the app's API Connection, generate the Client ID and Client Secret (or bearer token)." },
      { step: "Add the token as a secret", text: "Go to Dashboard → Settings → Secrets and add SCIM_BEARER_TOKEN with the token value. Enter SCIM_BEARER_TOKEN in the Token secret name field here." },
      { step: "Map parameters", text: "Ensure email, name, and status are mapped under Parameters." },
      { step: "Enable SAML", text: "Under SSO, copy the IdP URL and SAML 2.0 Endpoint into the SAML fields here." },
    ],
  },
  jumpcloud: {
    label: "JumpCloud",
    docs: "https://support.jumpcloud.com/s/article/SCIM-Provisioning",
    steps: [
      { step: "Create SCIM integration", text: "In JumpCloud → SSO → Applications → search for SCIM. Enter the SCIM base URL." },
      { step: "Generate API token", text: "Under the app's Connection settings, generate the SCIM bearer token." },
      { step: "Add the token as a secret", text: "Go to Dashboard → Settings → Secrets and add SCIM_BEARER_TOKEN with the token value. Enter SCIM_BEARER_TOKEN in the Token secret name field here." },
      { step: "Map attributes", text: "Ensure email, firstName, lastName, and active are mapped under User Attributes." },
      { step: "Enable SSO", text: "Under the SSO tab, copy the IdP URL and SP metadata into the SAML fields here." },
    ],
  },
  other: {
    label: "Generic SCIM 2.0",
    docs: "https://datatracker.ietf.org/doc/html/rfc7644",
    steps: [
      { step: "Provide SCIM endpoint", text: "Enter the SCIM 2.0 base URL for your IdP (ends with /scim/v2 typically)." },
      { step: "Generate bearer token", text: "Create a bearer token on your IdP with read access to /Users." },
      { step: "Add the token as a secret", text: "Go to Dashboard → Settings → Secrets and add SCIM_BEARER_TOKEN with the token value. Enter SCIM_BEARER_TOKEN in the Token secret name field here." },
      { step: "Map attributes", text: "Ensure your IdP provides emails[], displayName, and active in the SCIM user resource." },
      { step: "Optional SAML", text: "If your IdP supports SAML SSO, fill in the SAML entry point and metadata URL fields." },
    ],
  },
};

export default function ProviderSetupGuide({ type }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const guide = GUIDES[type] || GUIDES.other;

  const copySecret = () => {
    navigator.clipboard.writeText("SCIM_BEARER_TOKEN");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-medium text-foreground">
          Setup guide: {guide.label}
        </span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-4 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <a href={guide.docs} target="_blank" rel="noopener noreferrer" className="text-primary underline flex items-center gap-1">
              Official docs <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <ol className="space-y-2.5">
            {guide.steps.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <div>
                  <p className="font-medium text-foreground">{s.step}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{s.text}</p>
                  {s.step.includes("Add the token") && (
                    <button onClick={copySecret} className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy secret name</>}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}