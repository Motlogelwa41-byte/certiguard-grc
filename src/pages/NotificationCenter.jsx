import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Bell, AlertTriangle, Clock, FileCheck, Building2, ScrollText, Shield,
  CheckCircle, BellOff, Loader2, Filter, Inbox
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";

const TYPE_CONFIG = {
  overdue_task: { label: "Overdue Task", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100", path: "/tasks" },
  evidence_due: { label: "Evidence Due", icon: FileCheck, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100", path: "/evidence" },
  control_failure: { label: "Control Failure", icon: Shield, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", path: "/controls" },
  vendor_expiring: { label: "Vendor Expiring", icon: Building2, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100", path: "/vendor-assessments" },
  regulatory: { label: "Regulatory Change", icon: ScrollText, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100", path: "/regulatory-changes" },
  audit_finding: { label: "Audit Finding", icon: AlertTriangle, color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", path: "/audit-findings" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "overdue_task", label: "Overdue" },
  { key: "evidence_due", label: "Evidence Due" },
  { key: "control_failure", label: "Control Failures" },
  { key: "vendor_expiring", label: "Vendor" },
  { key: "regulatory", label: "Regulatory" },
  { key: "audit_finding", label: "Audit Findings" },
];

const SNOOZE_KEY = "certiguard_snoozed_notifications";
const SNOOZE_HOURS = 24;

function getSnoozed() {
  try {
    const data = JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}");
    const now = Date.now();
    const active = {};
    for (const [id, until] of Object.entries(data)) {
      if (until > now) active[id] = until;
    }
    return active;
  } catch { return {}; }
}

function snooze(id) {
  const data = getSnoozed();
  data[id] = Date.now() + SNOOZE_HOURS * 60 * 60 * 1000;
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(data));
}

export default function NotificationCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [snoozed, setSnoozed] = useState(getSnoozed());

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      const [tasks, evidence, controls, vendorAssessments, alerts, findings] = await Promise.all([
        base44.entities.ComplianceTask.list().catch(() => []),
        base44.entities.Evidence.list().catch(() => []),
        base44.entities.Control.list().catch(() => []),
        base44.entities.VendorAssessment.list().catch(() => []),
        base44.entities.RegulatoryAlert.list().catch(() => []),
        base44.entities.AuditFinding.list().catch(() => []),
      ]);

      const items = [];

      // Overdue tasks
      (tasks || []).forEach((t) => {
        if (t.due_date && t.due_date.slice(0, 10) < today && t.status !== "completed") {
          items.push({
            id: `task_overdue_${t.id}`,
            type: "overdue_task",
            title: t.title || "Untitled task",
            description: `Due ${t.due_date} · ${t.assignee_name || "Unassigned"} · ${t.priority || "medium"} priority`,
            date: t.due_date,
            priority: t.priority || "high",
            refId: t.id,
          });
        }
      });

      // Evidence due / expiring / missing
      (evidence || []).forEach((e) => {
        const isMissing = e.status === "missing" || e.status === "expired";
        const isExpiring = e.expiry_date && e.expiry_date.slice(0, 10) <= in30 && e.status === "approved";
        if (isMissing || isExpiring) {
          items.push({
            id: `evidence_${e.id}`,
            type: "evidence_due",
            title: e.title || "Evidence item",
            description: isMissing
              ? `Missing evidence — ${e.control_title || "No control"} · ${e.status}`
              : `Expires ${e.expiry_date} — ${e.control_title || "No control"}`,
            date: e.expiry_date || today,
            priority: isMissing ? "critical" : "medium",
            refId: e.id,
          });
        }
      });

      // Control failures
      (controls || []).forEach((c) => {
        if (c.status === "failing") {
          items.push({
            id: `control_fail_${c.id}`,
            type: "control_failure",
            title: c.title || c.control_id || "Control",
            description: `Failing — ${c.category || "uncategorized"} · Owner: ${c.owner_name || "Unassigned"} · ${c.severity || "medium"} severity`,
            date: c.last_tested || today,
            priority: c.severity || "high",
            refId: c.id,
          });
        }
      });

      // Vendor assessments expiring/stale
      (vendorAssessments || []).forEach((v) => {
        const nextReview = v.next_review_date || v.expiry_date;
        if (nextReview && nextReview.slice(0, 10) <= in30 && v.status !== "completed" && v.status !== "approved") {
          items.push({
            id: `vendor_${v.id}`,
            type: "vendor_expiring",
            title: v.vendor_name || v.title || "Vendor assessment",
            description: `Assessment ${v.status || "pending"} — review due ${nextReview}`,
            date: nextReview,
            priority: nextReview.slice(0, 10) < today ? "high" : "medium",
            refId: v.id,
          });
        }
      });

      // Regulatory alerts
      (alerts || []).forEach((a) => {
        if (a.is_active !== false) {
          items.push({
            id: `reg_alert_${a.id}`,
            type: "regulatory",
            title: a.title || "Regulatory update",
            description: a.message || a.framework_name || "Regulatory change requires attention",
            date: a.compliance_deadline || a.effective_date || today,
            priority: a.priority || "medium",
            refId: a.id,
          });
        }
      });

      // Open audit findings
      (findings || []).forEach((f) => {
        if (f.status === "open" || f.status === "in_progress" || f.status === "pending") {
          items.push({
            id: `finding_${f.id}`,
            type: "audit_finding",
            title: f.title || f.finding || "Audit finding",
            description: `${f.status || "open"} — ${f.severity || "medium"} severity · ${f.recommendation || ""}`.trim(),
            date: f.due_date || f.created_date || today,
            priority: f.severity || "medium",
            refId: f.id,
          });
        }
      });

      // Sort by priority then date
      const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
      items.sort((a, b) => {
        const pr = (priorityRank[a.priority] ?? 2) - (priorityRank[b.priority] ?? 2);
        if (pr !== 0) return pr;
        return (a.date || "").localeCompare(b.date || "");
      });

      setNotifications(items);
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    return notifications.filter((n) => {
      if (snoozed[n.id]) return false;
      if (filter === "all") return true;
      return n.type === filter;
    });
  }, [notifications, filter, snoozed]);

  const counts = useMemo(() => {
    const c = { all: 0 };
    notifications.forEach((n) => {
      if (snoozed[n.id]) return;
      c.all = (c.all || 0) + 1;
      c[n.type] = (c[n.type] || 0) + 1;
    });
    return c;
  }, [notifications, snoozed]);

  const handleSnooze = (id) => {
    snooze(id);
    setSnoozed(getSnoozed());
    toast({ title: "Snoozed for 24 hours" });
  };

  const handleSnoozeAll = () => {
    visible.forEach((n) => snooze(n.id));
    setSnoozed(getSnoozed());
    toast({ title: `Snoozed ${visible.length} notifications` });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Unified inbox for all compliance alerts, overdue items, and action requests"
        actions={
          <Button variant="outline" size="sm" onClick={handleSnoozeAll} disabled={visible.length === 0}>
            <BellOff className="w-4 h-4 mr-1" /> Snooze All
          </Button>
        }
      />

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {FILTERS.map((f) => {
          const count = counts[f.key] || 0;
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`text-left p-3 rounded-xl border transition-all ${
                isActive ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <p className="text-2xl font-heading font-bold text-foreground">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.label}</p>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f.label} {counts[f.key] > 0 && `(${counts[f.key]})`}
          </button>
        ))}
      </div>

      {/* Notification feed */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            {notifications.length === 0 ? "No notifications — you're all caught up!" : "No notifications in this category."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((n) => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.overdue_task;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}
              >
                <div className={`p-2 rounded-lg ${cfg.bg} ${cfg.color} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    {n.priority === "critical" && (
                      <span className="text-[10px] font-bold uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Link to={cfg.path}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => handleSnooze(n.id)}
                    >
                      <BellOff className="w-3 h-3 mr-1" /> Snooze 24h
                    </Button>
                  </div>
                </div>
                {n.date && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {n.date}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}