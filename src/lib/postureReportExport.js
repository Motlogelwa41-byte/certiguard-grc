import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";

/**
 * Builds a rich HTML string for the Compliance Posture Report.
 * Includes: executive summary, KPIs, trend charts (SVG), critical risks table,
 * failing controls table, framework readiness, evidence trend, recommendations.
 */
export function generatePostureReportHTML({ controls, risks, evidence, tasks, frameworks, generatedBy = "ComplianceOS" }) {
  const now = new Date();

  // ── Core metrics ──────────────────────────────────────────────────────────
  const passing   = controls.filter(c => c.status === "passing").length;
  const failing   = controls.filter(c => c.status === "failing").length;
  const total     = controls.length;
  const compScore = total > 0 ? Math.round((passing / total) * 100) : 0;

  const openRisks     = risks.filter(r => r.status !== "closed");
  const criticalRisks = openRisks
    .filter(r => (r.likelihood || 1) * (r.impact || 1) >= 15)
    .sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));

  const overdueTasks  = tasks.filter(t => t.due_date && t.status !== "completed" && new Date(t.due_date) < now).length;
  const pendingTasks  = tasks.filter(t => t.status === "todo" || t.status === "in_progress").length;

  // ── Evidence 6-month trend ────────────────────────────────────────────────
  const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
  const evidenceTrend = months.map(m => {
    const start = startOfMonth(m);
    const end   = endOfMonth(m);
    const count = evidence.filter(e => {
      try { const d = parseISO(e.created_date); return d >= start && d <= end; } catch { return false; }
    }).length;
    return { label: format(m, "MMM yy"), count };
  });

  const thisMonthEvidence = evidenceTrend[5].count;
  const lastMonthEvidence = evidenceTrend[4].count;

  // ── Risk score 6-month trend (simulated from created_date buckets) ────────
  const riskTrend = months.map(m => {
    const start = startOfMonth(m);
    const end   = endOfMonth(m);
    const bucket = risks.filter(r => {
      try { const d = parseISO(r.created_date); return d >= start && d <= end; } catch { return false; }
    });
    const avgScore = bucket.length > 0
      ? Math.round(bucket.reduce((s, r) => s + (r.likelihood || 3) * (r.impact || 3), 0) / bucket.length)
      : 0;
    return { label: format(m, "MMM yy"), score: avgScore };
  });

  // ── Framework readiness ───────────────────────────────────────────────────
  const fwData = frameworks.map(f => ({
    name: f.name,
    score: f.readiness_score || (f.total_controls > 0 ? Math.round((f.passing_controls / f.total_controls) * 100) : 0),
  })).sort((a, b) => b.score - a.score);

  // ── Recommendations ───────────────────────────────────────────────────────
  const recs = [];
  if (failing > 0)           recs.push(`Remediate <strong>${failing} failing control${failing > 1 ? "s" : ""}</strong> — prioritise critical and high-severity items.`);
  if (criticalRisks.length)  recs.push(`Actively mitigate <strong>${criticalRisks.length} critical/high risk${criticalRisks.length > 1 ? "s" : ""}</strong> — these carry the highest exposure scores.`);
  if (overdueTasks > 0)      recs.push(`Clear <strong>${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}</strong> — assign clear ownership and new deadlines.`);
  if (thisMonthEvidence < lastMonthEvidence) recs.push(`Evidence submissions dropped from <strong>${lastMonthEvidence}</strong> to <strong>${thisMonthEvidence}</strong> this month — follow up with control owners.`);
  if (compScore < 70)        recs.push(`Compliance score is <strong>${compScore}%</strong> — below the 70% threshold. Focus on control remediation to improve posture.`);
  if (recs.length === 0)     recs.push("All indicators are within acceptable ranges. Maintain current posture and continue routine monitoring.");

  // ── SVG Sparkline helper ──────────────────────────────────────────────────
  const sparkline = (data, key, color, maxOverride) => {
    const vals = data.map(d => d[key]);
    const max  = maxOverride || Math.max(...vals, 1);
    const W = 480, H = 80, pad = 10;
    const pts = vals.map((v, i) => {
      const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v / max) * (H - pad * 2));
      return `${x},${y}`;
    }).join(" ");
    const areaBottom = `${W - pad},${H - pad} ${pad},${H - pad}`;
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="display:block;width:100%;height:auto">
      <defs><linearGradient id="g${key}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.2"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
      <polygon points="${pts} ${areaBottom}" fill="url(#g${key})"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${vals.map((v, i) => {
        const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
        const y = H - pad - ((v / max) * (H - pad * 2));
        return `<circle cx="${x}" cy="${y}" r="4" fill="${color}"/>`;
      }).join("")}
      ${data.map((d, i) => {
        const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
        return `<text x="${x}" y="${H}" text-anchor="middle" font-size="9" fill="#94a3b8">${d.label}</text>`;
      }).join("")}
    </svg>`;
  };

  // ── Score colour ──────────────────────────────────────────────────────────
  const scoreColor = compScore >= 80 ? "#10b981" : compScore >= 50 ? "#f59e0b" : "#ef4444";

  // ── Failing controls table rows ───────────────────────────────────────────
  const failingRows = controls
    .filter(c => c.status === "failing")
    .slice(0, 15)
    .map(c => `
      <tr>
        <td>${c.control_id || "—"}</td>
        <td>${c.title}</td>
        <td style="text-transform:capitalize">${(c.category || "").replace(/_/g, " ")}</td>
        <td><span class="badge ${c.severity === "critical" ? "badge-red" : c.severity === "high" ? "badge-orange" : "badge-amber"}">${c.severity || "medium"}</span></td>
        <td>${c.owner_name || "Unassigned"}</td>
      </tr>
    `).join("") || `<tr><td colspan="5" style="text-align:center;color:#64748b">No failing controls — great work!</td></tr>`;

  // ── Critical risks table rows ─────────────────────────────────────────────
  const riskRows = criticalRisks.slice(0, 10).map(r => `
    <tr>
      <td>${r.title}</td>
      <td style="text-transform:capitalize">${(r.category || "").replace(/_/g, " ")}</td>
      <td style="font-weight:700;color:${(r.likelihood||3)*(r.impact||3) >= 20 ? "#ef4444" : "#f97316"}">${(r.likelihood||3) * (r.impact||3)}</td>
      <td style="text-transform:capitalize">${(r.status || "").replace(/_/g, " ")}</td>
      <td>${r.owner_name || "Unassigned"}</td>
      <td>${r.due_date || "—"}</td>
    </tr>
  `).join("") || `<tr><td colspan="6" style="text-align:center;color:#64748b">No critical risks — good standing!</td></tr>`;

  // ── Framework bars ────────────────────────────────────────────────────────
  const fwBars = fwData.map(f => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
        <span>${f.name}</span>
        <strong style="color:${f.score>=80?"#10b981":f.score>=50?"#f59e0b":"#ef4444"}">${f.score}%</strong>
      </div>
      <div style="height:8px;border-radius:4px;background:#e2e8f0">
        <div style="height:8px;border-radius:4px;background:${f.score>=80?"#10b981":f.score>=50?"#f59e0b":"#ef4444"};width:${f.score}%"></div>
      </div>
    </div>
  `).join("") || "<p style='color:#94a3b8'>No frameworks configured.</p>";

  // ── Full HTML ─────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Compliance Posture Report — ${format(now, "MMMM yyyy")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: #f8fafc; color: #1e293b; font-size: 14px; line-height: 1.6; }
  .page { max-width: 900px; margin: 0 auto; padding: 40px 24px 80px; }

  /* Header */
  .report-header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; border-radius: 16px; padding: 36px 40px; margin-bottom: 32px; display: flex; align-items: center; justify-content: space-between; }
  .report-header h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
  .report-header p { opacity: 0.75; font-size: 14px; }
  .score-circle { width: 90px; height: 90px; border-radius: 50%; border: 5px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .score-circle .val { font-size: 26px; font-weight: 900; }
  .score-circle .lbl { font-size: 10px; opacity: 0.8; }

  /* Sections */
  section { margin-bottom: 32px; }
  h2 { font-size: 16px; font-weight: 700; color: #1e3a5f; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
  h2::before { content: attr(data-icon); font-size: 18px; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .kpi-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; }
  .kpi-card .value { font-size: 28px; font-weight: 800; }
  .kpi-card .label { font-size: 12px; color: #64748b; margin-top: 2px; }
  .kpi-card .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }
  .kpi-green .value { color: #10b981; } .kpi-red .value { color: #ef4444; } .kpi-amber .value { color: #f59e0b; } .kpi-blue .value { color: #3b82f6; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; color: #475569; padding: 10px 14px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.03em; }
  td { padding: 10px 14px; border-top: 1px solid #f1f5f9; font-size: 13px; }
  tr:hover td { background: #f8fafc; }

  /* Badges */
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-orange { background: #ffedd5; color: #9a3412; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-green { background: #dcfce7; color: #166534; }

  /* Chart card */
  .chart-card { background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; margin-bottom: 16px; }
  .chart-title { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 12px; }

  /* Recommendations */
  .rec-list { list-style: none; }
  .rec-list li { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; display: flex; align-items: flex-start; gap: 10px; font-size: 13px; }
  .rec-list li::before { content: "→"; color: #2563eb; font-weight: 800; flex-shrink: 0; }

  /* Executive summary */
  .exec-summary { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 10px 10px 0; padding: 18px 20px; font-size: 14px; color: #1e3a5f; line-height: 1.7; }

  /* Alert banner */
  .alert-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; display: flex; align-items: center; gap: 10px; font-size: 13px; color: #991b1b; margin-bottom: 16px; }

  /* Footer */
  .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }

  @media print {
    body { background: white; }
    .page { padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="report-header">
    <div>
      <h1>Compliance Posture Report</h1>
      <p>${format(now, "MMMM d, yyyy 'at' h:mm a")} &nbsp;|&nbsp; Generated by ${generatedBy}</p>
      <p style="margin-top:8px;font-size:13px;opacity:0.9">
        ${total} controls &nbsp;·&nbsp; ${openRisks.length} open risks &nbsp;·&nbsp; ${evidence.length} evidence records
      </p>
    </div>
    <div class="score-circle">
      <span class="val">${compScore}%</span>
      <span class="lbl">COMPLIANCE</span>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <section>
    <h2 data-icon="📋">Executive Summary</h2>
    <div class="exec-summary">
      The organisation currently has <strong>${passing} of ${total} controls passing</strong>, yielding an overall compliance score of 
      <strong style="color:${scoreColor}">${compScore}%</strong>. 
      There are <strong>${openRisks.length} open risks</strong>, of which <strong>${criticalRisks.length}</strong> are rated critical or high severity. 
      Evidence submissions this month stand at <strong>${thisMonthEvidence}</strong> 
      (${thisMonthEvidence >= lastMonthEvidence ? "up" : "down"} from ${lastMonthEvidence} last month). 
      <strong>${overdueTasks} tasks</strong> are overdue and <strong>${pendingTasks}</strong> are in-progress.
      ${criticalRisks.length > 0 ? `<strong>Immediate attention required</strong> for ${criticalRisks.length} critical risk${criticalRisks.length > 1 ? "s" : ""}.` : ""}
    </div>
  </section>

  ${criticalRisks.length > 0 ? `
  <div class="alert-banner">
    ⚠️ <strong>${criticalRisks.length} critical risk${criticalRisks.length > 1 ? "s" : ""}</strong> identified with risk scores ≥ 15. See the Critical Risks section below for details.
  </div>` : ""}

  <!-- KPI CARDS -->
  <section>
    <h2 data-icon="📊">Key Performance Indicators</h2>
    <div class="kpi-grid">
      <div class="kpi-card kpi-${compScore>=80?"green":compScore>=50?"amber":"red"}">
        <div class="value">${compScore}%</div>
        <div class="label">Compliance Score</div>
        <div class="sub">${passing}/${total} controls passing</div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="value">${passing}</div>
        <div class="label">Passing Controls</div>
        <div class="sub">Currently compliant</div>
      </div>
      <div class="kpi-card kpi-${failing>0?"red":"green"}">
        <div class="value">${failing}</div>
        <div class="label">Failing Controls</div>
        <div class="sub">Require remediation</div>
      </div>
      <div class="kpi-card kpi-${criticalRisks.length>0?"red":"amber"}">
        <div class="value">${openRisks.length}</div>
        <div class="label">Open Risks</div>
        <div class="sub">${criticalRisks.length} critical / high</div>
      </div>
      <div class="kpi-card kpi-blue">
        <div class="value">${thisMonthEvidence}</div>
        <div class="label">Evidence This Month</div>
        <div class="sub">vs ${lastMonthEvidence} last month</div>
      </div>
      <div class="kpi-card kpi-${overdueTasks>0?"red":"green"}">
        <div class="value">${overdueTasks}</div>
        <div class="label">Overdue Tasks</div>
        <div class="sub">${pendingTasks} pending</div>
      </div>
    </div>
  </section>

  <!-- TREND ANALYSIS -->
  <section>
    <h2 data-icon="📈">Trend Analysis</h2>
    <div class="chart-card">
      <div class="chart-title">Evidence Submissions — Last 6 Months</div>
      ${sparkline(evidenceTrend, "count", "#3b82f6", null)}
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#94a3b8">
        ${evidenceTrend.map(d => `<div style="text-align:center"><strong style="display:block;font-size:14px;color:#1e293b">${d.count}</strong>${d.label}</div>`).join("")}
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-title">New Risk Score — Last 6 Months (average score of risks created each month)</div>
      ${sparkline(riskTrend, "score", "#ef4444", 25)}
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:#94a3b8">
        ${riskTrend.map(d => `<div style="text-align:center"><strong style="display:block;font-size:14px;color:#1e293b">${d.score || "—"}</strong>${d.label}</div>`).join("")}
      </div>
    </div>
  </section>

  <!-- FRAMEWORK READINESS -->
  <section>
    <h2 data-icon="🎯">Framework Readiness</h2>
    <div class="chart-card">
      ${fwBars}
    </div>
  </section>

  <!-- CRITICAL RISKS -->
  <section>
    <h2 data-icon="🔴">Critical & High Risks</h2>
    <table>
      <thead><tr><th>Risk</th><th>Category</th><th>Score</th><th>Status</th><th>Owner</th><th>Due Date</th></tr></thead>
      <tbody>${riskRows}</tbody>
    </table>
  </section>

  <!-- FAILING CONTROLS -->
  <section>
    <h2 data-icon="⚠️">Failing Controls</h2>
    <table>
      <thead><tr><th>ID</th><th>Title</th><th>Category</th><th>Severity</th><th>Owner</th></tr></thead>
      <tbody>${failingRows}</tbody>
    </table>
  </section>

  <!-- RECOMMENDATIONS -->
  <section>
    <h2 data-icon="💡">Improvement Recommendations</h2>
    <ul class="rec-list">
      ${recs.map(r => `<li>${r}</li>`).join("")}
    </ul>
  </section>

  <!-- FOOTER -->
  <div class="footer">
    <span>CONFIDENTIAL — Management Report</span>
    <span>Generated by ComplianceOS &nbsp;|&nbsp; ${format(now, "yyyy-MM-dd")}</span>
  </div>

</div>
</body>
</html>`;
}

export function downloadPostureReport(html, filename) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}