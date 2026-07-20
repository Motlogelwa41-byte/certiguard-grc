// Shared Gmail sender for compliance notification emails.
// Uses the authorized shared Gmail connector (gmail.send scope).
// Builds a proper RFC 2822 MIME message with RFC 2047 encoded subject
// and base64-encoded UTF-8 HTML body, then sends via the Gmail API.

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const GMAIL_PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

export async function sendGmail(base44, to, subject, htmlBody) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("gmail");
  if (!accessToken) throw new Error("Gmail connection not available — authorize the Gmail connector.");
  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // Resolve the sending account's address for the From header.
  let fromAddr = "";
  try {
    const profRes = await fetch(GMAIL_PROFILE_URL, { headers: authHeader });
    if (profRes.ok) {
      const prof = await profRes.json();
      fromAddr = prof.emailAddress || "";
    }
  } catch (e) {
    // ignore — From will be omitted and Gmail uses the authenticated account
  }

  const recipient = String(to || "").trim();
  if (!recipient) throw new Error("No recipient email address provided.");

  const encSubject = encodeHeader(subject || "Compliance notification");
  const bodyB64 = toBase64(htmlBody || "");

  const lines = [];
  if (fromAddr) lines.push("From: " + fromAddr);
  lines.push("To: " + recipient);
  lines.push("Subject: " + encSubject);
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/html; charset=UTF-8");
  lines.push("Content-Transfer-Encoding: base64");
  lines.push("");
  lines.push(bodyB64);
  const rawMessage = lines.join("\r\n");

  const rawB64Url = toBase64Url(rawMessage);

  const res = await fetch(GMAIL_SEND_URL, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: rawB64Url }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${detail}`);
  }
  return await res.json();
}

function encodeHeader(str) {
  const b64 = toBase64(str).replace(/\r\n/g, "");
  return "=?UTF-8?B?" + b64 + "?=";
}

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/(.{76})/g, "$1\r\n").trim();
}

function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}