// AWS SigV4 request signing using Web Crypto API — no AWS SDK dependency.
// Implements https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html

const encoder = new TextEncoder();

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return bufToHex(hash);
}

async function hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
}

async function getSigningKey(secretKey: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(encoder.encode("AWS4" + secretKey), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, "aws4_request");
}

export interface AwsRequest {
  method: string;
  host: string;
  path: string;
  queryString?: string;
  headers?: Record<string, string>;
  body?: string;
  accessKey: string;
  secretKey: string;
  region: string;
  service: string;
}

export async function awsFetch(params: AwsRequest): Promise<Response> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const dateStamp = amzDate.substring(0, 8);

  const { method, host, path, queryString = "", headers = {}, body = "", accessKey, secretKey, region, service } = params;

  const payloadHash = await sha256Hex(body);
  const allHeaders: Record<string, string> = {
    ...headers,
    host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
  };

  const sortedKeys = Object.keys(allHeaders).sort();
  const canonicalHeaders = sortedKeys.map(k => `${k.toLowerCase()}:${allHeaders[k].trim()}\n`).join("");
  const signedHeaders = sortedKeys.map(k => k.toLowerCase()).join(";");

  const canonicalRequest = [method, path, queryString, canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const signingKey = await getSigningKey(secretKey, dateStamp, region, service);
  const signature = bufToHex(await hmac(signingKey, stringToSign));

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${path}${queryString ? "?" + queryString : ""}`;
  const fetchOptions: RequestInit = {
    method,
    headers: { ...allHeaders, Authorization: authorization },
  };
  if (body && method !== "GET") {
    fetchOptions.body = body;
  }
  return fetch(url, fetchOptions);
}

// Helper to extract text from the first XML tag match
export function xmlExtract(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return match ? match[1] : null;
}

export function xmlExtractAll(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map(m => m[1]);
}