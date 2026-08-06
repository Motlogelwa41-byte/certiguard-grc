import {
  LayoutDashboard, Shield, FileCheck, AlertTriangle, FileText, Paperclip,
  ClipboardList, Building2, CheckSquare, ChevronLeft, ChevronRight, LogOut,
  ShieldCheck, FileSearch, Brain, Play, FileSpreadsheet, FileDown, BarChart3, LineChart,
  History, ShieldAlert, GraduationCap, Calendar, Bell, Users, Copy, SlidersHorizontal,
  Target, Upload, Send, Globe, Users2, MapPin, Zap, ListChecks, BellRing,
  PieChart,   Radar, Landmark, BarChart2, Network, GitCompare, Sparkles, CreditCard, Gauge, Info, ScrollText, Activity, Factory, Plug, UserCheck, Wand2, KeyRound, Bug, Library, Presentation, TrendingDown, CalendarCheck, Rocket, ClipboardCheck,   FlaskRound, Award, FileQuestion, FlaskConical, Lock, Calculator, Server, BookOpen, Settings, Code, Cloud, Webhook, Leaf, Trophy, TestTube, FileBadge, Gavel, Fingerprint, Languages, FileArchive, DollarSign, Palette,   ShieldX, Siren, ScanLine, Laptop, Eye, Atom, Smartphone, Star
} from "lucide-react";
// NOTE: ClipboardList imported above is reused for the UAT checklist item below.

