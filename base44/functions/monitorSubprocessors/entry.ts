import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Fourth-Party Risk (Subprocessor) Monitoring
// Syncs subprocessors from Contract.subprocessor_list fields, detects new/modified/removed
// subprocessors (change detection), scores risk, and creates alerts for unapproved
// high-risk fourth parties. Runs on a scheduled workflow or manual trigger.

const HIGH_RISK_COUNTRIES = ['CN', 'RU', 'IR', 'KP', 'BY']; // Example high-risk jurisdictions

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer", "risk_manager"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 1. Fetch all contracts with subprocessor lists
    const contracts = await sr.entities.Contract.list("-created_date", 200).catch(() => []);
    const vendors = await sr.entities.Vendor.list("-created_date", 200).catch(() => []);
    const vendorById = new Map((vendors || []).map(v => [v.id, v]));

    // 2. Fetch existing subprocessors for change detection
    const existingSubs = await sr.entities.Subprocessor.list("-created_date", 500).catch(() => []);
    const existingByKey = new Map((existingSubs || []).map(s => [`${s.vendor_id}_${s.name}`.toLowerCase(), s]));

    // 3. Parse all subprocessors from contracts
    const currentSubprocessors = [];
    for (const contract of (contracts || [])) {
      if (!contract.subprocessor_list) continue;
      let subs = [];
      try { subs = JSON.parse(contract.subprocessor_list); } catch (_) { continue; }
      if (!Array.isArray(subs)) continue;

      for (const sub of subs) {
        const vendorId = contract.linked_vendor_id || '';
        const vendorName = contract.linked_vendor_name || vendorById.get(vendorId)?.name || contract.counterparty || '';
        currentSubprocessors.push({
          vendor_id: vendorId,
          vendor_name: vendorName,
          name: sub.name || 'Unknown',
          location: sub.location || '',
          data_access: sub.data_access || 'limited',
          approved: sub.approved || false,
          contract_id: contract.id,
        });
      }
    }

    // 4. Detect changes and create/update subprocessor records
    let newSubs = 0, modifiedSubs = 0, unapprovedHighRisk = 0, alertsCreated = 0;
    const newRecords = [];
    const currentKeys = new Set();

    for (const sub of currentSubprocessors) {
      const key = `${sub.vendor_id}_${sub.name}`.toLowerCase();
      currentKeys.add(key);

      const existing = existingByKey.get(key);
      if (existing) {
        // Check for modifications
        const changed = (existing.location !== sub.location) || (existing.data_access_level !== sub.data_access);
        if (changed) {
          try {
            await sr.entities.Subprocessor.update(existing.id, {
              location: sub.location,
              data_access_level: sub.data_access,
              change_detected: true,
              change_type: 'modified',
              change_detected_at: now,
            });
            modifiedSubs++;
          } catch (e) { console.error('Subprocessor update error:', e?.message); }
        }
      } else {
        // New subprocessor detected
        const riskScore = computeSubprocessorRisk(sub);
        const riskLevel = riskScore >= 75 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
        const subId = `SUB-${String((existingSubs?.length || 0) + newRecords.length + 1).padStart(4, '0')}`;

        const record = {
          subprocessor_id: subId,
          vendor_id: sub.vendor_id,
          vendor_name: sub.vendor_name,
          name: sub.name,
          location: sub.location,
          country: extractCountry(sub.location),
          data_access_level: sub.data_access,
          data_types_processed: JSON.stringify(sub.data_access === 'extensive' ? ['pii', 'financial'] : ['internal']),
          compliance_status: 'pending_review',
          certifications: '[]',
          risk_score: riskScore,
          risk_level: riskLevel,
          risk_factors: JSON.stringify(generateRiskFactors(sub, riskScore)),
          approved: sub.approved || false,
          added_date: new Date().toISOString().split('T')[0],
          detected_date: now,
          monitoring_status: 'active',
          change_detected: true,
          change_type: 'new',
          change_detected_at: now,
        };
        newRecords.push(record);
        newSubs++;

        // Create alert for unapproved high-risk new subprocessors
        if (!sub.approved && (riskLevel === 'high' || riskLevel === 'critical')) {
          unapprovedHighRisk++;
          try {
            const alert = await sr.entities.SecurityAlert.create({
              title: `New Unapproved High-Risk Subprocessor: ${sub.name}`,
              description: `Vendor ${sub.vendor_name} has added a new subprocessor "${sub.name}" (location: ${sub.location || 'unknown'}) that has not been approved. Risk level: ${riskLevel}. Data access: ${sub.data_access}.`,
              type: 'supply_chain_attack',
              severity: riskLevel === 'critical' ? 'critical' : 'high',
              status: 'open',
              detected_at: now,
              details: JSON.stringify({ subprocessor_id: subId, vendor_id: sub.vendor_id, vendor_name: sub.vendor_name }),
            });
            record.security_alert_id = alert.id;
            alertsCreated++;
          } catch (e) { console.error('SecurityAlert create error:', e?.message); }
        }
      }
    }

    // 5. Detect removed subprocessors (in existing but not in current)
    let removedSubs = 0;
    for (const [key, existing] of existingByKey) {
      if (!currentKeys.has(key) && existing.monitoring_status === 'active') {
        try {
          await sr.entities.Subprocessor.update(existing.id, {
            monitoring_status: 'removed',
            change_detected: true,
            change_type: 'removed',
            change_detected_at: now,
          });
          removedSubs++;
        } catch (e) { console.error('Subprocessor removal error:', e?.message); }
      }
    }

    // 6. Bulk create new subprocessors
    if (newRecords.length > 0) {
      try {
        await sr.entities.Subprocessor.bulkCreate(newRecords);
      } catch (e) { console.error('Subprocessor bulkCreate error:', e?.message); }
    }

    // 7. Summary
    const allSubs = await sr.entities.Subprocessor.list("-risk_score", 500).catch(() => []);
    const totalActive = (allSubs || []).filter(s => s.monitoring_status === 'active').length;
    const totalUnapproved = (allSubs || []).filter(s => !s.approved && s.monitoring_status === 'active').length;
    const totalHighRisk = (allSubs || []).filter(s => (s.risk_level === 'high' || s.risk_level === 'critical') && s.monitoring_status === 'active').length;

    return Response.json({
      status: "completed",
      contracts_scanned: (contracts || []).length,
      subprocessors_found: currentSubprocessors.length,
      new_subprocessors: newSubs,
      modified_subprocessors: modifiedSubs,
      removed_subprocessors: removedSubs,
      unapproved_high_risk: unapprovedHighRisk,
      security_alerts_created: alertsCreated,
      total_active_subprocessors: totalActive,
      total_unapproved: totalUnapproved,
      total_high_risk: totalHighRisk,
      message: `Subprocessor monitoring complete — ${newSubs} new, ${modifiedSubs} modified, ${removedSubs} removed. ${unapprovedHighRisk} unapproved high-risk subprocessors flagged.`,
    });
  } catch (error) {
    console.error("monitorSubprocessors error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function computeSubprocessorRisk(sub) {
  let score = 20; // base
  if (sub.data_access === 'extensive') score += 35;
  else if (sub.data_access === 'moderate') score += 20;
  else if (sub.data_access === 'limited') score += 10;
  if (!sub.approved) score += 25;
  const country = extractCountry(sub.location);
  if (HIGH_RISK_COUNTRIES.includes(country?.toUpperCase())) score += 20;
  return Math.min(100, score);
}

function extractCountry(location) {
  if (!location) return '';
  const parts = location.split(',').map(p => p.trim());
  return parts[parts.length - 1] || '';
}

function generateRiskFactors(sub, score) {
  const factors = [];
  if (sub.data_access === 'extensive') factors.push({ factor: 'Extensive Data Access', detail: 'Subprocessor has extensive access to data' });
  if (!sub.approved) factors.push({ factor: 'Unapproved', detail: 'Subprocessor has not been formally approved' });
  const country = extractCountry(sub.location);
  if (HIGH_RISK_COUNTRIES.includes(country?.toUpperCase())) factors.push({ factor: 'High-Risk Jurisdiction', detail: `Located in ${country}` });
  if (score >= 75) factors.push({ factor: 'Critical Risk Score', detail: `Composite risk score: ${score}/100` });
  return factors;
}