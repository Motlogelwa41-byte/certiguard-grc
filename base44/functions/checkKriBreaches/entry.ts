import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const today = new Date().toISOString().split('T')[0];
    const breaches = [];

    // Fetch all KRIs
    const kris = await base44.asServiceRole.entities.KpiKri.filter({ tenant_id, indicator_type: 'kri' });

    for (const kri of kris) {
      if (kri.actual_value === undefined || kri.actual_value === null) continue;

      let newStatus = 'on_track';
      let breachLevel = null;

      if (kri.better_direction === 'higher') {
        // Higher is better — low values are bad
        if (kri.threshold_critical !== undefined && kri.actual_value <= kri.threshold_critical) {
          newStatus = 'critical';
          breachLevel = 'critical';
        } else if (kri.threshold_warning !== undefined && kri.actual_value <= kri.threshold_warning) {
          newStatus = 'warning';
          breachLevel = 'warning';
        }
      } else {
        // Lower is better — high values are bad
        if (kri.threshold_critical !== undefined && kri.actual_value >= kri.threshold_critical) {
          newStatus = 'critical';
          breachLevel = 'critical';
        } else if (kri.threshold_warning !== undefined && kri.actual_value >= kri.threshold_warning) {
          newStatus = 'warning';
          breachLevel = 'warning';
        }
      }

      // Update KRI status if changed
      if (newStatus !== kri.status) {
        await base44.asServiceRole.entities.KpiKri.update(kri.id, { status: newStatus, last_measured_date: today }).catch(() => {});

        // Create alert for critical breaches
        if (breachLevel === 'critical') {
          const existing = await base44.asServiceRole.entities.AnomalyAlert.filter({
            tenant_id, entity_type: 'kpi_kri', entity_id: kri.id, status: 'open'
          }).catch(() => []);

          if (existing.length === 0) {
            await base44.asServiceRole.entities.AnomalyAlert.create({
              tenant_id,
              anomaly_id: `AN-${Date.now().toString().slice(-6)}`,
              title: `KRI Critical Breach: ${kri.name}`,
              description: `KRI "${kri.name}" has breached its critical threshold (actual: ${kri.actual_value}${kri.unit || ''}, critical: ${kri.threshold_critical}${kri.unit || ''})`,
              anomaly_type: 'risk_score_drift',
              severity: 'critical',
              entity_type: 'kpi_kri',
              entity_id: kri.id,
              entity_name: kri.name,
              detected_at: new Date().toISOString(),
              status: 'open',
              recommended_action: 'Escalate to risk owner and executive team — initiate mitigation plan',
            });
          }
        }

        breaches.push({
          kri_id: kri.id,
          kri_name: kri.name,
          previous_status: kri.status,
          new_status: newStatus,
          actual_value: kri.actual_value,
          threshold_warning: kri.threshold_warning,
          threshold_critical: kri.threshold_critical,
          breach_level: breachLevel,
          linked_risk_ids: kri.linked_risk_ids || [],
        });
      }
    }

    return Response.json({
      ok: true,
      kris_evaluated: kris.length,
      breaches_detected: breaches.length,
      critical_breaches: breaches.filter((b) => b.breach_level === 'critical').length,
      warning_breaches: breaches.filter((b) => b.breach_level === 'warning').length,
      breaches,
      evaluated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('checkKriBreaches error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});