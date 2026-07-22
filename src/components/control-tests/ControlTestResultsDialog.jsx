import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

function fmtDateTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

export default function ControlTestResultsDialog({ test, open, onOpenChange }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !test) return;
    setLoading(true);
    base44.entities.ControlTestResult.filter({ test_id: test.id }, "-run_at", 30)
      .then((r) => setResults(r || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [open, test]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Run history — {test?.title}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No runs recorded yet. Click “Run now” to execute this test.</p>
        ) : (
          <div className="space-y-3">
            {results.map((r) => {
              let details = [];
              try { details = JSON.parse(r.details || "[]"); } catch (_) { details = []; }
              return (
                <div key={r.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{fmtDateTime(r.run_at)}</span>
                    <StatusBadge status={r.result === "pass" ? "passing" : r.result === "fail" ? "failing" : "draft"} />
                  </div>
                  <p className="text-sm text-foreground">{r.summary}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.fail_count} failing · {r.controls_updated?.length || 0} controls updated · {r.evidence_created} evidence · by {r.triggered_by}
                  </p>
                  {details.length > 0 && (
                    <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                      {details.slice(0, 10).map((d, i) => <li key={i}>{d}</li>)}
                      {details.length > 10 && <li className="text-muted-foreground">…and {details.length - 10} more</li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}