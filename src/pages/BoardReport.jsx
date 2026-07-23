import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FileDown, Send, RefreshCw, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import { useRBAC } from "@/lib/useRBAC";
import { exportElementToPDF } from "@/lib/boardReportExport";
import { generateManagementReport } from "@/lib/generateReport";
import { sendReportToStakeholders } from "@/lib/reportEmailer";
import moment from "moment";

export default function BoardReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const printRef = useRef(null);
  const { tenant } = useTenant();
  const { can } = useRBAC();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [controls, frameworks, risks, findings, tasks, incidents, certs] = await Promise.all([
      base44.entities.Control.list(),
      base44.entities.Framework.list().catch(() => []),
      base44.entities.Risk.list("-created_date", 200).catch(() => []),
      base44.entities.SecurityFinding.list("-created_date", 200).catch(() => []),
      base44.entities.ComplianceTask.list("-created_date", 300).catch(() => []),
      base44.entities.Incident.list("-created_date", 100).catch(() => []),
      base44.entities.Certification.list("-expiry_date", 200).catch(() => []),
    ]);
    const passing = (controls || []).filter((c) => c.status === "passing").length;
    const total = (controls || []).length;
    const complianceScore = total > 0 ? Math.round((passing / total) * 100) : 0;
    const fwScores = {};
    (frameworks || []).forEach((f) => { fwScores[f.name] = f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : f.readiness_score || 0; });
    const openRisks = (risks || []).filter((r) => r.status === "open" || r.status === "mitigating");
    const topRisks = [...openRisks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 6);
    const openFindings = (findings || []).filter((f) => f.status === "open" || f.status === "in_progress");
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    openFindings.forEach((f) => { sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1; });
    const overdueTasks = (tasks || []).filter((t) => t.status === "overdue").length;
    const openIncidents = (incidents || []).filter((i) => i.status !== "closed" && i.status !== "false_positive").length;
    const nowStr = new Date().toISOString().slice(0, 10);
    const plus90 = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const certStatusCounts = {};
    (certs || []).forEach((c) => { certStatusCounts[c.status] = (certStatusCounts[c.status] || 0) + 1; });
    const activeCerts = (certs || []).filter((c) => c.status !== "expired" && c.status !== "lapsed" && c.status !== "suspended");
    const expiringCerts = (certs || []).filter((c) => c.expiry_date && c.expiry_date >= nowStr && c.expiry_date <= plus90 && c.status !== "expired" && c.status !== "lapsed");
    const recs = [];
    if (total - passing > 0) recs.push(`Remediate ${total - passing} non-passing controls to lift the compliance score.`);
    if (expiringCerts.length > 0) recs.push(`Renew ${expiringCerts.length} certification(s) expiring within 90 days.`);
    if (sevCounts.critical + sevCounts.high > 0) recs.push(`Triage ${sevCounts.critical + sevCounts.high} critical/high security findings within SLA.`);
    if (overdueTasks > 0) recs.push(`Close ${overdueTasks} overdue compliance tasks.`);
    if (openRisks.length > 0) recs.push(`Mitigate ${openRisks.length} open risks — prioritise the top 3 by score.`);
    if (openIncidents > 0) recs.push(`Resolve ${openIncidents} open security incidents.`);
    if (recs.length === 0) recs.push("All indicators within acceptable ranges — maintain current posture and monitoring cadence.");
    setData({ passing, total, complianceScore, fwScores, topRisks, sevCounts, openFindings: openFindings.length, overdueTasks, openIncidents, openRisks: openRisks.length, completedTasks: (tasks || []).filter((t) => t.status === "completed").length, totalTasks: (tasks || []).length, totalCerts: (certs || []).length, activeCerts: activeCerts.length, certStatusCounts, expiringCerts, recs });
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportPDF = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(printRef.current, { filename: `Board_Compliance_Report_${moment().format("YYYY-MM-DD")}.pdf`, title: "Board Compliance Report", subtitle: tenant?.name || "CertiGuard GRC" });
      toast({ title: "Board-ready PDF exported" });
    } catch (e) { toast({ title: "Export failed", description: e.message, variant: "destructive" }); }
    setExporting(false);
  };

  // Trigger the weekly board-report function on demand (generates the server-side
  // PDF and emails all active schedule recipients — same path as the Monday run).
  const sendNow = async () => {
    setSendingNow(true);
    try {
      const res = await base44.functions.invoke("sendWeeklyBoardReport", {});
      const d = res?.data || res;
      if (d?.ok) {
        const n = d.sent ?? 0;
        toast({ title: n > 0 ? `Board report sent to ${n} recipient${n !== 1 ? "s" : ""}` : "Report generated", description: d.pdfUrl ? "PDF ready — download link emailed." : "No recipients found on active schedules." });
      } else {
        toast({ title: "Send failed", description: d?.error || "Unknown error", variant: "destructive" });
      }
    } catch (e) { toast({ title: "Send failed", description: e.message, variant: "destructive" }); }
    setSendingNow(false);
  };

  const emailExecs = async () => {
    setEmailing(true);
    try {
      const schedules = await base44.entities.ReportSchedule.filter({ is_active: true });
      if (!schedules || schedules.length === 0) { toast({ title: "No active schedules", description: "Set up an executive distribution schedule first.", variant: "destructive" }); setEmailing(false); return; }
      const snapshot = generateManagementReport(base44, tenant);
      const reportData = await snapshot;
      const created = await base44.entities.ManagementReport.create(reportData);
      let totalSent = 0;
      for (const s of schedules) { const { successCount } = await sendReportToStakeholders({ base44, schedule: s, reportData: created }); totalSent += successCount; await base44.entities.ReportSchedule.update(s.id, { last_sent_at: new Date().toISOString().slice(0, 10), last_sent_status: "sent", total_sent: (s.total_sent || 0) + successCount }); }
      toast({ title: `Report emailed to ${totalSent} executive recipient${totalSent !== 1 ? "s" : ""}` });
    } catch (e) { toast({ title: "Email failed", description: e.message, variant: "destructive" }); }
    setEmailing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!can("reports:export")) return <div className="flex flex-col items-center justify-center h-96 gap-4"><Shield className="w-16 h-16 text-muted-foreground/30" /><h2 className="text-xl font-heading font-bold">Restricted Access</h2><p className="text-muted-foreground text-center max-w-md">Board reports are available to administrators, compliance officers, and risk managers.</p></div>;

  const scoreColor = data.complianceScore >= 80 ? "#10b981" : data.complianceScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <PageHeader title="Board Compliance Report" subtitle="Real-time, board-ready view — export to PDF or email to your executive team"
        actions={<div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" asChild><Link to="/scheduled-reports"><Calendar className="w-4 h-4 mr-1" /> Schedules</Link></Button>
          <Button size="sm" variant="outline" onClick={emailExecs} disabled={emailing}>{emailing ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Email Executives</Button>
          <Button size="sm" variant="secondary" onClick={sendNow} disabled={sendingNow}>{sendingNow ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send Now (PDF)</Button>
          <Button size="sm" onClick={exportPDF} disabled={exporting}>{exporting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />} Export Board PDF</Button>
        </div>} />

      <div ref={printRef} className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Board Compliance Report</h1>
          <p className="text-sm text-slate-500 mt-1">{tenant?.name || "CertiGuard GRC"} · Generated {moment().format("DD MMMM YYYY [at] HH:mm")} · Confidential</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Compliance Score" value={`${data.complianceScore}%`} valueColor={scoreColor} />
          <Metric label="Controls Passing" value={`${data.passing} / ${data.total}`} />
          <Metric label="Open Risks" value={data.openRisks} valueColor={data.openRisks > 5 ? "#ef4444" : "#f59e0b"} />
          <Metric label="Open Findings" value={data.openFindings} valueColor={data.sevCounts.critical > 0 ? "#ef4444" : "#1e293b"} />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Framework Readiness</h2>
          <table className="w-full text-sm border border-slate-200 rounded">
            <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-2 font-medium">Framework</th><th className="text-left p-2 font-medium w-32">Readiness</th></tr></thead>
            <tbody>
              {Object.keys(data.fwScores).length === 0 && <tr><td className="p-2 text-slate-400" colSpan={2}>No frameworks configured.</td></tr>}
              {Object.entries(data.fwScores).map(([name, score]) => (
                <tr key={name} className="border-t border-slate-100"><td className="p-2">{name}</td><td className="p-2"><span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: score >= 80 ? "#dcfce7" : score >= 50 ? "#fef3c7" : "#fee2e2", color: score >= 80 ? "#166534" : score >= 50 ? "#92400e" : "#991b1b" }}>{score}%</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Certifications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <Metric label="Total Certs" value={data.totalCerts || 0} />
            <Metric label="Active" value={data.activeCerts || 0} valueColor="#10b981" />
            <Metric label="Expiring ≤90d" value={data.expiringCerts?.length || 0} valueColor={(data.expiringCerts?.length || 0) > 0 ? "#f59e0b" : "#10b981"} />
            <Metric label="Certified" value={data.certStatusCounts?.certified || 0} valueColor="#10b981" />
          </div>
          {data.expiringCerts?.length > 0 ? (
            <table className="w-full text-sm border border-slate-200">
              <thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-2 font-medium">Certification</th><th className="text-left p-2 font-medium w-40">Standard</th><th className="text-left p-2 font-medium w-32">Expiry</th><th className="text-left p-2 font-medium w-28">Renewal</th></tr></thead>
              <tbody>
                {data.expiringCerts.map((c) => <tr key={c.id} className="border-t border-slate-100"><td className="p-2">{c.name}</td><td className="p-2">{c.standard}</td><td className="p-2 font-semibold">{c.expiry_date}</td><td className="p-2 capitalize text-xs">{c.renewal_status}</td></tr>)}
              </tbody>
            </table>
          ) : <p className="text-sm text-slate-400">No certifications expiring within 90 days.</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-base font-semibold mb-2">Top Open Risks</h2>
            {data.topRisks.length === 0 ? <p className="text-sm text-slate-400">No open risks.</p> : (
              <table className="w-full text-sm border border-slate-200"><thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-2 font-medium">Risk</th><th className="text-left p-2 font-medium w-20">Score</th><th className="text-left p-2 font-medium w-24">Status</th></tr></thead><tbody>
                {data.topRisks.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="p-2">{r.title}</td><td className="p-2 font-semibold">{r.risk_score || "—"}</td><td className="p-2 capitalize text-xs">{r.status}</td></tr>)}
              </tbody></table>
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold mb-2">Open Findings by Severity</h2>
            <table className="w-full text-sm border border-slate-200"><thead className="bg-slate-50 text-slate-600"><tr><th className="text-left p-2 font-medium">Severity</th><th className="text-left p-2 font-medium w-20">Count</th></tr></thead><tbody>
              {["critical", "high", "medium", "low", "info"].map((s) => <tr key={s} className="border-t border-slate-100"><td className="p-2 capitalize">{s}</td><td className="p-2 font-semibold">{data.sevCounts[s] || 0}</td></tr>)}
            </tbody></table>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Completed Tasks" value={`${data.completedTasks} / ${data.totalTasks}`} />
          <Metric label="Overdue Tasks" value={data.overdueTasks} valueColor={data.overdueTasks > 0 ? "#ef4444" : "#10b981"} />
          <Metric label="Open Incidents" value={data.openIncidents} valueColor={data.openIncidents > 0 ? "#ef4444" : "#10b981"} />
          <Metric label="Critical Findings" value={data.sevCounts.critical || 0} valueColor={data.sevCounts.critical > 0 ? "#ef4444" : "#1e293b"} />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Recommendations</h2>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {data.recs.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-2">Confidential — Board Compliance Report · Generated by CertiGuard GRC · {moment().format("YYYY-MM-DD")}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueColor = "#0f172a" }) {
  return <div className="border border-slate-200 rounded-lg p-3"><div className="text-2xl font-bold" style={{ color: valueColor }}>{value}</div><div className="text-xs text-slate-500 mt-0.5">{label}</div></div>;
}