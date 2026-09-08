import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { filterNavSections } from "@/lib/navConfig";
import { useRBAC } from "@/lib/useRBAC";
import { logLogout } from "@/lib/authAudit";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [brand, setBrand] = useState({ name: "", logo_url: "" });
  const location = useLocation();
  const { role } = useRBAC();
  const sections = filterNavSections(role || "user");

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
      className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar-accent via-sidebar-background to-sidebar-background text-sidebar-foreground flex flex-col transition-all duration-300 z-50 shadow-2xl shadow-black/30 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border/50 shrink-0 bg-gradient-to-r from-sidebar-background/60 to-transparent backdrop-blur-sm">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sidebar-primary to-primary flex items-center justify-center shrink-0 shadow-lg shadow-sidebar-primary/30 overflow-hidden ring-1 ring-white/10">
          {brand.logo_url ? <img src={brand.logo_url} alt="logo" className="w-full h-full object-contain" /> : <ShieldCheck className="w-5 h-5 text-white" />}
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <span className="font-heading font-bold text-base tracking-tight truncate block text-sidebar-foreground">
              {brand.name || "CertiGuard GRC"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-sidebar-primary/90">RegTech Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-3.5">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/35 px-2.5 mb-1">
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
                    className={`group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-white shadow-sm shadow-sidebar-primary/10"
                        : "text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                    }`}
                    title={collapsed ? item.label : undefined}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sidebar-primary shadow-[0_0_8px] shadow-sidebar-primary/50" />
                    )}
                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${active ? "text-sidebar-primary" : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground/90"}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-sidebar-border/50 space-y-0.5 bg-sidebar-background/40">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/65 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0" />
          ) : (
            <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={async () => { await logLogout(); base44.auth.logout("/"); }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/65 hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}