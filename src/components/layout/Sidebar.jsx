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
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-slate-300 flex flex-col z-50 shadow-2xl ${collapsed ? "w-16" : "w-64"}`}
    >
      {/* Subtle top glow accent */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-800/80 shrink-0 relative">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-blue-900/30 ${brand.logo_url ? "bg-white border border-slate-700" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="w-full h-full object-contain p-0.5" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="leading-tight overflow-hidden">
            <span className="font-heading font-bold text-[15px] text-white block truncate">
              {brand.name || "CertiGuard GRC"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-blue-400">RegTech Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto overflow-x-hidden sidebar-scroll relative">
        {sections.map((section, sIdx) => (
          <div key={section.label} className={sIdx > 0 ? "mt-5" : ""}>
            {!collapsed ? (
              <div className="flex items-center gap-2 px-2 mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {section.label}
                </span>
                <div className="flex-1 h-px bg-slate-800/80" />
              </div>
            ) : (
              <div className="h-px bg-slate-800/80 mx-2 my-2.5" />
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
                    className={`group flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium relative ${
                      active
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    {active && !collapsed && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-r-full" />
                    )}
                    <Icon className={`w-[17px] h-[17px] shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2.5 py-3 border-t border-slate-800/80 space-y-0.5 relative">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 w-full"
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
          className="flex items-center gap-3 px-2.5 py-2 rounded-md text-[13px] font-medium text-slate-400 hover:text-white hover:bg-red-500/80 w-full"
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