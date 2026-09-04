import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { awsFetch, xmlExtract, xmlExtractAll } from "../../shared/awsSigV4.ts";

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || "sync";
    const region = body.region || secrets.get("AWS_REGION") || "us-east-1";

    const accessKey = secrets.get("AWS_ACCESS_KEY_ID");
    const secretKey = secrets.get("AWS_SECRET_ACCESS_KEY");

    if (!accessKey || !secretKey) {
      return Response.json({ error: "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY secrets." }, { status: 400 });
    }

    // --- STS GetCallerIdentity (verify credentials + get account ID) ---
    const stsResp = await awsFetch({
      method: "POST", host: "sts.amazonaws.com", path: "/", queryString: "",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "Action=GetCallerIdentity&Version=2011-06-15",
      accessKey, secretKey, region: "us-east-1", service: "sts",
    });
    const stsText = await stsResp.text();
    if (!stsResp.ok) {
      return Response.json({ error: "AWS credentials invalid", detail: stsText.substring(0, 500) }, { status: 400 });
    }
    const accountId = xmlExtract(stsText, "Account") || "unknown";

    if (action === "test") {
      return Response.json({ connected: true, account_id: accountId, region });
    }

    // --- IAM GetAccountSummary ---
    const iamResp = await awsFetch({
      method: "POST", host: "iam.amazonaws.com", path: "/", queryString: "",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "Action=GetAccountSummary&Version=2010-05-08",
      accessKey, secretKey, region, service: "iam",
    });
    const iamText = await iamResp.text();
    const usersMatch = iamText.match(/<key>Users<\/key>\s*<value>(\d+)<\/value>/);
    const mfaMatch = iamText.match(/<key>UsersQuasiMFA<\/key>\s*<value>(\d+)<\/value>/);
    const accessKeysMatch = iamText.match(/<key>AccessKeys<\/key>\s*<value>(\d+)<\/value>/);
    const totalUsers = usersMatch ? parseInt(usersMatch[1]) : 0;
    const mfaUsers = mfaMatch ? parseInt(mfaMatch[1]) : 0;
    const accessKeyCount = accessKeysMatch ? parseInt(accessKeysMatch[1]) : 0;

    // --- IAM ListUsers ---
    const listUsersResp = await awsFetch({
      method: "POST", host: "iam.amazonaws.com", path: "/", queryString: "",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "Action=ListUsers&Version=2010-05-08&MaxItems=100",
      accessKey, secretKey, region, service: "iam",
    });
    const listUsersText = await listUsersResp.text();
    const userNames = xmlExtractAll(listUsersText, "UserName");

    // --- S3 ListBuckets ---
    const s3Resp = await awsFetch({
      method: "GET", host: `s3.${region}.amazonaws.com`, path: "/", queryString: "",
      headers: {}, body: "",
      accessKey, secretKey, region, service: "s3",
    });
    const s3Text = await s3Resp.text();
    const bucketNames = xmlExtractAll(s3Text, "Name");

    // --- Security Hub GetFindings (best effort) ---
    let securityHubFindings: any[] = [];
    try {
      const shResp = await awsFetch({
        method: "POST", host: `securityhub.${region}.amazonaws.com`, path: "/findings", queryString: "",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ MaxResults: 100 }),
        accessKey, secretKey, region, service: "securityhub",
      });
      if (shResp.ok) {
        const shData = await shResp.json();
        securityHubFindings = shData.Findings || [];
      }
    } catch { /* Security Hub may not be enabled */ }

    // --- Create / update Connection record ---
    const existing = await base44.entities.Connection.filter({ service: "aws" });
    const connData: any = {
      name: `AWS Account ${accountId}`,
      service: "aws",
      category: "cloud",
      status: "connected",
      health: "healthy",
      auth_method: "api_key",
      config: JSON.stringify({ region, accountId, bucketCount: bucketNames.length, totalUsers, mfaUsers }),
      last_sync_at: new Date().toISOString(),
      last_status: "ok",
      control_count: 0,
      evidence_collected_count: 0,
    };
    let connection;
    if (existing.length > 0) {
      connection = await base44.entities.Connection.update(existing[0].id, connData);
    } else {
      connection = await base44.entities.Connection.create(connData);
    }

    // --- Create SecurityFinding records for Security Hub findings ---
    let findingsCreated = 0;
    for (const f of securityHubFindings.slice(0, 50)) {
      const existingFinding = await base44.entities.SecurityFinding.filter({ finding_id: f.Id });
      if (existingFinding.length === 0) {
        await base44.entities.SecurityFinding.create({
          finding_id: f.Id,
          source: "security_hub",
          cloud_provider: "aws",
          title: f.Title || "AWS Security Hub Finding",
          description: f.Description || "",
          severity: ((f.Severity?.Label) || "medium").toLowerCase(),
          status: "open",
          detected_date: f.CreatedAt ? f.CreatedAt.split("T")[0] : new Date().toISOString().split("T")[0],
          asset: f.Resources?.[0]?.Id || "",
          resource_id: f.Resources?.[0]?.Id || "",
          service: f.Resources?.[0]?.Type || "",
          connection_id: connection.id,
        });
        findingsCreated++;
      }
    }

    // --- Create Evidence records ---
    const today = new Date().toISOString().split("T")[0];
    const evidenceRecords = [
      {
        title: `AWS IAM Account Summary — ${today}`,
        description: `IAM account summary for AWS account ${accountId}. Total users: ${totalUsers}, MFA-enabled: ${mfaUsers}, Access keys: ${accessKeyCount}. Users: ${userNames.slice(0, 20).join(", ")}`,
        type: "configuration",
        status: "approved",
        collected_date: today,
        control_title: "IAM Access Review",
      },
      {
        title: `AWS S3 Bucket Inventory — ${today}`,
        description: `S3 bucket inventory for AWS account ${accountId}. ${bucketNames.length} buckets: ${bucketNames.slice(0, 30).join(", ")}`,
        type: "configuration",
        status: "approved",
        collected_date: today,
        control_title: "Data Protection — S3 Inventory",
      },
    ];
    for (const ev of evidenceRecords) {
      await base44.entities.Evidence.create(ev);
    }

    // Update evidence count on connection
    await base44.entities.Connection.update(connection.id, {
      evidence_collected_count: (connection.evidence_collected_count || 0) + evidenceRecords.length,
    });

    return Response.json({
      connected: true,
      account_id: accountId,
      region,
      iam: { totalUsers, mfaUsers, accessKeyCount, userList: userNames.slice(0, 20) },
      s3: { bucketCount: bucketNames.length, buckets: bucketNames.slice(0, 30) },
      security_hub: { findingsCount: securityHubFindings.length, findingsCreated },
      evidence_created: evidenceRecords.length,
      connection_id: connection.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}