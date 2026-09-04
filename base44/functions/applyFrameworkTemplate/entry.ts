import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Apply a Pre-Built Framework Control Template
// Creates the full chain: RegulatoryFramework → FrameworkRequirements → Controls → ControlTests
// with mappings between requirements and controls, and automated test keys on controls.
// This gives the "connect a tool → controls auto-populate and auto-test" experience.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { template_code, overwrite } = body;

    if (!template_code) return Response.json({ error: "template_code required" }, { status: 400 });

    // Import the template library
    // Since this is a Deno backend function, we embed the template data directly
    const template = await getTemplate(template_code);
    if (!template) return Response.json({ error: `Template '${template_code}' not found` }, { status: 404 });

    // 1. Create or find the RegulatoryFramework
    let framework;
    const existingFrameworks = await sr.entities.RegulatoryFramework.list("-created_date", 200).catch(() => []);
    framework = (existingFrameworks || []).find(f => f.code === template.code);
    if (!framework || overwrite) {
      const frameworkData = {
        name: template.name,
        code: template.code,
        version: template.version,
        description: template.description,
        jurisdiction: template.jurisdiction,
        authority: template.authority,
        category: template.jurisdiction === 'global' ? 'international' : 'national',
        status: 'active',
        total_requirements: template.requirements.length,
      };
      if (framework && overwrite) {
        await sr.entities.RegulatoryFramework.update(framework.id, frameworkData);
      } else {
        framework = await sr.entities.RegulatoryFramework.create(frameworkData);
      }
    }

    // 2. Create FrameworkRequirements
    let requirementsCreated = 0;
    const requirementIdMap = new Map(); // requirement_id -> entity id
    for (const req of template.requirements) {
      const reqData = {
        framework_id: framework.id,
        framework_name: template.name,
        framework_code: template.code,
        requirement_id: req.requirement_id,
        title: req.title,
        category: req.category,
        is_mandatory: req.is_mandatory,
        order_index: template.requirements.indexOf(req),
      };
      try {
        const created = await sr.entities.FrameworkRequirement.create(reqData);
        requirementIdMap.set(req.requirement_id, created.id);
        requirementsCreated++;
      } catch (e) { console.error('Requirement create error:', e?.message); }
    }

    // 3. Create Controls
    let controlsCreated = 0;
    const controlIdMap = new Map(); // control_id -> entity id
    for (const ctrl of template.controls) {
      const ctrlData = {
        control_id: ctrl.control_id,
        title: ctrl.title,
        description: ctrl.description,
        category: ctrl.category,
        status: 'not_tested',
        severity: 'medium',
        automation_status: ctrl.automation_status,
        framework_ids: [framework.id],
        framework_names: [template.name],
      };
      try {
        const created = await sr.entities.Control.create(ctrlData);
        controlIdMap.set(ctrl.control_id, created.id);
        controlsCreated++;
      } catch (e) { console.error('Control create error:', e?.message); }
    }

    // 4. Create ControlTests for automated controls
    let testsCreated = 0;
    for (const ctrl of template.controls) {
      if (!ctrl.test_key) continue;
      const ctrlEntityId = controlIdMap.get(ctrl.control_id);
      if (!ctrlEntityId) continue;
      const testData = {
        title: `${ctrl.title} — Automated Test`,
        description: `Automated test for ${ctrl.control_id}: ${ctrl.title}`,
        test_key: ctrl.test_key,
        service: 'internal',
        linked_control_ids: [ctrlEntityId],
        linked_control_names: [ctrl.title],
        linked_framework_ids: [framework.id],
        frequency: 'daily',
        enabled: true,
        severity_on_fail: 'high',
        auto_update_control: true,
        auto_create_evidence: true,
      };
      try {
        await sr.entities.ControlTest.create(testData);
        testsCreated++;
      } catch (e) { console.error('ControlTest create error:', e?.message); }
    }

    // 5. Create RequirementControlMappings
    let mappingsCreated = 0;
    for (const [reqId, ctrlIds] of Object.entries(template.mappings)) {
      const reqEntityId = requirementIdMap.get(reqId);
      if (!reqEntityId) continue;
      for (const ctrlId of ctrlIds) {
        const ctrlEntityId = controlIdMap.get(ctrlId);
        if (!ctrlEntityId) continue;
        try {
          await sr.entities.RequirementControlMapping.create({
            framework_id: framework.id,
            framework_name: template.name,
            framework_code: template.code,
            requirement_id: reqEntityId,
            requirement_ref: reqId,
            control_id: ctrlEntityId,
            control_ref: ctrlId,
            mapping_confidence: 'high',
            mapping_method: 'template',
            mapping_status: 'approved',
          });
          mappingsCreated++;
        } catch (e) { console.error('Mapping create error:', e?.message); }
      }
      // Update requirement's mapped_control_count
      try {
        await sr.entities.FrameworkRequirement.update(reqEntityId, { mapped_control_count: ctrlIds.length });
      } catch (e) { /* ignore */ }
    }

    return Response.json({
      status: "applied",
      template: template.name,
      framework_id: framework.id,
      requirements_created: requirementsCreated,
      controls_created: controlsCreated,
      control_tests_created: testsCreated,
      mappings_created: mappingsCreated,
      message: `Template '${template.name}' applied — ${requirementsCreated} requirements, ${controlsCreated} controls, ${testsCreated} automated tests, ${mappingsCreated} mappings created.`,
    });
  } catch (error) {
    console.error("applyFrameworkTemplate error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Minimal embedded template lookup — mirrors src/lib/frameworkTemplates.js
async function getTemplate(code) {
  const templates = {
    SOC2: { code: "SOC2", name: "SOC 2 (AICPA Trust Services Criteria)", version: "2017 TSC", jurisdiction: "global", authority: "AICPA", description: "Service Organization Control 2.", requirements: [
      { requirement_id: "CC6.1", title: "User Authentication", category: "access_control", is_mandatory: true },
      { requirement_id: "CC6.2", title: "Access Removal", category: "access_control", is_mandatory: true },
      { requirement_id: "CC7.1", title: "Vulnerability Detection", category: "security_operations", is_mandatory: true },
      { requirement_id: "CC7.2", title: "Incident Detection", category: "incident_response", is_mandatory: true },
      { requirement_id: "C1.1", title: "Data Encryption", category: "data_protection", is_mandatory: true },
    ], controls: [
      { control_id: "SOC2-001", title: "MFA Enforced on All Systems", category: "access_control", description: "MFA enforced globally", automation_status: "automated", test_key: "check_mfa_enabled" },
      { control_id: "SOC2-003", title: "Offboarding Within 24 Hours", category: "access_control", description: "Deprovision within 24h", automation_status: "automated", test_key: "check_offboarding_timeliness" },
      { control_id: "SOC2-004", title: "Vulnerability Scanning - Weekly", category: "security_operations", description: "Weekly vuln scanning", automation_status: "automated", test_key: "check_vuln_scans" },
      { control_id: "SOC2-005", title: "Incident Response Plan", category: "incident_response", description: "IR plan documented", automation_status: "partially_automated", test_key: "check_ir_plan_exists" },
      { control_id: "SOC2-006", title: "Encryption at Rest (AES-256)", category: "data_protection", description: "AES-256 at rest", automation_status: "automated", test_key: "check_encryption_at_rest" },
    ], mappings: { "CC6.1": ["SOC2-001"], "CC6.2": ["SOC2-003"], "CC7.1": ["SOC2-004"], "CC7.2": ["SOC2-005"], "C1.1": ["SOC2-006"] } },
    ISO27001: { code: "ISO27001", name: "ISO/IEC 27001", version: "2022", jurisdiction: "global", authority: "ISO/IEC", description: "ISMS requirements.", requirements: [
      { requirement_id: "A.5.1", title: "Policies for Information Security", category: "compliance", is_mandatory: true },
      { requirement_id: "A.8.2", title: "Privileged Access Rights", category: "access_control", is_mandatory: true },
      { requirement_id: "A.8.5", title: "Secure Authentication", category: "access_control", is_mandatory: true },
      { requirement_id: "A.8.24", title: "Use of Cryptography", category: "data_protection", is_mandatory: true },
      { requirement_id: "A.9.1", title: "Management of Technical Vulnerabilities", category: "security_operations", is_mandatory: true },
    ], controls: [
      { control_id: "ISO-002", title: "MFA on All Access", category: "access_control", description: "MFA globally", automation_status: "automated", test_key: "check_mfa_enabled" },
      { control_id: "ISO-006", title: "Vulnerability Management Program", category: "security_operations", description: "Monthly scanning", automation_status: "automated", test_key: "check_vuln_scans" },
      { control_id: "ISO-007", title: "Encryption at Rest and in Transit", category: "data_protection", description: "AES-256 + TLS 1.2+", automation_status: "automated", test_key: "check_encryption_at_rest" },
    ], mappings: { "A.5.1": ["ISO-002"], "A.8.2": ["ISO-002"], "A.8.5": ["ISO-002"], "A.8.24": ["ISO-007"], "A.9.1": ["ISO-006"] } },
    NIST_CSF: { code: "NIST_CSF", name: "NIST Cybersecurity Framework", version: "2.0", jurisdiction: "us", authority: "NIST", description: "Core cybersecurity functions.", requirements: [
      { requirement_id: "PR.AC-1", title: "Identity and Credential Management", category: "access_control", is_mandatory: true },
      { requirement_id: "PR.DS-1", title: "Data-at-Rest Security", category: "data_protection", is_mandatory: true },
      { requirement_id: "DE.CM-8", title: "Vulnerability Scans Performed", category: "security_operations", is_mandatory: true },
      { requirement_id: "RS.RP-1", title: "Response Plan Defined", category: "incident_response", is_mandatory: true },
    ], controls: [
      { control_id: "NIST-002", title: "MFA Enforced", category: "access_control", description: "MFA globally", automation_status: "automated", test_key: "check_mfa_enabled" },
      { control_id: "NIST-004", title: "Disk Encryption", category: "data_protection", description: "FDE on endpoints", automation_status: "automated", test_key: "check_disk_encryption" },
      { control_id: "NIST-007", title: "Vulnerability Scanning - Monthly", category: "security_operations", description: "Monthly scans", automation_status: "automated", test_key: "check_vuln_scans" },
    ], mappings: { "PR.AC-1": ["NIST-002"], "PR.DS-1": ["NIST-004"], "DE.CM-8": ["NIST-007"], "RS.RP-1": ["NIST-002"] } },
    GDPR: { code: "GDPR", name: "GDPR (General Data Protection Regulation)", version: "2018", jurisdiction: "eu", authority: "European Parliament", description: "EU data protection regulation.", requirements: [
      { requirement_id: "Art.25", title: "Data Protection by Design and by Default", category: "data_protection", is_mandatory: true },
      { requirement_id: "Art.32", title: "Security of Processing", category: "data_protection", is_mandatory: true },
      { requirement_id: "Art.33", title: "Notification of Personal Data Breach to Authority", category: "incident_response", is_mandatory: true },
    ], controls: [
      { control_id: "GDPR-004", title: "Data Encryption (At Rest and in Transit)", category: "data_protection", description: "AES-256 + TLS", automation_status: "automated", test_key: "check_encryption_at_rest" },
      { control_id: "GDPR-006", title: "Breach Notification Process (72h)", category: "incident_response", description: "72h notification", automation_status: "automated", test_key: "check_breach_notification_sla" },
    ], mappings: { "Art.25": ["GDPR-004"], "Art.32": ["GDPR-004"], "Art.33": ["GDPR-006"] } },
    POPIA: { code: "POPIA", name: "POPIA (Protection of Personal Information Act)", version: "2021", jurisdiction: "za", authority: "Information Regulator (South Africa)", description: "South African data protection law.", requirements: [
      { requirement_id: "S.7", title: "Security Safeguards", category: "data_protection", is_mandatory: true },
      { requirement_id: "S.21", title: "Notification of Compromise", category: "incident_response", is_mandatory: true },
    ], controls: [
      { control_id: "POPIA-004", title: "Encryption and Access Controls", category: "data_protection", description: "Technical safeguards", automation_status: "automated", test_key: "check_encryption_at_rest" },
      { control_id: "POPIA-005", title: "Breach Notification (Regulator + Subject)", category: "incident_response", description: "Notify regulator", automation_status: "automated", test_key: "check_breach_notification_sla" },
    ], mappings: { "S.7": ["POPIA-004"], "S.21": ["POPIA-005"] } },
    HIPAA: { code: "HIPAA", name: "HIPAA Security Rule", version: "2013", jurisdiction: "us", authority: "HHS OCR", description: "ePHI protection.", requirements: [
      { requirement_id: "164.312(a)(1)", title: "Access Control", category: "access_control", is_mandatory: true },
      { requirement_id: "164.312(e)(1)", title: "Transmission Security", category: "data_protection", is_mandatory: true },
    ], controls: [
      { control_id: "HIPAA-003", title: "MFA for ePHI Systems", category: "access_control", description: "MFA on ePHI", automation_status: "automated", test_key: "check_mfa_enabled" },
      { control_id: "HIPAA-007", title: "TLS for ePHI Transmission", category: "data_protection", description: "TLS 1.2+", automation_status: "automated", test_key: "check_tls_config" },
    ], mappings: { "164.312(a)(1)": ["HIPAA-003"], "164.312(e)(1)": ["HIPAA-007"] } },
    PCI_DSS: { code: "PCI_DSS", name: "PCI DSS", version: "4.0", jurisdiction: "global", authority: "PCI SSC", description: "Credit card security.", requirements: [
      { requirement_id: "3.4", title: "PAN Rendered Unreadable", category: "data_protection", is_mandatory: true },
      { requirement_id: "8.1", title: "Unique ID for Each Person", category: "access_control", is_mandatory: true },
      { requirement_id: "11.1", title: "Quarterly Vulnerability Scans", category: "security_operations", is_mandatory: true },
    ], controls: [
      { control_id: "PCI-003", title: "PAN Tokenization/Encryption", category: "data_protection", description: "PAN tokenized", automation_status: "automated", test_key: "check_pan_tokenization" },
      { control_id: "PCI-008", title: "MFA for CDE Access", category: "access_control", description: "MFA on CDE", automation_status: "automated", test_key: "check_mfa_enabled" },
      { control_id: "PCI-010", title: "Quarterly ASV Scans", category: "security_operations", description: "ASV scans", automation_status: "automated", test_key: "check_vuln_scans" },
    ], mappings: { "3.4": ["PCI-003"], "8.1": ["PCI-008"], "11.1": ["PCI-010"] } },
  };
  return templates[code];
}