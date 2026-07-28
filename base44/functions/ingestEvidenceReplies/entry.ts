import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Scans the connected Gmail inbox for replies to CertiGuard evidence-request
// emails that carry file attachments, downloads each attachment, uploads it to
// app storage, and creates a pending_review Evidence record linked to the
// matching control (matched by Control ID found in the filename or reply body).
// Unmatched submissions are still captured for manual linking by a compliance
// officer. Runs on a daily schedule and can be triggered manually.
//
// REPLY-PATH REQUIREMENT (operational — must hold or evidence is lost):
// Evidence-request emails are sent via sendGmail() (shared/gmailSender.ts),
// which resolves the connected SHARED Gmail account's address from the Gmail
// profile and sets it as the From: header. Owners who hit "Reply" therefore
// send their attachments back to THAT SAME inbox, which this function reads
// via the same shared gmail connector (gmail.readonly). The loop is only
// closed if the Gmail account authorised in the dashboard is the one owners
// actually reply to. If the connected Gmail account is ever changed, replies
// sent to the old address will NOT be ingested and the evidence is silently
// lost. The request email body tells owners to "reply to this email and attach
// your evidence" and to include the Control ID — matching here depends on that.

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
const LOOKBACK_DAYS = 14;
const TOKEN = 'CertiGuard Evidence';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Authorization: authenticated admin/compliance_officer (manual) or internal token (scheduled).
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      if (!['admin', 'compliance_officer'].includes(user.role)) {
        return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else {
      const expected = secrets.get('INTERNAL_INVOKE_TOKEN');
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    if (!accessToken) {
      return Response.json({ error: 'Gmail connector not authorized (needs gmail.readonly).' }, { status: 503 });
    }
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // Load tenant controls for matching by Control ID.
    const controls = await base44.asServiceRole.entities.Control.list('-updated_date', 500).catch(() => []);
    const ctrlById = {};
    const ctrlIdLower = [];
    (controls || []).forEach((c) => {
      const cid = (c.control_id || '').trim();
      if (cid) { ctrlById[cid.toLowerCase()] = c; ctrlIdLower.push(cid.toLowerCase()); }
    });

    // Dedup via recent Evidence notes containing gmail:<messageId>.
    const recent = await base44.asServiceRole.entities.Evidence.list('-created_date', 200).catch(() => []);
    const processed = new Set();
    (recent || []).forEach((e) => {
      const m = (e.notes || '').match(/gmail:[A-Za-z0-9]+/g);
      if (m) m.forEach((x) => processed.add(x.replace('gmail:', '')));
    });

    // Search inbox for replies with attachments.
    const q = `in:inbox subject:"${TOKEN}" has:attachment newer_than:${LOOKBACK_DAYS}d`;
    const listRes = await fetch(`${GMAIL_BASE}/messages?q=${encodeURIComponent(q)}&maxResults=25`, { headers: authHeader });
    if (!listRes.ok) {
      const detail = await listRes.text();
      return Response.json({ error: `Gmail list failed (${listRes.status}): ${detail}` }, { status: 502 });
    }
    const list = await listRes.json();
    const messageIds = (list.messages || []).map((m) => m.id);

    let scanned = messageIds.length;
    let skipped = 0;
    let created = 0;
    let failed = 0;
    let matched = 0;
    let unmatched = 0;

    for (const messageId of messageIds) {
      if (processed.has(messageId)) { skipped++; continue; }
      try {
        const mRes = await fetch(`${GMAIL_BASE}/messages/${messageId}?format=full`, { headers: authHeader });
        if (!mRes.ok) { failed++; continue; }
        const msg = await mRes.json();
        const headers = msg.payload?.headers || [];
        const subject = (getHeader(headers, 'Subject') || '').replace(/^re:\s*/i, '').trim();
        const from = getHeader(headers, 'From') || '';
        const date = getHeader(headers, 'Date') || '';

        const corpus = `${subject}\n${extractText(msg.payload)}`.toLowerCase();
        const attachments = [];
        collectAttachments(msg.payload, attachments);

        if (attachments.length === 0) { skipped++; continue; }

        for (const att of attachments) {
          try {
            const aRes = await fetch(`${GMAIL_BASE}/messages/${messageId}/attachments/${att.attachmentId}`, { headers: authHeader });
            if (!aRes.ok) { failed++; continue; }
            const aJson = await aRes.json();
            const bytes = decodeBase64Url(aJson.data || '');
            if (bytes.length === 0) { failed++; continue; }

            let fileUrl = '';
            try {
              const blob = new Blob([bytes], { type: att.mimeType || 'application/octet-stream' });
              const up = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });
              fileUrl = up?.file_url || '';
            } catch (e) {
              console.error('UploadFile failed for attachment', att.filename, e?.message);
            }

            const fnameLower = (att.filename || '').toLowerCase();
            let matchedCtrl = null;
            for (const cid of ctrlIdLower) {
              if (fnameLower.includes(cid) || corpus.includes(cid)) { matchedCtrl = ctrlById[cid]; break; }
            }

            const today = new Date().toISOString().slice(0, 10);
            const evidenceTitle = att.filename || `Email evidence — ${subject.slice(0, 60)}`;
            await base44.asServiceRole.entities.Evidence.create({
              title: evidenceTitle,
              description: `Submitted via email reply by ${from} on ${date}. Control: ${matchedCtrl ? matchedCtrl.control_id + ' — ' + matchedCtrl.title : 'unmatched — manual linking required'}.`,
              file_url: fileUrl,
              file_name: att.filename || '',
              control_id: matchedCtrl ? matchedCtrl.id : '',
              control_title: matchedCtrl ? matchedCtrl.title : '',
              type: guessType(att.filename, att.mimeType),
              status: 'pending_review',
              collected_date: today,
              tenant_id: matchedCtrl ? (matchedCtrl.tenant_id || '') : '',
              notes: `Submitted via email reply by ${from} on ${date}. Gmail message: gmail:${messageId}. ${matchedCtrl ? 'Matched control ' + matchedCtrl.control_id + ' automatically.' : 'No control matched — please link manually.'}${fileUrl ? '' : ' Attachment could not be auto-uploaded; retrieve from Gmail message ' + messageId + '.'}`,
            });
            created++;
            if (matchedCtrl) matched++; else unmatched++;
          } catch (e) {
            console.error('Attachment ingest failed:', e?.message);
            failed++;
          }
        }
        processed.add(messageId);
      } catch (e) {
        console.error('Message ingest failed:', messageId, e?.message);
        failed++;
      }
    }

    return Response.json({ ok: true, scanned, skipped, created, failed, matched, unmatched });
  } catch (error) {
    console.error('ingestEvidenceReplies error:', error?.message || error);
    return Response.json({ error: error?.message || 'Ingest failed' }, { status: 500 });
  }
});

