import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import {
  Mail, RefreshCw, CheckCircle, AlertTriangle, Clock,
  Send, Search, Bell, FileX, Eye, CalendarClock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { isPast, parseISO, differenceInDays, addDays } from "date-fns";

// Days ahead threshold for "expiring soon" detection
const EXPIRY_WARNING_DAYS = 30;

const STATUS_CONFIG = {
  pending_review:  { label: "Pending Review",  color: "bg-amber-100 text-amber-700",  icon: Clock,         urgent: false },
  rejected:        { label: "Rejected",         color: "bg-red-100 text-red-700",      icon: FileX,         urgent: true  },
  expired:         { label: "Expired",          color: "bg-red-100 text-red-700",      icon: AlertTriangle, urgent: true  },
  expiring_soon:   { label: "Expiring Soon",    color: "bg-orange-100 text-orange-700",icon: CalendarClock, urgent: true  },
};

export default function EvidenceReminders() {
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingRequests, setSendingRequests] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [sentLog, setSentLog] = useState({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.Evidence.list("-created_date", 500);
    const today = new Date();
    const warningDate = addDays(today, EXPIRY_WARNING_DAYS);

    // Build actionable list: expired/rejected/pending + upcoming expiry on approved items
    const actionable = all
      .filter(e =>
        e.status === "pending_review" ||
        e.status === "rejected" ||
        e.status === "expired" ||
        (e.status === "approved" && e.expiry_date && parseISO(e.expiry_date) <= warningDate)
      )
      .map(e => {
        // Tag approved-but-expiring items
        if (e.status === "approved" && e.expiry_date && parseISO(e.expiry_date) <= warningDate) {
          return { ...e, _displayStatus: "expiring_soon" };
        }
        return { ...e, _displayStatus: e.status };
      });

    setEvidence(actionable);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return evidence.filter(e => {
      const matchSearch = !search ||
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.reviewer_name?.toLowerCase().includes(search.toLowerCase()) ||
        e.control_title?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || e._displayStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [evidence, search, filterStatus]);

  const urgentCount = useMemo(() =>
    evidence.filter(e => e.status === "expired" || e.status === "rejected" || e._displayStatus === "expiring_soon").length,
    [evidence]
  );

  const sendReminder = async (item) => {
    const email = item.reviewer_name; // Use reviewer_name as proxy — in real systems this would be owner email
    if (!email || !email.includes("@")) {
      toast({
        title: "No email available",
        description: `"${item.reviewer_name || "No reviewer"}" — add an email address to the reviewer field to send reminders.`,
        variant: "destructive",
      });
      return;
    }

    setSending(prev => ({ ...prev, [item.id]: true }));

    const displayStatus = item._displayStatus || item.status;
    const statusLabel = STATUS_CONFIG[displayStatus]?.label || displayStatus;
    const urgency = displayStatus === "expired" ? "URGENT: " : (displayStatus === "rejected" || displayStatus === "expiring_soon") ? "ACTION REQUIRED: " : "";
    const daysLeft = item.expiry_date ? differenceInDays(parseISO(item.expiry_date), new Date()) : null;
    const expiryNote = item.expiry_date
      ? `\n\nNote: This evidence ${isPast(parseISO(item.expiry_date)) ? "expired" : `expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`} on ${item.expiry_date}.`
      : "";

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `${urgency}Evidence Submission Reminder — ${item.title}`,
      body: `
Hello ${item.reviewer_name?.split("@")[0] || "Team"},

This is an automated reminder regarding the following compliance evidence item that requires your attention:

📄 Evidence Title: ${item.title}
🔗 Related Control: ${item.control_title || "N/A"}
📌 Current Status: ${statusLabel}
📅 Collected: ${item.collected_date || "Not recorded"}${expiryNote}

${displayStatus === "pending_review"
  ? "This evidence is awaiting your review. Please log in to CertiGuard to review and approve or reject it."
  : displayStatus === "rejected"
  ? "This evidence was previously rejected. Please resubmit updated documentation as soon as possible."
  : displayStatus === "expiring_soon"
  ? `This evidence is expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Please renew it before it expires to maintain continuous compliance coverage.`
  : "This evidence has expired and needs to be renewed. Please collect and upload current documentation immediately."}

${item.notes ? `\nNotes: ${item.notes}` : ""}

Please log in to CertiGuard to take action.

Regards,
CertiGuard Automated Notification System
      `.trim(),
    });

    setSentLog(prev => ({ ...prev, [item.id]: new Date().toISOString() }));
    setSending(prev => ({ ...prev, [item.id]: false }));
    toast({ title: "Reminder sent", description: `Email sent to ${email} for "${item.title}"` });
  };

  const sendAllReminders = async () => {
    const withEmail = filtered.filter(e => e.reviewer_name?.includes("@"));
    if (withEmail.length === 0) {
      toast({ title: "No eligible items", description: "No evidence items have an email in the reviewer field.", variant: "destructive" });
      return;
    }
    setSendingAll(true);
    let successCount = 0;
    for (const item of withEmail) {
      try {
        await sendReminder(item);
        successCount++;
      } catch (e) {
        // continue
      }
    }
    setSendingAll(false);
    toast({ title: `${successCount} reminders sent`, description: `Notified owners of ${successCount} evidence items.` });
  };

  const sendEvidenceRequests = async () => {
    setSendingRequests(true);
    try {
      const res = await base44.functions.invoke("sendEvidenceDueRequests", {});
      const d = res?.data || res || {};
      toast({ title: "Evidence requests sent", description: `${d.sent || 0} email(s) sent to control owners (${d.dueControls || 0} controls due).`, duration: 2500 });
    } catch (e) {
      toast({ title: "Request failed", description: e?.message || "Could not send evidence requests.", variant: "destructive", duration: 2500 });
    } finally {
      setSendingRequests(false);
    }
  };

  const ingestReplies = async () => {
    setIngesting(true);
    try {
      const res = await base44.functions.invoke("ingestEvidenceReplies", {});
      const d = res?.data || res || {};
      const desc = `Scanned ${d.scanned || 0} reply email(s). Created ${d.created || 0} evidence record(s) (${d.matched || 0} matched, ${d.unmatched || 0} unmatched, ${d.skipped || 0} already processed).`;
      toast({ title: "Email replies ingested", description: desc, duration: 4000 });
      if ((d.created || 0) > 0) load();
    } catch (e) {
      toast({ title: "Ingest failed", description: e?.message || "Could not ingest email replies.", variant: "destructive", duration: 4000 });
    } finally {
      setIngesting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Reminders"
        subtitle="Automatically notify evidence owners about pending, rejected, or expired document submissions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={sendEvidenceRequests} disabled={sendingRequests}>
              {sendingRequests ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Request evidence
            </Button>
            <Button variant="outline" size="sm" onClick={ingestReplies} disabled={ingesting}>
              {ingesting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />} Ingest replies
            </Button>
            <Button size="sm" onClick={sendAllReminders} disabled={sendingAll || filtered.length === 0}>
              <Send className="w-4 h-4 mr-1" />
              {sendingAll ? "Sending..." : `Send All Reminders (${filtered.filter(e => e.reviewer_name?.includes("@")).length})`}
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{evidence.filter(e => e._displayStatus === "pending_review").length}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{evidence.filter(e => e._displayStatus === "expiring_soon").length}</p>
            <p className="text-xs text-muted-foreground">Expiring Soon</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{evidence.filter(e => e._displayStatus === "expired").length}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
            <FileX className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{evidence.filter(e => e._displayStatus === "rejected").length}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
        </div>
      </div>

      {urgentCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{urgentCount} items</strong> are expired or rejected and require immediate attention. Send reminders to prompt evidence owners to resubmit.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search evidence, reviewer, control..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "pending_review", "expiring_soon", "expired", "rejected"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Evidence table */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle className="w-12 h-12 text-emerald-400" />
          <p className="font-semibold text-foreground">All clear!</p>
          <p className="text-sm text-muted-foreground">No evidence items require attention right now.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Evidence</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Control</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Reviewer / Owner</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Expiry</th>
                <th className="text-right px-4 py-3 font-semibold text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cfg = STATUS_CONFIG[item._displayStatus || item.status] || {};
                const StatusIcon = cfg.icon || Clock;
                const alreadySent = sentLog[item.id];
                const hasEmail = item.reviewer_name?.includes("@");
                const isExpired = item.expiry_date && isPast(parseISO(item.expiry_date));
                const daysToExpiry = item.expiry_date ? differenceInDays(parseISO(item.expiry_date), new Date()) : null;

                return (
                  <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-muted/20 transition-colors ${cfg.urgent ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {cfg.urgent && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                        <div>
                          <p className="font-medium text-foreground">{item.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{(item.type || "").replace(/_/g, " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {item.control_title || <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {item.reviewer_name ? (
                        <div className="flex items-center gap-1.5">
                          {hasEmail
                            ? <Mail className="w-3.5 h-3.5 text-primary" />
                            : <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          }
                          <span className={`text-sm ${hasEmail ? "text-foreground" : "text-muted-foreground"}`}>
                            {item.reviewer_name}
                          </span>
                          {!hasEmail && (
                            <span className="text-xs text-amber-600">(no email)</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50 text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-sm">
                      {item.expiry_date ? (
                        <span className={isExpired ? "text-red-600 font-medium" : daysToExpiry <= EXPIRY_WARNING_DAYS ? "text-orange-600 font-medium" : "text-muted-foreground"}>
                          {isExpired ? "⚠ Expired" : daysToExpiry !== null ? `${daysToExpiry}d left` : item.expiry_date}
                        </span>
                      ) : <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {alreadySent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Sent
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant={cfg.urgent ? "default" : "outline"}
                          className={cfg.urgent ? "bg-red-600 hover:bg-red-700 text-white border-0" : ""}
                          onClick={() => sendReminder(item)}
                          disabled={sending[item.id]}
                        >
                          {sending[item.id] ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5 mr-1" />
                              {hasEmail ? "Send Reminder" : "No Email"}
                            </>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Tip: Add an email address to the <strong>Reviewer</strong> field of each evidence record to enable automated reminders. Evidence expiring within <strong>{EXPIRY_WARNING_DAYS} days</strong> is automatically flagged.
      </p>
    </div>
  );
}