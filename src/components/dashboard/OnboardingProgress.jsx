import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Check, Rocket } from "lucide-react";

const CHECKLIST = [
  { key: "framework", label: "Add your first compliance framework", path: "/frameworks" },
  { key: "controls", label: "Create your first controls", path: "/controls" },
  { key: "policy", label: "Create a policy document", path: "/policies" },
  { key: "risk", label: "Register a risk", path: "/risks" },
  { key: "connection", label: "Connect an integration", path: "/connections" },
  { key: "users", label: "Invite team members", path: "/users" },
];

export default function OnboardingProgress() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.allSettled([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Policy.list(),
      base44.entities.Risk.list(),
      base44.entities.Connection.list(),
      base44.entities.User.list(),
    ]).then((results) => {
      const val = (r) => (r.status === "fulfilled" ? r.value?.length || 0 : 0);
      setCounts({
        framework: val(results[0]),
        controls: val(results[1]),
        policy: val(results[2]),
        risk: val(results[3]),
        connection: val(results[4]),
        users: val(results[5]),
      });
    });
  }, []);

  if (!counts) return null;

  const isDone = (key) => {
    if (key === "users") return counts.users > 1;
    return counts[key] > 0;
  };

  const completed = CHECKLIST.filter((item) => isDone(item.key));
  const pct = Math.round((completed.length / CHECKLIST.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Onboarding Progress</h3>
        </div>
        <span className="text-sm font-semibold text-primary">{pct}% set up</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
        {CHECKLIST.map((item) => {
          const done = isDone(item.key);
          return (
            <Link key={item.key} to={item.path} className={`flex items-center gap-2 text-sm p-2 rounded-lg transition-colors ${done ? "text-muted-foreground" : "text-foreground hover:bg-muted"}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-success/15 text-success" : "border-2 border-muted-foreground/30"}`}>
                {done && <Check className="w-3 h-3" />}
              </span>
              <span className={done ? "line-through" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}