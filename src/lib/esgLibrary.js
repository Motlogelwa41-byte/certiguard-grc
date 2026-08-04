// ESG reporting framework library — metadata and starter metric templates
// for GRI, SASB, TCFD, CSRD, and UN SDG frameworks.

export const ESG_FRAMEWORKS = [
  {
    code: "GRI",
    name: "Global Reporting Initiative (GRI Standards)",
    category: "global",
    description: "The most widely adopted sustainability reporting standard, covering environmental, social, and governance impacts.",
    disclosures: 168,
    region: "Global",
    mandatory: false,
  },
  {
    code: "SASB",
    name: "Sustainability Accounting Standards Board (SASB)",
    category: "industry",
    description: "Industry-specific sustainability metrics focused on financially material ESG factors for investors.",
    disclosures: 77,
    region: "Global (US-aligned)",
    mandatory: false,
  },
  {
    code: "TCFD",
    name: "Task Force on Climate-related Financial Disclosures (TCFD)",
    category: "framework",
    description: "Climate-related financial risk disclosure framework — governance, strategy, risk management, and metrics.",
    disclosures: 11,
    region: "Global",
    mandatory: false,
  },
  {
    code: "CSRD",
    name: "Corporate Sustainability Reporting Directive (CSRD)",
    category: "regional",
    description: "EU mandate requiring detailed sustainability reporting (double materiality) for large and listed companies.",
    disclosures: 82,
    region: "European Union",
    mandatory: true,
  },
  {
    code: "SDG",
    name: "UN Sustainable Development Goals (SDGs)",
    category: "framework",
    description: "17 global goals providing a shared blueprint for peace, prosperity, and sustainability through 2030.",
    disclosures: 17,
    region: "Global",
    mandatory: false,
  },
];

export const ESG_STARTER_METRICS = [
  { framework: "GRI", category: "environmental", metric_id: "GRI 305-1", metric_name: "Direct (Scope 1) GHG emissions", unit: "tCO2e", description: "Direct GHG emissions from owned or controlled sources." },
  { framework: "GRI", category: "environmental", metric_id: "GRI 305-2", metric_name: "Energy indirect (Scope 2) GHG emissions", unit: "tCO2e", description: "Indirect emissions from purchased electricity, heat, or steam." },
  { framework: "GRI", category: "environmental", metric_id: "GRI 303-3", metric_name: "Water withdrawal", unit: "megaliters", description: "Total water withdrawn from all sources." },
  { framework: "GRI", category: "social", metric_id: "GRI 401-1", metric_name: "New employee hires and turnover", unit: "count", description: "Total number and rate of new hires and employee turnover." },
  { framework: "GRI", category: "social", metric_id: "GRI 403-9", metric_name: "Work-related injuries", unit: "count", description: "Number and rate of work-related injuries." },
  { framework: "GRI", category: "governance", metric_id: "GRI 2-9", metric_name: "Governance structure and composition", unit: "count", description: "Composition of the highest governance body." },
  { framework: "SASB", category: "environmental", metric_id: "SASB EM-EP-140a.1", metric_name: "Scope 1 emissions", unit: "tCO2e", description: "Gross direct emissions from operations." },
  { framework: "TCFD", category: "governance", metric_id: "TCFD a", metric_name: "Board oversight of climate-related risks", unit: "score", description: "Board-level governance of climate risks and opportunities." },
  { framework: "TCFD", category: "environmental", metric_id: "TCFD c.3.1", metric_name: "Climate-related scenario analysis", unit: "score", description: "Resilience of strategy under different climate scenarios." },
  { framework: "CSRD", category: "governance", metric_id: "CSRD GOV-1", metric_name: "Sustainability governance", unit: "score", description: "Administrative, management and oversight bodies sustainability role." },
  { framework: "SDG", category: "social", metric_id: "SDG 5", metric_name: "Gender equality — women in leadership", unit: "%", description: "Proportion of women in management positions." },
  { framework: "SDG", category: "environmental", metric_id: "SDG 13", metric_name: "Climate action — emissions reduction", unit: "tCO2e", description: "Annual emissions reduction achieved." },
];