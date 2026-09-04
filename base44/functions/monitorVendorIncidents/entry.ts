import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Vendor Incident & Breach Monitoring
// Continuously monitors vendors for publicly reported breaches, security incidents,
// and rating changes using AI-powered web search. Alerts in real-time when a vendor
// you depend on suffers an incident. Creates VendorIncident records and SecurityAlerts.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!["admin", "compliance_officer", "risk_manager"].includes(user.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Fetch vendor inventory
    const vendors = await sr.entities.Vendor.list("-created_date", 100).catch(() => []);
    if (!vendors || vendors.length === 0) {
      return Response.json({ status: "skipped", message: "No vendors in inventory to monitor" });
    }

    // Fetch existing vendor incidents to avoid duplicates
    const existingIncidents = await sr.entities.VendorIncident.list("-detected_date", 200).catch(() => []);
    const existingKeys = new Set((existingIncidents || []).map(i => `${i.vendor_id}_${i.title}`.toLowerCase()));

    // Group vendors by batches for web search (search for multiple vendors at once)
    const batchSize = 5;
    const vendorBatches = [];
    for (let i = 0; i < vendors.length; i += batchSize) {
      vendorBatches.push(vendors.slice(i, i + batchSize));
    }

    let totalIncidents = 0;
    let newIncidents = 0;
    let alertsCreated = 0;
    let highExposureIncidents = 0;
    const newIncidentRecords = [];

    for (const batch of vendorBatches) {
      const vendorNames = batch.map(v => v.name).join(", ");
      const vendorList = batch.map(v => ({ id: v.id, name: v.name, website: v.website, criticality: v.criticality, data_access: v.data_access, risk_level: v.risk_level }));

      // Use InvokeLLM with web search to find recent vendor incidents
      const prompt = `You are a threat intelligence analyst monitoring third-party vendors for security incidents and data breaches.

Search the web for recent (last 90 days) publicly reported security incidents, data breaches, ransomware attacks, outages, vulnerability disclosures, or security rating downgrades for the following vendors:

${vendorNames}

For each vendor, if you find a publicly reported incident, provide:
- vendor_name: the vendor name
- incident_type: one of [data_breach, ransomware, outage, vulnerability_disclosure, rating_downgrade, supply_chain_attack, insider_threat, regulatory_action, other]
- severity: [critical, high, medium, low, info]
- title: short incident title
- description: 2-3 sentence description of the incident
- source_url: URL to the public report
- source_name: publication name
- reported_date: date the incident was reported (YYYY-MM-DD)
- affected_services: array of affected services
- data_types_affected: array of data types compromised

Only report REAL, publicly documented incidents. Do not fabricate. If no incidents are found for a vendor, do not include them.

Return JSON: { "incidents": [{ vendor_name, incident_type, severity, title, description, source_url, source_name, reported_date, affected_services, data_types_affected }] }`;

      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          model: "gemini_3_flash",
          add_context_from_internet: true,
          response_json_schema: {
            type: "object",
            properties: {
              incidents: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    vendor_name: { type: "string" },
                    incident_type: { type: "string" },
                    severity: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    source_url: { type: "string" },
                    source_name: { type: "string" },
                    reported_date: { type: "string" },
                    affected_services: { type: "array", items: { type: "string" } },
                    data_types_affected: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        });

        const incidents = res.incidents || (res.data && res.data.incidents) || [];

        for (const inc of incidents) {
          // Match to vendor in our inventory
          const vendor = batch.find(v => v.name.toLowerCase() === (inc.vendor_name || "").toLowerCase());
          if (!vendor) continue;

          const dedupeKey = `${vendor.id}_${inc.title}`.toLowerCase();
          if (existingKeys.has(dedupeKey)) continue;
          existingKeys.add(dedupeKey);

          // Assess our exposure based on vendor criticality and data access
          const exposureLevel = assessExposure(vendor, inc);
          if (exposureLevel === "high" || exposureLevel === "critical") highExposureIncidents++;

          const incidentId = `VINC-${String((existingIncidents?.length || 0) + newIncidents + 1).padStart(4, '0')}`;

          const incidentData = {
            incident_id: incidentId,
            vendor_id: vendor.id,
            vendor_name: vendor.name,
            vendor_website: vendor.website,
            incident_type: inc.incident_type || "data_breach",
            severity: inc.severity || "medium",
            title: inc.title,
            description: inc.description,
            source_url: inc.source_url,
            source_name: inc.source_name,
            reported_date: inc.reported_date,
            detected_date: now,
            affected_services: JSON.stringify(inc.affected_services || []),
            data_types_affected: JSON.stringify(inc.data_types_affected || []),
            our_exposure_level: exposureLevel,
            exposure_assessment: generateExposureAssessment(vendor, inc, exposureLevel),
            recommended_actions: JSON.stringify(generateRecommendedActions(vendor, inc, exposureLevel)),
            alert_sent: false,
            status: "detected",
          };

          try {
            const created = await sr.entities.VendorIncident.create(incidentData);
            newIncidentRecords.push(created);
            newIncidents++;
            totalIncidents++;

            // Create SecurityAlert for high/critical exposure
            if (exposureLevel === "high" || exposureLevel === "critical") {
              try {
                const alert = await sr.entities.SecurityAlert.create({
                  title: `Vendor Incident: ${vendor.name} — ${inc.title}`,
                  description: `${inc.description}\n\nOur exposure: ${exposureLevel}. Vendor criticality: ${vendor.criticality}, data access: ${vendor.data_access}.`,
                  type: "supply_chain_attack",
                  severity: exposureLevel === "critical" ? "critical" : "high",
                  status: "open",
                  detected_at: now,
                  affected_user: vendor.name,
                  details: JSON.stringify({ vendor_id: vendor.id, incident_id: incidentId, incident_type: inc.incident_type }),
                });
                await sr.entities.VendorIncident.update(created.id, { security_alert_id: alert.id, alert_sent: true, alert_sent_at: now });
                alertsCreated++;
              } catch (e) { console.error("SecurityAlert create error:", e?.message); }
            }
          } catch (e) { console.error("VendorIncident create error:", e?.message); }
        }
      } catch (e) {
        console.error("Web search batch error:", e?.message);
      }
    }

    return Response.json({
      status: "completed",
      vendors_monitored: vendors.length,
      incidents_found: totalIncidents,
      new_incidents: newIncidents,
      high_exposure_incidents: highExposureIncidents,
      security_alerts_created: alertsCreated,
      message: `Vendor incident monitoring complete — ${vendors.length} vendors scanned, ${newIncidents} new incidents detected, ${highExposureIncidents} high-exposure, ${alertsCreated} alerts created.`,
    });
  } catch (error) {
    console.error("monitorVendorIncidents error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function assessExposure(vendor, incident) {
  // High exposure if: vendor is critical/high criticality AND incident is critical/high severity
  const isCriticalVendor = vendor.criticality === "critical" || vendor.criticality === "high";
  const isHighSeverity = incident.severity === "critical" || incident.severity === "high";
  const hasDataAccess = vendor.data_access === "extensive" || vendor.data_access === "moderate";

  if (isCriticalVendor && isHighSeverity && hasDataAccess) return "critical";
  if (isCriticalVendor && isHighSeverity) return "high";
  if (isCriticalVendor || (isHighSeverity && hasDataAccess)) return "medium";
  if (isHighSeverity || hasDataAccess) return "low";
  return "low";
}

function generateExposureAssessment(vendor, incident, exposureLevel) {
  return `Vendor ${vendor.name} (criticality: ${vendor.criticality}, data access: ${vendor.data_access}) experienced a ${incident.incident_type} with ${incident.severity} severity. Our exposure is ${exposureLevel} based on our dependency on this vendor and the data we share with them. Immediate review of our data exposure and potential impact is recommended.`;
}

function generateRecommendedActions(vendor, incident, exposureLevel) {
  const actions = [];
  if (exposureLevel === "critical" || exposureLevel === "high") {
    actions.push({ action: "Immediately assess if our data was compromised in the breach", priority: "critical", owner: "Security Team", status: "pending" });
    actions.push({ action: `Contact ${vendor.name} for incident details and impact assessment`, priority: "high", owner: "Vendor Manager", status: "pending" });
    actions.push({ action: "Review and rotate any shared credentials or API keys with this vendor", priority: "high", owner: "IT Security", status: "pending" });
  }
  if (exposureLevel === "medium") {
    actions.push({ action: `Monitor ${vendor.name} for further incident developments`, priority: "medium", owner: "Risk Manager", status: "pending" });
    actions.push({ action: "Review vendor contract for breach notification obligations", priority: "medium", owner: "Legal", status: "pending" });
  }
  actions.push({ action: "Document incident in vendor risk register", priority: "low", owner: "Compliance", status: "pending" });
  return actions;
}