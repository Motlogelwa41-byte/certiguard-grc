import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { FileDown, FileSpreadsheet, FileText, Shield, Paperclip, Loader2, FileLock, Download } from "lucide-react";
import { exportAuditorExcel, exportFrameworkProgressCsv, exportEvidenceTrackingCsv } from "@/lib/auditorExport";
import { exportEvidencePack } from "@/lib/exportEvidencePack";

export default function EvidencePacksTab({ frameworks, controls, evidence }) {
  const { toast } = useToast();
  const [ledger, setLedger] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    base44.entities.AuditEvidenceLedger.list("-timestamp", 100)
      .then((entries) => setLedger(entries || []))
      .catch(() => toast({ title: "Failed to load evidence ledger", variant: "destructive" }))
      .finally(() => setLoadingLedger(false));
  }, []);

  const handleExcel = () => {
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
      // Refresh ledger to show the new entry
      base44.entities.AuditEvidenceLedger.list("-timestamp", 100)
        .then((entries) => setLedger(entries || []));
    } catch (e) {
      toast({ title: "PDF export failed", description: e.message, variant: "destructive" });
    }
    setExporting(null);
  };

  return (
    <div className="space-y-6">
      {/* Timestamped Evidence Packs from Ledger */}
      <div>
        <h3 className="text-sm font-heading font-bold text-foreground mb-2 flex items-center gap-2">
          <FileLock className="w-4 h-4 text-emerald-600" /> Timestamped Evidence Packs
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tamper-evident evidence packs sealed with SHA-256 file hashes. Each pack is logged to the append-only audit ledger with a timestamp for integrity verification.
        </p>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Timestamp</th>
                  <th className="text-left px-4 py-3">File</th>
                  <th className="text-left px-4 py-3">SHA-256 Hash</th>
                  <th className="text-left px-4 py-3">Submitted By</th>
                  <th className="text-right px-4 py-3">Download</th>
                </tr>
              </thead>
              <tbody>
                {loadingLedger ? (
                  <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
                ) : ledger.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No evidence packs generated yet. Use the PDF generator below to create one.</td></tr>
                ) : (
                  ledger.map((entry) => (
                    <tr key={entry.id} className="border-t border-border hover:bg-accent/30">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
                      </td>
                      <td className="px-4 py-3 font-medium">{entry.file_name || "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground max-w-[200px] truncate" title={entry.sha256_hash}>
                        {entry.sha256_hash ? `${entry.sha256_hash.slice(0, 16)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{entry.user_name || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {entry.file_url ? (
                          <a href={entry.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Download className="w-3.5 h-3.5" /> Download
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Control Documentation Exports */}
      <div>
        <h3 className="text-sm font-heading font-bold text-foreground mb-2 flex items-center gap-2">
          <FileDown className="w-4 h-4 text-blue-600" /> Control Documentation Exports
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Export framework progress, evidence tracking, and full evidence packs for offline review. All exports reflect the controls and evidence within your engagement scope.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Excel */}
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Auditor Pack</p>
                <p className="text-xs text-muted-foreground">Excel · 2 sheets</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Framework progress + evidence tracking in one file.</p>
            <button onClick={handleExcel} disabled={exporting === "excel"} className="mt-auto inline-flex items-center justify-center gap-2 text-xs font-medium text-white bg-primary rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50">
              {exporting === "excel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} Export Excel
            </button>
          </div>
          {/* Framework CSV */}
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Framework Progress</p>
                <p className="text-xs text-muted-foreground">CSV</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Status, readiness %, control counts.</p>
            <button onClick={handleFwCsv} disabled={exporting === "fw-csv"} className="mt-auto inline-flex items-center justify-center gap-2 text-xs font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted disabled:opacity-50">
              {exporting === "fw-csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Export CSV
            </button>
          </div>
          {/* Evidence CSV */}
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                <Paperclip className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Evidence Tracking</p>
                <p className="text-xs text-muted-foreground">CSV</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Evidence list, controls, dates, reviewers.</p>
            <button onClick={handleEvCsv} disabled={exporting === "ev-csv"} className="mt-auto inline-flex items-center justify-center gap-2 text-xs font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted disabled:opacity-50">
              {exporting === "ev-csv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} Export CSV
            </button>
          </div>
          {/* PDF Pack */}
          <div className="bg-card rounded-xl border border-border p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Evidence Pack</p>
                <p className="text-xs text-muted-foreground">PDF · sealed</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Branded PDF with audit trail for review.</p>
            <button onClick={handlePdf} disabled={exporting === "pdf"} className="mt-auto inline-flex items-center justify-center gap-2 text-xs font-medium text-foreground bg-card border border-border rounded-lg px-3 py-2 hover:bg-muted disabled:opacity-50">
              {exporting === "pdf" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />} Generate PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}