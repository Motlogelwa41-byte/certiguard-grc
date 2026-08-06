import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin' && user.role !== 'risk_manager') {
      return Response.json({ error: 'Forbidden — admin or risk_manager only' }, { status: 403 });
    }

    // Service-role reads to aggregate across all tenants in the hierarchy
    const tenants = await base44.asServiceRole.entities.Tenant.list('-created_date', 500);
    const risks = await base44.asServiceRole.entities.Risk.list('-created_date', 1000);
    const controls = await base44.asServiceRole.entities.Control.list('-created_date', 1000);

    // Build subsidiary map: parentId -> [child tenants]
    const subsidiaryMap = {};
    for (const t of tenants) {
      if (t.parent_tenant_id) {
        if (!subsidiaryMap[t.parent_tenant_id]) subsidiaryMap[t.parent_tenant_id] = [];
        subsidiaryMap[t.parent_tenant_id].push(t);
      }
    }

    // Index risks and controls by tenant_id for O(1) lookup
    const risksByTenant = {};
    for (const r of risks) {
      const tid = r.tenant_id || '_unscoped';
      if (!risksByTenant[tid]) risksByTenant[tid] = [];
      risksByTenant[tid].push(r);
    }
    const controlsByTenant = {};
    for (const c of controls) {
      const tid = c.tenant_id || '_unscoped';
      if (!controlsByTenant[tid]) controlsByTenant[tid] = [];
      controlsByTenant[tid].push(c);
    }

    const computeTenantMetrics = (tenantId) => {
      const tRisks = risksByTenant[tenantId] || [];
      const tControls = controlsByTenant[tenantId] || [];
      const openRisks = tRisks.filter(r => r.status === 'open' || r.status === 'mitigating');
      const totalALE = tRisks.reduce((s, r) => s + (r.annualized_loss_expectancy || 0), 0);
      const totalResidualALE = tRisks.reduce((s, r) => s + (r.residual_annualized_loss_expectancy || 0), 0);
      const criticalRisks = tRisks.filter(r => (r.risk_score || 0) >= 16);
      const highRisks = tRisks.filter(r => (r.risk_score || 0) >= 12 && (r.risk_score || 0) < 16);
      const compliantControls = tControls.filter(c => c.status === 'passing');
      const compliancePct = tControls.length > 0 ? Math.round((compliantControls.length / tControls.length) * 100) : 0;
      const avgRiskScore = tRisks.length > 0 ? +(tRisks.reduce((s, r) => s + (r.risk_score || 0), 0) / tRisks.length).toFixed(1) : 0;
      return {
        totalRisks: tRisks.length,
        openRisks: openRisks.length,
        criticalRisks: criticalRisks.length,
        highRisks: highRisks.length,
        totalALE,
        totalResidualALE,
        compliancePct,
        avgRiskScore,
        totalControls: tControls.length,
        compliantControls: compliantControls.length,
      };
    };

    // Recursive rollup: walk the hierarchy from each holding company down
    const rollupSubtree = (tenantId) => {
      const ownMetrics = computeTenantMetrics(tenantId);
      const children = subsidiaryMap[tenantId] || [];
      let aggregated = { ...ownMetrics, subsidiaryCount: 0, subsidiaries: [] };
      for (const child of children) {
        const childRollup = rollupSubtree(child.id);
        aggregated.totalRisks += childRollup.totalRisks;
        aggregated.openRisks += childRollup.openRisks;
        aggregated.criticalRisks += childRollup.criticalRisks;
        aggregated.highRisks += childRollup.highRisks;
        aggregated.totalALE += childRollup.totalALE;
        aggregated.totalResidualALE += childRollup.totalResidualALE;
        aggregated.totalControls += childRollup.totalControls;
        aggregated.compliantControls += childRollup.compliantControls;
        aggregated.subsidiaryCount += 1 + childRollup.subsidiaryCount;
        aggregated.subsidiaries.push({
          id: child.id,
          name: child.name,
          entity_type: child.entity_type,
          ...childRollup,
        });
      }
      // Recompute group compliance as weighted average
      if (aggregated.totalControls > 0) {
        aggregated.compliancePct = Math.round((aggregated.compliantControls / aggregated.totalControls) * 100);
      }
      return aggregated;
    };

    // Find top-level holding companies: have children, or explicitly typed as holding_company
    const holdingCompanies = tenants.filter(t =>
      t.entity_type === 'holding_company' ||
      (!t.parent_tenant_id && (subsidiaryMap[t.id] || []).length > 0)
    );

    const groups = holdingCompanies.map(hc => ({
      id: hc.id,
      name: hc.name,
      entity_type: hc.entity_type,
      ...rollupSubtree(hc.id),
    }));

    // Global rollup across all entities
    const globalRollup = {
      totalEntities: tenants.length,
      totalRisks: risks.length,
      openRisks: risks.filter(r => r.status === 'open' || r.status === 'mitigating').length,
      criticalRisks: risks.filter(r => (r.risk_score || 0) >= 16).length,
      totalALE: risks.reduce((s, r) => s + (r.annualized_loss_expectancy || 0), 0),
      totalResidualALE: risks.reduce((s, r) => s + (r.residual_annualized_loss_expectancy || 0), 0),
      totalControls: controls.length,
      compliantControls: controls.filter(c => c.status === 'passing').length,
    };
    globalRollup.compliancePct = globalRollup.totalControls > 0
      ? Math.round((globalRollup.compliantControls / globalRollup.totalControls) * 100)
      : 0;

    return Response.json({ globalRollup, groups });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}