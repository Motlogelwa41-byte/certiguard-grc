import {
  LayoutDashboard, Shield, FileCheck, AlertTriangle, FileText, Paperclip,
  ClipboardList, Building2, CheckSquare, ChevronLeft, ChevronRight, LogOut,
  ShieldCheck, FileSearch, Brain, Play, FileSpreadsheet, FileDown, BarChart3, LineChart,
  History, ShieldAlert, GraduationCap, Calendar, Bell, Users, Copy, SlidersHorizontal,
  Target, Upload, Send, Globe, Users2, MapPin, Zap, ListChecks, BellRing,
  PieChart,   Radar, Landmark, BarChart2, Network, GitCompare, Sparkles, CreditCard, Gauge, Info, ScrollText, Activity, Factory, Plug, UserCheck, Wand2, KeyRound, Bug, Library, Presentation, TrendingDown, CalendarCheck, Rocket, ClipboardCheck, FlaskRound, Award, FileQuestion, FlaskConical, Lock, Calculator, Server, BookOpen
} from "lucide-react";
// NOTE: ClipboardList imported above is reused for the UAT checklist item below.

// Roles: admin, compliance_officer, risk_manager, auditor, user
// Each nav item declares which roles may see/access it. admin sees everything.
export const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "About CertiGuard", path: "/about", icon: Info, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Architecture", path: "/architecture", icon: Server, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Posture Dashboard", path: "/posture", icon: BarChart3, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "GRC Education", path: "/grc-education", icon: Gauge, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "User Guide", path: "/user-guide", icon: BookOpen, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Maturity Dashboard", path: "/maturity-dashboard", icon: LineChart, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
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
      { label: "Frameworks", path: "/frameworks", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Controls", path: "/controls", icon: FileCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Gap Analysis", path: "/gap-analysis", icon: FileSearch, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Map", path: "/framework-map", icon: Network, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Progress", path: "/framework-progress", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Control Libraries", path: "/control-libraries", icon: Library, roles: ["admin", "compliance_officer"] },
      { label: "SADC Frameworks", path: "/sadc-frameworks", icon: MapPin, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Regulatory Changes", path: "/regulatory-changes", icon: ScrollText, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Checklists", path: "/audit-checklists", icon: ListChecks, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Control Monitoring", path: "/control-monitoring", icon: Activity, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Control Tests", path: "/control-tests", icon: FlaskRound, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Auditor Portal", path: "/auditor-portal", icon: ShieldCheck, roles: ["admin", "compliance_officer", "external_auditor", "auditor"] },
      { label: "Auditor Scope", path: "/auditor-scope", icon: UserCheck, roles: ["admin", "compliance_officer"] },
      { label: "Certifications", path: "/certifications", icon: Award, roles: ["admin", "compliance_officer", "auditor", "external_auditor"] },
      { label: "Questionnaires", path: "/questionnaires", icon: FileQuestion, roles: ["admin", "compliance_officer"] },
      { label: "Penetration Tests", path: "/pen-tests", icon: FlaskConical, roles: ["admin", "compliance_officer", "auditor", "external_auditor"] },
      { label: "Privacy Requests", path: "/privacy-requests", icon: Lock, roles: ["admin", "compliance_officer"] },
      { label: "Risk Quantification", path: "/risk-quantification", icon: Calculator, roles: ["admin", "compliance_officer", "risk_manager"] },
    ]
  },
  {
    label: "Risk",
    items: [
      { label: "Risk Register", path: "/risks", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Risk Heatmap", path: "/risk-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Appetite Heatmap", path: "/risk-appetite-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager"] },
      { label: "Exec Risk Summary", path: "/executive-risk-summary", icon: TrendingDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Cross-Map", path: "/risk-framework-crossmap", icon: GitCompare, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Policies & Evidence",
    items: [
      { label: "Policies", path: "/policies", icon: FileText, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Policy Templates", path: "/policy-templates", icon: Copy, roles: ["admin", "compliance_officer"] },
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
      { label: "AI Control Mapper", path: "/ai-control-mapper", icon: Zap, roles: ["admin", "compliance_officer"] },
      { label: "Compliance Runs", path: "/compliance-runs", icon: Play, roles: ["admin", "compliance_officer", "auditor"] },
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
      { label: "Security Findings", path: "/vulnerabilities", icon: Bug, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Access Recertification", path: "/access-recertification", icon: UserCheck, roles: ["admin"] },
      { label: "Training", path: "/training", icon: GraduationCap, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Calendar Sync", path: "/calendar-sync", icon: CalendarCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
    ]
  },
  {
    label: "Vendors & Third Parties",
    items: [
      { label: "Vendors", path: "/vendors", icon: Building2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Assessments", path: "/vendor-assessments", icon: ClipboardList, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Scorecard", path: "/vendor-scorecard", icon: Gauge, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Privacy & Governance",
    items: [
      { label: "ROPA", path: "/ropa", icon: FileSpreadsheet, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "DPIA", path: "/dpia", icon: ShieldAlert, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Audits", path: "/audits", icon: Landmark, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Audit Findings", path: "/audit-findings", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Trail", path: "/audit-trail", icon: History, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Activity Log", path: "/activity-log", icon: Activity, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "People Compliance", path: "/people", icon: Users2, roles: ["admin", "compliance_officer", "auditor"] },
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
      { label: "Security Posture", path: "/security-posture", icon: Radar, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Reports", path: "/reports", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Mgmt Reports", path: "/management-reports", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Scheduled Reports", path: "/scheduled-reports", icon: Send, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Exec Readiness Dashboard", path: "/executive-readiness-dashboard", icon: LineChart, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Auditor Export", path: "/auditor-export", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Trust Center", path: "/trust-center-settings", icon: Globe, roles: ["admin", "compliance_officer"] },
      { label: "Security", path: "/security", icon: ShieldCheck, roles: ["admin"] },
      { label: "Platform Governance", path: "/platform-governance", icon: ShieldCheck, roles: ["admin"] },
      { label: "Users", path: "/users", icon: Users, roles: ["admin"] },
      { label: "Security Command Center", path: "/security-command-center", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "UAT Checklist", path: "/testing-checklist", icon: ClipboardList, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "SSO & Directory", path: "/sso", icon: KeyRound, roles: ["admin"] },
      { label: "Data Privacy", path: "/data-privacy", icon: Lock, roles: ["admin", "compliance_officer"] },
      { label: "Tenants", path: "/tenant-admin", icon: PieChart, roles: ["admin"] },
      { label: "Billing", path: "/billing", icon: CreditCard, roles: ["admin"] },
      { label: "Policy Acknowledgments", path: "/policy-acknowledgments", icon: FileCheck, roles: ["admin", "compliance_officer"] },
      { label: "Notifications", path: "/notifications", icon: Bell, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Notif. Preferences", path: "/notification-preferences", icon: SlidersHorizontal, roles: ["admin", "compliance_officer", "risk_manager"] },
    ]
  },
];

export const ALL_ROLES = ["admin", "compliance_officer", "risk_manager", "auditor", "user"];

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