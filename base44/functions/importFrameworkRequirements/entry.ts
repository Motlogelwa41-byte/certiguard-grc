import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Creates FrameworkRequirement + Control + RequirementControlMapping records
// for a previously-created Framework (from createFrameworkWithinPlan).
// Runs as service role to bypass RLS on bulk creates. Workflow/HTTP-invoked.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { framework_id, framework_name, framework_code, key_requirements, description, mandatory } = body;

    if (!framework_id || !framework_name || !Array.isArray(key_requirements)) {
      return Response.json({ ok: false, error: 'framework_id, framework_name, and key_requirements[] are required' }, { status: 400 });
    }

    const prefix = framework_code || framework_name.slice(0, 3).toUpperCase();
    const isMandatory = mandatory !== false;

    // 1. Create requirements
    const requirements = await base44.asServiceRole.entities.FrameworkRequirement.bulkCreate(
      key_requirements.map((req, i) => ({
        framework_id,
        framework_name,
        framework_code: prefix,
        requirement_id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
        title: req,
        description: `${req} — as mandated under ${framework_name}.`,
        section: 'Education',
        category: 'compliance',
        is_mandatory: isMandatory,
        guidance: description || '',
        order_index: i,
        mapped_control_count: 1,
      }))
    );

    // 2. Create controls
    const controls = await base44.asServiceRole.entities.Control.bulkCreate(
      key_requirements.map((req, i) => ({
        control_id: `${prefix}-${String(i + 1).padStart(2, '0')}`,
        title: req,
        description: `Implementation control for ${req} under ${framework_name}.`,
        category: 'compliance',
        status: 'not_tested',
        severity: isMandatory ? 'high' : 'medium',
        framework_ids: [framework_id],
        framework_names: [framework_name],
        automation_status: 'manual',
      }))
    );

    // 3. Create mappings
    const mappings = await base44.asServiceRole.entities.RequirementControlMapping.bulkCreate(
      requirements.map((req, i) => ({
        requirement_id: req.id,
        requirement_title: req.title,
        requirement_ref: req.requirement_id,
        framework_id,
        framework_name,
        framework_code: prefix,
        control_id: controls[i].id,
        control_title: controls[i].title,
        control_ref: controls[i].control_id,
        mapping_confidence: 'full',
        mapping_notes: 'Auto-generated on framework import.',
        status: 'active',
      }))
    );

    return Response.json({
      ok: true,
      framework_id,
      framework_name,
      requirements: requirements.length,
      controls: controls.length,
      mappings: mappings.length,
    });
  } catch (error) {
    console.error('importFrameworkRequirements error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'Import failed' }, { status: 500 });
  }
});