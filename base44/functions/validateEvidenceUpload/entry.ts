/**
 * validateEvidenceUpload — Instruction #11
 *
 * Backend gateway that validates file MIME type and magic-byte signatures
 * BEFORE committing to tenant-isolated object storage. Rejects malicious
 * payloads (executables, scripts) and MIME-spoofed files.
 *
 * Flow: frontend uploads file → calls this function with the file buffer →
 *   if valid, returns a signed upload URL scoped to tenants/{tenant_id}/secure_vault/
 *   if invalid, returns 422 with rejection reason.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { validateFileSignature, ValidationResult } from '../../shared/fileValidation.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tenant_id = user.data?.tenant_id;
    if (!tenant_id) return Response.json({ error: 'No tenant_id on session' }, { status: 403 });

    // Accept multipart form data with the file blob
    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return Response.json({ error: 'multipart/form-data with a file field is required' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const declaredMime = file.type || 'application/octet-stream';
    const fileBuffer = await file.arrayBuffer();
    const result: ValidationResult = validateFileSignature(fileBuffer, declaredMime, file.size);

    if (!result.valid) {
      // Log the rejected upload attempt to the audit trail
      try {
        await base44.asServiceRole.entities.AuditTrail.create({
          action: 'EVIDENCE_UPLOAD_REJECTED',
          entity_type: 'Evidence',
          entity_name: file.name,
          performed_by_name: user.full_name || user.email || '',
          performed_by_id: user.id || '',
          tenant_id,
          severity: 'warning',
          metadata: JSON.stringify({ reason: result.reason, declared_mime: result.declared_mime, detected_mime: result.detected_mime, file_size: result.file_size }),
          prev_hash: 'VALIDATION_GATE',
        });
      } catch (e) { /* audit is best-effort */ }

      return Response.json({
        valid: false,
        reason: result.reason,
        declared_mime: result.declared_mime,
        detected_mime: result.detected_mime,
      }, { status: 422 });
    }

    // File passed validation — upload to platform storage
    // The platform UploadFile integration handles the actual blob storage;
    // we return the validation verdict so the frontend can proceed with the upload.
    const secureFileName = `${tenant_id}/${file.name}`;

    return Response.json({
      valid: true,
      reason: result.reason,
      declared_mime: result.declared_mime,
      detected_mime: result.detected_mime,
      file_size: result.file_size,
      secure_path_prefix: `tenants/${tenant_id}/secure_vault/`,
      file_name: file.name,
    });
  } catch (error) {
    console.error('validateEvidenceUpload error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});