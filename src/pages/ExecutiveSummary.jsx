import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import { exportToCsv, exportToExcel } from "@/lib/exportCsv";
import { exportElementToPDF } from "@/lib/boardReportExport";
import { FileDown, FileSpreadsheet, Printer, RefreshCw } from "lucide-react";
import moment from "moment";

export default function ExecutiveSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef(null);
  const { tenant } = useTenant();
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [controls, frameworks] = await Promise.all([
        base44.entities.Control.list(),
        base44.entities.Framework.list().catch(() => []),
      ]);

      const passing = controls.filter((c) => c.status === "passing").length;
      const failing = controls.filter((c) => c.status === "failing").length;
      const notTested = controls.filter((c) => c.status === "not_tested").length;
      const notApplicable = controls.filter((c) => c.status === "not_applicable").length;
      const total = controls.length;
      const complianceScore = total > 0 ? Math.round((passing / total) * 100) : 0;

      const frameworkRows = (frameworks || []).map((fw) => {
        const pct = fw.total_controls > 0
          ? Math.round((fw.passing_controls / fw.total_controls) * 100)
          : fw.readiness_score || 0;
        const fwControls = controls.filter((c) =>
          c.framework_ids?.includes(fw.id) || c.framework_names?.includes(fw.name)
        );
        return {
          framework: fw.name,
          version: fw.version || "—",
          status: fw.status || "—",
          total_controls: fw.total_controls || 0,
          passing: fw.passing_controls || 0,
          readiness_pct: pct,
          failing: fwControls.filter((c) => c.status === "failing").length,
          untested: fwControls.filter((c) => c.status === "not_tested").length,
          certification_date: fw.certification_date || "—",
          expiry_date: fw.expiry_date || "—",
        };
      });

      const categories = {};
      controls.forEach((c) => {
        const cat = c.category || "uncategorized";
        if (!categories[cat]) categories[cat] = { passing: 0, failing: 0, not_tested: 0, not_applicable: 0, total: 0 };
        categories[cat].total++;
        const key = c.status === "not_tested" ? "not_tested" : c.status === "not_applicable" ? "not_applicable" : c.status === "passing" ? "passing" : c.status === "failing" ? "failing" : null;
        if (key && categories[cat][key] !== undefined) categories[cat][key]++;
      });
      const categoryRows = Object.entries(categories).map(([cat, counts]) => ({
        category: cat.replace(/_/g, " "),
        ...counts,
        readiness: counts.total > 0 ? Math.round((counts.passing / counts.total) * 100) : 0,
      })).sort((a, b) => b.total - a.total);

      setData({
        complianceScore,
        passing, failing, notTested, notApplicable, total,
        frameworkCount: frameworks.length,
        frameworkRows,
        categoryRows,
      });
    } catch (e) {
      toast({ title: "Failed to load report data", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCsv = () => {
    const rows = [
      { Section: "OVERALL", Framework: "—", Readiness_Pct: data.complianceScore, Passing: data.passing, Failing: data.failing, Untested: data.notTested, Total: data.total },
      ...data.frameworkRows.map((r) => ({
        Section: "Framework", Framework: `${r.framework} (${r.version})`, Readiness_Pct: r.readiness_pct,
        Passing: r.passing, Failing: r.failing, Untested: r.untested, Total: r.total_controls,
      })),
      ...data.categoryRows.map((r) => ({
        Section: "Control Category", Framework: r.category, Readiness_Pct: r.readiness,
        Passing: r.passing, Failing: r.failing, Untested: r.not_tested, Total: r.total,
      })),
    ];
    exportToCsv(rows, `executive-compliance-summary-${moment().format("YYYY-MM-DD")}`);
  };

  const handleExcel = () => {
    exportToExcel(data.frameworkRows, `framework-readiness-${moment().format("YYYY-MM-DD")}`);
  };

  const handlePdf = async () => {
    if (!printRef.current) return;
    setExporting(true);
    try {
      await exportElementToPDF(printRef.current, {
        filename: `Executive_Compliance_Summary_${moment().format("YYYY-MM-DD")}.pdf`,
        title: "Executive Compliance Summary",
        subtitle: tenant?.name || "CertiGuard GRC",
      });
      toast({ title: "Executive summary PDF exported" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const scoreColor = data.complianceScore >= 80 ? "#10b981" : data.complianceScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div>
      <PageHeader
        title="Executive Compliance Summary"
        subtitle="One-page readiness snapshot for executive distribution — frameworks + control status aggregated."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={handleCsv}>
              <FileDown className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button size="sm" variant="outline" onClick={handleExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Print
            </Button>
            <Button size="sm" onClick={handlePdf} disabled={exporting}>
              {exporting ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />} Download PDF
            </Button>
          </div>
        }
      />

      <div ref={printRef} className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-8 space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight">Executive Compliance Summary</h1>
          <p className="text-sm text-slate-500 mt-1">
            {tenant?.name || "CertiGuard GRC"} · Generated {moment().format("DD MMMM YYYY [at] HH:mm")} · Confidential
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border border-slate-200 rounded-lg p-4 text-center">
            <div className="text-4xl font-bold" style={{ color: scoreColor }}>{data.complianceScore}%</div>
            <div className="text-xs text-slate-500 mt-1">Overall Compliance</div>
          </div>
          <Metric label="Controls Passing" value={`${data.passing} / ${data.total}`} color="#10b981" />
          <Metric label="Failing" value={data.failing} color={data.failing > 0 ? "#ef4444" : "#10b981"} />
          <Metric label="Untested" value={data.notTested} color={data.notTested > 0 ? "#f59e0b" : "#10b981"} />
          <Metric label="Frameworks" value={data.frameworkCount} color="#1e293b" />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Framework Readiness</h2>
          {data.frameworkRows.length === 0 ? (
            <p className="text-sm text-slate-400">No frameworks configured.</p>
          ) : (
            <table className="w-full text-sm border border-slate-200 rounded">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2 font-medium">Framework</th>
                  <th className="text-left p-2 font-medium w-24">Status</th>
                  <th className="text-right p-2 font-medium w-20">Controls</th>
                  <th className="text-right p-2 font-medium w-16">Pass</th>
                  <th className="text-right p-2 font-medium w-16">Fail</th>
                  <th className="text-right p-2 font-medium w-24">Readiness</th>
                  <th className="text-left p-2 font-medium w-32">Cert Date</th>
                  <th className="text-left p-2 font-medium w-32">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {data.frameworkRows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 font-medium">{r.framework} <span className="text-xs text-slate-400">{r.version}</span></td>
                    <td className="p-2 capitalize text-xs">{r.status.replace(/_/g, " ")}</td>
                    <td className="p-2 text-right">{r.total_controls}</td>
                    <td className="p-2 text-right text-emerald-600 font-medium">{r.passing}</td>
                    <td className="p-2 text-right text-rose-600 font-medium">{r.failing}</td>
                    <td className="p-2 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: r.readiness_pct >= 80 ? "#dcfce7" : r.readiness_pct >= 50 ? "#fef3c7" : "#fee2e2",
                        color: r.readiness_pct >= 80 ? "#166534" : r.readiness_pct >= 50 ? "#92400e" : "#991b1b",
                      }}>
                        {r.readiness_pct}%
                      </span>
                    </td>
                    <td className="p-2 text-xs">{r.certification_date}</td>
                    <td className="p-2 text-xs">{r.expiry_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div>
          <h2 className="text-base font-semibold mb-2">Control Status by Category</h2>
          {data.categoryRows.length === 0 ? (
            <p className="text-sm text-slate-400">No controls configured.</p>
          ) : (
            <table className="w-full text-sm border border-slate-200 rounded">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left p-2 font-medium">Category</th>
                  <th className="text-right p-2 font-medium w-16">Total</th>
                  <th className="text-right p-2 font-medium w-16">Pass</th>
                  <th className="text-right p-2 font-medium w-16">Fail</th>
                  <th className="text-right p-2 font-medium w-16">Untested</th>
                  <th className="text-right p-2 font-medium w-24">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {data.categoryRows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="p-2 capitalize">{r.category}</td>
                    <td className="p-2 text-right">{r.total}</td>
                    <td className="p-2 text-right text-emerald-600 font-medium">{r.passing}</td>
                    <td className="p-2 text-right text-rose-600 font-medium">{r.failing}</td>
                    <td className="p-2 text-right text-amber-600 font-medium">{r.not_tested}</td>
                    <td className="p-2 text-right">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                        background: r.readiness >= 80 ? "#dcfce7" : r.readiness >= 50 ? "#fef3c7" : "#fee2e2",
                        color: r.readiness >= 80 ? "#166534" : r.readiness >= 50 ? "#92400e" : "#991b1b",
                      }}>
                        {r.readiness}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-2">
          Confidential — Executive Compliance Summary · Generated by CertiGuard GRC · {moment().format("YYYY-MM-DD")}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, color = "#0f172a" }) {
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}