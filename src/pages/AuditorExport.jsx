import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileDown, FileSpreadsheet, FileText, Shield, Paperclip, Loader2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { exportAuditorExcel, exportFrameworkProgressCsv, exportEvidenceTrackingCsv, gatherAuditorData } from "@/lib/auditorExport";
import { exportEvidencePack } from "@/lib/exportEvidencePack";
import { useToast } from "@/components/ui/use-toast";

export default function AuditorExport() {
  const { toast } = useToast();
  const [frameworks, setFrameworks] = useState([]);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    gatherAuditorData()
      .then(({ frameworks, controls, evidence }) => {
        setFrameworks(frameworks || []);
        setControls(controls || []);
        setEvidence(evidence || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCombinedExcel = () => {
    setExporting("excel");
    try {
      exportAuditorExcel(frameworks, controls, evidence);
      toast({ title: "Auditor pack exported (Excel)" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  const handleFwCsv = () => {
    setExporting("fw-csv");
    try {
      exportFrameworkProgressCsv(frameworks, controls);
      toast({ title: "Framework progress exported (CSV)" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  const handleEvCsv = () => {
    setExporting("ev-csv");
    try {
      exportEvidenceTrackingCsv(evidence);
      toast({ title: "Evidence tracking exported (CSV)" });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  const handlePdf = async () => {
    setExporting("pdf");
    try {
      await exportEvidencePack();
      toast({ title: "Evidence pack PDF generated" });
    } catch (e) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const fwCount = frameworks.length;
  const ctlCount = controls.length;
  const evCount = evidence.length;
  const passingCtl = controls.filter((c) => c.status === "passing").length;
  const approvedEv = evidence.filter((e) => e.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditor Export"
        subtitle="Export framework progress and evidence tracking records into a clean file for external auditors."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <Shield className="w-6 h-6 text-blue-600 mb-2" />
          <div className="text-3xl font-heading font-bold text-foreground">{fwCount}</div>
          <div className="text-sm font-medium text-foreground">Frameworks</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <FileText className="w-6 h-6 text-emerald-600 mb-2" />
          <div className="text-3xl font-heading font-bold text-foreground">{ctlCount}</div>
          <div className="text-sm font-medium text-foreground">Controls ({passingCtl} passing)</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <Paperclip className="w-6 h-6 text-purple-600 mb-2" />
          <div className="text-3xl font-heading font-bold text-foreground">{evCount}</div>
          <div className="text-sm font-medium text-foreground">Evidence ({approvedEv} approved)</div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <FileDown className="w-6 h-6 text-amber-600 mb-2" />
          <div className="text-3xl font-heading font-bold text-foreground">{fwCount + evCount}</div>
          <div className="text-sm font-medium text-foreground">Total Records</div>
        </div>
      </div>

      {/* Export options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Combined Excel */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Combined Auditor Pack (Excel)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Single Excel file with two sheets: Framework Progress and Evidence Tracking. Includes an overall summary row.
              </p>
            </div>
          </div>
          <button
            onClick={handleCombinedExcel}
            disabled={exporting === "excel"}
            className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-white bg-primary rounded-lg px-4 py-2.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {exporting === "excel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Excel Pack
          </button>
        </div>

        {/* Framework Progress CSV */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Framework Progress (CSV)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Framework name, status, readiness %, total/passing/failing/untested controls, certification and expiry dates.
              </p>
            </div>
          </div>
          <button
            onClick={handleFwCsv}
            disabled={exporting === "fw-csv"}
            className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-4 py-2.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {exporting === "fw-csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export Framework CSV
          </button>
        </div>

        {/* Evidence Tracking CSV */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
              <Paperclip className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Evidence Tracking (CSV)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Evidence title, linked control, type, status, collection/expiry dates, reviewer, file name, and notes.
              </p>
            </div>
          </div>
          <button
            onClick={handleEvCsv}
            disabled={exporting === "ev-csv"}
            className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-4 py-2.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {exporting === "ev-csv" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Export Evidence CSV
          </button>
        </div>

        {/* Evidence Pack PDF */}
        <div className="bg-card rounded-xl border border-border p-6 flex flex-col">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-rose-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-foreground">Evidence Pack (PDF)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Branded PDF with compliance status summary, frameworks, risks, and full audit trail — suitable for auditor/board review.
              </p>
            </div>
          </div>
          <button
            onClick={handlePdf}
            disabled={exporting === "pdf"}
            className="mt-auto inline-flex items-center justify-center gap-2 text-sm font-medium text-foreground bg-card border border-border rounded-lg px-4 py-2.5 hover:bg-muted transition-colors disabled:opacity-50"
          >
            {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Generate PDF Pack
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        All exports reflect the current live data in your tenant. For scheduled or recurring exports, use the Scheduled Reports page to automate delivery.
      </p>
    </div>
  );
}