// GRC Maturity Model — levels, domains, criteria, and improvement actions.

export const MATURITY_LEVELS = [
  { level: 1, name: 'Initial', color: '#ef4444', description: 'No formal processes. Activities are reactive, unstructured, and person-dependent. No documentation or measurement.' },
  { level: 2, name: 'Managed', color: '#f97316', description: 'Basic processes exist and are documented. Largely reactive but repeatable. Compliance handled project-by-project.' },
  { level: 3, name: 'Defined', color: '#eab308', description: 'Standardized, organization-wide processes. Proactive approach. Roles, policies, and standards formally defined and approved.' },
  { level: 4, name: 'Quantitatively Managed', color: '#22c55e', description: 'Processes measured with metrics and KPIs. Data-driven decisions. Control effectiveness quantified and benchmarked.' },
  { level: 5, name: 'Optimizing', color: '#10b981', description: 'Continuous improvement culture. Automated, integrated, and benchmarked. Predictive and adaptive.' },
];

export const GRC_DOMAINS = [
  {
    key: 'governance',
    name: 'Governance & Strategy',
    description: 'Board oversight, GRC strategy, accountability structures, and tone from the top.',
    criteria: [
      'No GRC strategy or board oversight. Decisions are ad-hoc and undocumented.',
      'Governance structures exist informally. Board briefed occasionally on compliance matters.',
      'Formal GRC strategy approved by board. Clear ownership, charter, and quarterly reporting cadence.',
      'Board reviews GRC KPIs and risk appetite quarterly. Strategy benchmarked against peers.',
      'Continuous board-level governance optimization. Integrated ERM and GRC with real-time oversight.',
    ],
    improvements: [
      'Draft and approve a GRC charter defining roles, responsibilities, and reporting lines. Appoint a GRC owner and establish quarterly board reporting.',
      'Formalize a documented GRC strategy approved by the board. Define risk appetite and tolerance statements and a regular reporting cadence.',
      'Implement GRC KPI dashboards for the board. Benchmark governance practices against industry peers and integrate ERM.',
      'Automate board reporting with real-time GRC metrics. Establish a continuous governance-improvement program and external benchmarking.',
    ],
  },
  {
    key: 'risk',
    name: 'Risk Management',
    description: 'Risk register, appetite, assessments, and continuous monitoring.',
    criteria: [
      'No formal risk register. Risks identified reactively, often after incidents.',
      'A risk register exists but is updated irregularly. Basic likelihood/impact scoring used.',
      'Organization-wide risk register with standard scoring, owners, and mitigation plans. Regular reviews.',
      'Risks quantified with metrics and KRIs. Risk appetite enforced; trends tracked and reported.',
      'Predictive risk analytics. Continuous monitoring with automated triggers and scenario modeling.',
    ],
    improvements: [
      'Establish a centralized risk register. Define a standard likelihood x impact scoring model and assign an owner to each risk.',
      'Standardize risk assessments org-wide. Document mitigation plans, set review cadences, and define risk appetite and tolerance thresholds.',
      'Introduce KRIs and quantitative risk metrics. Enforce risk appetite with automated exceedance alerts and trend reporting.',
      'Deploy predictive risk analytics and continuous automated monitoring. Add scenario modeling and stress testing.',
    ],
  },
  {
    key: 'compliance',
    name: 'Compliance & Regulatory',
    description: 'Framework adherence, regulatory tracking, audits, and evidence.',
    criteria: [
      'Compliance tracked manually. No framework mapping. Regulatory changes missed.',
      'Some frameworks adopted ad-hoc. Gap analyses done occasionally and manually.',
      'Formal compliance program with framework mapping, control ownership, and audit readiness.',
      'Compliance measured continuously with control-test pass rates and regulatory-change tracking.',
      'Continuous compliance with automated evidence collection and real-time posture.',
    ],
    improvements: [
      'Inventory applicable regulations and frameworks (e.g. SOC 2, ISO 27001, POPIA). Assign ownership and conduct a baseline gap analysis.',
      'Map controls to frameworks. Establish control ownership, evidence collection, and an audit-readiness checklist.',
      'Automate control testing and evidence collection. Track regulatory changes and measure control pass rates continuously.',
      'Achieve continuous compliance with automated evidence, real-time posture scoring, and proactive regulatory-change response.',
    ],
  },
  {
    key: 'security_ops',
    name: 'Security Operations & Controls',
    description: 'Control catalog, testing cadence, patching, and automation.',
    criteria: [
      'Controls implemented ad-hoc. No inventory or testing. Reactive patching.',
      'Key controls documented. Manual testing on a schedule. Patching reactive but tracked.',
      'Comprehensive control catalog with owners, testing cadence, and evidence.',
      'Controls continuously monitored with automation. Pass rates and SLAs measured.',
      'Self-healing, automated control environment with predictive remediation.',
    ],
    improvements: [
      'Inventory security controls and assign owners. Establish a patch-management policy and a manual control-testing schedule.',
      'Build a comprehensive control catalog mapped to frameworks. Define testing cadence, evidence requirements, and remediation workflows.',
      'Automate control monitoring and evidence collection. Track pass rates, SLAs, and remediation times as metrics.',
      'Move to a self-healing control environment with predictive remediation and automated response playbooks.',
    ],
  },
  {
    key: 'vendor',
    name: 'Vendor & Third-Party Risk',
    description: 'Vendor inventory, tiered assessments, due diligence, and monitoring.',
    criteria: [
      'No vendor inventory. Third-party risk unmanaged.',
      'Vendor inventory exists. Assessments done for some critical vendors, inconsistently.',
      'Tiered vendor risk program with assessments, due diligence, and contractual safeguards.',
      'Continuous vendor monitoring with metrics, SLA tracking, and automated reassessment.',
      'Real-time third-party risk intelligence and automated tiered response.',
    ],
    improvements: [
      'Create a vendor inventory. Categorize by data access and criticality. Conduct assessments for critical vendors.',
      'Establish a tiered vendor risk management program. Define assessment templates, due-diligence requirements, and contractual security clauses.',
      'Implement continuous vendor monitoring, SLA tracking, and automated reassessment triggers based on risk tier.',
      'Adopt real-time third-party risk intelligence feeds and automated tiered response actions.',
    ],
  },
  {
    key: 'incident',
    name: 'Incident Response & Resilience',
    description: 'Detection, response, runbooks, testing, and lessons learned.',
    criteria: [
      'No incident response plan. Reacts to incidents ad-hoc.',
      'Basic IR plan exists. Post-incident reviews inconsistent. No metrics.',
      'Documented IR plan with roles, runbooks, and regular testing. MTTR tracked.',
      'Measured IR with MTTR/MTTC targets, automated detection, and tabletop exercises.',
      'Automated, continuously improving IR with threat intelligence and resilience testing.',
    ],
    improvements: [
      'Draft a basic incident response plan with roles and contact lists. Start conducting post-incident reviews.',
      'Formalize the IR plan with runbooks, severity classifications, and a testing schedule. Begin tracking MTTR.',
      'Set MTTR/MTTC targets, deploy automated detection, and run regular tabletop exercises. Add lessons-learned tracking.',
      'Automate response with threat-intelligence integration and resilience (chaos) testing for continuous improvement.',
    ],
  },
  {
    key: 'data',
    name: 'Data Protection & Privacy',
    description: 'Data inventory, classification, ROPA, DPIAs, encryption, and POPIA/GDPR.',
    criteria: [
      'No data inventory or classification. Privacy obligations unknown.',
      'Partial data inventory. Some classification. Privacy notices exist but unmanaged.',
      'Complete data inventory with classification, ROPA, and privacy controls (POPIA/GDPR).',
      'Data flows mapped and monitored. DPIAs systematic. Encryption measured.',
      'Continuous data-loss prevention, automated DPIAs, and privacy-by-design embedded.',
    ],
    improvements: [
      'Build a data inventory and basic classification scheme. Identify applicable privacy laws (POPIA, GDPR).',
      'Complete data classification and a ROPA. Implement access controls, encryption, and privacy notices aligned to POPIA/GDPR.',
      'Map and monitor data flows. Systematize DPIAs. Measure encryption coverage and access-review completion.',
      'Deploy data-loss prevention and automated DPIAs. Embed privacy-by-design across the SDLC and vendor lifecycle.',
    ],
  },
  {
    key: 'people',
    name: 'People & Awareness',
    description: 'Security awareness, role-based training, phishing simulations, and culture.',
    criteria: [
      'No security awareness program. Training ad-hoc or absent.',
      'Annual training delivered. Phishing simulations occasionally. Low coverage tracking.',
      'Role-based training program with mandatory completion tracking and acknowledgments.',
      'Measured awareness with phishing-resilience metrics, targeted training, and culture surveys.',
      'Adaptive, AI-personalized training with a measurable security culture and insider-threat detection.',
    ],
    improvements: [
      'Launch a baseline security awareness program with annual mandatory training and a phishing simulation.',
      'Implement role-based training, mandatory completion tracking, and policy acknowledgment workflows.',
      'Measure phishing-resilience and culture. Deliver targeted training and run regular simulations with metrics.',
      'Adopt adaptive, personalized training. Add insider-threat detection and a measured security-culture program.',
    ],
  },
];

