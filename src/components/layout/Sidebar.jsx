import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { navSections, filterNavSections } from "@/lib/navConfig";
import { useRBAC } from "@/lib/useRBAC";
import { logLogout } from "@/lib/authAudit";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [brand, setBrand] = useState({ name: "", logo_url: "" });
  const location = useLocation();
  const { role, isAdmin } = useRBAC();
  const sections = isAdmin ? navSections : filterNavSections(role || "user");

  // Per-section color accents — visual only, no navigation logic changes
  const sectionColors = {
    "Overview": { dot: "bg-blue-500", header: "text-blue-600", icon: "text-blue-500", activeBg: "bg-gradient-to-r from-blue-600 to-blue-500", activeBar: "bg-blue-300", shadow: "shadow-blue-500/25", hover: "hover:bg-blue-50", hoverIcon: "group-hover:text-blue-600" },
    "Regulatory & SADC": { dot: "bg-emerald-500", header: "text-emerald-600", icon: "text-emerald-500", activeBg: "bg-gradient-to-r from-emerald-600 to-emerald-500", activeBar: "bg-emerald-300", shadow: "shadow-emerald-500/25", hover: "hover:bg-emerald-50", hoverIcon: "group-hover:text-emerald-600" },
    "Integrations": { dot: "bg-violet-500", header: "text-violet-600", icon: "text-violet-500", activeBg: "bg-gradient-to-r from-violet-600 to-violet-500", activeBar: "bg-violet-300", shadow: "shadow-violet-500/25", hover: "hover:bg-violet-50", hoverIcon: "group-hover:text-violet-600" },
    "Compliance": { dot: "bg-indigo-500", header: "text-indigo-600", icon: "text-indigo-500", activeBg: "bg-gradient-to-r from-indigo-600 to-indigo-500", activeBar: "bg-indigo-300", shadow: "shadow-indigo-500/25", hover: "hover:bg-indigo-50", hoverIcon: "group-hover:text-indigo-600" },
    "Risk": { dot: "bg-amber-500", header: "text-amber-600", icon: "text-amber-500", activeBg: "bg-gradient-to-r from-amber-500 to-orange-500", activeBar: "bg-amber-300", shadow: "shadow-amber-500/25", hover: "hover:bg-amber-50", hoverIcon: "group-hover:text-amber-600" },
    "Policies & Evidence": { dot: "bg-teal-500", header: "text-teal-600", icon: "text-teal-500", activeBg: "bg-gradient-to-r from-teal-600 to-teal-500", activeBar: "bg-teal-300", shadow: "shadow-teal-500/25", hover: "hover:bg-teal-50", hoverIcon: "group-hover:text-teal-600" },
    "AI & Automation": { dot: "bg-fuchsia-500", header: "text-fuchsia-600", icon: "text-fuchsia-500", activeBg: "bg-gradient-to-r from-fuchsia-600 to-purple-500", activeBar: "bg-fuchsia-300", shadow: "shadow-fuchsia-500/25", hover: "hover:bg-fuchsia-50", hoverIcon: "group-hover:text-fuchsia-600" },
    "Operations": { dot: "bg-rose-500", header: "text-rose-600", icon: "text-rose-500", activeBg: "bg-gradient-to-r from-rose-600 to-rose-500", activeBar: "bg-rose-300", shadow: "shadow-rose-500/25", hover: "hover:bg-rose-50", hoverIcon: "group-hover:text-rose-600" },
    "Vendors & Third Parties": { dot: "bg-cyan-500", header: "text-cyan-600", icon: "text-cyan-500", activeBg: "bg-gradient-to-r from-cyan-600 to-cyan-500", activeBar: "bg-cyan-300", shadow: "shadow-cyan-500/25", hover: "hover:bg-cyan-50", hoverIcon: "group-hover:text-cyan-600" },
    "Privacy & Governance": { dot: "bg-purple-500", header: "text-purple-600", icon: "text-purple-500", activeBg: "bg-gradient-to-r from-purple-600 to-purple-500", activeBar: "bg-purple-300", shadow: "shadow-purple-500/25", hover: "hover:bg-purple-50", hoverIcon: "group-hover:text-purple-600" },
    "Reporting": { dot: "bg-sky-500", header: "text-sky-600", icon: "text-sky-500", activeBg: "bg-gradient-to-r from-sky-600 to-sky-500", activeBar: "bg-sky-300", shadow: "shadow-sky-500/25", hover: "hover:bg-sky-50", hoverIcon: "group-hover:text-sky-600" },
    "Settings": { dot: "bg-slate-500", header: "text-slate-600", icon: "text-slate-500", activeBg: "bg-gradient-to-r from-slate-600 to-slate-500", activeBar: "bg-slate-300", shadow: "shadow-slate-500/25", hover: "hover:bg-slate-100", hoverIcon: "group-hover:text-slate-700" },
  };

  useEffect(() => {
    base44.entities.TenantSettings.list("-created_date", 1)
      .then((items) => {
        if (items && items.length > 0) {
          setBrand({ name: items[0].brand_display_name || "", logo_url: items[0].brand_logo_url || "" });
        }
      })
      .catch(() => {});
  }, []);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar-background text-sidebar-foreground flex flex-col z-50 shadow-2xl ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0 bg-gradient-to-r from-slate-50 via-blue-50/40 to-indigo-50/30">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-md ${brand.logo_url ? "bg-white border border-border" : "bg-gradient-to-br from-blue-600 to-indigo-600"}`}>
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="w-full h-full object-contain p-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <span className="font-heading font-bold text-[15px] text-foreground block truncate">
              {brand.name || "CertiGuard GRC"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-blue-600">RegTech Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {sections.map((section, sIdx) => {
          const sc = sectionColors[section.label] || sectionColors["Overview"];
          return (
          <div key={section.label} className={sIdx > 0 ? "mt-5" : ""}>
            {!collapsed ? (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.dot}`} />
                <span className={`text-[11px] font-bold uppercase tracking-[0.12em] ${sc.header}`}>
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-border/80" />
              </div>
            ) : (
              <div className="h-px bg-border/80 mx-2 my-2.5" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={collapsed ? item.label : undefined}
                    className={`group flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium relative transition-colors ${
                      active
                        ? `${sc.activeBg} text-white shadow-md ${sc.shadow}`
                        : `text-foreground ${sc.hover}`
                    }`}
                  >
                    {active && !collapsed && (
                      <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 ${sc.activeBar} rounded-r-full`} />
                    )}
                    <Icon className={`w-[17px] h-[17px] shrink-0 transition-colors ${active ? "text-white" : `${sc.icon} ${sc.hoverIcon}`}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2.5 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium text-foreground hover:bg-blue-50 hover:text-blue-700 w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-[17px] h-[17px] shrink-0 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-[17px] h-[17px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={async () => {
            await logLogout();
            base44.auth.logout("/");
          }}
          className="flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium text-foreground hover:bg-destructive hover:text-white w-full"
        >
          {collapsed ? (
            <LogOut className="w-[17px] h-[17px] shrink-0 mx-auto" />
          ) : (
            <>
              <LogOut className="w-[17px] h-[17px] shrink-0" />
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}