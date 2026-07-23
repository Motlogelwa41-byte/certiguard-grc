import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Lock, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

// Full-screen lock shown after the idle timeout fires. The only way out is
// re-authentication, enforcing an automatic session-timeout policy.
export default function ScreenLockOverlay() {
  const { logout } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center gap-5 px-4">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/30">
        <Lock className="w-8 h-8 text-emerald-400" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-heading font-bold text-slate-100">Session locked</h2>
        <p className="text-sm text-slate-400 mt-1.5">
          For your security, this screen was locked after a period of inactivity. Please sign in again to continue working.
        </p>
      </div>
      <Button size="lg" onClick={() => logout(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        <LogIn className="w-4 h-4 mr-1.5" /> Re-authenticate
      </Button>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
        <ShieldCheck className="w-3.5 h-3.5" /> Automatic session timeout policy enforced
      </div>
    </div>
  );
}