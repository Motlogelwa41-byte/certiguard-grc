import React from "react";
import { useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useRBAC } from "@/lib/useRBAC";
import { canAccessRoute } from "@/lib/navConfig";

export default function RoleGuard({ children }) {
  const { role } = useRBAC();
  const location = useLocation();
  const allowed = canAccessRoute(role || "user", location.pathname);

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-card rounded-2xl border border-border shadow p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6 text-destructive" />
          </div>
          <h2 className="text-lg font-heading font-bold text-foreground mb-1">Access restricted</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Your role doesn't have access to this area. Contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
}