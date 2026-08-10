import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { assessment_type, source_type, source_id, title, description, scope } = body;

    if (!assessment_type || !title) {
      return Response.json({ error: 'assessment_type and title are required' }, { status: 400 });
    }

    const tenant_id = user.data?.tenant_id || user.tenant_id || '';
    const now = new Date().toISOString();

    // Generate questions based on the source type
    let questions = [];
    let source_name = '';
    let resolved_scope = scope || [];

    if (assessment_type === 'framework' && source_id) {
      const framework = await base44.asServiceRole.entities.RegulatoryFramework.get(source_id);
      source_name = framework?.name || '';
      const requirements = await base44.asServiceRole.entities.FrameworkRequirement.filter({ framework_id: source_id, tenant_id });
      questions = requirements.map((r, i) => ({
        question_id: `Q${i + 1}`,
        question_text: r.title || r.description || r.requirement_id,
        requirement_ref: r.requirement_id,
        requirement_id: r.id,
        response: 'evidence_required',
        evidence_url: '',
        comments: '',
        score_weight: r.is_mandatory ? 1.0 : 0.5,
        answered_by: '',
        answered_at: '',
        category: r.category || r.section || '',
      }));
      resolved_scope = [{ entity_type: 'RegulatoryFramework', entity_id: source_id, entity_name: source_name }];
    } else if (assessment_type === 'control_library') {
      const controls = source_id
        ? await base44.asServiceRole.entities.UniversalControl.filter({ tenant_id, linked_framework_ids: { $in: [source_id] } })
        : await base44.asServiceRole.entities.UniversalControl.filter({ tenant_id, status: 'active' });
      source_name = 'Universal Control Library';
      questions = controls.map((c, i) => ({
        question_id: `Q${i + 1}`,
        question_text: `Is control ${c.control_id} (${c.title}) operating effectively?`,
        control_id: c.id,
        control_ref: c.control_id,
        response: 'evidence_required',
        evidence_url: '',
        comments: '',
        score_weight: 1.0,
        answered_by: '',
        answered_at: '',
        category: c.category || '',
      }));
    } else if (assessment_type === 'vendor' && source_id) {
      const vendor = await base44.asServiceRole.entities.Vendor.get(source_id);
      source_name = vendor?.name || '';
      const questionnaires = await base44.asServiceRole.entities.SecurityQuestionnaire.filter({ tenant_id, status: 'active' });
      const items = questionnaires.length > 0
        ? await base44.asServiceRole.entities.QuestionnaireItem.filter({ questionnaire_id: questionnaires[0].id, tenant_id })
        : [];
      questions = items.map((item, i) => ({
        question_id: `Q${i + 1}`,
        question_text: item.question || item.title,
        response: 'evidence_required',
        evidence_url: '',
        comments: '',
        score_weight: 1.0,
        answered_by: '',
        answered_at: '',
        category: item.category || '',
      }));
      resolved_scope = [{ entity_type: 'Vendor', entity_id: source_id, entity_name: source_name }];
    } else if (assessment_type === 'maturity') {
      // Maturity assessment uses the GRC maturity domains
      const domains = ['governance', 'risk_management', 'compliance', 'security_operations', 'incident_response', 'business_continuity', 'third_party', 'data_protection'];
      questions = domains.map((d, i) => ({
        question_id: `Q${i + 1}`,
        question_text: `What is the current maturity level for ${d.replace(/_/g, ' ')}? (1-5)`,
        response: 'evidence_required',
        evidence_url: '',
        comments: '',
        score_weight: 1.0,
        answered_by: '',
        answered_at: '',
        category: d,
      }));
      source_name = 'GRC Maturity Assessment';
    } else if (assessment_type === 'organization' || assessment_type === 'department' || assessment_type === 'business_unit' || assessment_type === 'site') {
      // Org/dept/BU/site assessment — generate from all active controls
      const controls = await base44.asServiceRole.entities.UniversalControl.filter({ tenant_id, status: 'active' });
      source_name = source_id ? (await base44.asServiceRole.entities.BusinessUnit.get(source_id))?.name || title : title;
      questions = controls.map((c, i) => ({
        question_id: `Q${i + 1}`,
        question_text: `Is control ${c.control_id} (${c.title}) implemented and operating effectively?`,
        control_id: c.id,
        control_ref: c.control_id,
        response: 'evidence_required',
        evidence_url: '',
        comments: '',
        score_weight: 1.0,
        answered_by: '',
        answered_at: '',
        category: c.category || '',
      }));
    }

    // Generate unique assessment ID
    const assessment_id = `ASSESS-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

    const assessment = await base44.asServiceRole.entities.Assessment.create({
      assessment_id,
      title,
      description: description || '',
      assessment_type,
      source_type: source_type || '',
      source_id: source_id || '',
      source_name,
      scope: JSON.stringify(resolved_scope),
      status: 'draft',
      total_questions: questions.length,
      answered_questions: 0,
      compliance_score: 0,
      maturity_score: 0,
      control_effectiveness_score: 0,
      posture_state: 'unknown',
      responses: JSON.stringify(questions),
      assigned_to_name: user.full_name || user.email || '',
      assigned_to_id: user.id || '',
      started_at: now,
      tenant_id,
      created_by_name: user.full_name || user.email || '',
    });

    return Response.json({
      ok: true,
      assessment_id: assessment.id,
      assessment_ref: assessment_id,
      total_questions: questions.length,
      message: `Assessment generated with ${questions.length} questions from ${source_name || assessment_type}`,
    });
  } catch (error) {
    console.error('generateAssessment error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});