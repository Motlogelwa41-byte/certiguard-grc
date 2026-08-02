import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Printer, Shield, AlertTriangle, DollarSign, FileText } from "lucide-react";

const PRINT_CSS = `
  @media print {
    @page { size: A4; margin: 1.5cm; }
    body { background: white !important; }
    .print-hide { display: none !important; }
    .print-card { break-inside: avoid; box-shadow: none !important; border: 1px solid #cbd5e1 !important; }
    .print-page { padding: 0 !important; max-width: 100% !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`;

export default function ExecutiveReport() {
  const [frameworks, setFrameworks] = useState([]);
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      base44.entities.Framework.list(),
      base44.entities.Risk.list(),
      base44.entities.Control.list(),
    ]).then(([f, r, c]) => {
      setFrameworks(f || []);
      setRisks(r || []);
      setControls(c || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeFrameworks = frameworks.filter((f) => f.status !== "not_started" || f.total_controls > 0);
  const avgReadiness = activeFrameworks.length > 0
    ? Math.round(activeFrameworks.reduce((sum, f) => sum + (f.readiness_score || 0), 0) / activeFrameworks.length)
    : 0;

  const passingControls = controls.filter((c) => c.status === "passing").length;
  const totalControls = controls.length;
  const controlPct = totalControls > 0 ? Math.round((passingControls / totalControls) * 100) : 0;

  const compliancePct = activeFrameworks.length > 0
    ? Math.round(controlPct * 0.4 + avgReadiness * 0.6)
    : controlPct;

  // Traffic-light risk classification: Red / Yellow / Green
  const redRisks = risks.filter(
    (r) => (r.risk_score || 0) >= 20 || r.appetite_band === "unacceptable" || r.appetite_band === "above_appetite"
  );
  const yellowRisks = risks.filter(
    (r) => {
      const score = r.risk_score || 0;
      const band = r.appetite_band;
      return (score >= 10 && score < 20) || band === "tolerance_zone";
    }
  );
  const greenRisks = risks.filter(
    (r) => {
      const score = r.risk_score || 0;
      const band = r.appetite_band;
      return score < 10 && (band === "within_appetite" || !band);
    }
  );

  const criticalRisks = redRisks;
  const openCriticalRisks = criticalRisks.filter((r) => r.status === "open" || r.status === "mitigating");

  const totalALE = risks.reduce((sum, r) => sum + (Number(r.annualized_loss_expectancy) || 0), 0);

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
  const reportTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit",
  });

  const fmtCurrency = (val) => {
    if (val >= 1000000) return "$" + (val / 1000000).toFixed(2) + "M";
    if (val >= 1000) return "$" + (val / 1000).toFixed(1) + "K";
    return "$" + val.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="max-w-5xl mx-auto p-6 sm:p-8 print-page">
        {/* Action bar */}
        <div className="flex justify-end mb-4 print-hide">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print / Export PDF
          </button>
        </div>

        {/* Report header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6 print-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-500 text-xs uppercase tracking-wider font-semibold mb-1">
                <FileText className="h-4 w-4" />
                Executive Compliance Report
              </div>
              <h1 className="text-2xl font-bold text-slate-900">GRC Posture Summary</h1>
              <p className="text-sm text-slate-500 mt-1">
                Prepared for {user?.full_name || user?.email || "Executive Leadership"}
              </p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div className="font-semibold">{reportDate}</div>
              <div className="text-xs text-slate-400">{reportTime}</div>
            </div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Compliance % */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print-card">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Shield className="h-5 w-5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Compliance</span>
            </div>
            <div className="text-4xl font-bold text-slate-900">{compliancePct}%</div>
            <div className="text-sm text-slate-500 mt-1">
              Across {activeFrameworks.length} active {activeFrameworks.length === 1 ? "framework" : "frameworks"}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Controls passing</span>
                <span className="font-semibold text-slate-700">{passingControls}/{totalControls}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Avg framework readiness</span>
                <span className="font-semibold text-slate-700">{avgReadiness}%</span>
              </div>
            </div>
          </div>

          {/* Critical risks */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print-card">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Risks</span>
            </div>
            <div className="text-4xl font-bold text-slate-900">{criticalRisks.length}</div>
            <div className="text-sm text-slate-500 mt-1">
              {openCriticalRisks.length} open · {criticalRisks.length - openCriticalRisks.length} closed
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Total risks in register</span>
                <span className="font-semibold text-slate-700">{risks.length}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Threshold</span>
                <span className="font-semibold text-slate-700">Score {"\u2265"} 20</span>
              </div>
            </div>
          </div>

          {/* Total ALE */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 print-card">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Annual Loss</span>
            </div>
            <div className="text-4xl font-bold text-slate-900">{fmtCurrency(totalALE)}</div>
            <div className="text-sm text-slate-500 mt-1">
              Total Annualized Loss Expectancy
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Risks with ALE data</span>
                <span className="font-semibold text-slate-700">
                  {risks.filter((r) => Number(r.annualized_loss_expectancy) > 0).length}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Highest single ALE</span>
                <span className="font-semibold text-slate-700">
                  {fmtCurrency(Math.max(0, ...risks.map((r) => Number(r.annualized_loss_expectancy) || 0)))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Traffic-Light Summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 print-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Risk Traffic-Light Summary</h2>
            <p className="text-xs text-slate-500 mt-0.5">Distribution by risk score and appetite band</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-x divide-slate-100">
            {/* Red */}
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 mb-3">
                <div className="w-5 h-5 rounded-full bg-red-500" />
              </div>
              <div className="text-3xl font-bold text-red-600">{redRisks.length}</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">Red Risks</div>
              <div className="text-xs text-slate-500 mt-0.5">Score {"\u2265"} 20 · Above appetite</div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                {redRisks.filter((r) => r.status === "open" || r.status === "mitigating").length} open · {redRisks.filter((r) => r.status === "closed" || r.status === "accepted").length} resolved
              </div>
            </div>
            {/* Yellow */}
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 border-2 border-amber-200 mb-3">
                <div className="w-5 h-5 rounded-full bg-amber-500" />
              </div>
              <div className="text-3xl font-bold text-amber-600">{yellowRisks.length}</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">Yellow Risks</div>
              <div className="text-xs text-slate-500 mt-0.5">Score 10–19 · Tolerance zone</div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                {yellowRisks.filter((r) => r.status === "open" || r.status === "mitigating").length} open · {yellowRisks.filter((r) => r.status === "closed" || r.status === "accepted").length} resolved
              </div>
            </div>
            {/* Green */}
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-200 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-3xl font-bold text-emerald-600">{greenRisks.length}</div>
              <div className="text-sm font-semibold text-slate-700 mt-1">Green Risks</div>
              <div className="text-xs text-slate-500 mt-0.5">Score &lt; 10 · Within appetite</div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                {greenRisks.filter((r) => r.status === "open" || r.status === "mitigating").length} open · {greenRisks.filter((r) => r.status === "closed" || r.status === "accepted").length} resolved
              </div>
            </div>
          </div>
        </div>

        {/* Framework breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 print-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Framework Readiness Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                  <th className="text-left px-6 py-3 font-semibold">Framework</th>
                  <th className="text-left px-6 py-3 font-semibold">Status</th>
                  <th className="text-right px-6 py-3 font-semibold">Controls</th>
                  <th className="text-right px-6 py-3 font-semibold">Passing</th>
                  <th className="text-right px-6 py-3 font-semibold">Readiness</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeFrameworks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No active frameworks to display
                    </td>
                  </tr>
                ) : (
                  activeFrameworks.map((f) => {
                    const pct = f.readiness_score || 0;
                    const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {f.name}
                          {f.version && <span className="text-slate-400 ml-1">({f.version})</span>}
                        </td>
                        <td className="px-6 py-3">
                          <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (
                            f.status === "certified" ? "bg-emerald-100 text-emerald-700" :
                            f.status === "audit_ready" ? "bg-emerald-100 text-emerald-700" :
                            f.status === "in_progress" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {(f.status || "not_started").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600">{f.total_controls || 0}</td>
                        <td className="px-6 py-3 text-right text-slate-600">{f.passing_controls || 0}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={"h-full " + barColor + " rounded-full"} style={{ width: pct + "%" }} />
                            </div>
                            <span className="font-semibold text-slate-700 w-10 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical risk summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 print-card">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Critical Risk Summary</h2>
          </div>
          {criticalRisks.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">
              No critical risks identified — all risks are within acceptable thresholds
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Risk</th>
                    <th className="text-left px-6 py-3 font-semibold">Category</th>
                    <th className="text-left px-6 py-3 font-semibold">Owner</th>
                    <th className="text-right px-6 py-3 font-semibold">Score</th>
                    <th className="text-right px-6 py-3 font-semibold">ALE</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {criticalRisks.slice(0, 15).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{r.title}</td>
                      <td className="px-6 py-3 text-slate-600 capitalize">
                        {(r.category || "operational").replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-3 text-slate-600">{r.owner_name || "—"}</td>
                      <td className="px-6 py-3 text-right">
                        <span className="font-semibold text-red-600">{r.risk_score || 0}</span>
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {r.annualized_loss_expectancy ? fmtCurrency(Number(r.annualized_loss_expectancy)) : "—"}
                      </td>
                      <td className="px-6 py-3">
                        <span className={"inline-flex px-2 py-0.5 rounded-full text-xs font-medium " + (
                          r.status === "open" ? "bg-red-100 text-red-700" :
                          r.status === "mitigating" ? "bg-amber-100 text-amber-700" :
                          r.status === "accepted" ? "bg-slate-100 text-slate-600" :
                          "bg-emerald-100 text-emerald-700"
                        )}>
                          {(r.status || "open").replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticalRisks.length > 15 && (
                <div className="px-6 py-2 text-xs text-slate-400 text-center">
                  Showing 15 of {criticalRisks.length} critical risks
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 mt-8 text-center text-xs text-slate-400 print-card">
          <p>
            Generated by CertiGuard GRC Platform · {reportDate} at {reportTime} ·
            Confidential — For executive use only
          </p>
        </div>
      </div>
    </div>
  );
}