// Roles: admin, compliance_officer, risk_manager, auditor, user
// Each nav item declares which roles may see/access it. admin sees everything.
export const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator", "user"] },
      { label: "24/7 Protection", path: "/protection-center", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator", "user"] },
      { label: "About CertiGuard", path: "/about", icon: Info, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Architecture", path: "/architecture", icon: Server, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Posture Dashboard", path: "/posture", icon: BarChart3, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "GRC Education", path: "/grc-education", icon: Gauge, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "User Guide", path: "/user-guide", icon: BookOpen, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Maturity Dashboard", path: "/maturity-dashboard", icon: LineChart, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Executive Briefing", path: "/executive-briefing", icon: Presentation, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor"] },
    ]
  },
  {
    label: "Integrations",
    items: [
      { label: "Setup Wizard", path: "/onboarding", icon: Wand2, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Guided Onboarding", path: "/guided-onboarding", icon: Rocket, roles: ["admin", "compliance_officer"] },
      { label: "Connections", path: "/connections", icon: Plug, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Compliance",
    items: [
      { label: "Frameworks", path: "/frameworks", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator"] },
      { label: "Controls", path: "/controls", icon: FileCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator"] },
      { label: "Gap Analysis", path: "/gap-analysis", icon: FileSearch, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Map", path: "/framework-map", icon: Network, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Progress", path: "/framework-progress", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Control Libraries", path: "/control-libraries", icon: Library, roles: ["admin", "compliance_officer"] },
      { label: "SADC Frameworks", path: "/sadc-frameworks", icon: MapPin, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Regulatory Changes", path: "/regulatory-changes", icon: ScrollText, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Checklists", path: "/audit-checklists", icon: ListChecks, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Control Monitoring", path: "/control-monitoring", icon: Activity, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Control Tests", path: "/control-tests", icon: FlaskRound, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Automated Test Library", path: "/automated-tests", icon: Library, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Test Library", path: "/control-test-library", icon: Library, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Auditor Portal", path: "/auditor-portal", icon: ShieldCheck, roles: ["admin", "compliance_officer", "external_auditor", "auditor"] },
      { label: "Auditor Scope", path: "/auditor-scope", icon: UserCheck, roles: ["admin", "compliance_officer"] },
      { label: "Certifications", path: "/certifications", icon: Award, roles: ["admin", "compliance_officer", "auditor", "external_auditor"] },
      { label: "Questionnaires", path: "/questionnaires", icon: FileQuestion, roles: ["admin", "compliance_officer"] },
      { label: "Penetration Tests", path: "/pen-tests", icon: FlaskConical, roles: ["admin", "compliance_officer", "auditor", "external_auditor"] },
      { label: "Privacy Requests", path: "/privacy-requests", icon: Lock, roles: ["admin", "compliance_officer"] },
      { label: "Risk Quantification", path: "/risk-quantification", icon: Calculator, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "FAIR Benchmarks", path: "/fair-benchmarks", icon: DollarSign, roles: ["admin", "compliance_officer", "risk_manager", "executive"] },
      { label: "ESG Reporting", path: "/esg-reporting", icon: Leaf, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "ESG Benchmarking", path: "/esg-benchmarking", icon: Leaf, roles: ["admin", "compliance_officer", "executive"] },
    ]
  },
  {
    label: "Risk",
    items: [
      { label: "Risk Register", path: "/risks", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator"] },
      { label: "Risk Heatmap", path: "/risk-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Appetite Heatmap", path: "/risk-appetite-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Exec Risk Summary", path: "/executive-risk-summary", icon: TrendingDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Cross-Map", path: "/risk-framework-crossmap", icon: GitCompare, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "KPI / KRI Tracker", path: "/kpi-kri", icon: Target, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Monte Carlo Forecast", path: "/monte-carlo-forecast", icon: Activity, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Cross-Border Matrix", path: "/cross-border-matrix", icon: Globe, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Cost of Compliance", path: "/cost-of-compliance", icon: DollarSign, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Cross-Org Rollup", path: "/cross-org-risk", icon: Building2, roles: ["admin", "risk_manager"] },
    ]
  },
  {
    label: "Policies & Evidence",
    items: [
      { label: "Policies", path: "/policies", icon: FileText, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "My Policies", path: "/my-policies", icon: FileText, roles: ["user", "hr", "department_head"] },
      { label: "Policy Templates", path: "/policy-templates", icon: Copy, roles: ["admin", "compliance_officer"] },
      { label: "Policy Exceptions", path: "/policy-exceptions", icon: ShieldX, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Evidence", path: "/evidence", icon: Paperclip, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Bulk Evidence", path: "/bulk-evidence", icon: Upload, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Evidence Reminders", path: "/evidence-reminders", icon: BellRing, roles: ["admin", "compliance_officer", "auditor"] },
    ]
  },
  {
    label: "AI & Automation",
    items: [
      { label: "AI Assistant", path: "/ai-assistant", icon: Sparkles, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "AI Hub", path: "/ai-hub", icon: Radar, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "AI Auditor", path: "/ai-auditor", icon: Brain, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Testing Agent", path: "/testing-agent", icon: TestTube, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "AI Control Mapper", path: "/ai-control-mapper", icon: Zap, roles: ["admin", "compliance_officer"] },
      { label: "AI Cross-Framework Mapping", path: "/ai-cross-mapping", icon: Sparkles, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "AI Gap Analysis", path: "/ai-gap-analysis", icon: Brain, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Compliance Runs", path: "/compliance-runs", icon: Play, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Regulatory Localization", path: "/regulatory-localization", icon: Languages, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Operations",
    items: [
      { label: "Tasks", path: "/tasks", icon: CheckSquare, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Task Reminders", path: "/task-reminders", icon: Bell, roles: ["admin", "compliance_officer"] },
      { label: "Calendar", path: "/calendar", icon: Calendar, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Incidents", path: "/incidents", icon: ShieldAlert, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Incident Command", path: "/incident-command", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "IR Playbooks", path: "/ir-playbooks", icon: Siren, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "SOAR Playbooks", path: "/soar-playbooks", icon: Zap, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Security Findings", path: "/vulnerabilities", icon: Bug, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Cloud Posture (CSPM)", path: "/cloud-posture", icon: Cloud, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Real-Time CSPM Scan", path: "/realtime-cspm", icon: ScanLine, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "DevSecOps Scanner", path: "/devsecops", icon: ScanLine, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "SIEM Webhooks", path: "/siem-webhooks", icon: Webhook, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "DLP Monitor", path: "/dlp-monitor", icon: Eye, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "EDR / XDR", path: "/edr-dashboard", icon: Radar, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "IT Asset Management", path: "/itam", icon: Laptop, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "PQC Readiness", path: "/pqc-readiness", icon: Atom, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "API & Mobile Security", path: "/api-security", icon: Smartphone, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Access Recertification", path: "/access-recertification", icon: UserCheck, roles: ["admin"] },
      { label: "Training", path: "/training", icon: GraduationCap, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Training Gates", path: "/training-gates", icon: Lock, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Calendar Sync", path: "/calendar-sync", icon: CalendarCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
    ]
  },
  {
    label: "Vendors & Third Parties",
    items: [
      { label: "Vendors", path: "/vendors", icon: Building2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Contracts (CLM)", path: "/contracts", icon: FileText, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Assessments", path: "/vendor-assessments", icon: ClipboardList, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Scorecard", path: "/vendor-scorecard", icon: Gauge, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Risk Exchange", path: "/vendor-risk-exchange", icon: Star, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "AI Contract Scanner", path: "/ai-contract-scanner", icon: FileSearch, roles: ["admin", "compliance_officer", "risk_manager"] },
    ]
  },
  {
    label: "Privacy & Governance",
    items: [
      { label: "ROPA", path: "/ropa", icon: FileSpreadsheet, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "DPIA", path: "/dpia", icon: ShieldAlert, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Data Flow Mapping", path: "/privacy-data-mapping", icon: Network, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Audits", path: "/audits", icon: Landmark, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Audit Findings", path: "/audit-findings", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Trail", path: "/audit-trail", icon: History, roles: ["admin", "compliance_officer", "auditor", "external_auditor", "regulator"] },
      { label: "Activity Log", path: "/activity-log", icon: Activity, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "People Compliance", path: "/people", icon: Users2, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "HRIS Directory", path: "/hris-directory", icon: Users, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Board Resolutions", path: "/board-resolutions", icon: Gavel, roles: ["admin", "compliance_officer"] },
      { label: "Zero-Trust Ledger", path: "/zero-trust-ledger", icon: Fingerprint, roles: ["admin", "compliance_officer", "risk_manager"] },
    ]
  },
  {
    label: "Reporting",
    items: [
      { label: "Stakeholder Summary", path: "/stakeholder-summary", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Exec Risk Report", path: "/executive-risk-report", icon: LineChart, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Board Report", path: "/board-report", icon: Presentation, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Readiness Report", path: "/audit-readiness-report", icon: ClipboardCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Exec Summary", path: "/executive-summary", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Readiness Report", path: "/compliance-readiness-report", icon: ClipboardCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Mgmt Dashboard", path: "/management-dashboard", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "SADC Exec Dashboard", path: "/sadc-executive-dashboard", icon: Globe, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Industry Dashboard", path: "/industry-dashboard", icon: Factory, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Financial Dashboard", path: "/financial-dashboard", icon: Landmark, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Compliance Benchmarking", path: "/compliance-benchmarking", icon: Trophy, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Continuous Compliance Score", path: "/continuous-score", icon: Gauge, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Security Posture", path: "/security-posture", icon: Radar, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Reports", path: "/reports", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator"] },
      { label: "Mgmt Reports", path: "/management-reports", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Scheduled Reports", path: "/scheduled-reports", icon: Send, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Exec Readiness Dashboard", path: "/executive-readiness-dashboard", icon: LineChart, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "One-Click Report", path: "/one-click-report", icon: FileText, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "AI Board Pack", path: "/board-pack-generator", icon: Presentation, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Certification Dossier", path: "/certification-dossier", icon: FileArchive, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Secure Evidence Pack", path: "/secure-evidence-pack", icon: FileArchive, roles: ["admin", "compliance_officer", "auditor", "external_auditor"] },
      { label: "Auditor Export", path: "/auditor-export", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Executive Report", path: "/executive-report", icon: FileText, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Trust Center", path: "/trust-center-settings", icon: Globe, roles: ["admin", "compliance_officer"] },
      { label: "Security", path: "/security", icon: ShieldCheck, roles: ["admin"] },
      { label: "Platform Governance", path: "/platform-governance", icon: ShieldCheck, roles: ["admin"] },
      { label: "Users", path: "/users", icon: Users, roles: ["admin"] },
      { label: "Performance Monitoring", path: "/performance-monitoring", icon: Activity, roles: ["admin", "compliance_officer"] },
      { label: "HA/DR Documentation", path: "/hadr-documentation", icon: Server, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Security Command Center", path: "/security-command-center", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Tenant Isolation Monitor", path: "/tenant-isolation", icon: ShieldCheck, roles: ["admin"] },
      { label: "UAT Checklist", path: "/testing-checklist", icon: ClipboardList, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "SSO & Directory", path: "/sso", icon: KeyRound, roles: ["admin"] },
      { label: "Data Privacy", path: "/data-privacy", icon: Lock, roles: ["admin", "compliance_officer"] },
      { label: "API Docs", path: "/api-docs", icon: Code, roles: ["admin", "compliance_officer"] },
      { label: "Business Units", path: "/business-units", icon: Building2, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "BCDR Tracker", path: "/bcdr-tracker", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Tabletop Simulator", path: "/tabletop-simulator", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Statutory Calendar", path: "/statutory-calendar", icon: FileBadge, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Whistleblower Cases", path: "/whistleblower-cases", icon: Shield, roles: ["admin", "compliance_officer"] },
      { label: "COI & Insider Threat", path: "/coi-portal", icon: ShieldAlert, roles: ["admin", "compliance_officer", "risk_manager", "user"] },
      { label: "White-Label Branding", path: "/white-label", icon: Palette, roles: ["admin"] },
      { label: "Tenant Settings", path: "/tenant-settings", icon: Settings, roles: ["admin"] },
      { label: "Tenants", path: "/tenant-admin", icon: PieChart, roles: ["admin"] },
      { label: "Billing", path: "/billing", icon: CreditCard, roles: ["admin"] },
      { label: "Policy Acknowledgments", path: "/policy-acknowledgments", icon: FileCheck, roles: ["admin", "compliance_officer"] },
      { label: "Notifications", path: "/notifications", icon: Bell, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Notif. Preferences", path: "/notification-preferences", icon: SlidersHorizontal, roles: ["admin", "compliance_officer", "risk_manager"] },
    ]
  },
];

export const ALL_ROLES = ["admin", "compliance_officer", "risk_manager", "auditor", "external_auditor", "regulator", "hr", "department_head", "user"];

function routeMatches(pathname, route) {
  if (route === "/") return pathname === "/";
  return pathname === route || pathname.startsWith(route + "/");
}

// Returns the nav item whose route best matches the pathname (longest prefix), or null.
export function matchingRoute(pathname) {
  let best = null;
  for (const section of navSections) {
    for (const item of section.items) {
      if (routeMatches(pathname, item.path)) {
        if (!best || item.path.length > best.path.length) best = item;
      }
    }
  }
  return best;
}

export function canAccessRoute(role, pathname) {
  const item = matchingRoute(pathname);
  if (!item) return true; // public or unlisted route — allow (auth handled elsewhere)
  if (!item.roles) return true;
  return item.roles.includes(role);
}

export function filterNavSections(role) {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}