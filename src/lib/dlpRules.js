export const DLP_RULES = [
  { id: "off_hours_access", name: "Off-Hours Access", description: "Access to sensitive systems outside business hours (before 6am or after 8pm, or weekends)", severity: "medium", category: "behavioral" },
  { id: "no_mfa_access", name: "Access Without MFA", description: "User accessed a sensitive module without MFA verification", severity: "high", category: "authentication" },
  { id: "new_device", name: "New Device Access", description: "Access from a previously unseen device fingerprint", severity: "medium", category: "device" },
  { id: "geo_mismatch", name: "Geographic Anomaly", description: "Access from an unusual or unexpected geographic location", severity: "high", category: "location" },
  { id: "high_risk_score", name: "High Risk Score", description: "User session risk score exceeded 70/100", severity: "critical", category: "composite" },
  { id: "unusual_ip", name: "Unusual IP Access", description: "Access from an IP address flagged as unusual or suspicious", severity: "high", category: "network" },
  { id: "bulk_data_access", name: "Bulk Data Access", description: "User accessed an unusually high volume of records in a single session", severity: "high", category: "data_volume" },
  { id: "privileged_after_hours", name: "Privileged After-Hours Access", description: "Administrator-level access outside business hours", severity: "critical", category: "privileged" },
];

export const DLP_CATEGORIES = [
  { id: "behavioral", name: "Behavioral", color: "amber" },
  { id: "authentication", name: "Authentication", color: "red" },
  { id: "device", name: "Device", color: "blue" },
  { id: "location", name: "Location", color: "purple" },
  { id: "composite", name: "Composite Risk", color: "rose" },
  { id: "network", name: "Network", color: "cyan" },
  { id: "data_volume", name: "Data Volume", color: "orange" },
  { id: "privileged", name: "Privileged Access", color: "red" },
];