import React, { forwardRef } from "react";
import moment from "moment";

// A clean, branded, light-themed summary designed specifically for PDF export.
// Contains ONLY the risk heatmap and control status — no navigation, no dark
// theme, no charts that depend on CSS variables. Rendered off-screen and
// captured by html2canvas via exportElementToPDF.

const SEVERITY_COLORS = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981" };
const STATUS_COLORS = { passing: "#10b981", failing: "#ef4444", not_tested: "#6b7280", not_applicable: "#94a3b8" };

const StakeholderRiskSummary = forwardRef(({ controls = [], risks = [], frameworks = [], tenantName = "CertiGuard GRC" }, ref) => {
  const total = controls.length;
  const passing = controls.filter((c) => c.status === "passing").length;
  const failing = controls.filter((c) => c.status === "failing").length;
  const not_tested = controls.filter((c) => c.status === "not_tested").length;
  const not_applicable = controls.filter((c) => c.status === "not_applicable").length;
  const passRate = total ? Math.round((passing / total) * 100) : 0;

  const openRisks = risks.filter((r) => r.status === "open" || r.status === "mitigating");
  const avgScore = risks.length
    ? Math.round(risks.reduce((s, r) => s + (r.risk_score || (r.likelihood || 3) * (r.impact || 3)), 0) / risks.length * 10) / 10
    : 0;
  const topRisks = [...openRisks].sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 8);

  // Risk heatmap grid: 5x5 (likelihood × impact)
  const heatmap = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => {
      const lik = 5 - i; // rows top=5, bottom=1
      const imp = j + 1; // cols left=1, right=5
      const score = lik * imp;
      const count = openRisks.filter((r) => {
        const s = r.risk_score || (r.likelihood || 3) * (r.impact || 3);
        return s === score;
      }).length;
      return { lik, imp, score, count };
    })
  );

  const heatColor = (score) => {
    if (score >= 15) return "#ef4444";
    if (score >= 10) return "#f97316";
    if (score >= 5) return "#f59e0b";
    return "#10b981";
  };

  const scoreColor = passRate >= 80 ? "#10b981" : passRate >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div ref={ref} className="bg-white text-slate-900 p-8" style={{ width: "800px" }}>
      {/* Branded header */}
      <div style={{ borderBottom: "3px solid #1e3a5f", paddingBottom: "16px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#1e3a5f", margin: 0 }}>Risk & Control Summary</h1>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>{tenantName} · Stakeholder Briefing · {moment().format("DD MMMM YYYY")}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: "32px", fontWeight: 900, color: scoreColor, margin: 0, lineHeight: 1 }}>{passRate}%</p>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "2px 0 0" }}>Control Pass Rate</p>
          </div>
        </div>
      </div>

      {/* Top metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Controls", value: total, color: "#1e3a5f" },
          { label: "Passing", value: passing, color: "#10b981" },
          { label: "Failing", value: failing, color: "#ef4444" },
          { label: "Open Risks", value: openRisks.length, color: openRisks.length > 5 ? "#ef4444" : "#f59e0b" },
        ].map((m) => (
          <div key={m.label} style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px" }}>
            <p style={{ fontSize: "28px", fontWeight: 800, color: m.color, margin: 0, lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontSize: "11px", color: "#64748b", margin: "4px 0 0" }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Risk Heatmap + Control Status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
        {/* Risk Heatmap */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e3a5f", marginBottom: "12px" }}>Risk Heatmap</h2>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 12px" }}>Likelihood × Impact distribution of open risks</p>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ fontSize: "9px", color: "#94a3b8", padding: "2px" }}></th>
                {[1, 2, 3, 4, 5].map((imp) => (
                  <th key={imp} style={{ fontSize: "9px", color: "#64748b", padding: "2px", textAlign: "center" }}>I{imp}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.map((row, ri) => (
                <tr key={ri}>
                  <td style={{ fontSize: "9px", color: "#64748b", padding: "2px", textAlign: "center", whiteSpace: "nowrap" }}>L{5 - ri}</td>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "2px" }}>
                      <div style={{
                        background: cell.count > 0 ? heatColor(cell.score) : "#f1f5f9",
                        color: cell.count > 0 ? "#fff" : "#cbd5e1",
                        borderRadius: "4px",
                        width: "100%",
                        height: "32px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}>
                        {cell.count > 0 ? cell.count : "·"}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", fontSize: "9px", color: "#64748b" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ width: "10px", height: "10px", background: "#10b981", borderRadius: "2px" }} />Low</span>
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ width: "10px", height: "10px", background: "#f59e0b", borderRadius: "2px" }} />Medium</span>
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ width: "10px", height: "10px", background: "#f97316", borderRadius: "2px" }} />High</span>
            <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><span style={{ width: "10px", height: "10px", background: "#ef4444", borderRadius: "2px" }} />Critical</span>
          </div>
        </div>

        {/* Control Status Distribution */}
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e3a5f", marginBottom: "12px" }}>Control Status</h2>
          <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 12px" }}>Current health of all {total} controls</p>
          {[
            { label: "Passing", value: passing, color: STATUS_COLORS.passing, pct: total ? Math.round((passing / total) * 100) : 0 },
            { label: "Failing", value: failing, color: STATUS_COLORS.failing, pct: total ? Math.round((failing / total) * 100) : 0 },
            { label: "Not Tested", value: not_tested, color: STATUS_COLORS.not_tested, pct: total ? Math.round((not_tested / total) * 100) : 0 },
            { label: "N/A", value: not_applicable, color: STATUS_COLORS.not_applicable, pct: total ? Math.round((not_applicable / total) * 100) : 0 },
          ].map((s) => (
            <div key={s.label} style={{ marginBottom: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                <span style={{ color: "#475569", fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: "#1e3a5f", fontWeight: 700 }}>{s.value} ({s.pct}%)</span>
              </div>
              <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "10px", overflow: "hidden" }}>
                <div style={{ background: s.color, height: "100%", width: `${s.pct}%`, borderRadius: "4px" }} />
              </div>
            </div>
          ))}
          {total === 0 && <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "24px 0" }}>No controls configured</p>}
        </div>
      </div>

      {/* Top open risks table */}
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e3a5f", marginBottom: "8px" }}>Top Open Risks</h2>
        {topRisks.length === 0 ? (
          <p style={{ fontSize: "12px", color: "#94a3b8", padding: "16px 0" }}>No open risks.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#475569", borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>Risk</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#475569", borderBottom: "1px solid #e2e8f0", fontWeight: 600, width: "80px" }}>Score</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#475569", borderBottom: "1px solid #e2e8f0", fontWeight: 600, width: "90px" }}>Severity</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: "#475569", borderBottom: "1px solid #e2e8f0", fontWeight: 600, width: "90px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {topRisks.map((r) => {
                const score = r.risk_score || (r.likelihood || 3) * (r.impact || 3);
                const sev = score >= 15 ? "critical" : score >= 10 ? "high" : score >= 5 ? "medium" : "low";
                return (
                  <tr key={r.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}>{r.title}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, color: heatColor(score) }}>{score}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ background: SEVERITY_COLORS[sev], color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: 600, textTransform: "capitalize" }}>{sev}</span>
                    </td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#64748b", textTransform: "capitalize" }}>{r.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Framework readiness summary */}
      {frameworks.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1e3a5f", marginBottom: "8px" }}>Framework Readiness</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <tbody>
              {frameworks.map((f) => {
                const score = f.readiness_score || 0;
                return (
                  <tr key={f.id}>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" }}>{f.name}</td>
                    <td style={{ padding: "6px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right", width: "120px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "flex-end" }}>
                        <div style={{ background: "#f1f5f9", borderRadius: "4px", height: "8px", width: "80px", overflow: "hidden" }}>
                          <div style={{ background: heatColor(score), height: "100%", width: `${score}%`, borderRadius: "4px" }} />
                        </div>
                        <span style={{ fontWeight: 700, color: heatColor(score), minWidth: "32px" }}>{score}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "10px", fontSize: "9px", color: "#94a3b8" }}>
        Confidential — Stakeholder Risk & Control Summary · Generated by CertiGuard GRC · {moment().format("YYYY-MM-DD")} · Avg risk score: {avgScore}
      </div>
    </div>
  );
});

StakeholderRiskSummary.displayName = "StakeholderRiskSummary";
export default StakeholderRiskSummary;