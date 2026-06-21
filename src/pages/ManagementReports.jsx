import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  FileText, Download, RefreshCw, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, Shield, Eye, Calendar,
  ChevronRight, BarChart3, Target, Activity, FileDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useTenant } from "@/lib/TenantContext";
import { useRBAC } from "@/lib/useRBAC";
import { useToast } from "@/components/ui/use-toast";
import { generateManagementReport } from "@/lib/generateReport";
import moment from "moment";

export default function ManagementReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { tenant } = useTenant();
  const { can, role } = useRBAC();
  const { toast } = useToast();

  const loadReports = useCallback(async () => {
    const data = await base44.entities.ManagementReport.list("-created_date", 50);
    setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const generateNow = async () => {
    setGenerating(true);
    toast({ title: "Generating report...", description: "Collecting data across all modules" });
    try {
      const reportData = await generateManagementReport(base44, tenant);
      const created = await base44.entities.ManagementReport.create(reportData);
      setReports(prev => [created, ...prev]);
      toast({ title: "Report ready", description: reportData.title });
    } catch (e) {
      toast({ title: "Generation failed", description: "Could not generate the report. Try again.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const exportReport = (report) => {
    const frameworkScores = JSON.parse(report.framework_readiness_scores || "{}");
    const topRisks = JSON.parse(report.top_risks || "[]");
    const criticalTasks = JSON.parse(report.critical_tasks || "[]");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${report.title}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; line-height: 1.6; }
  h1 { font-size: 24px; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
  h2 { font-size: 18px; margin-top: 30px; color: #1e40af; }
  .summary { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; }
  .score-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 14px; }
  .good { background: #dcfce7; color: #166534; } .warn { background: #fef3c7; color: #92400e; } .bad { background: #fee2e2; color: #991b1b; }
  .recommendations li { margin: 8px 0; }
  .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
</style></head><body>
<h1>📊 ${report.title}</h1>
<p><strong>Tenant:</strong> ${report.tenant_name || "N/A"} | <strong>Generated:</strong> ${moment(report.generated_at).format("MMMM D, YYYY [at] h:mm A")}</p>
<div class="summary">${report.executive_summary || ""}</div>

<h2>📋 Compliance Overview</h2>
<table><tr><th>Metric</th><th>Value</th></tr>
<tr><td>Compliance Score</td><td><span class="score-badge ${report.compliance_score >= 80 ? 'good' : report.compliance_score >= 50 ? 'warn' : 'bad'}">${report.compliance_score}%</span></td></tr>
<tr><td>Controls Passing</td><td>${report.controls_passing} / ${report.controls_total}</td></tr>
<tr><td>Risk Score</td><td>${report.risk_score}</td></tr>
</table>

<h2>✅ Tasks</h2>
<table><tr><th>Status</th><th>Count</th></tr>
<tr><td>Completed</td><td>${report.completed_tasks}</td></tr>
<tr><td>Pending</td><td>${report.pending_tasks}</td></tr>
<tr><td>Overdue</td><td style="color:${report.overdue_tasks > 0 ? '#dc2626' : 'inherit'}">${report.overdue_tasks}</td></tr>
</table>

<h2>🎯 Framework Readiness</h2>
<table><tr><th>Framework</th><th>Score</th></tr>
${Object.entries(frameworkScores).map(([name, score]) => `<tr><td>${name}</td><td><span class="score-badge ${score >= 80 ? 'good' : score >= 50 ? 'warn' : 'bad'}">${score}%</span></td></tr>`).join("")}
</table>

<h2>🔐 Security</h2>
<table><tr><th>Metric</th><th>Value</th></tr>
<tr><td>Login Successes</td><td>${report.login_successes}</td></tr>
<tr><td>Login Failures / Anomalies</td><td>${report.login_failures} / ${report.login_anomalies}</td></tr>
<tr><td>Incidents (Opened / Closed)</td><td>${report.incidents_opened} / ${report.incidents_closed}</td></tr>
</table>

<h2>⚠️ Top Risks</h2>
${topRisks.length > 0 ? `<table><tr><th>Risk</th><th>Score</th><th>Status</th></tr>${topRisks.map(r => `<tr><td>${r.title}</td><td>${r.score}</td><td>${r.status}</td></tr>`).join("")}</table>` : "<p>No risks recorded</p>"}

<h2>💡 Improvement Recommendations</h2>
<div class="recommendations">${(report.improvement_recommendations || "").split("\n").filter(l => l.trim()).map(l => `<p>${l}</p>`).join("")}</div>

<div class="footer">Confidential — Management Report | Generated by ComplianceOS | ${new Date().toISOString().slice(0, 10)}</div>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Report exported", description: "Management report downloaded as HTML" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // RBAC gate
  if (!can("reports:export")) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <Shield className="w-16 h-16 text-muted-foreground/30" />
        <h2 className="text-xl font-heading font-bold text-foreground">Restricted Access</h2>
        <p className="text-muted-foreground text-center max-w-md">Management Reports are only accessible to administrators, compliance officers, and risk managers.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Management Reports"
        subtitle="Monthly executive reports — activities, scores, risks, and recommendations"
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={generateNow} disabled={generating}>
              <RefreshCw className={`w-4 h-4 mr-1 ${generating ? "animate-spin" : ""}`} />
              {generating ? "Generating..." : "Generate Now"}
            </Button>
          </div>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No reports yet"
          description="Generate your first monthly management report to see compliance metrics, risk scores, and improvement recommendations."
          actionLabel="Generate First Report"
          onAction={generateNow}
        />
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const criticalTasks = JSON.parse(report.critical_tasks || "[]");
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{report.title}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {report.tenant_name && `${report.tenant_name} · `}
                          Generated {moment(report.generated_at).format("MMM D, YYYY · h:mm A")}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportReport(report)}>
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Score Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className={`text-2xl font-bold ${report.compliance_score >= 80 ? "text-emerald-600" : report.compliance_score >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {report.compliance_score}%
                      </div>
                      <div className="text-xs text-muted-foreground">Compliance</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-blue-600">{report.completed_tasks}</div>
                      <div className="text-xs text-muted-foreground">Completed Tasks</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className={`text-2xl font-bold ${report.overdue_tasks > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {report.overdue_tasks}
                      </div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-amber-600">{report.risks_open}</div>
                      <div className="text-xs text-muted-foreground">Open Risks</div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  {report.executive_summary && (
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{report.executive_summary}</p>
                  )}

                  {/* Critical Items */}
                  {criticalTasks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span><strong>{criticalTasks.length} critical tasks</strong> require attention: {criticalTasks.slice(0, 3).join(", ")}</span>
                    </div>
                  )}

                  {/* Recommendations preview */}
                  {report.improvement_recommendations && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Key Recommendations</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {(report.improvement_recommendations || "").split("\n").filter(l => l.trim()).slice(0, 3).map((rec, i) => (
                          <div key={i} className="flex items-start gap-1">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>{rec.replace(/^- /, "")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom meta */}
                  <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {report.audit_entries} activities</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {report.controls_passing}/{report.controls_total} controls passing</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.pending_tasks} pending</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}