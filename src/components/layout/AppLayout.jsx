import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import GlobalSearch from "@/components/shared/GlobalSearch";
import { Search } from "lucide-react";

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-16 lg:ml-60 transition-all duration-300">
        {/* Top bar with global search */}
        <div className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors w-full max-w-sm"
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search everything…</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">⌘K</kbd>
          </button>
        </div>
        <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}