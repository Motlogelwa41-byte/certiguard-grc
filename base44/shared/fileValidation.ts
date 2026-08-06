/**
 * File Validation — shared module for MIME-type verification and magic-byte scanning.
 *
 * Instruction #11: Strict MIME-Type Validation & Malware Scanning for Evidence Ingestion.
 * Verifies file signatures (magic bytes) before tenant-isolated storage commits.
 */

// Allowed MIME types for compliance evidence uploads
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "image/png": ["89504E47"],
  "image/jpeg": ["FFD8FF"],
  "image/gif": ["47494638"],
  "application/pdf": ["25504446"],
  "text/csv": [],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["504B0304"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["504B0304"],
  "application/vnd.ms-excel": ["D0CF11E0"],
  "application/msword": ["D0CF11E0"],
  "application/json": [],
  "text/plain": [],
  "application/zip": ["504B0304"],
};

// Dangerous / blocked file signatures
export const BLOCKED_SIGNATURES: string[] = [
  "4D5A",       // PE/COFF executable (Windows .exe, .dll)
  "7F454C46",   // ELF executable (Linux)
  "CAFEBA",     // Java class
  "2321",       // Shell script shebang
];

export interface ValidationResult {
  valid: boolean;
  detected_mime: string | null;
  declared_mime: string | null;
  reason: string;
  file_size: number;
}

/**
 * Converts the first N bytes of a binary buffer to a hex signature string.
 */
function bytesToHex(buffer: ArrayBuffer, byteCount: number = 8): string {
  const bytes = new Uint8Array(buffer.slice(0, byteCount));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
}

/**
 * Validates an uploaded file's magic bytes against its declared MIME type.
 * Returns a structured validation result.
 */
export function validateFileSignature(
  fileBuffer: ArrayBuffer,
  declaredMime: string,
  fileSize: number
): ValidationResult {
  const hexSig = bytesToHex(fileBuffer, 8);
  const detectedMime = detectMimeFromSignature(hexSig);

  // Size guardrail — reject files over 25 MB (platform upload limit)
  if (fileSize > 25 * 1024 * 1024) {
    return { valid: false, detected_mime: detectedMime, declared_mime: declaredMime, reason: "File exceeds 25 MB limit", file_size: fileSize };
  }

  // Block known executable / malicious signatures
  for (const blocked of BLOCKED_SIGNATURES) {
    if (hexSig.startsWith(blocked)) {
      return { valid: false, detected_mime: detectedMime, declared_mime: declaredMime, reason: `Blocked file signature detected (${blocked})`, file_size: fileSize };
    }
  }

  // Check declared MIME is in allowlist
  const allowedMimes = Object.keys(ALLOWED_MIME_TYPES);
  if (!allowedMimes.includes(declaredMime)) {
    return { valid: false, detected_mime: detectedMime, declared_mime: declaredMime, reason: `MIME type '${declaredMime}' is not in the allowlist`, file_size: fileSize };
  }

  // If we detected a signature, verify it matches the declared type
  if (detectedMime && detectedMime !== declaredMime) {
    // Allow zip-based Office formats (both map to 504B0304)
    const declaredSigs = ALLOWED_MIME_TYPES[declaredMime] || [];
    const detectedSigs = ALLOWED_MIME_TYPES[detectedMime] || [];
    const sigMatches = declaredSigs.some(s => hexSig.startsWith(s));
    if (!sigMatches && declaredSigs.length > 0) {
      return { valid: false, detected_mime: detectedMime, declared_mime: declaredMime, reason: `MIME type mismatch — declared '${declaredMime}' but signature indicates '${detectedMime}'`, file_size: fileSize };
    }
  }

  // Text-based formats (csv, json, txt) have no reliable magic bytes — allow if declared
  if (["text/csv", "application/json", "text/plain"].includes(declaredMime)) {
    return { valid: true, detected_mime: detectedMime, declared_mime: declaredMime, reason: "Text format accepted (no magic-byte verification)", file_size: fileSize };
  }

  // Verify the declared MIME's expected signature is present
  const expectedSigs = ALLOWED_MIME_TYPES[declaredMime] || [];
  if (expectedSigs.length > 0) {
    const sigOk = expectedSigs.some(s => hexSig.startsWith(s));
    if (!sigOk) {
      return { valid: false, detected_mime: detectedMime, declared_mime: declaredMime, reason: `File signature does not match declared MIME '${declaredMime}'`, file_size: fileSize };
    }
  }

  return { valid: true, detected_mime: detectedMime, declared_mime: declaredMime, reason: "Signature verified", file_size: fileSize };
}

/**
 * Detects the actual MIME type from a hex signature.
 */
function detectMimeFromSignature(hexSig: string): string | null {
  if (hexSig.startsWith("89504E47")) return "image/png";
  if (hexSig.startsWith("FFD8FF")) return "image/jpeg";
  if (hexSig.startsWith("47494638")) return "image/gif";
  if (hexSig.startsWith("25504446")) return "application/pdf";
  if (hexSig.startsWith("504B0304")) return "application/zip";
  if (hexSig.startsWith("D0CF11E0")) return "application/msword";
  if (hexSig.startsWith("4D5A")) return "application/x-msdownload";
  if (hexSig.startsWith("7F454C46")) return "application/x-elf";
  return null;
}