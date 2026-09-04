import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Runs automated CIS baseline validation checks against linked IT assets.
// For each baseline, evaluates each config item against matching assets:
//   - Automated checks (asset_encryption, asset_patch_level, asset_agent_installed)
//     query the ITAsset inventory and compare actual vs expected values.
//   - Manual checks are marked "not_checked" (require human/agent verification).
// Failed checks create BaselineCheckResult records with drift_detected=true,
// and a ConfigurationChangeLog entry is appended to the immutable log.
// Returns a summary of the validation run.

const PLATFORM_ASSET_MAP = {
  linux: ['hardware', 'virtual', 'cloud'],
  windows: ['hardware', 'virtual', 'cloud'],
  kubernetes: ['cloud', 'container', 'virtual'],
  cloud: ['cloud'],
  network: ['network'],
  database: ['hardware', 'virtual', 'cloud'],
  container: ['container', 'cloud'],
  generic: ['hardware', 'virtual', 'cloud', 'network', 'container'],
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Auth: admin/compliance_officer, or internal workflow token
    let authUser = null;
    try { authUser = await base44.auth.me(); } catch (_) { authUser = null; }
    if (authUser) {
      if (!['admin', 'compliance_officer', 'risk_manager'].includes(authUser.role)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const baselineId = body.baseline_id;
    let baselines = [];
    if (baselineId) {
      const b = await base44.entities.SecureBaseline.get(baselineId).catch(() => null);
      if (b) baselines = [b];
    } else {
      baselines = await base44.entities.SecureBaseline.list('-updated_date', 100).catch(() => []);
    }
    // Only validate active or enforce baselines
    baselines = baselines.filter((b) => b.status === 'active' || b.enforcement_mode === 'enforce');
    if (baselines.length === 0) {
      return Response.json({ ok: true, message: 'No active baselines to validate', baselines: 0, results: 0, drift: 0 });
    }

    const assets = await base44.asServiceRole.entities.ITAsset.list('-updated_date', 500).catch(() => []);
    const now = new Date().toISOString();
    let totalResults = 0;
    let totalPass = 0;
    let totalFail = 0;
    let totalDrift = 0;
    const perBaseline = [];

    for (const baseline of baselines) {
      let configItems = [];
      try { configItems = JSON.parse(baseline.config_items || '[]'); } catch (_) { configItems = []; }
      if (configItems.length === 0) continue;

      // Find assets matching this baseline's platform
      const validAssetTypes = PLATFORM_ASSET_MAP[baseline.target_platform] || ['hardware', 'virtual', 'cloud'];
      const matchingAssets = (assets || []).filter((a) =>
        validAssetTypes.includes(a.asset_type) && a.status === 'in_service'
      );

      let passCount = 0;
      let failCount = 0;
      let driftCount = 0;
      const resultsToCreate = [];
      const driftLogsToCreate = [];

      for (const item of configItems) {
        const method = item.validation_method || 'manual';

        if (method === 'manual' || method === 'agent_reported') {
          // Manual checks — mark as not_checked, no drift
          resultsToCreate.push({
            tenant_id: baseline.tenant_id,
            baseline_id: baseline.id,
            baseline_name: baseline.name,
            item_id: item.item_id,
            check_name: item.name,
            cis_reference: item.cis_ref,
            category: item.category,
            status: 'not_checked',
            severity: item.severity,
            expected_value: item.expected_value,
            actual_value: 'Requires manual or agent verification',
            remediation_guidance: item.remediation_guidance,
            validated_at: now,
            validated_by: 'automated',
            drift_detected: false,
          });
          continue;
        }

        // Automated checks — evaluate against each matching asset
        for (const asset of matchingAssets) {
          let status = 'not_checked';
          let actualValue = '';
          let isDrift = false;

          if (method === 'asset_encryption') {
            actualValue = asset.encryption_status || 'unknown';
            if (actualValue === 'encrypted') { status = 'pass'; }
            else { status = 'fail'; isDrift = true; }
          } else if (method === 'asset_patch_level') {
            actualValue = asset.patch_level || 'unknown';
            if (actualValue === 'current') { status = 'pass'; }
            else { status = 'fail'; isDrift = true; }
          } else if (method === 'asset_agent_installed') {
            actualValue = asset.agent_installed ? 'installed' : 'not_installed';
            if (asset.agent_installed) { status = 'pass'; }
            else { status = 'fail'; isDrift = true; }
          } else if (method === 'asset_status_active') {
            actualValue = asset.status || 'unknown';
            if (asset.status === 'in_service') { status = 'pass'; }
            else { status = 'fail'; isDrift = true; }
          } else if (method === 'asset_classification') {
            actualValue = asset.classification || 'unknown';
            const minClass = item.expected_value || 'confidential';
            const classOrder = ['public', 'internal', 'confidential', 'restricted'];
            const actualIdx = classOrder.indexOf(actualValue);
            const minIdx = classOrder.indexOf(minClass);
            if (actualIdx >= minIdx) { status = 'pass'; }
            else { status = 'fail'; isDrift = true; }
          }

          if (status === 'pass') passCount++;
          else if (status === 'fail') { failCount++; driftCount++; }

          resultsToCreate.push({
            tenant_id: baseline.tenant_id,
            baseline_id: baseline.id,
            baseline_name: baseline.name,
            asset_id: asset.id,
            asset_name: asset.asset_name,
            item_id: item.item_id,
            check_name: item.name,
            cis_reference: item.cis_ref,
            category: item.category,
            status,
            severity: item.severity,
            expected_value: item.expected_value,
            actual_value: actualValue,
            remediation_guidance: item.remediation_guidance,
            validated_at: now,
            validated_by: 'automated',
            drift_detected: isDrift,
          });

          if (isDrift) {
            driftLogsToCreate.push({
              tenant_id: baseline.tenant_id,
              log_id: `CCL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              baseline_id: baseline.id,
              baseline_name: baseline.name,
              asset_id: asset.id,
              asset_name: asset.asset_name,
              change_type: 'config_drift',
              field_changed: `${item.item_id}: ${item.name}`,
              previous_value: item.expected_value,
              new_value: actualValue,
              cis_reference: item.cis_ref,
              changed_by: 'automated_validation',
              changed_at: now,
              drift_detected: true,
              drift_severity: item.severity,
              alert_sent: false,
              approval_required: false,
              approval_status: 'not_required',
              iac_manifest_ref: baseline.iac_manifest_version || '',
              notes: `Automated CIS check failed: expected "${item.expected_value}" but found "${actualValue}"`,
            });
          }
        }
      }

      // Bulk create results and drift logs
      if (resultsToCreate.length > 0) {
        try {
          await base44.asServiceRole.entities.BaselineCheckResult.bulkCreate(resultsToCreate);
        } catch (e) { console.error('Failed to create check results:', e?.message); }
      }
      if (driftLogsToCreate.length > 0) {
        try {
          await base44.asServiceRole.entities.ConfigurationChangeLog.bulkCreate(driftLogsToCreate);
        } catch (e) { console.error('Failed to create drift logs:', e?.message); }
      }

      // Update baseline stats
      const totalChecks = passCount + failCount;
      const compliancePct = totalChecks > 0 ? Math.round((passCount / totalChecks) * 100) : 0;
      try {
        await base44.asServiceRole.entities.SecureBaseline.update(baseline.id, {
          last_validated: now,
          passing_checks: passCount,
          total_checks: configItems.length,
          compliance_pct: compliancePct,
        });
      } catch (e) { console.error('Failed to update baseline stats:', e?.message); }

      totalResults += resultsToCreate.length;
      totalPass += passCount;
      totalFail += failCount;
      totalDrift += driftCount;
      perBaseline.push({
        baseline_id: baseline.id,
        baseline_name: baseline.name,
        pass: passCount,
        fail: failCount,
        drift: driftCount,
        compliance_pct: compliancePct,
      });
    }

    return Response.json({
      ok: true,
      baselines_validated: baselines.length,
      results_created: totalResults,
      pass: totalPass,
      fail: totalFail,
      drift_events: totalDrift,
      per_baseline: perBaseline,
    });
  } catch (error) {
    console.error('runBaselineValidation error:', error?.message || error);
    return Response.json({ error: error?.message || 'Validation failed' }, { status: 500 });
  }
});