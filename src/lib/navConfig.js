import {
  LayoutDashboard, Shield, FileCheck, AlertTriangle, FileText, Paperclip,
  ClipboardList, Building2, CheckSquare, ChevronLeft, ChevronRight, LogOut,
  ShieldCheck, FileSearch, Brain, Play, FileSpreadsheet, FileDown, BarChart3,
  History, ShieldAlert, GraduationCap, Calendar, Bell, Users, Copy, SlidersHorizontal,
  Target, Upload, Send, Globe, Users2, MapPin, Zap, ListChecks, BellRing,
  PieChart, Radar, Landmark, BarChart2, Network, GitCompare, Sparkles, CreditCard
} from "lucide-react";

// Roles: admin, compliance_officer, risk_manager, auditor, user
// Each nav item declares which roles may see/access it. admin sees everything.
export const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
      { label: "Posture Dashboard", path: "/posture", icon: BarChart3, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Compliance",
    items: [
      { label: "Frameworks", path: "/frameworks", icon: Shield, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Controls", path: "/controls", icon: FileCheck, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Gap Analysis", path: "/gap-analysis", icon: FileSearch, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Framework Map", path: "/framework-map", icon: Network, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "SADC Frameworks", path: "/sadc-frameworks", icon: MapPin, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Checklists", path: "/audit-checklists", icon: ListChecks, roles: ["admin", "compliance_officer", "auditor"] },
    ]
  },
  {
    label: "Risk",
    items: [
      { label: "Risk Register", path: "/risks", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Risk Heatmap", path: "/risk-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Appetite Heatmap", path: "/risk-appetite-heatmap", icon: Target, roles: ["admin", "compliance_officer", "risk_manager"] },
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
      { label: "Training", path: "/training", icon: GraduationCap, roles: ["admin", "compliance_officer", "risk_manager", "auditor", "user"] },
    ]
  },
  {
    label: "Vendors & Third Parties",
    items: [
      { label: "Vendors", path: "/vendors", icon: Building2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Vendor Assessments", path: "/vendor-assessments", icon: ClipboardList, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
    ]
  },
  {
    label: "Privacy & Governance",
    items: [
      { label: "ROPA", path: "/ropa", icon: FileSpreadsheet, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Audits", path: "/audits", icon: Landmark, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "Audit Findings", path: "/audit-findings", icon: AlertTriangle, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Audit Trail", path: "/audit-trail", icon: History, roles: ["admin", "compliance_officer", "auditor"] },
      { label: "People Compliance", path: "/people", icon: Users2, roles: ["admin", "compliance_officer", "auditor"] },
    ]
  },
  {
    label: "Reporting",
    items: [
      { label: "Mgmt Dashboard", path: "/management-dashboard", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Security Posture", path: "/security-posture", icon: Radar, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Reports", path: "/reports", icon: FileDown, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Mgmt Reports", path: "/management-reports", icon: BarChart2, roles: ["admin", "compliance_officer", "risk_manager", "auditor"] },
      { label: "Scheduled Reports", path: "/scheduled-reports", icon: Send, roles: ["admin", "compliance_officer", "auditor"] },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Trust Center", path: "/trust-center-settings", icon: Globe, roles: ["admin", "compliance_officer"] },
      { label: "Security", path: "/security", icon: ShieldCheck, roles: ["admin"] },
      { label: "Users", path: "/users", icon: Users, roles: ["admin"] },
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