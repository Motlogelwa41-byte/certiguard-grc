import { generatePostureReportHTML } from "./postureReportExport";

/**
 * Collects live data, builds the HTML report, and emails it to all recipients.
 * Returns { successCount, failCount, emails }
 */
export async function sendReportToStakeholders({ base44, schedule, reportData = null }) {
  // Fetch live data if no cached report data supplied
  let html;
  if (reportData) {
    // Build from a stored ManagementReport snapshot
    html = buildEmailFromReportRecord(reportData);
  } else {
    // Build from live entity data
    const [controls, risks, evidence, tasks, frameworks] = await Promise.all([
      base44.entities.Control.list(),
      base44.entities.Risk.list(),
      base44.entities.Evidence.list(),
      base44.entities.ComplianceTask.list(),
      base44.entities.Framework.list(),
    ]);
    html = generatePostureReportHTML({ controls, risks, evidence, tasks, frameworks, generatedBy: "CertiGuard GRC Scheduler" });
  }

  const emails = (schedule.recipients || "")
    .split(",")
    .map(e => e.trim())
    .filter(e => e.includes("@"));

  if (emails.length === 0) throw new Error("No valid recipient email addresses configured.");

  const subject = `${schedule.subject_prefix || "Compliance Report"} — ${new Date().toLocaleDateString("en-ZA", { month: "long", year: "numeric" })}`;
  const customMsg = schedule.custom_message
    ? `<p style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;margin-bottom:20px;color:#1e3a5f">${schedule.custom_message}</p>`
    : "";

  const wrappedHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;background:#f8fafc;padding:20px}
.wrapper{max-width:900px;margin:0 auto}
.header{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:24px 32px;border-radius:12px 12px 0 0}
.header h1{font-size:20px;margin:0 0 4px}
.header p{margin:0;opacity:.8;font-size:13px}
.content{background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
.footer{text-align:center;padding:20px;font-size:11px;color:#94a3b8;margin-top:16px}
</style></head><body>
<div class="wrapper">
  <div class="header">
    <h1>📊 ${subject}</h1>
    <p>Compliance posture update — ${new Date().toLocaleDateString("en-ZA", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
  </div>
  <div class="content">
    ${customMsg}
    <p style="color:#475569;font-size:14px;margin-bottom:20px">
      Please find below your automated compliance posture report. This report is generated from live data and requires no login to view.
    </p>
    ${html.replace(/<!DOCTYPE html>[\s\S]*?<body[^>]*>/i, "").replace(/<\/body>[\s\S]*?<\/html>/i, "").replace(/<div class="page"[^>]*>/, "").replace(/<\/div>\s*$/, "")}
  </div>
  <div class="footer">Confidential — sent by CertiGuard GRC · Do not forward · ${new Date().toISOString().slice(0,10)}</div>
</div>
</body></html>`;

  let successCount = 0;
  let failCount = 0;

  for (const email of emails) {
    try {
      await base44.integrations.Core.SendEmail({
        to: email,
        subject,
        body: wrappedHtml,
      });
      successCount++;
    } catch {
      failCount++;
    }
  }

  return { successCount, failCount, emails };
}

/** Build a simple email body from a stored ManagementReport record */
function buildEmailFromReportRecord(report) {
  const frameworkScores = JSON.parse(report.framework_readiness_scores || "{}");
  const topRisks = JSON.parse(report.top_risks || "[]");
  const scoreColor = report.compliance_score >= 80 ? "#10b981" : report.compliance_score >= 50 ? "#f59e0b" : "#ef4444";

  return `
<div style="font-family:system-ui,sans-serif;color:#1e293b">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:28px 32px;border-radius:12px;margin-bottom:24px">
    <h1 style="margin:0 0 4px;font-size:22px">${report.title}</h1>
    <p style="margin:0;opacity:.8;font-size:13px">Generated ${report.generated_at ? new Date(report.generated_at).toLocaleDateString("en-ZA",{day:"numeric",month:"long",year:"numeric"}) : "recently"}</p>
    <div style="margin-top:16px;display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:8px 20px;font-size:28px;font-weight:900">${report.compliance_score}%</div>
    <div style="font-size:12px;margin-top:4px;opacity:.8">Overall Compliance Score</div>
  </div>

  ${report.executive_summary ? `<div style="background:#eff6ff;border-left:4px solid #2563eb;padding:14px 18px;border-radius:4px;margin-bottom:20px;font-size:14px;line-height:1.6;color:#1e3a5f">${report.executive_summary}</div>` : ""}

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Key Metrics</th></tr>
    <tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">Controls Passing</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#10b981">${report.controls_passing} / ${report.controls_total}</td></tr>
    <tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">Open Risks</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${report.risks_open > 5 ? "#ef4444":"#f59e0b"}">${report.risks_open}</td></tr>
    <tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">Tasks Completed</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:#3b82f6">${report.completed_tasks} / ${report.total_tasks}</td></tr>
    <tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">Overdue Tasks</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${report.overdue_tasks > 0 ? "#ef4444":"#10b981"}">${report.overdue_tasks}</td></tr>
    <tr><td style="padding:9px 14px;font-size:13px">Incidents Opened</td><td style="padding:9px 14px;font-weight:700">${report.incidents_opened}</td></tr>
  </table>

  ${Object.keys(frameworkScores).length > 0 ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Framework Readiness</th></tr>
    ${Object.entries(frameworkScores).map(([name, score]) =>
      `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${name}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${score>=80?"#dcfce7":score>=50?"#fef3c7":"#fee2e2"};color:${score>=80?"#166534":score>=50?"#92400e":"#991b1b"};padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px">${score}%</span></td></tr>`
    ).join("")}
  </table>` : ""}

  ${topRisks.length > 0 ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr style="background:#f8fafc"><th colspan="3" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Top Risks</th></tr>
    ${topRisks.map(r => `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${r.title}</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700">${r.score}</td><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;text-transform:capitalize">${r.status}</td></tr>`).join("")}
  </table>` : ""}

  ${report.improvement_recommendations ? `
  <div style="background:#f8fafc;border-radius:8px;padding:16px 20px">
    <p style="font-weight:700;font-size:13px;color:#475569;margin:0 0 10px">Recommendations</p>
    ${report.improvement_recommendations.split("\n").filter(l=>l.trim()).map(l=>`<p style="font-size:13px;margin:0 0 6px;padding-left:12px;border-left:2px solid #2563eb;color:#1e293b">${l.replace(/^- /,"").replace(/\*\*/g,"")}</p>`).join("")}
  </div>` : ""}
</div>`;
}