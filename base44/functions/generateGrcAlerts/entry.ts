import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const today = new Date().toISOString().split('T')[0];
    const alertsGenerated = [];
    let rulesProcessed = 0;

    // Fetch all active alert rules
    const rules = await base44.asServiceRole.entities.GrcAlertRule.filter({ tenant_id, status: 'active' });
    rulesProcessed = rules.length;

    for (const rule of rules) {
      try {
        const alerts = await evaluateRule(base44, rule, tenant_id, today);
        alertsGenerated.push(...alerts);
      } catch (e) {
        console.error(`Rule ${rule.name} evaluation failed:`, e.message);
      }
    }

    // Also run built-in alert checks (not configurable, always-on)
    const builtinAlerts = await runBuiltinAlerts(base44, tenant_id, today);
    alertsGenerated.push(...builtinAlerts);

    return Response.json({
      ok: true,
      rules_processed: rulesProcessed,
      alerts_generated: alertsGenerated.length,
      alerts: alertsGenerated.slice(0, 100),
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('generateGrcAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function evaluateRule(base44, rule, tenant_id, today) {
  const alerts = [];
  const entityType = rule.entity_type;
  if (!entityType || !base44.asServiceRole.entities[entityType]) return alerts;

  let records = [];
  try {
    records = await base44.asServiceRole.entities[entityType].filter({ tenant_id }, '-created_date', 200);
  } catch (e) { return alerts; }

  for (const record of records) {
    if (matchesCondition(record, rule.condition)) {
      // Check dedup window
      const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({
        tenant_id,
        entity_type: entityType.toLowerCase(),
        entity_id: record.id,
        status: 'open',
      }).catch(() => []);

      if (existing.length > 0 && rule.dedup_window_hours) {
        const lastAlert = existing[0];
        const hoursSince = (Date.now() - new Date(lastAlert.detected_at || lastAlert.created_date).getTime()) / 3600000;
        if (hoursSince < rule.dedup_window_hours) continue;
      }

      const alert = await base44.asServiceRole.entities.AnomalyAlert.create({
        tenant_id,
        anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
        title: `${rule.name}: ${record.title || record.name || record.id}`,
        description: rule.description || `Alert rule "${rule.name}" triggered for ${entityType}`,
        anomaly_type: mapAlertType(rule.alert_type),
        severity: rule.severity,
        entity_type: entityType.toLowerCase(),
        entity_id: record.id,
        entity_name: record.title || record.name || '',
        detected_at: new Date().toISOString(),
        status: 'open',
        recommended_action: `Review and resolve the ${rule.alert_type} condition`,
      });
      alerts.push({ rule: rule.name, entity: alert.entity_name, severity: rule.severity });

      // Update rule fire count
      await base44.asServiceRole.entities.GrcAlertRule.update(rule.id, {
        fire_count: (rule.fire_count || 0) + 1,
        last_fired_at: new Date().toISOString(),
      }).catch(() => {});
    }
  }
  return alerts;
}

function matchesCondition(record, conditionStr) {
  if (!conditionStr) return true;
  try {
    const conditions = JSON.parse(conditionStr);
    return conditions.every((c) => {
      const val = record[c.field];
      switch (c.operator) {
        case 'eq': return val === c.value;
        case 'ne': return val !== c.value;
        case 'gt': return val > c.value;
        case 'lt': return val < c.value;
        case 'gte': return val >= c.value;
        case 'lte': return val <= c.value;
        case 'in': return Array.isArray(c.value) && c.value.includes(val);
        case 'contains': return typeof val === 'string' && val.includes(c.value);
        case 'overdue': return val && val < new Date().toISOString().split('T')[0];
        case 'expired': return val && val < today;
        default: return true;
      }
    });
  } catch { return true; }
}

function mapAlertType(alertType) {
  const map = {
    overdue_risk: 'risk_score_drift',
    expired_evidence: 'evidence_gap',
    failed_control: 'control_failure_spike',
    compliance_deterioration: 'compliance_regression',
    vendor_reassessment: 'vendor_risk_shift',
    kri_threshold_breach: 'risk_score_drift',
    risk_appetite_breach: 'risk_score_drift',
  };
  return map[alertType] || 'compliance_regression';
}

async function runBuiltinAlerts(base44, tenant_id, today) {
  const alerts = [];

  // 1. Overdue risks
  try {
    const risks = await base44.asServiceRole.entities.Risk.filter({ tenant_id, status: { $in: ['open', 'mitigating'] } });
    for (const r of risks) {
      if (r.due_date && r.due_date < today) {
        const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({ tenant_id, entity_id: r.id, status: 'open' }).catch(() => []);
        if (existing.length === 0) {
          await base44.asServiceRole.entities.AnomalyAlert.create({
            tenant_id, anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
            title: `Overdue Risk: ${r.title}`,
            description: `Risk "${r.title}" is overdue (due: ${r.due_date})`,
            anomaly_type: 'risk_score_drift', severity: 'high',
            entity_type: 'risk', entity_id: r.id, entity_name: r.title,
            detected_at: new Date().toISOString(), status: 'open',
            recommended_action: 'Review and update the risk treatment plan or escalate',
          });
          alerts.push({ rule: 'builtin:overdue_risk', entity: r.title, severity: 'high' });
        }
      }
    }
  } catch (e) { /* */ }

  // 2. Expired evidence
  try {
    const evidence = await base44.asServiceRole.entities.Evidence.filter({ tenant_id, status: { $in: ['pending_review', 'approved'] } });
    for (const e of evidence) {
      if (e.expiry_date && e.expiry_date < today) {
        const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({ tenant_id, entity_id: e.id, status: 'open' }).catch(() => []);
        if (existing.length === 0) {
          await base44.asServiceRole.entities.AnomalyAlert.create({
            tenant_id, anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
            title: `Expired Evidence: ${e.title}`,
            description: `Evidence "${e.title}" expired on ${e.expiry_date}`,
            anomaly_type: 'evidence_gap', severity: 'medium',
            entity_type: 'evidence', entity_id: e.id, entity_name: e.title,
            detected_at: new Date().toISOString(), status: 'open',
            recommended_action: 'Collect fresh evidence or update the expiry date',
          });
          alerts.push({ rule: 'builtin:expired_evidence', entity: e.title, severity: 'medium' });
        }
      }
    }
  } catch (e) { /* */ }

  // 3. Failed controls
  try {
    const controls = await base44.asServiceRole.entities.Control.filter({ tenant_id, status: 'failing' });
    for (const c of controls) {
      const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({ tenant_id, entity_id: c.id, status: 'open' }).catch(() => []);
      if (existing.length === 0) {
        await base44.asServiceRole.entities.AnomalyAlert.create({
          tenant_id, anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
          title: `Failed Control: ${c.title}`,
          description: `Control "${c.title}" (${c.control_id}) is currently failing`,
          anomaly_type: 'control_failure_spike', severity: c.severity || 'high',
          entity_type: 'control', entity_id: c.id, entity_name: c.title,
          detected_at: new Date().toISOString(), status: 'open',
          recommended_action: 'Review the control failure and initiate remediation',
        });
        alerts.push({ rule: 'builtin:failed_control', entity: c.title, severity: c.severity || 'high' });
      }
    }
  } catch (e) { /* */ }

  // 4. Risk appetite breaches
  try {
    const risks = await base44.asServiceRole.entities.Risk.filter({ tenant_id, exceeds_appetite_limit: true, status: { $ne: 'closed' } });
    for (const r of risks) {
      const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({ tenant_id, entity_id: r.id, status: 'open' }).catch(() => []);
      if (existing.length === 0) {
        await base44.asServiceRole.entities.AnomalyAlert.create({
          tenant_id, anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
          title: `Risk Appetite Breach: ${r.title}`,
          description: `Risk "${r.title}" exceeds the organization's risk appetite limit`,
          anomaly_type: 'risk_score_drift', severity: 'critical',
          entity_type: 'risk', entity_id: r.id, entity_name: r.title,
          detected_at: new Date().toISOString(), status: 'open',
          recommended_action: 'Escalate to executive team — risk exceeds appetite threshold',
        });
        alerts.push({ rule: 'builtin:risk_appetite_breach', entity: r.title, severity: 'critical' });
      }
    }
  } catch (e) { /* */ }

  return alerts;
}