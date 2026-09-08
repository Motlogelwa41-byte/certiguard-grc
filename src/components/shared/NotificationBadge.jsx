import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function NotificationBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
        const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

        const [tasks, evidence] = await Promise.all([
          base44.entities.ComplianceTask.list().catch(() => []),
          base44.entities.Evidence.list().catch(() => []),
        ]);

        let c = 0;
        (tasks || []).forEach((t) => {
          if (!t.due_date || t.status === "completed") return;
          const d = String(t.due_date).slice(0, 10);
          if (d < today || (d >= today && d <= in7)) c++;
        });
        (evidence || []).forEach((e) => {
          if (e.missing_evidence) { c++; return; }
          if (e.expiry_date && e.status === "approved") {
            const d = String(e.expiry_date).slice(0, 10);
            if (d <= in30) c++;
          }
        });

        setCount(c);
      } catch {
        /* ignore */
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      to="/notification-center"
      className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-destructive rounded-full ring-2 ring-background">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}