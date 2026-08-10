import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Re-verifies the integrity of every stored evidence file by re-downloading it,
// recomputing its SHA-256 hash, and comparing to the hash recorded in the
// AuditEvidenceLedger. Any mismatch (tampering, corruption, or replacement)
// raises an AnomalyAlert and a Slack alert. Runs daily via the
// "Evidence Integrity Verification Scanner" workflow.

async function sha256Hex(buffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const ledger = await sr.entities.AuditEvidenceLedger.list("-timestamp", 500).catch(() => []);

    let checked = 0, matched = 0, mismatched = 0, fetchFailed = 0, skipped = 0;
    const mismatches = [];

    for (const entry of ledger || []) {
      if (!entry.file_url) continue;
      // Skip legacy untenantable ledger entries (pre-fix packs logged with no
      // tenant_id and a payload-seal hash instead of a file-content hash).
      // These are not tenant evidence and re-verifying them produces false positives.
      if (!entry.tenant_id) { skipped++; continue; }
      checked++;
      try {
        const res = await fetch(entry.file_url);
        if (!res.ok) { fetchFailed++; continue; }
        const buf = await res.arrayBuffer();
        const currentHash = await sha256Hex(buf);

        if (currentHash === entry.sha256_hash) {
          matched++;
        } else {
          mismatched++;
          mismatches.push({
            ledger_id: entry.id,
            file_name: entry.file_name,
            file_url: entry.file_url,
            recorded_hash: entry.sha256_hash,
            current_hash: currentHash,
            uploaded_by: entry.user_name,
            uploaded_at: entry.timestamp,
            tenant_id: entry.tenant_id,
          });

          // Raise an anomaly alert for evidence tampering
          await sr.entities.AnomalyAlert.create({
            tenant_id: entry.tenant_id,
            anomaly_id: `EI-${Date.now().toString(36)}-${mismatched}`,
            title: `Evidence integrity failure: ${entry.file_name || entry.file_url}`,
            description: `The SHA-256 hash of evidence file "${entry.file_name || entry.file_url}" no longer matches the value recorded in the AuditEvidenceLedger at upload time. This indicates the file has been tampered with, corrupted, or replaced.\n\nRecorded hash: ${entry.sha256_hash}\nCurrent hash:  ${currentHash}\nUploaded by: ${entry.user_name} at ${entry.timestamp}`,
            anomaly_type: "compliance_regression",
            severity: "critical",
            entity_type: "evidence",
            entity_id: entry.id,
            entity_name: entry.file_name || "Evidence file",
            detected_value: JSON.stringify({ recorded: entry.sha256_hash, current: currentHash }),
            confidence_score: 100,
            recommended_action: "Investigate immediately. Quarantine the evidence file, review access logs, and determine whether the file was tampered with or corrupted. If tampering is confirmed, escalate to the CISO and regulator as a potential audit-integrity breach.",
            status: "open",
            detected_at: new Date().toISOString(),
          }).catch(() => null);
        }
      } catch (e) {
        fetchFailed++;
      }
    }

    // Slack alert if any mismatches
    if (mismatched > 0) {
      try {
        const msg = `🚨 *Evidence Integrity Verification* found ${mismatched} tampered/corrupted evidence file(s) on ${new Date().toISOString().slice(0,10)}. Checked: ${checked}. This is a potential audit-integrity breach — investigate immediately.`;
        await sr.functions.invoke("sendSlackAlert", { message: msg, channel: "C0BJB8240RF" });
      } catch (_) { /* best-effort */ }
    }

    return Response.json({
      ok: true,
      checked,
      matched,
      mismatched,
      fetch_failed: fetchFailed,
      skipped,
      mismatches: mismatches.slice(0, 20),
      ran_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("verifyEvidenceIntegrity error:", error?.message || error);
    return Response.json({ error: error?.message || "Evidence integrity verification failed" }, { status: 500 });
  }
});