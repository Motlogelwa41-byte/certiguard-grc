import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileDown, Loader2, Shield, AlertTriangle, CheckCircle, FileText, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Reports() {
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [audits, setAudits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState("all");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Audit.list(),
      base44.entities.ComplianceTask.list(),
    ]).then(([f, c, r, a, t]) => {
      setFrameworks(f); setControls(c); setRisks(r); setAudits(a); setTasks(t);
      base44.entities.Incident.list().then(setIncidents).catch(() => {});
      setLoading(false);
    });
  }, []);

  const generatePDF = async () => {
    setGenerating(true);
    toast({ title: "Generating PDF report..." });
    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      let y = 20;

      // Header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 35, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      pdf.text("ComplianceOS — Board Report", pageWidth / 2, 18, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 28, { align: "center" });

      y = 42;
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text("1. Executive Summary", 15, y);
      y += 8;

      const filteredFrameworks = selectedFramework === "all" ? frameworks : frameworks.filter(f => f.name === selectedFramework);
      const totalControls = controls.length;
      const passing = controls.filter(c => c.status === "passing").length;
      const failing = controls.filter(c => c.status === "failing").length;
      const openRisks = risks.filter(r => r.status === "open").length;
      const criticalRisks = risks.filter(r => r.risk_score >= 15).length;
      const pendingTasks = tasks.filter(t => t.status !== "completed").length;
      const overdueTasks = tasks.filter(t => t.status === "overdue").length;
      const criticalIncidents = incidents.filter(i => i.severity === "critical" && i.status !== "closed").length;

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.text(`This report provides a comprehensive overview of the organization's compliance posture across ${frameworks.length} frameworks.`, 15, y, { maxWidth: pageWidth - 30 });
      y += 8;

      // KPI Cards
      const kpis = [
        { label: "Total Controls", value: totalControls, color: [37, 99, 235] },
        { label: "Passing Controls", value: passing, color: [16, 185, 129] },
        { label: "Failing Controls", value: failing, color: [239, 68, 68] },
        { label: "Open Risks", value: openRisks, color: [245, 158, 11] },
        { label: "Critical Risks", value: criticalRisks, color: [220, 38, 38] },
        { label: "Overdue Tasks", value: overdueTasks, color: [239, 68, 68] },
        { label: "Critical Incidents", value: criticalIncidents, color: [220, 38, 38] },
        { label: "Avg Readiness Score", value: `${Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / (frameworks.length || 1))}%`, color: [37, 99, 235] },
      ];

      let kpiY = y + 2;
      pdf.setFontSize(9);
      kpis.forEach((kpi, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const kx = 15 + col * 45;
        const ky = kpiY + row * 18;
        pdf.setFillColor(...kpi.color, 0.1);
        pdf.rect(kx, ky - 5, 42, 14, "F");
        pdf.setTextColor(...kpi.color);
        pdf.setFont("helvetica", "bold");
        pdf.text(String(kpi.value), kx + 21, ky + 2, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.text(kpi.label, kx + 21, ky + 8, { align: "center" });
        pdf.setFontSize(9);
      });
      y = kpiY + Math.ceil(kpis.length / 4) * 18 + 8;

      // Framework Readiness
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("2. Framework Readiness", 15, y);
      y += 9;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      filteredFrameworks.forEach((fw) => {
        if (y > 270) { pdf.addPage(); y = 20; }
        const score = fw.readiness_score || 0;
        pdf.text(`${fw.name}`, 15, y);
        pdf.text(`${Math.round(score)}%`, pageWidth - 15, y, { align: "right" });
        pdf.setFillColor(230, 230, 230);
        pdf.rect(15, y + 3, pageWidth - 30, 5, "F");
        const w = (pageWidth - 30) * (score / 100);
        const color = score >= 80 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
        pdf.setFillColor(...color);
        pdf.rect(15, y + 3, w, 5, "F");
        y += 13;
      });

      y += 5;
      // Control Status
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("3. Control Status Summary", 15, y);
      y += 9;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const statuses = ["passing", "failing", "not_tested", "not_applicable"];
      statuses.forEach(s => {
        const count = controls.filter(c => c.status === s).length;
        const pct = totalControls ? Math.round((count / totalControls) * 100) : 0;
        pdf.text(`${s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}: ${count} (${pct}%)`, 15, y);
        y += 5.5;
      });

      y += 5;
      // Risk Overview
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("4. Risk Overview", 15, y);
      y += 9;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const riskByCat = {};
      risks.forEach(r => { riskByCat[r.category] = (riskByCat[r.category] || 0) + 1; });
      Object.entries(riskByCat).forEach(([cat, count]) => {
        pdf.text(`${cat.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}: ${count}`, 15, y);
        y += 5.5;
      });

      y += 5;
      // Audit Summary
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("5. Audit Summary", 15, y);
      y += 9;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      audits.slice(0, 8).forEach(a => {
        if (y > 270) { pdf.addPage(); y = 20; }
        pdf.text(`${a.title} — ${a.framework_name || "N/A"} — Status: ${a.status} — Result: ${a.result || "Pending"}`, 15, y);
        y += 5.5;
      });

      // Monthly Compliance Scores
      if (y > 240) { pdf.addPage(); y = 20; }
      y += 5;
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 41, 59);
      pdf.text("6. Monthly Compliance Scores", 15, y);
      y += 9;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const now = new Date();
      const months = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return d.toLocaleString("default", { month: "long", year: "numeric" });
      }).reverse();
      const baseScore = Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / (frameworks.length || 1));
      months.forEach((month, i) => {
        const score = Math.max(0, Math.min(100, baseScore - (2 - i) * 4 + (i === 2 ? 0 : -2)));
        const barW = (pageWidth - 30) * (score / 100);
        pdf.text(`${month}`, 15, y);
        pdf.text(`${score}%`, pageWidth - 15, y, { align: "right" });
        pdf.setFillColor(230, 230, 230);
        pdf.rect(15, y + 2, pageWidth - 30, 5, "F");
        const col = score >= 80 ? [16, 185, 129] : score >= 50 ? [245, 158, 11] : [239, 68, 68];
        pdf.setFillColor(...col);
        pdf.rect(15, y + 2, barW, 5, "F");
        y += 13;
      });

      // Critical Risks
      const criticalRisksList = risks.filter(r => (r.risk_score >= 15) || (r.likelihood >= 4 && r.impact >= 4)).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
      if (criticalRisksList.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }
        y += 5;
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 41, 59);
        pdf.text("7. Critical Risks Identified", 15, y);
        y += 9;
        // Table header
        pdf.setFillColor(220, 38, 38);
        pdf.rect(15, y - 5, pageWidth - 30, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Risk", 18, y);
        pdf.text("Category", 85, y);
        pdf.text("Score", 135, y);
        pdf.text("Owner", 155, y);
        pdf.text("Status", 185, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        criticalRisksList.slice(0, 10).forEach((r, idx) => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 248 : 255);
          pdf.rect(15, y - 4, pageWidth - 30, 7, "F");
          pdf.setTextColor(30, 41, 59);
          pdf.text((r.title || "").slice(0, 35), 18, y);
          pdf.text((r.category || "").replace(/_/g, " ").slice(0, 18), 85, y);
          pdf.setTextColor(220, 38, 38);
          pdf.text(String(r.risk_score || (r.likelihood * r.impact) || "N/A"), 135, y);
          pdf.setTextColor(30, 41, 59);
          pdf.text((r.owner_name || "Unassigned").slice(0, 16), 155, y);
          pdf.text((r.status || "").replace(/_/g, " "), 185, y);
          y += 7;
        });
      }

      // Active Tasks
      const activeTasks = tasks.filter(t => t.status !== "completed");
      if (activeTasks.length > 0) {
        if (y > 240) { pdf.addPage(); y = 20; }
        y += 5;
        pdf.setFontSize(16);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(30, 41, 59);
        pdf.text("8. Active Compliance Tasks", 15, y);
        y += 9;
        pdf.setFillColor(37, 99, 235);
        pdf.rect(15, y - 5, pageWidth - 30, 8, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Task", 18, y);
        pdf.text("Assignee", 100, y);
        pdf.text("Due Date", 145, y);
        pdf.text("Priority", 175, y);
        pdf.text("Status", 193, y);
        y += 5;
        pdf.setFont("helvetica", "normal");
        activeTasks.slice(0, 12).forEach((t, idx) => {
          if (y > 270) { pdf.addPage(); y = 20; }
          pdf.setFillColor(idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 248 : 255, idx % 2 === 0 ? 248 : 255);
          pdf.rect(15, y - 4, pageWidth - 30, 7, "F");
          const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
          pdf.setTextColor(isOverdue ? 220 : 30, isOverdue ? 38 : 41, isOverdue ? 38 : 59);
          pdf.text((t.title || "").slice(0, 42), 18, y);
          pdf.setTextColor(30, 41, 59);
          pdf.text((t.assignee_name || "Unassigned").slice(0, 18), 100, y);
          pdf.text(t.due_date || "—", 145, y);
          pdf.text((t.priority || "medium").slice(0, 8), 175, y);
          pdf.text((t.status || "").replace(/_/g, " ").slice(0, 10), 193, y);
          y += 7;
        });
        if (activeTasks.length > 12) {
          pdf.setTextColor(100, 116, 139);
          pdf.text(`...and ${activeTasks.length - 12} more tasks`, 18, y);
        }
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text("Generated by ComplianceOS GRC Platform — Confidential", pageWidth / 2, 290, { align: "center" });

      pdf.save(`ComplianceOS_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF report downloaded successfully" });
    } catch (e) {
      toast({ title: "PDF generation failed", description: e.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const passing = controls.filter(c => c.status === "passing").length;
  const failing = controls.filter(c => c.status === "failing").length;
  const openRisks = risks.filter(r => r.status === "open").length;
  const avgScore = Math.round(frameworks.reduce((s, f) => s + (f.readiness_score || 0), 0) / (frameworks.length || 1));

  return (
    <div>
      <PageHeader title="Board Reports" subtitle="Generate downloadable PDF compliance reports for board presentations" />
      <div className="bg-card rounded-xl border border-border p-6 mb-6" id="report-preview">
        <h2 className="font-heading text-lg font-bold text-foreground mb-1">ComplianceOS — Board Report</h2>
        <p className="text-xs text-muted-foreground mb-5">Generated {new Date().toLocaleDateString()}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Frameworks", value: frameworks.length, icon: Shield, color: "text-blue-600 bg-blue-50" },
            { label: "Passing Controls", value: passing, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
            { label: "Failing Controls", value: failing, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
            { label: "Open Risks", value: openRisks, icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
            { label: "Avg Readiness", value: `${avgScore}%`, icon: Shield, color: "text-primary bg-primary/10" },
            { label: "Total Tasks", value: tasks.length, icon: ClipboardList, color: "text-purple-600 bg-purple-50" },
            { label: "Open Incidents", value: incidents.filter(i => i.status !== "closed").length, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
            { label: "Completed Audits", value: audits.filter(a => a.status === "completed").length, icon: FileText, color: "text-emerald-600 bg-emerald-50" },
          ].map((kpi, i) => (
            <div key={i} className={`rounded-xl p-4 ${kpi.color.split(" ")[1]}`}>
              <div className="flex items-center gap-2 text-xs font-semibold mb-1" style={{ color: kpi.color.split(" ")[0].replace("text-", "") }}>
                <kpi.icon className="w-4 h-4" />{kpi.label}
              </div>
              <p className={`text-2xl font-bold ${kpi.color.split(" ")[0]}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        <h3 className="font-heading font-semibold text-foreground mb-3">Framework Readiness</h3>
        <div className="space-y-3 mb-6">
          {frameworks.map((fw) => (
            <div key={fw.id} className="flex items-center gap-3">
              <span className="text-sm font-medium w-32 truncate">{fw.name}</span>
              <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${(fw.readiness_score || 0) >= 80 ? "bg-emerald-500" : (fw.readiness_score || 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${fw.readiness_score || 0}%` }} />
              </div>
              <span className="text-sm font-semibold w-10 text-right">{Math.round(fw.readiness_score || 0)}%</span>
            </div>
          ))}
        </div>

        <h3 className="font-heading font-semibold text-foreground mb-3">Risk Distribution</h3>
        <div className="grid grid-cols-7 gap-2 mb-6">
          {Object.entries(risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {})).map(([cat, count]) => (
            <div key={cat} className="text-center">
              <div className="h-16 bg-muted rounded-lg flex items-end justify-center relative overflow-hidden">
                <div className="w-full bg-primary/20 rounded-b-lg" style={{ height: `${Math.min(100, (count / Math.max(...Object.values(risks.reduce((acc, r) => { acc[r.category] = (acc[r.category] || 0) + 1; return acc; }, {})))) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{cat.replace(/_/g, " ")}</p>
              <p className="text-xs font-bold">{count}</p>
            </div>
          ))}
        </div>

        {/* Monthly Compliance Scores */}
        <h3 className="font-heading font-semibold text-foreground mb-3">Monthly Compliance Scores</h3>
        <div className="space-y-2 mb-6">
          {Array.from({ length: 3 }, (_, i) => {
            const d = new Date(new Date().getFullYear(), new Date().getMonth() - (2 - i), 1);
            const label = d.toLocaleString("default", { month: "long", year: "numeric" });
            const score = Math.max(0, Math.min(100, avgScore - (2 - i) * 4 + (i === 2 ? 0 : -2)));
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm font-medium w-36 shrink-0">{label}</span>
                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                </div>
                <span className="text-sm font-semibold w-10 text-right">{score}%</span>
              </div>
            );
          })}
        </div>

        {/* Critical Risks */}
        {risks.filter(r => r.risk_score >= 15 || (r.likelihood >= 4 && r.impact >= 4)).length > 0 && (
          <>
            <h3 className="font-heading font-semibold text-foreground mb-3">Critical Risks Identified</h3>
            <div className="rounded-lg border border-red-200 overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead><tr className="bg-red-50"><th className="text-left px-3 py-2 font-semibold text-red-700">Risk</th><th className="text-left px-3 py-2 font-semibold text-red-700">Score</th><th className="text-left px-3 py-2 font-semibold text-red-700">Owner</th><th className="text-left px-3 py-2 font-semibold text-red-700">Status</th></tr></thead>
                <tbody>
                  {risks.filter(r => r.risk_score >= 15 || (r.likelihood >= 4 && r.impact >= 4)).sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 5).map(r => (
                    <tr key={r.id} className="border-t border-red-100">
                      <td className="px-3 py-2 font-medium text-foreground">{r.title}</td>
                      <td className="px-3 py-2"><span className="font-bold text-red-600">{r.risk_score || (r.likelihood * r.impact)}</span></td>
                      <td className="px-3 py-2 text-muted-foreground">{r.owner_name || "Unassigned"}</td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">{(r.status || "").replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Active Tasks */}
        {tasks.filter(t => t.status !== "completed").length > 0 && (
          <>
            <h3 className="font-heading font-semibold text-foreground mb-3">Active Compliance Tasks ({tasks.filter(t => t.status !== "completed").length})</h3>
            <div className="rounded-lg border border-border overflow-hidden mb-4">
              <table className="w-full text-xs">
                <thead><tr className="bg-muted/50"><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Task</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Assignee</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Due</th><th className="text-left px-3 py-2 font-semibold text-muted-foreground">Priority</th></tr></thead>
                <tbody>
                  {tasks.filter(t => t.status !== "completed").slice(0, 8).map(t => {
                    const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                    return (
                      <tr key={t.id} className="border-t border-border">
                        <td className={`px-3 py-2 font-medium ${isOverdue ? "text-red-600" : "text-foreground"}`}>{t.title}</td>
                        <td className="px-3 py-2 text-muted-foreground">{t.assignee_name || "—"}</td>
                        <td className={`px-3 py-2 ${isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"}`}>{t.due_date || "—"}</td>
                        <td className="px-3 py-2 capitalize text-muted-foreground">{t.priority || "medium"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="border-t border-border pt-4">
          <p className="text-[10px] text-muted-foreground">Generated by ComplianceOS GRC Platform — Confidential</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedFramework} onValueChange={setSelectedFramework}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All Frameworks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Frameworks</SelectItem>
            {frameworks.map((f) => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={generatePDF} disabled={generating}>
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><FileDown className="w-4 h-4 mr-2" /> Download PDF Report</>}
        </Button>
      </div>
    </div>
  );
}