// Catalog of source-system integrations for the Connections hub.
// `connectorType` = base44 integration_type when backed by a platform OAuth connector.
import {
  Cloud, Github, KeyRound, HardDrive, Activity, Users, Smartphone, MessageSquare, Shield, Database, Server, Cpu, Rocket
} from "lucide-react";

export const CATEGORIES = [
  { id: "cloud", label: "Cloud Infrastructure", icon: Cloud },
  { id: "identity", label: "Identity & Access", icon: KeyRound },
  { id: "code", label: "Source Code & CI", icon: Github },
  { id: "monitoring", label: "Monitoring & SIEM", icon: Activity },
  { id: "hr", label: "HR & People", icon: Users },
  { id: "device_management", label: "Device Management", icon: Smartphone },
  { id: "collaboration", label: "Collaboration", icon: MessageSquare },
  { id: "security", label: "Security Tools", icon: Shield },
];

export const CATALOG = [
  { service: "aws", label: "Amazon Web Services", category: "cloud", authMethod: "api_key", icon: Cloud, connectorType: null, secretHint: "AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY", description: "IAM access reviews, S3 bucket policies, CloudTrail logs, security hub findings.", frameworks: ["SOC 2","ISO 27001","PCI DSS"] },
  { service: "gcp", label: "Google Cloud Platform", category: "cloud", authMethod: "service_account", icon: Cloud, connectorType: null, secretHint: "GCP_SERVICE_ACCOUNT_JSON", description: "IAM bindings, project inventory, GKE posture, logging configuration.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "azure", label: "Microsoft Azure", category: "cloud", authMethod: "api_key", icon: Cloud, connectorType: null, secretHint: "AZURE_TENANT_ID + AZURE_CLIENT_*", description: "Entra ID users, subscription posture, Defender findings, activity logs.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "github", label: "GitHub", category: "code", authMethod: "oauth", icon: Github, connectorType: "github", description: "Repository inventory, branch protection, code review enforcement, MFA status.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "google_workspace", label: "Google Workspace", category: "identity", authMethod: "oauth", icon: HardDrive, connectorType: "googledrive", description: "User accounts, MFA enforcement, admin roles, Drive sharing settings.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "google_drive", label: "Google Drive", category: "collaboration", authMethod: "oauth", icon: HardDrive, connectorType: "googledrive", description: "File inventory, sharing exposure, data residency, document evidence.", frameworks: ["SOC 2","ISO 27001","POPIA"] },
  { service: "datadog", label: "Datadog", category: "monitoring", authMethod: "api_key", icon: Activity, connectorType: null, secretHint: "DATADOG_API_KEY + DATADOG_APP_KEY", description: "Infrastructure monitors, log retention, audit trail, alert policies.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "bamboohr", label: "BambooHR", category: "hr", authMethod: "oauth", icon: Users, connectorType: "bamboohr", description: "Employee directory, onboarding/offboarding, role-based access provisioning.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "jamf", label: "Jamf Pro", category: "device_management", authMethod: "api_key", icon: Smartphone, connectorType: null, secretHint: "JAMF_API_TOKEN + JAMF_URL", description: "Device encryption, OS patch levels, MDM compliance posture.", frameworks: ["SOC 2","ISO 27001","HIPAA"] },
  { service: "slack", label: "Slack", category: "collaboration", authMethod: "bot_token", icon: MessageSquare, connectorType: "slackbot", description: "Workspace audit logs, channel inventory, MFA/SSO settings.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "crowdstrike", label: "CrowdStrike", category: "security", authMethod: "api_key", icon: Shield, connectorType: null, secretHint: "CROWDSTRIKE_CLIENT_ID + CROWDSTRIKE_CLIENT_SECRET", description: "Endpoint detection, sensor health, Spotlight vulnerability posture.", frameworks: ["SOC 2","ISO 27001","NIST CSF"] },
  { service: "defender", label: "Microsoft Defender for Endpoint", category: "security", authMethod: "api_key", icon: Shield, connectorType: null, secretHint: "DEFENDER_APP_ID + DEFENDER_TENANT_ID + DEFENDER_CLIENT_SECRET", description: "Endpoint alerts, vulnerability findings, device compliance posture. Free with M365 E5 — cost-effective EDR default.", frameworks: ["SOC 2","ISO 27001","NIST CSF"] },
  { service: "gitlab", label: "GitLab", category: "code", authMethod: "api_token", icon: Github, connectorType: "gitlab", description: "Merge request approvals, pipeline scans, access logs, branch protection.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "okta", label: "Okta", category: "identity", authMethod: "api_token", icon: KeyRound, connectorType: null, secretHint: "OKTA_API_TOKEN + OKTA_DOMAIN", description: "User lifecycle, MFA enrollment, app assignments, group memberships.", frameworks: ["SOC 2","ISO 27001","NIST CSF"] },
  { service: "microsoft_365", label: "Microsoft 365 / Entra ID", category: "identity", authMethod: "oauth", icon: KeyRound, connectorType: null, secretHint: "AZURE_CLIENT_ID + AZURE_CLIENT_SECRET + AZURE_TENANT_ID", description: "Conditional access, MFA registration, sign-in logs, audit logs.", frameworks: ["SOC 2","ISO 27001","NIST CSF"] },
  { service: "cloudflare", label: "Cloudflare", category: "security", authMethod: "api_token", icon: Shield, connectorType: null, secretHint: "CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID", description: "WAF rule sets, SSL/TLS config, DNS records, access policies.", frameworks: ["SOC 2","ISO 27001","PCI DSS"] },
  { service: "pagerduty", label: "PagerDuty", category: "monitoring", authMethod: "api_token", icon: Activity, connectorType: null, secretHint: "PAGERDUTY_API_TOKEN", description: "On-call schedules, incident history, escalation policies, response times.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "1password", label: "1Password", category: "security", authMethod: "api_token", icon: KeyRound, connectorType: null, secretHint: "ONEPASSWORD_API_TOKEN + ONEPASSWORD_VAULT_ID", description: "Vault access logs, password policy config, item usage, team memberships.", frameworks: ["SOC 2","ISO 27001"] },
  { service: "vercel", label: "Vercel", category: "code", authMethod: "api_token", icon: Rocket, connectorType: null, secretHint: "VERCEL_ACCESS_TOKEN", description: "Deployment logs, environment config, team access, project settings.", frameworks: ["SOC 2"] },
];

export const catalogEntry = (service) => CATALOG.find((c) => c.service === service) || null;