import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck, ChevronDown } from "lucide-react";
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

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const activeSectionLabel = useMemo(() => {
    return sections.find((s) => s.items.some((item) => isActive(item.path)))?.label;
  }, [location.pathname, sections]);

  const [openSections, setOpenSections] = useState({});

  useEffect(() => {
    if (activeSectionLabel) {
      setOpenSections((prev) => ({ ...prev, [activeSectionLabel]: true }));
    }
  }, [activeSectionLabel]);

  const toggleSection = (label) => {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
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

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50 border-r border-sidebar-border ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shrink-0 shadow-md shadow-primary/20 overflow-hidden">
          {brand.logo_url ? (
            <img src={brand.logo_url} alt="logo" className="w-full h-full object-contain" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-white" />
          )}
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <span className="font-heading font-bold text-base tracking-tight truncate block text-sidebar-foreground">
              {brand.name || "CertiGuard GRC"}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-widest text-primary/70">RegTech Platform</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto overflow-x-hidden">
        {sections.map((section) => {
          if (collapsed) {
            return (
              <div key={section.label} className="mb-1.5">
                <div className="h-px bg-sidebar-border mx-1 my-1" />
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={item.label}
                      className={`group flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-muted"
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isOpen = openSections[section.label];
          return (
            <div key={section.label} className="mb-0.5">
              <button
                onClick={() => toggleSection(section.label)}
                className="group w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-sidebar-foreground hover:bg-muted/60 transition-colors"
              >
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
                />
                <span className="flex-1 text-left">{section.label}</span>
              </button>
              {isOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`group relative flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-muted"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" />
                        )}
                        <Icon
                          className={`w-[16px] h-[16px] shrink-0 ${
                            active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-foreground"
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-muted w-full transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-[18px] h-[18px] shrink-0 mx-auto" />
          ) : (
            <>
              <ChevronLeft className="w-[18px] h-[18px] shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
        <button
          onClick={async () => {
            await logLogout();
            base44.auth.logout("/");
          }}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 w-full transition-colors"
        >
          {collapsed ? (
            <LogOut className="w-[18px] h-[18px] shrink-0 mx-auto" />
          ) : (
            <>
              <LogOut className="w-[18px] h-[18px] shrink-0" />
              <span>Logout</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}