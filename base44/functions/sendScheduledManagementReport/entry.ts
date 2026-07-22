import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { sendGmail } from "../../shared/gmailSender.ts";

function esc(s) { return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }); } catch { return String(d); }
}

function buildSummaryHtml({ controls, risks, tasks, frameworks, score }) {
  const passing = controls.filter((c) => c.status === 'passing').length;
  const failing = controls.filter((c) => c.status === 'failing').length;
  const open = risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length;
  const now = new Date();
  const overdue = tasks.filter((t) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  const fwRows = frameworks.slice(0, 10).map((f) => {
    const c = f.readiness_score >= 80 ? '#dcfce7' : f.readiness_score >= 50 ? '#fef3c7' : '#fee2e2';
    const t = f.readiness_score >= 80 ? '#166534' : f.readiness_score >= 50 ? '#92400e' : '#991b1b';
    return `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${esc(f.name)}</td>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9"><span style="background:${c};color:${t};padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px">${f.readiness_score || 0}%</span></td>
      <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#64748b;text-transform:capitalize">${esc((f.status || '').replace(/_/g, ' '))}</td></tr>`;
  }).join('');

  const metric = (label, value, color = '#0f172a') =>
    `<tr><td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px">${label}</td>
     <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-weight:700;color:${color}">${value}</td></tr>`;

  return `
  <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:12px;padding:18px 26px;color:white;text-align:center">
      <div style="font-size:36px;font-weight:900">${score}%</div>
      <div style="font-size:11px;opacity:.85">Compliance Score</div>
    </div>
    <div style="flex:1">
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#f8fafc"><th colspan="2" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Compliance Summary</th></tr>
        ${metric('Controls Passing', `${passing} / ${controls.length}`, '#10b981')}
        ${metric('Controls Failing', `${failing}`, failing > 0 ? '#ef4444' : '#10b981')}
        ${metric('Open Risks', `${open}`, open > 5 ? '#ef4444' : '#f59e0b')}
        ${metric('Tasks Completed', `${completed} / ${tasks.length}`, '#3b82f6')}
        ${metric('Overdue Tasks', `${overdue}`, overdue > 0 ? '#ef4444' : '#10b981')}
      </table>
    </div>
  </div>
  ${frameworks.length ? `
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
    <tr style="background:#f8fafc"><th colspan="3" style="padding:10px 14px;text-align:left;font-size:13px;color:#475569;border-bottom:1px solid #e2e8f0">Framework Readiness</th></tr>
    ${fwRows}
  </table>` : ''}`;
}

function buildAuditHtml(logs) {
  if (!logs.length) return '<p style="color:#64748b;font-size:13px">No audit events recorded in this period.</p>';
  const rows = logs.slice(0, 200).map((l, i) => {
    const color = ({ create: '#10b981', update: '#2563eb', delete: '#ef4444', login: '#7c3aed', logout: '#94a3b8', approve: '#10b981', reject: '#ef4444', export: '#f59e0b' })[l.action] || '#64748b';
    return `<tr style="${i % 2 ? 'background:#f8fafc' : ''}">
      <td style="padding:6px 12px;font-size:11px;color:#475569;white-space:nowrap">${esc(fmtDate(l.created_date))}</td>
      <td style="padding:6px 12px;font-size:11px"><span style="background:${color}22;color:${color};padding:2px 8px;border-radius:8px;font-weight:700;text-transform:uppercase;font-size:9px">${esc(l.action)}</span></td>
      <td style="padding:6px 12px;font-size:11px;color:#1e293b">${esc(l.entity_type)}</td>
      <td style="padding:6px 12px;font-size:11px;color:#1e293b">${esc(l.entity_name || '—')}</td>
      <td style="padding:6px 12px;font-size:11px;color:#1e293b">${esc(l.performed_by_name || 'System')}</td>
      <td style="padding:6px 12px;font-size:11px;color:#64748b;font-family:monospace">${esc(l.ip_address || '—')}</td>
    </tr>`;
  }).join('');
  return `
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <tr style="background:#1e293b;color:white"><th colspan="6" style="padding:10px 14px;text-align:left;font-size:13px">Audit Trail — Latest ${Math.min(logs.length, 200)} Events</th></tr>
    <tr style="background:#f1f5f9;color:#475569">
      <th style="padding:8px 12px;text-align:left;font-size:10px">Timestamp</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px">Action</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px">Entity</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px">Name</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px">User</th>
      <th style="padding:8px 12px;text-align:left;font-size:10px">IP</th>
    </tr>
    ${rows}
  </table>
  <p style="font-size:10px;color:#94a3b8;margin-top:4px">Audit trail is tamper-evident (SHA-256 hash-chained). ${logs.length} total events on record.</p>`;
}

function wrapEmail({ subject, customMessage, summaryHtml, auditHtml }) {
  const msg = customMessage
    ? `<p style="background:#eff6ff;border-left:4px solid #2563eb;padding:12px 16px;border-radius:4px;margin-bottom:20px;color:#1e3a5f">${esc(customMessage)}</p>` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>body{font-family:system-ui,sans-serif;background:#f8fafc;padding:20px;color:#1e293b}
  .w{max-width:920px;margin:0 auto}.h{background:linear-gradient(135deg,#1e3a5f,#2563eb);color:white;padding:24px 32px;border-radius:12px 12px 0 0}
  .h h1{font-size:20px;margin:0 0 4px}.h p{margin:0;opacity:.8;font-size:13px}
  .c{background:white;padding:28px 32px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 12px 12px}
  .f{text-align:center;padding:16px;font-size:11px;color:#94a3b8}</style></head><body>
  <div class="w"><div class="h"><h1>📊 ${esc(subject)}</h1>
  <p>Automated management report — ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
  <div class="c">${msg}
  <p style="color:#475569;font-size:14px;margin-bottom:20px">Below is your monthly compliance summary and the latest audit trail, generated automatically from live data.</p>
  ${summaryHtml}${auditHtml}
  <p style="margin-top:24px;font-size:12px;color:#64748b">This report was sent via your connected Gmail account. Manage recipients and schedule in Scheduled Reports.</p>
  </div><div class="f">Confidential — sent by CertiGuard GRC · ${new Date().toISOString().slice(0, 10)}</div></div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    // Compute "today" in Africa/Johannesburg so day_of_month / weekday match the
    // schedule the user configured in local time (the Deno runtime is UTC).
    const TZ = 'Africa/Johannesburg';
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: TZ, day: '2-digit', weekday: 'short' }).formatToParts(now);
    const today = parseInt(parts.find((p) => p.type === 'day').value, 10);
    const weekday = parts.find((p) => p.type === 'weekday').value;
    const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

    const schedules = await sr.entities.ReportSchedule.filter({ is_active: true }).catch(() => []);
    const due = schedules.filter((s) => {
      if (!s.recipients) return false;
      if (s.last_sent_at === localDateStr && s.last_sent_status === 'sent') return false; // dedup same-day re-runs
      if (s.frequency === 'monthly') return (s.day_of_month || 1) === today;
      if (s.frequency === 'weekly') return weekday === 'Mon';
      return false; // manual — never auto-sent
    });

    if (due.length === 0) {
      return Response.json({ sent: 0, message: 'No schedules due today' });
    }

    // Gather data once across tenants; filter per schedule by tenant_id in memory.
    const [controls, risks, tasks, frameworks, auditLogs] = await Promise.all([
      sr.entities.Control.list('-updated_date', 1000).catch(() => []),
      sr.entities.Risk.list('-updated_date', 1000).catch(() => []),
      sr.entities.ComplianceTask.list('-updated_date', 1000).catch(() => []),
      sr.entities.Framework.list('-updated_date', 200).catch(() => []),
      sr.entities.AuditTrail.list('-created_date', 500).catch(() => [])
    ]);

    const byTenant = (arr, tid) => arr.filter((x) => !tid || x.tenant_id === tid);
    let sent = 0;
    const results = [];

    for (const s of due) {
      const tid = s.tenant_id || '';
      const tControls = byTenant(controls, tid);
      const tRisks = byTenant(risks, tid);
      const tTasks = byTenant(tasks, tid);
      const tFrameworks = byTenant(frameworks, tid);
      const tAudit = byTenant(auditLogs, tid);
      const score = tControls.length ? Math.round((tControls.filter((c) => c.status === 'passing').length / tControls.length) * 100) : 0;

      const summaryHtml = buildSummaryHtml({ controls: tControls, risks: tRisks, tasks: tTasks, frameworks: tFrameworks, score });
      const auditHtml = buildAuditHtml(tAudit);
      const subject = `${s.subject_prefix || 'Compliance Report'} — ${now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`;
      const body = wrapEmail({ subject, customMessage: s.custom_message, summaryHtml, auditHtml });

      const emails = (s.recipients || '').split(',').map((e) => e.trim()).filter((e) => e.includes('@'));
      let ok = 0, fail = 0;
      for (const email of emails) {
        try { await sendGmail(base44, email, subject, body); ok++; }
        catch (e) { console.error('sendScheduledManagementReport email failed:', email, e?.message || e); fail++; }
      }

      await sr.entities.ReportSchedule.update(s.id, {
        last_sent_at: localDateStr,
        last_sent_status: ok > 0 ? 'sent' : 'failed',
        total_sent: (s.total_sent || 0) + ok
      }).catch(() => {});
      sent++;
      results.push({ schedule: s.name, recipients: emails.length, ok, fail });
    }

    return Response.json({ sent, date: now.toISOString(), results });
  } catch (error) {
    console.error('sendScheduledManagementReport error:', error?.message || error);
    return Response.json({ error: error?.message || 'Failed to send management report' }, { status: 500 });
  }
});