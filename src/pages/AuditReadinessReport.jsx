import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { exportElementToPDF } from "@/lib/boardReportExport";
import { FileDown, Send, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

export default function AuditReadinessReport() {
  const { toast } = useToast();
  const reportRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [recipients, setRecipients] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [findings, setFindings] = useState([]);
  const [risks, setRisks] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [fws, ctls, fnds, rks, inc] = await Promise.all([
          base44.entities.Framework.list("-updated_date", 100),
          base44.entities.Control.list("-updated_date", 500),
          base44.entities.AuditFinding.list("-updated_date", 200),
          base44.entities.Risk.list("-created_date", 300),
          base44.entities.Incident.list("-created_date", 100),
        ]);
        setFrameworks(fws || []);
        setControls(ctls || []);
        setFindings(fnds || []);
        setRisks(rks || []);
        setIncidents(inc || []);
      } catch (e) {
        toast({ title: "Failed to load report data", description: e.message, variant: "destructive" });
      }
      setLoading(false);
    })();
  }, []);

  const passing = controls.filter((c) => c.status === "passing").length;
  const failing = controls.filter((c) => c.status === "failing").length;
  const notTested = controls.filter((c) => c.status === "not_tested").length;
  const total = controls.length;
  const readiness = total > 0 ? Math.round((passing / total) * 100) : 0;
  const verdict = readiness >= 80 ? "Audit Ready" : readiness >= 60 ? "On Track" : "Needs Attention";

  const fwReadiness = frameworks.map((f) => ({
    name: f.name,
    score: f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : (f.readiness_score || 0),
    status: f.status,
  }));

  const topFailing = controls.filter((c) => c.status === "failing").sort((a, b) => {
    const sev = { critical: 4, high: 3, medium: 2, low: 1 };
    return (sev[b.severity] || 0) - (sev[a.severity] || 0);
  }).slice(0, 8);

  const openFindings = findings.filter((f) => f.status === "open" || f.status === "in_remediation");
  const risksExceeding = risks.filter((r) => r.exceeds_tolerance || (r.risk_score || 0) > 12);
  const openIncidents = incidents.filter((i) => i.status !== "closed" && i.status !== "false_positive");

  const dateStr = new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(reportRef.current, {
        filename: `Audit_Readiness_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
        title: "Audit Readiness Report",
        subtitle: `Generated ${dateStr}`,
      });
      toast({ title: "PDF downloaded", description: "Your audit readiness report is saved." });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  const handleEmail = async () => {
    const list = recipients.split(",").map((e) => e.trim()).filter((e) => e.includes("@"));
    if (list.length === 0) {
      toast({ title: "Add at least one recipient", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const res = await base44.functions.invoke("sendAuditReadinessReport", { recipients: list.join(","), message });
      toast({ title: "Report emailed", description: `Sent to ${list.length} recipient(s).` });
      setEmailOpen(false);
      setRecipients("");
      setMessage("");
    } catch (e) {
      toast({ title: "Email failed", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const scoreColor = readiness >= 80 ? "#10b981" : readiness >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <PageHeader
        title="Audit Readiness Report"
        subtitle="A clean, executive summary of your current audit readiness — download or email in one click."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEmailOpen(true)}><Send className="w-4 h-4 mr-1" /> Email to Executives</Button>
            <Button onClick={handleDownload} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />} Download PDF
            </Button>
          </div>
        }
      />

      {/* Report — this element is captured for PDF export */}
      <div ref={reportRef} className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Audit Readiness Report</h2>
            <p className="text-sm text-slate-500">Generated {dateStr} · CertiGuard GRC</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `${scoreColor}1a`, color: scoreColor, border: `1px solid ${scoreColor}40` }}>{verdict}</span>
          </div>
        </div>

        {/* Score hero */}
        <div className="flex items-center gap-6">
          <div className="rounded-2xl p-5 text-center text-white" style={{ background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}cc)`, minWidth: 140 }}>
            <div className="text-4xl font-extrabold">{readiness}%</div>
            <div className="text-xs opacity-90 mt-1">Overall Readiness</div>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1">
            {[
              { label: "Controls Passing", value: `${passing} / ${total}`, icon: CheckCircle2, color: "#10b981" },
              { label: "Controls Failing", value: failing, icon: XCircle, color: "#ef4444" },
              { label: "Open Audit Findings", value: openFindings.length, icon: AlertTriangle, color: "#f59e0b" },
              { label: "Risks Above Tolerance", value: risksExceeding.length, icon: AlertTriangle, color: "#ef4444" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3">
                <m.icon className="w-5 h-5" style={{ color: m.color }} />
                <div>
                  <div className="text-lg font-bold text-slate-900">{m.value}</div>
                  <div className="text-xs text-slate-500">{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Framework readiness */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Framework Readiness</h3>
          {fwReadiness.length === 0 ? (
            <p className="text-sm text-slate-400">No frameworks configured.</p>
          ) : (
            <div className="space-y-2">
              {fwReadiness.map((f) => {
                const c = f.score >= 80 ? "#10b981" : f.score >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={f.name} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 w-48 truncate">{f.name}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${f.score}%`, backgroundColor: c }} />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right" style={{ color: c }}>{f.score}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top failing controls */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Top Failing Controls</h3>
          {topFailing.length === 0 ? (
            <p className="text-sm text-slate-400 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-500" /> No failing controls — great posture.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {topFailing.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-slate-900">{c.control_id ? `[${c.control_id}] ` : ""}{c.title}</span>
                    {c.owner_name && <span className="text-xs text-slate-400 ml-2">· {c.owner_name}</span>}
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                    background: c.severity === "critical" || c.severity === "high" ? "#fee2e2" : "#fef3c7",
                    color: c.severity === "critical" || c.severity === "high" ? "#991b1b" : "#92400e",
                  }}>{c.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open audit findings */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Open Audit Findings ({openFindings.length})</h3>
          {openFindings.length === 0 ? (
            <p className="text-sm text-slate-400">No open audit findings.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {openFindings.slice(0, 10).map((f) => (
                <div key={f.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900">{f.title}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700">{f.severity}</span>
                  </div>
                  {f.linked_control_name && <p className="text-xs text-slate-500 mt-0.5">Linked: {f.linked_control_name}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risks exceeding tolerance */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Risks Above Tolerance ({risksExceeding.length})</h3>
          {risksExceeding.length === 0 ? (
            <p className="text-sm text-slate-400">No risks exceed tolerance.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {risksExceeding.slice(0, 8).map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium text-slate-900 truncate">{r.title}</span>
                  <span className="text-xs font-mono font-bold text-red-600 ml-3">score {r.risk_score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 text-center text-xs text-slate-400">
          Confidential · CertiGuard GRC · {dateStr} · Page footer
        </div>
      </div>

      {/* Email dialog */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Audit Readiness Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Recipient email(s)</Label>
              <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="ceo@company.io, ciso@company.io" />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated. A PDF summary is generated and emailed via Gmail.</p>
            </div>
            <div>
              <Label>Optional message</Label>
              <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Attached is our latest audit readiness summary…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleEmail} disabled={sending}>
              {sending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}