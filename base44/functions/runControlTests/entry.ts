import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { secrets } from 'base44:runtime';

// Built-in automated test evaluators. Each receives (test, ctx) and returns
// { result: 'pass'|'fail', summary, failCount, details: string[] }.
// ctx contains tenant-scoped arrays: directoryUsers, findings, vendors, connections, controls.
const evaluators = {
  "iam.all_admins_mfa_enabled": (_test, ctx) => {
    const isAdmin = (u) => (u.roles || []).some((r) => /admin/i.test(String(r))) || (u.groups || []).some((g) => /admin/i.test(String(g)));
    const admins = ctx.directoryUsers.filter((u) => u.status === "active" && isAdmin(u));
    const failing = admins.filter((u) => !u.mfa_enabled);
    return {
      result: failing.length ? "fail" : "pass",
      summary: failing.length ? `${failing.length} admin(s) without MFA` : `All ${admins.length} admin(s) have MFA enabled`,
      failCount: failing.length,
      details: failing.slice(0, 25).map((u) => `${u.full_name || u.email} (${u.email})`),
    };
  },
  "iam.all_users_mfa_enabled": (_test, ctx) => {
    const active = ctx.directoryUsers.filter((u) => u.status === "active");
    const failing = active.filter((u) => !u.mfa_enabled);
    return {
      result: failing.length ? "fail" : "pass",
      summary: failing.length ? `${failing.length} active user(s) without MFA` : `All ${active.length} active user(s) have MFA enabled`,
      failCount: failing.length,
      details: failing.slice(0, 25).map((u) => `${u.full_name || u.email} (${u.email})`),
    };
  },
  "iam.no_error_provisioning": (_test, ctx) => {
    const errors = ctx.directoryUsers.filter((u) => u.provisioning_status === "error");
    return {
      result: errors.length ? "fail" : "pass",
      summary: errors.length ? `${errors.length} user(s) in provisioning error` : "All users provisioned cleanly",
      failCount: errors.length,
      details: errors.slice(0, 25).map((u) => u.email),
    };
  },
  "findings.no_open_critical": (_test, ctx) => {
    const open = ctx.findings.filter((f) => ["critical", "high"].includes(f.severity) && ["open", "in_progress"].includes(f.status));
    return {
      result: open.length ? "fail" : "pass",
      summary: open.length ? `${open.length} open critical/high finding(s)` : "No open critical/high findings",
      failCount: open.length,
      details: open.slice(0, 25).map((f) => `${f.title} (${f.severity}, ${f.status})`),
    };
  },
  "findings.no_sla_breached": (_test, ctx) => {
    const breached = ctx.findings.filter((f) => f.sla_breached);
    return {
      result: breached.length ? "fail" : "pass",
      summary: breached.length ? `${breached.length} SLA-breach finding(s)` : "No SLA-breach findings",
      failCount: breached.length,
      details: breached.slice(0, 25).map((f) => f.title),
    };
  },
  "vendors.no_unapproved_high_risk": (_test, ctx) => {
    const bad = ctx.vendors.filter((v) => ["critical", "high"].includes(v.risk_level) && v.status !== "approved");
    return {
      result: bad.length ? "fail" : "pass",
      summary: bad.length ? `${bad.length} high-risk vendor(s) not approved` : "All high-risk vendors approved",
      failCount: bad.length,
      details: bad.slice(0, 25).map((v) => v.name),
    };
  },
  "connections.all_healthy": (_test, ctx) => {
    const bad = ctx.connections.filter((c) => c.health !== "healthy" || c.status !== "connected");
    return {
      result: bad.length ? "fail" : "pass",
      summary: bad.length ? `${bad.length} connection(s) unhealthy` : "All connections healthy",
      failCount: bad.length,
      details: bad.slice(0, 25).map((c) => `${c.name} (${c.service})`),
    };
  },
  "controls.evidence_attached": (test, ctx) => {
    const ids = test.linked_control_ids || [];
    const linked = ctx.controls.filter((c) => ids.includes(c.id));
    const failing = linked.filter((c) => (c.evidence_count || 0) === 0);
    return {
      result: failing.length ? "fail" : "pass",
      summary: failing.length ? `${failing.length} linked control(s) missing evidence` : `All ${linked.length} linked control(s) have evidence`,
      failCount: failing.length,
      details: failing.slice(0, 25).map((c) => c.title),
    };
  },
  "controls.no_failing_critical": (_test, ctx) => {
    const failing = ctx.controls.filter((c) => c.severity === "critical" && c.status === "failing");
    return {
      result: failing.length ? "fail" : "pass",
      summary: failing.length ? `${failing.length} critical control(s) failing` : "No critical controls failing",
      failCount: failing.length,
      details: failing.slice(0, 25).map((c) => c.title),
    };
  },
  "vendor_soc2_freshness_check": (_test, ctx) => {
    const soc2Vendors = ctx.vendors.filter((v) => v.soc2_compliant);
    const oneYearAgo = new Date(Date.now() - 365 * 86400000);
    const stale = soc2Vendors.filter((v) => !v.last_assessment_date || new Date(v.last_assessment_date) < oneYearAgo);
    return {
      result: stale.length ? "fail" : "pass",
      summary: stale.length ? `${stale.length} vendor(s) with stale SOC 2 reports (>1yr)` : `All ${soc2Vendors.length} SOC 2-compliant vendor(s) have fresh reports`,
      failCount: stale.length,
      details: stale.slice(0, 25).map((v) => `${v.name} (last assessed: ${v.last_assessment_date || "never"})`),
    };
  },
  "s3_public_access_check_v2": (_test, ctx) => {
    const open = ctx.findings.filter((f) => {
      const text = `${f.title} ${f.description || ""} ${f.posture_check || ""}`.toLowerCase();
      return (text.includes("s3") || text.includes("public") || text.includes("acl") || text.includes("block public")) && ["open", "in_progress"].includes(f.status);
    });
    return {
      result: open.length ? "fail" : "pass",
      summary: open.length ? `${open.length} open S3 public access finding(s)` : "No open S3 public access findings",
      failCount: open.length,
      details: open.slice(0, 25).map((f) => `${f.title} (${f.severity}, ${f.status})`),
    };
  },
  "ad_password_policy_evaluator": (_test, ctx) => {
    const open = ctx.findings.filter((f) => {
      const text = `${f.title} ${f.description || ""} ${f.posture_check || ""}`.toLowerCase();
      return (text.includes("password") || text.includes("active directory") || text.includes("ad password")) && ["open", "in_progress"].includes(f.status);
    });
    return {
      result: open.length ? "fail" : "pass",
      summary: open.length ? `${open.length} open password policy finding(s)` : "Password policy compliant — no open findings",
      failCount: open.length,
      details: open.slice(0, 25).map((f) => `${f.title} (${f.severity})`),
    };
  },
};

