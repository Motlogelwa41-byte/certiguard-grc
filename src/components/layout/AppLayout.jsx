import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/shared/GlobalSearch";
import SubscriptionGate from "@/components/shared/SubscriptionGate";
import RoleGuard from "@/components/shared/RoleGuard";
import { Search } from "lucide-react";
import useIdleLock from "@/hooks/useIdleLock";
import ScreenLockOverlay from "@/components/shared/ScreenLockOverlay";
import MfaEnforcementGate from "@/components/shared/MfaEnforcementGate";
import SecurityPolicyBanner from "@/components/shared/SecurityPolicyBanner";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";

function hexToHsl(hex) {
  if (!hex || !hex.startsWith("#")) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const locked = useIdleLock();

  useEffect(() => {
    base44.entities.TenantSettings.list("-created_date", 5)
      .then((items) => {
        if (items && items.length > 0) {
          const s = items[0];
          const root = document.documentElement;
          const primary = hexToHsl(s.brand_primary_color);
          const secondary = hexToHsl(s.brand_secondary_color);
          const accent = hexToHsl(s.brand_accent_color);
          if (primary) root.style.setProperty("--primary", primary);
          if (secondary) root.style.setProperty("--sidebar-primary", secondary);
          if (accent) root.style.setProperty("--ring", accent);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <MfaEnforcementGate>
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 lg:ml-60 transition-all duration-300">
        {/* Top bar with global search */}
        <SecurityPolicyBanner />
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full max-w-sm"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search everything…</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">⌘K</kbd>
          </button>
          <LanguageSwitcher />
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <SubscriptionGate>
            <RoleGuard>
              <Outlet />
            </RoleGuard>
          </SubscriptionGate>
        </div>
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
      {locked && <ScreenLockOverlay />}
    </div>
    </MfaEnforcementGate>
  );
}

function LanguageSwitcher() {
  const { language, setLanguage, languages } = useLanguage();
  return (
    <div className="flex items-center gap-1.5">
      <Globe className="w-4 h-4 text-muted-foreground" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="text-xs bg-transparent border border-border rounded-md px-2 py-1 text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:border-primary/40"
      >
        {Object.entries(languages).map(([code, lang]) => (
          <option key={code} value={code}>{lang.flag} {lang.label}</option>
        ))}
      </select>
    </div>
  );
}