import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Shield,
  FileCheck,
  AlertTriangle,
  FileText,
  Paperclip,
  ClipboardList,
  Building2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  FileSearch,
  Brain,
  Play,
  FileSpreadsheet,
  FileDown,
  BarChart3,
  History,
  ShieldAlert,
  GraduationCap,
  Calendar,
  Bell,
  Users,
  Copy,
  SlidersHorizontal,
  Target,
  Upload,
  Send,
  Globe,
  Users2,
  MapPin,
  Zap,
  ListChecks,
  BellRing,
  PieChart,
  Radar,
  Landmark,
  BarChart2,
  Network,
  GitCompare,
  Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navSections = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: LayoutDashboard },
      { label: "Posture Dashboard", path: "/posture", icon: BarChart3 },
    ]
  },
  {
    label: "Compliance",
    items: [
      { label: "Frameworks", path: "/frameworks", icon: Shield },
      { label: "Controls", path: "/controls", icon: FileCheck },
      { label: "Gap Analysis", path: "/gap-analysis", icon: FileSearch },
      { label: "Framework Map", path: "/framework-map", icon: Network },
      { label: "SADC Frameworks", path: "/sadc-frameworks", icon: MapPin },
      { label: "Audit Checklists", path: "/audit-checklists", icon: ListChecks },
    ]
  },
  {
    label: "Risk",
    items: [
      { label: "Risk Register", path: "/risks", icon: AlertTriangle },
      { label: "Risk Heatmap", path: "/risk-heatmap", icon: Target },
      { label: "Appetite Heatmap", path: "/risk-appetite-heatmap", icon: Target },
      { label: "Framework Cross-Map", path: "/risk-framework-crossmap", icon: GitCompare },
    ]
  },
  {
    label: "Policies & Evidence",
    items: [
      { label: "Policies", path: "/policies", icon: FileText },
      { label: "Policy Templates", path: "/policy-templates", icon: Copy },
      { label: "Evidence", path: "/evidence", icon: Paperclip },
      { label: "Bulk Evidence", path: "/bulk-evidence", icon: Upload },
      { label: "Evidence Reminders", path: "/evidence-reminders", icon: BellRing },
    ]
  },
  {
    label: "AI & Automation",
    items: [
      { label: "AI Assistant", path: "/ai-assistant", icon: Sparkles },
      { label: "AI Hub", path: "/ai-hub", icon: Radar },
      { label: "AI Auditor", path: "/ai-auditor", icon: Brain },
      { label: "AI Control Mapper", path: "/ai-control-mapper", icon: Zap },
      { label: "Compliance Runs", path: "/compliance-runs", icon: Play },
    ]
  },
  {
    label: "Operations",
    items: [
      { label: "Tasks", path: "/tasks", icon: CheckSquare },
      { label: "Task Reminders", path: "/task-reminders", icon: Bell },
      { label: "Calendar", path: "/calendar", icon: Calendar },
      { label: "Incidents", path: "/incidents", icon: ShieldAlert },
      { label: "Incident Command", path: "/incident-command", icon: AlertTriangle },
      { label: "Training", path: "/training", icon: GraduationCap },
    ]
  },
  {
    label: "Vendors & Third Parties",
    items: [
      { label: "Vendors", path: "/vendors", icon: Building2 },
      { label: "Vendor Assessments", path: "/vendor-assessments", icon: ClipboardList },
    ]
  },
  {
    label: "Privacy & Governance",
    items: [
      { label: "ROPA", path: "/ropa", icon: FileSpreadsheet },
      { label: "Audits", path: "/audits", icon: Landmark },
      { label: "Audit Findings", path: "/audit-findings", icon: AlertTriangle },
      { label: "Audit Trail", path: "/audit-trail", icon: History },
      { label: "People Compliance", path: "/people", icon: Users2 },
    ]
  },
  {
    label: "Reporting",
    items: [
      { label: "Mgmt Dashboard", path: "/management-dashboard", icon: BarChart2 },
      { label: "Security Posture", path: "/security-posture", icon: Radar },
      { label: "Reports", path: "/reports", icon: FileDown },
      { label: "Mgmt Reports", path: "/management-reports", icon: BarChart2 },
      { label: "Scheduled Reports", path: "/scheduled-reports", icon: Send },
    ]
  },
  {
    label: "Settings",
    items: [
      { label: "Trust Center", path: "/trust-center-settings", icon: Globe },
      { label: "Security", path: "/security", icon: ShieldCheck },
      { label: "Users", path: "/users", icon: Users },
      { label: "Tenants", path: "/tenant-admin", icon: PieChart },
      { label: "Policy Acknowledgments", path: "/policy-acknowledgments", icon: FileCheck },
      { label: "Notifications", path: "/notifications", icon: Bell },
      { label: "Notif. Preferences", path: "/notification-preferences", icon: SlidersHorizontal },
    ]
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-heading font-bold text-base tracking-tight truncate">
            CertiGuard GRC
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/30 px-2.5 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-primary" : ""}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={() => base44.auth.logout("/")}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}