export function computeOverall(domainScores) {
  if (!domainScores || !domainScores.length) return 1;
  const sum = domainScores.reduce((s, d) => s + (d.current_level || 1), 0);
  return Math.round((sum / domainScores.length) * 10) / 10;
}

export function computeTargetOverall(domainScores) {
  if (!domainScores || !domainScores.length) return 3;
  return Math.round(domainScores.reduce((s, d) => s + (d.target_level || 3), 0) / domainScores.length);
}

export function generateRoadmap(domainScores) {
  const roadmap = [];
  const rid = () => Math.random().toString(36).slice(2, 9);
  GRC_DOMAINS.forEach((domain) => {
    const score = (domainScores || []).find((d) => d.domain === domain.key) || {};
    const current = score.current_level || 1;
    const target = score.target_level || 3;
    if (current < target) {
      for (let lvl = current; lvl < target; lvl++) {
        const action = domain.improvements[lvl - 1];
        if (action) {
          roadmap.push({
            id: `${domain.key}-${lvl}-${rid()}`,
            domain: domain.key,
            domain_name: domain.name,
            title: `${domain.name}: Level ${lvl} to ${lvl + 1}`,
            current_level: lvl,
            target_level: lvl + 1,
            actions: action,
            status: 'todo',
            priority: lvl <= 2 ? 'high' : 'medium',
            owner_name: '',
            due_date: '',
          });
        }
      }
    }
  });
  return roadmap;
}