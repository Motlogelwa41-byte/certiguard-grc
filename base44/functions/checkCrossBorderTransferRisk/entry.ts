import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveTenantContext, assertTenantMatch } from "../../shared/tenantGuard.ts";

/**
 * SADC Cross-Border Data Sovereignty Guard
 *
 * Evaluates whether a data transfer task crosses a border into a country
 * that lacks an adequacy agreement under SADC or local data protection
 * frameworks. If the destination country is not adequate, the task is
 * automatically flagged as 'High Risk' (priority = high).
 *
 * Called from the frontend when a cross-border transfer task is created
 * or updated, or from a workflow scanning existing transfer tasks.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { task_id, destination_country, transfer_description } = body;

    if (!task_id || !destination_country) {
      return Response.json(
        { error: 'task_id and destination_country are required' },
        { status: 400 }
      );
    }

    const ctx = await resolveTenantContext(base44);

    // Fetch the task (service role, then validate tenant)
    const task = await base44.asServiceRole.entities.ComplianceTask.get(task_id);
    assertTenantMatch(ctx, task);

    // SADC countries with recognized data protection frameworks / adequacy
    // South Africa (POPIA), Mauritius (DPA), Seychelles (DP Act), Botswana (DPA 2024),
    // Namibia (DPA 2024), Lesotho (DPA 2024), Eswatini (DPA 2024),
    // Malawi (DPA 2024), Tanzania (DPA 2023), Zambia (DPA 2024),
    // Zimbabwe (DPA 2024), Mozambique (DPA 2024), Angola (DPA 2024),
    // DRC (DPA 2024), Madagascar (DPA 2024)
    // Countries WITHOUT adequate data protection are flagged as high risk.
    const SADC_ADEQUATE = new Set([
      'south africa', 'mauritius', 'seychelles', 'botswana', 'namibia',
      'lesotho', 'eswatini', 'malawi', 'tanzania', 'zambia', 'zimbabwe',
      'mozambique', 'angola', 'drc', 'democratic republic of congo',
      'madagascar',
    ]);

    const dest = String(destination_country).toLowerCase().trim();
    const isAdequate = SADC_ADEQUATE.has(dest);

    // Determine the risk flag
    const isHighRisk = !isAdequate;

    // Update the task with the risk flag
    const updatePayload = {
      priority: isHighRisk ? 'high' : (task.priority || 'medium'),
      notes: [
        task.notes || '',
        `[SADC Sovereignty Guard] Destination: ${destination_country} — ${isAdequate ? 'Adequate (has data protection framework)' : 'HIGH RISK: No adequacy agreement — cross-border transfer requires safeguards (SCCs, BCRs, or explicit consent)'}`,
        transfer_description ? `Transfer: ${transfer_description}` : '',
      ].filter(Boolean).join('\n'),
    };

    await base44.asServiceRole.entities.ComplianceTask.update(task_id, updatePayload);

    // If high risk, create a SecurityAlert for the tenant dashboard
    if (isHighRisk) {
      try {
        await base44.asServiceRole.entities.SecurityAlert.create({
          tenant_id: ctx.tenantId,
          tenant_name: user.data?.tenant_name || '',
          title: `Cross-Border Data Transfer Risk: ${destination_country}`,
          description: `A data transfer to ${destination_country} was flagged as High Risk — no SADC adequacy agreement. Task: ${task.title || task_id}`,
          type: 'tenant_isolation_breach',
          severity: 'high',
          status: 'open',
          detected_at: new Date().toISOString(),
          affected_user: user.full_name || user.email || '',
          details: transfer_description || `Destination: ${destination_country}`,
        });
      } catch (e) {
        console.error('Failed to create cross-border security alert:', e?.message || e);
      }
    }

    return Response.json({
      ok: true,
      task_id,
      destination_country,
      is_adequate: isAdequate,
      is_high_risk: isHighRisk,
      priority_set: updatePayload.priority,
      alert_created: isHighRisk,
    });
  } catch (error) {
    const status = error?.status || 500;
    const message = error?.message || 'Cross-border risk check failed';
    console.error('checkCrossBorderTransferRisk error:', message);
    return Response.json({ ok: false, error: message }, { status });
  }
}