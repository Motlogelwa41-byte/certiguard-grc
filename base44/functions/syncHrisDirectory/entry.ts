import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Syncs the employee directory from a HRIS (BambooHR or generic REST API) into
// the DirectoryUser entity. Deduplicates by external_id. Workflow-invoked or manual.

function mapStatus(s) {
  const v = (s || '').toLowerCase();
  if (v === 'active' || v === '1') return 'active';
  if (v === 'suspended' || v === 'inactive') return 'suspended';
  if (v === 'terminated' || v === 'deprovisioned') return 'deprovisioned';
  return 'active';
}

async function fetchBambooHr(apiUrl, apiKey) {
  // BambooHR uses basic auth with API key + 'x' as password
  const url = apiUrl.endsWith('/') ? apiUrl : apiUrl + '/';
  const res = await fetch(`${url}employees/directory`, {
    headers: { Accept: 'application/json', Authorization: `Basic ${btoa(`${apiKey}:x`)}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`BambooHR fetch failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  // BambooHR directory returns { employees: [ { id, fields: { ... } } ] }
  return (data.employees || []).map((e) => ({
    external_id: e.id,
    email: e.workEmail || e.homeEmail || e.fields?.workEmail || undefined,
    full_name: e.displayName || e.fields?.displayName || [e.fields?.firstName, e.fields?.lastName].filter(Boolean).join(' ') || undefined,
    department: e.fields?.department || e.department || undefined,
    title: e.fields?.jobTitle || e.jobTitle || undefined,
    status: 'active',
  }));
}

async function fetchGeneric(apiUrl, apiToken) {
  // Generic REST API returning an array of employee objects
  const res = await fetch(apiUrl, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HRIS fetch failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.employees || data.users || data.results || [];
  return list.map((e) => ({
    external_id: e.id || e.employeeId || e.external_id || e.email,
    email: e.email || e.workEmail || undefined,
    full_name: e.fullName || e.name || [e.firstName, e.lastName].filter(Boolean).join(' ') || undefined,
    department: e.department || undefined,
    title: e.title || e.jobTitle || undefined,
    status: mapStatus(e.status || e.employmentStatus),
  }));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const provider = (Deno.env.get('HRIS_PROVIDER') || '').toLowerCase();
    const apiUrl = Deno.env.get('HRIS_API_URL');
    const apiToken = Deno.env.get('HRIS_API_TOKEN');

    if (!provider || !apiUrl || !apiToken) {
      return Response.json({
        ok: true,
        skipped: true,
        reason: 'HRIS_PROVIDER, HRIS_API_URL, and HRIS_API_TOKEN must be set (provider: bamboohr, workday, or generic)',
      });
    }

    // Fetch employees from the HRIS
    let employees = [];
    if (provider === 'bamboohr') {
      employees = await fetchBambooHr(apiUrl, apiToken);
    } else {
      employees = await fetchGeneric(apiUrl, apiToken);
    }

    if (employees.length === 0) {
      return Response.json({ ok: true, provider, fetched: 0, synced: 0, updated: 0 });
    }

    // Fetch existing directory users to dedupe by external_id
    const existing = await base44.asServiceRole.entities.DirectoryUser.list('-created_date', 500);
    const byExternalId = new Map();
    (existing || []).forEach((u) => { if (u.external_id) byExternalId.set(u.external_id, u); });

    const now = new Date().toISOString();
    let created = 0;
    let updated = 0;
    const toCreate = [];

    for (const emp of employees) {
      if (!emp.external_id) continue;
      const existingUser = byExternalId.get(emp.external_id);
      if (existingUser) {
        // Update if changed
        try {
          await base44.asServiceRole.entities.DirectoryUser.update(existingUser.id, {
            email: emp.email || existingUser.email,
            full_name: emp.full_name || existingUser.full_name,
            department: emp.department || existingUser.department,
            title: emp.title || existingUser.title,
            status: emp.status || existingUser.status,
            last_synced_at: now,
            provisioning_status: 'synced',
          });
          updated++;
        } catch (err) {
          console.error('DirectoryUser update error:', err?.message);
        }
      } else {
        toCreate.push({
          external_id: emp.external_id,
          email: emp.email,
          full_name: emp.full_name,
          department: emp.department,
          title: emp.title,
          status: emp.status || 'active',
          idp_name: provider,
          provisioning_status: 'synced',
          last_synced_at: now,
        });
      }
    }

    // Bulk create new users
    if (toCreate.length > 0) {
      try {
        await base44.asServiceRole.entities.DirectoryUser.bulkCreate(toCreate);
        created = toCreate.length;
      } catch (err) {
        console.error('DirectoryUser bulkCreate error:', err?.message);
      }
    }

    return Response.json({
      ok: true,
      provider,
      fetched: employees.length,
      synced: created,
      updated,
    });
  } catch (error) {
    console.error('syncHrisDirectory error:', error?.message || error);
    return Response.json({ ok: false, error: error?.message || 'HRIS sync failed' }, { status: 500 });
  }
});