function getHeader(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}
function extractText(payload) {
  let out = '';
  if (!payload) return out;
  if (payload.mimeType === 'text/plain' && payload.body?.data) out += decodeBase64UrlText(payload.body.data) + '\n';
  if (payload.parts) for (const p of payload.parts) out += extractText(p);
  return out;
}
function decodeBase64UrlText(b64) {
  try { return new TextDecoder().decode(decodeBase64Url(b64)); } catch (_) { return ''; }
}
function collectAttachments(payload, out) {
  if (!payload) return;
  if (payload.filename && payload.body?.attachmentId) {
    out.push({ filename: payload.filename, attachmentId: payload.body.attachmentId, mimeType: payload.mimeType || '' });
  }
  if (payload.parts) for (const p of payload.parts) collectAttachments(p, out);
}
function decodeBase64Url(b64url) {
  if (!b64url) return new Uint8Array();
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4));
  const bin = atob(pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function guessType(filename, mimeType) {
  const f = (filename || '').toLowerCase();
  const m = (mimeType || '').toLowerCase();
  if (m.startsWith('image/')) return 'screenshot';
  if (f.endsWith('.pdf') || f.endsWith('.doc') || f.endsWith('.docx') || f.endsWith('.txt')) return 'document';
  if (f.endsWith('.csv') || f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.conf') || f.endsWith('.config')) return 'configuration';
  if (f.endsWith('.log') || m.includes('log')) return 'log';
  if (f.includes('cert') || f.endsWith('.pem') || f.endsWith('.crt') || f.endsWith('.p12')) return 'certificate';
  if (f.endsWith('.xls') || f.endsWith('.xlsx')) return 'report';
  return 'other';
}