Deno.serve(async (req) => {
  const startedAt = new Date().toISOString();
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    let triggeredBy = "scheduled";
    let user = null;
    try { user = await base44.auth.me(); } catch (_) { user = null; }
    if (user) {
      triggeredBy = user.full_name || user.email || "manual";
      if (!["admin", "compliance_officer"].includes(user.role)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    } else {
      const expected = secrets.get("INTERNAL_INVOKE_TOKEN");
      if (!expected || body._internal_token !== expected) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const singleTestId = body.test_id || null;

    // Load test definitions
    let tests = await sr.entities.ControlTest.list("-created_date", 500);
    tests = tests.filter((t) => t.enabled !== false);
    if (singleTestId) tests = tests.filter((t) => t.id === singleTestId);

    if (!tests.length) {
      return Response.json({ total: 0, passed: 0, failed: 0, errors: 0, results: [] });
    }

    // Pre-fetch source data once (all tenants), scope per-tenant in memory
    const [directoryUsers, findings, vendors, connections, controls] = await Promise.all([
      sr.entities.DirectoryUser.list("-created_date", 500),
      sr.entities.SecurityFinding.list("-created_date", 500),
      sr.entities.Vendor.list("-created_date", 500),
      sr.entities.Connection.list("-created_date", 500),
      sr.entities.Control.list("-created_date", 500),
    ]);

    const byTenant = {};
    for (const t of tests) {
      const tk = t.tenant_id || "_default";
      (byTenant[tk] = byTenant[tk] || []).push(t);
    }

    const today = new Date().toISOString().slice(0, 10);
    let grandPassed = 0, grandFailed = 0, grandErrors = 0;
    const allResults = [];

    for (const [tenantKey, tenantTests] of Object.entries(byTenant)) {
      const tid = tenantKey === "_default" ? null : tenantKey;
      const scope = (arr) => (tid ? arr.filter((x) => x.tenant_id === tid) : arr.filter((x) => !x.tenant_id));

      const ctx = {
        directoryUsers: scope(directoryUsers),
        findings: scope(findings),
        vendors: scope(vendors),
        connections: scope(connections),
        controls: scope(controls),
      };

      for (const test of tenantTests) {
        const evaluator = evaluators[test.test_key];
        let outcome;
        try {
          if (!evaluator) throw new Error(`Unknown test_key: ${test.test_key}`);
          outcome = evaluator(test, ctx);
        } catch (e) {
          outcome = { result: "error", summary: e.message, failCount: 0, details: [] };
        }

        const isFail = outcome.result === "fail";
        const isError = outcome.result === "error";
        if (outcome.result === "pass") grandPassed++;
        else if (isError) grandErrors++;
        else grandFailed++;

        // Update linked controls (passing/failing) + last_tested
        const controlIds = test.linked_control_ids || [];
        let controlsUpdated = [];
        if (test.auto_update_control !== false && controlIds.length && !isError) {
          const newStatus = isFail ? "failing" : "passing";
          const bulkBody = controlIds.map((cid) => ({ id: cid, status: newStatus, last_tested: today }));
          try {
            await sr.entities.Control.bulkUpdate(bulkBody);
            controlsUpdated = controlIds;
          } catch (e) { /* keep going */ }
        }

        // Auto-create evidence on pass
        let evidenceCreated = 0;
        if (test.auto_create_evidence && outcome.result === "pass" && controlIds.length) {
          for (const cid of controlIds) {
            const ctrl = ctx.controls.find((c) => c.id === cid);
            try {
              await sr.entities.Evidence.create({
                tenant_id: tid || undefined,
                title: `Automated test evidence: ${test.title}`,
                description: outcome.summary,
                control_id: cid,
                control_title: ctrl?.title || "",
                type: "log",
                status: "approved",
                collected_date: today,
                notes: `Auto-generated by control test ${test.test_id || test.id} (${test.test_key}).`,
              });
              evidenceCreated++;
            } catch (e) { /* ignore single failure */ }
          }
        }

        // Persist run on the test definition
        try {
          await sr.entities.ControlTest.update(test.id, {
            last_run_at: startedAt,
            last_result: outcome.result,
            last_run_summary: outcome.summary,
            last_fail_count: outcome.failCount || 0,
            last_run_details: JSON.stringify(outcome.details || []),
          });
        } catch (e) { /* ignore */ }

        // Append immutable result record
        try {
          await sr.entities.ControlTestResult.create({
            tenant_id: tid || undefined,
            test_id: test.id,
            test_title: test.title,
            test_key: test.test_key,
            result: outcome.result,
            run_at: startedAt,
            summary: outcome.summary,
            fail_count: outcome.failCount || 0,
            details: JSON.stringify(outcome.details || []),
            controls_updated: controlsUpdated,
            evidence_created: evidenceCreated,
            triggered_by: triggeredBy,
            linked_control_ids: controlIds,
          });
        } catch (e) { /* ignore */ }

        allResults.push({
          test_id: test.id,
          title: test.title,
          test_key: test.test_key,
          result: outcome.result,
          summary: outcome.summary,
          fail_count: outcome.failCount || 0,
          controls_updated: controlsUpdated.length,
          evidence_created: evidenceCreated,
        });
      }
    }

    return Response.json({
      total: tests.length,
      passed: grandPassed,
      failed: grandFailed,
      errors: grandErrors,
      results: allResults,
    });
  } catch (error) {
    console.error("runControlTests error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});