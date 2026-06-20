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
  Settings,
  ShieldCheck,
  FileSearch,
  Brain,
  Play,
  FileSpreadsheet,
  FileDown,
  History,
  ShieldAlert,
  GraduationCap,
  Calendar,
  Bell
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const navItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Frameworks", path: "/frameworks", icon: Shield },
  { label: "Controls", path: "/controls", icon: FileCheck },
  { label: "Risks", path: "/risks", icon: AlertTriangle },
  { label: "Policies", path: "/policies", icon: FileText },
  { label: "Evidence", path: "/evidence", icon: Paperclip },
  { label: "Audits", path: "/audits", icon: ClipboardList },
  { label: "Vendors", path: "/vendors", icon: Building2 },
  { label: "Tasks", path: "/tasks", icon: CheckSquare },
  { label: "Gap Analysis", path: "/gap-analysis", icon: FileSearch },
  { label: "AI Auditor", path: "/ai-auditor", icon: Brain },
  { label: "Compliance Runs", path: "/compliance-runs", icon: Play },
  { label: "ROPA", path: "/ropa", icon: FileSpreadsheet },
  { label: "Reports", path: "/reports", icon: FileDown },
  { label: "Audit Trail", path: "/audit-trail", icon: History },
  { label: "Incidents", path: "/incidents", icon: ShieldAlert },
  { label: "Training", path: "/training", icon: GraduationCap },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Security", path: "/security", icon: ShieldCheck },
  { label: "Tenants", path: "/tenant-admin", icon: Building2 },
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
            ComplianceOS
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
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