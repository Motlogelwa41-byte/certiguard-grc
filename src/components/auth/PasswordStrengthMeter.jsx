import React from "react";
import { scorePassword, passwordRequirements, strengthLabel, PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";
import { Check, X } from "lucide-react";

const BAR_COLORS = [
  "bg-destructive", "bg-destructive", "bg-warning",
  "bg-warning", "bg-primary", "bg-success",
];

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const score = scorePassword(password);
  const r = passwordRequirements(password);
  const reqs = [
    { ok: r.length, label: `${PASSWORD_MIN_LENGTH}+ characters` },
    { ok: r.upper, label: "Uppercase" },
    { ok: r.lower, label: "Lowercase" },
    { ok: r.number, label: "Number" },
    { ok: r.symbol, label: "Symbol" },
  ];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? BAR_COLORS[score] : "bg-muted"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{strengthLabel(score)}</span>
        <span className="text-xs text-muted-foreground">{password.length} chars</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {reqs.map((req) => (
          <span
            key={req.label}
            className={`inline-flex items-center gap-1 text-[11px] ${req.ok ? "text-success" : "text-muted-foreground"}`}
          >
            {req.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {req.label}
          </span>
        ))}
      </div>
    </div>
  );
}