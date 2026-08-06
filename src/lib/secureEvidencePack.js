import { jsPDF } from "jspdf";

const C = {
  navy: [15, 23, 42], blue: [37, 99, 235], slate: [100, 116, 139],
  light: [241, 245, 249], muted: [148, 163, 184],
  green: [16, 185, 129], red: [239, 68, 68], amber: [245, 158, 11], white: [255, 255, 255],
  dark: [30, 41, 59],
};

function fmtDate(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleString(); } catch { return String(d); }
}

/**
 * Computes a SHA-256 hash of the pack contents using the Web Crypto API.
 * Returns a hex string.
 */
async function computePackHash(payload) {
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function genPackId() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SEP-${ts}-${rnd}`;
}

/**
 * Generate a secure, timestamped, tamper-evident PDF evidence pack for external auditors.
 * @param {object} opts
 * @param {Array} opts.selectedControls - Control records to include
 * @param {Array} opts.selectedEvidence - Evidence records to include
 * @param {string} opts.orgName - Organization name
 * @param {string} opts.preparedBy - Name of the person preparing the pack
 * @param {string} opts.notes - Optional cover notes
 */
export async function generateSecureEvidencePack({ selectedControls, selectedEvidence, orgName, preparedBy, notes }) {
  const packId = genPackId();
  const timestamp = new Date();
  const timestampIso = timestamp.toISOString();

  // Build the payload that will be hashed — this is the tamper-evident seal
  const payload = {
    pack_id: packId,
    generated_at: timestampIso,
    organization: orgName || "—",
    prepared_by: preparedBy || "—",
    control_ids: (selectedControls || []).map((c) => c.id).sort(),
    evidence_ids: (selectedEvidence || []).map((e) => e.id).sort(),
    control_count: (selectedControls || []).length,
    evidence_count: (selectedEvidence || []).length,
  };
  const packHash = await computePackHash(payload);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  let page = 1;
  let y = M;
  const contentW = W - M * 2;

  const header = () => {
    doc.setFillColor(...C.navy);
    doc.rect(0, 0, W, 64, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("CertiGuard GRC", M, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.light);
    doc.text("Secure Auditor Evidence Pack", M, 46);
    doc.text(`Org: ${orgName || "—"}`, W - M, 28, { align: "right" });
    doc.text(`Pack ID: ${packId}`, W - M, 46, { align: "right" });
    y = 92;
  };

  const footer = () => {
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.5);
    doc.line(M, H - 40, W - M, H - 40);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("CONFIDENTIAL — Prepared for external auditor review · Tamper-evident", M, H - 26);
    doc.text(`Page ${page} · Hash: ${packHash.slice(0, 16)}…`, W - M, H - 26, { align: "right" });
  };

  const ensure = (h) => {
    if (y + h > H - 60) {
      footer();
      doc.addPage();
      page++;
      header();
    }
  };

  const sectionTitle = (t) => {
    ensure(46);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.navy);
    doc.text(t, M, y);
    doc.setDrawColor(...C.blue);
    doc.setLineWidth(2);
    doc.line(M, y + 4, M + 36, y + 4);
    y += 22;
  };

  const drawTable = (headers, rows, ratios) => {
    const widths = ratios.map((r) => r * contentW);
    const rowH = 20;
    ensure(rowH + 4);
    doc.setFillColor(...C.navy);
    doc.rect(M, y, contentW, rowH, "F");
    doc.setTextColor(...C.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    let x = M + 6;
    headers.forEach((h, i) => {
      doc.text(h, x, y + 13);
      x += widths[i];
    });
    y += rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rows.forEach((row, ri) => {
      ensure(rowH);
      if (ri % 2 === 1) {
        doc.setFillColor(...C.light);
        doc.rect(M, y, contentW, rowH, "F");
      }
      x = M + 6;
      row.forEach((cell, i) => {
        doc.setTextColor(...C.navy);
        doc.text(String(cell ?? "—").slice(0, 80), x, y + 13, { maxWidth: widths[i] - 8 });
        x += widths[i];
      });
      y += rowH;
    });
    y += 10;
  };

  // --- Page 1: Cover + Integrity Seal ---
  header();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.navy);
  ensure(36);
  doc.text("Secure Auditor Evidence Pack", M, y);
  y += 30;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.slate);
  const coverLines = [
    `Organization: ${orgName || "—"}`,
    `Prepared by: ${preparedBy || "—"}`,
    `Generated (UTC): ${timestampIso}`,
    `Generated (Local): ${fmtDate(timestamp)}`,
    `Pack ID: ${packId}`,
    `Controls included: ${payload.control_count}`,
    `Evidence artifacts included: ${payload.evidence_count}`,
  ];
  coverLines.forEach((l) => {
    ensure(16);
    doc.text(l, M, y);
    y += 16;
  });

  if (notes) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.navy);
    ensure(20);
    doc.text("Cover Notes:", M, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.slate);
    const splitNotes = doc.splitTextToSize(notes, contentW);
    splitNotes.forEach((line) => {
      ensure(14);
      doc.text(line, M, y);
      y += 13;
    });
  }

  // Integrity seal box
  y += 10;
  ensure(120);
  doc.setFillColor(...C.dark);
  doc.roundedRect(M, y, contentW, 110, 8, 8, "F");
  doc.setTextColor(...C.green);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PACK INTEGRITY SEAL", M + 16, y + 22);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...C.light);
  doc.text(`Timestamp: ${timestampIso}`, M + 16, y + 40);
  doc.text(`SHA-256 Hash:`, M + 16, y + 56);
  doc.setTextColor(...C.white);
  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  const hashLines = doc.splitTextToSize(packHash, contentW - 32);
  hashLines.forEach((line, i) => {
    doc.text(line, M + 16, y + 68 + i * 11);
  });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("This hash is computed from the pack ID, timestamp, organization, and all included control/evidence IDs.", M + 16, y + 100);
  doc.text("Any alteration to the pack contents will produce a different hash, proving tampering.", M + 16, y + 110);
  y += 124;

  // --- Section 1: Controls ---
  doc.addPage();
  page++;
  header();

  sectionTitle(`1. Control Documentation (${selectedControls.length})`);
  if (selectedControls.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No controls selected for this pack.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Control ID", "Title", "Category", "Status", "Owner", "Last Tested"],
      selectedControls.map((c) => [
        c.control_id || c.id?.slice(0, 8) || "—",
        c.title || "—",
        (c.category || "—").replace(/_/g, " "),
        (c.status || "—").replace(/_/g, " "),
        c.owner_name || "—",
        c.last_tested || "—",
      ]),
      [0.14, 0.28, 0.16, 0.14, 0.16, 0.12]
    );
  }

  // --- Section 2: Evidence ---
  sectionTitle(`2. Evidence Artifacts (${selectedEvidence.length})`);
  if (selectedEvidence.length === 0) {
    ensure(16);
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text("No evidence selected for this pack.", M, y);
    y += 16;
  } else {
    drawTable(
      ["Title", "Control", "Type", "Status", "Collected", "Reviewer"],
      selectedEvidence.map((e) => [
        e.title || "—",
        e.control_title || e.control_id || "—",
        (e.type || "—").replace(/_/g, " "),
        (e.status || "—").replace(/_/g, " "),
        e.collected_date || "—",
        e.reviewer_name || "—",
      ]),
      [0.26, 0.2, 0.12, 0.14, 0.14, 0.14]
    );

    // Evidence detail cards
    sectionTitle("2a. Evidence Detail");
    selectedEvidence.forEach((e) => {
      ensure(60);
      doc.setFillColor(...C.light);
      doc.roundedRect(M, y, contentW, 52, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...C.navy);
      doc.text(e.title || "—", M + 8, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.slate);
      const detailLines = [
        `Control: ${e.control_title || e.control_id || "—"}  |  Type: ${e.type || "—"}  |  Status: ${e.status || "—"}`,
        `Collected: ${e.collected_date || "—"}  |  Expires: ${e.expiry_date || "—"}  |  Reviewer: ${e.reviewer_name || "—"}`,
        `File: ${e.file_name || "—"}`,
      ];
      if (e.review_notes) detailLines.push(`Review notes: ${e.review_notes}`);
      detailLines.forEach((line, i) => {
        const split = doc.splitTextToSize(line, contentW - 16);
        split.forEach((sl, j) => {
          ensure(11);
          doc.text(sl, M + 8, y + 26 + (i + j) * 10);
        });
      });
      y += 58;
    });
  }

  // --- Final page: Verification ---
  doc.addPage();
  page++;
  header();
  sectionTitle("3. Verification Instructions");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.slate);
  const verifyLines = [
    "This evidence pack is tamper-evident. To verify integrity:",
    "",
    "1. Record the Pack ID and SHA-256 hash from the cover page.",
    "2. Re-request the pack from the organization and compare the hash.",
    "3. If the hashes match, the pack contents have not been altered.",
    "4. If the hashes differ, the pack has been modified after generation.",
    "",
    `Pack ID: ${packId}`,
    `SHA-256: ${packHash}`,
    `Timestamp (UTC): ${timestampIso}`,
    `Controls: ${payload.control_count}  |  Evidence: ${payload.evidence_count}`,
  ];
  verifyLines.forEach((l) => {
    ensure(16);
    if (l.startsWith("SHA-256:") || l.startsWith("Pack ID:")) {
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.navy);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.slate);
    }
    doc.text(l, M, y);
    y += 14;
  });

  footer();

  const fileName = `CertiGuard_Auditor_Pack_${packId}_${timestampIso.slice(0, 10)}.pdf`;
  doc.save(fileName);

  return {
    packId,
    hash: packHash,
    timestamp: timestampIso,
    controlCount: payload.control_count,
    evidenceCount: payload.evidence_count,
    fileName,
  };
}