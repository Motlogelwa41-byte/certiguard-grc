import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

/**
 * Evidence Integrity Hook — SHA-256 Append-Only Ledger
 *
 * Called whenever a user uploads a compliance evidence artifact.
 * Downloads the file, computes a SHA-256 cryptographic hash, and
 * writes an immutable record to the AuditEvidenceLedger with the
 * user ID, server-side timestamp, and hash.
 *
 * The AuditEvidenceLedger entity enforces append-only access via RLS
 * (update and delete are denied for all roles), providing regulators
 * and auditors with verifiable proof of evidence integrity.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_url, file_name, control_id, framework_id, notes } = body;

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Fetch the uploaded file content for hashing
    const fileResponse = await fetch(file_url);
    if (!fileResponse.ok) {
      return Response.json(
        { error: `Failed to fetch file for hashing (status ${fileResponse.status})` },
        { status: 502 }
      );
    }
    const fileBuffer = await fileResponse.arrayBuffer();

    // Compute SHA-256 hash using the Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Resolve tenant context from the authenticated user
    const tenantId = user.data?.tenant_id || user.tenant_id;
    if (!tenantId) {
      return Response.json(
        { error: 'Tenant context required — user has no tenant_id' },
        { status: 403 }
      );
    }

    const timestamp = new Date().toISOString();

    // Write to the append-only AuditEvidenceLedger (service role — RLS blocks edits/deletes)
    const ledgerRecord = await base44.asServiceRole.entities.AuditEvidenceLedger.create({
      tenant_id: tenantId,
      user_id: user.id,
      user_name: user.full_name || user.email || 'Unknown',
      timestamp,
      file_url,
      file_name: file_name || '',
      sha256_hash: sha256Hash,
      control_id: control_id || null,
      framework_id: framework_id || null,
      notes: notes || null,
    });

    return Response.json({
      ok: true,
      ledger_id: ledgerRecord.id,
      sha256_hash: sha256Hash,
      timestamp,
      file_name: file_name || '',
    });
  } catch (error) {
    console.error('hashEvidenceToLedger error:', error?.message || error);
    return Response.json(
      { error: error?.message || 'Evidence hashing failed' },
      { status: 500 }
    );
  }
}