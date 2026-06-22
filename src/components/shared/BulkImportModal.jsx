import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";

/**
 * Generic bulk import modal. Parses CSV, maps columns, and creates entity records.
 * Props:
 *   open, onOpenChange, entityName, columns: [{key, label, required, transform}], onSuccess, sampleRows
 */
export default function BulkImportModal({ open, onOpenChange, entityName, columns, onSuccess, sampleRows }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef();
  const { toast } = useToast();

  const reset = () => { setFile(null); setPreview([]); setErrors([]); setResult(null); };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const vals = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQ = !inQ; }
        else if (line[i] === "," && !inQ) { vals.push(cur.trim()); cur = ""; }
        else { cur += line[i]; }
      }
      vals.push(cur.trim());
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
    });
    return { headers, rows };
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows } = parseCSV(ev.target.result);
      const errs = [];
      const mapped = rows.map((row, idx) => {
        const record = {};
        columns.forEach(({ key, label, required, transform }) => {
          const val = row[label] ?? row[key] ?? "";
          if (required && !val) errs.push(`Row ${idx + 2}: missing required field "${label}"`);
          record[key] = transform ? transform(val) : val || undefined;
        });
        return record;
      });
      setErrors(errs);
      setPreview(mapped.slice(0, 5));
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file || errors.length > 0) return;
    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const { rows } = parseCSV(ev.target.result);
      const mapped = rows.map((row) => {
        const record = {};
        columns.forEach(({ key, label, transform }) => {
          const val = row[label] ?? row[key] ?? "";
          record[key] = transform ? transform(val) : val || undefined;
        });
        return record;
      });
      let success = 0, failed = 0;
      for (const record of mapped) {
        try { await base44.entities[entityName].create(record); success++; }
        catch { failed++; }
      }
      setResult({ success, failed });
      setImporting(false);
      if (success > 0) { onSuccess?.(); toast({ title: `Imported ${success} records` }); }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const header = columns.map((c) => c.label).join(",");
    const sample = (sampleRows || [columns.reduce((a, c) => ({ ...a, [c.label]: c.example || "" }), {})]);
    const rows = sample.map((r) => columns.map((c) => r[c.label] ?? "").join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${entityName.toLowerCase()}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Bulk Import {entityName}s</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Upload a CSV file to import multiple records at once.</p>
            <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-3.5 h-3.5 mr-1" /> Template</Button>
          </div>

          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium">{file ? file.name : "Click to upload CSV"}</p>
            <p className="text-xs text-muted-foreground mt-1">CSV files only</p>
            <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>

          {errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 5).map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />{e}</div>
              ))}
              {errors.length > 5 && <p className="text-xs text-destructive">...and {errors.length - 5} more errors</p>}
            </div>
          )}

          {preview.length > 0 && errors.length === 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Preview (first {preview.length} rows)</p>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-xs">
                  <thead><tr className="bg-muted/50">{columns.slice(0, 4).map((c) => <th key={c.key} className="px-3 py-2 text-left font-medium">{c.label}</th>)}</tr></thead>
                  <tbody>{preview.map((row, i) => <tr key={i} className="border-t border-border">{columns.slice(0, 4).map((c) => <td key={c.key} className="px-3 py-2 truncate max-w-[120px]">{String(row[c.key] ?? "—")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {result && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-medium">{result.success} imported{result.failed > 0 ? `, ${result.failed} failed` : ""}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => { onOpenChange(false); reset(); }}>Cancel</Button>
            <Button className="flex-1" onClick={handleImport} disabled={!file || errors.length > 0 || importing || !!result}>
              {importing ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}