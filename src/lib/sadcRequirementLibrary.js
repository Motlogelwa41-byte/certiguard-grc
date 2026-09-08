// Detailed clause-level requirement libraries for key SADC regulatory frameworks.
// Each requirement matches the FrameworkRequirement entity schema so it can be
// bulk-imported via the importFrameworkRequirements backend function.
//
// Usage: import { BDPA_REQUIREMENTS, POPIA_REQUIREMENTS } from "@/lib/sadcRequirementLibrary";
// Then call importFrameworkRequirements with { framework_code, requirements }.

// ── Botswana Data Protection Act (Act No. 8 of 2018) ──────────────────────────
// Administered by BOCRA Data Protection Department. Effective 2025.
// Modelled on GDPR principles. 42 control areas across 8 parts of the Act.

export const BDPA_REQUIREMENTS = [
  // Part I — Preliminary
  { requirement_id: "S2", title: "Definitions & scope of personal data", section: "Part I — Preliminary", category: "privacy", is_mandatory: true, order_index: 1,
    description: "Personal data means any information relating to an identified or identifiable natural person who can be identified, directly or indirectly, by reference to an identification number or one or more factors specific to their physical, physiological, mental, economic, cultural or social identity. Processing means any operation performed on personal data, including collection, recording, organisation, storage, adaptation, alteration, retrieval, consultation, use, disclosure by transmission, dissemination, alignment, combination, blocking, erasure or destruction.",
    guidance: "Maintain a data inventory that classifies each data field as personal data or not. Include the legal basis for processing for each category." },

  // Part II — General Principles
  { requirement_id: "S8", title: "Lawful, fair & transparent processing", section: "Part II — General Principles", category: "privacy", is_mandatory: true, order_index: 2,
    description: "Personal data must be processed lawfully, fairly, and in a transparent manner in relation to the data subject. Controllers must identify a lawful basis before processing: consent, contract, legal obligation, vital interests, public task, or legitimate interests.",
    guidance: "Document the lawful basis for each processing activity in your ROPA. Ensure privacy notices are clear and accessible." },
  { requirement_id: "S9", title: "Purpose limitation", section: "Part II — General Principles", category: "privacy", is_mandatory: true, order_index: 3,
    description: "Personal data must be collected for specified, explicit and legitimate purposes and not further processed in a manner incompatible with those purposes. Further processing for archiving, research or statistical purposes is not considered incompatible if appropriate safeguards are applied.",
    guidance: "Record the original collection purpose for each data category. Implement controls to prevent repurposing without a new lawful basis." },
  { requirement_id: "S10", title: "Data minimisation", section: "Part II — General Principles", category: "privacy", is_mandatory: true, order_index: 4,
    description: "Personal data must be adequate, relevant and limited to what is necessary in relation to the purposes for which it is processed. Controllers must not collect more data than needed for the stated purpose.",
    guidance: "Review data collection forms and fields annually. Remove fields that are no longer necessary for the documented purpose." },
  { requirement_id: "S11", title: "Accuracy of personal data", section: "Part II — General Principles", category: "privacy", is_mandatory: true, order_index: 5,
    description: "Personal data must be accurate and, where necessary, kept up to date. Every reasonable step must be taken to ensure that inaccurate personal data is erased or rectified without delay.",
    guidance: "Implement data quality controls and a process for data subjects to request corrections." },
  { requirement_id: "S12", title: "Storage limitation", section: "Part II — General Principles", category: "privacy", is_mandatory: true, order_index: 6,
    description: "Personal data must be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the data is processed. Implement retention schedules and secure deletion.",
    guidance: "Define and document retention periods per data category. Automate deletion or anonymisation at end of retention." },
  { requirement_id: "S13", title: "Integrity & confidentiality (security safeguards)", section: "Part II — General Principles", category: "data_protection", is_mandatory: true, order_index: 7,
    description: "Personal data must be processed in a manner that ensures appropriate security of the personal data, including protection against unauthorised or unlawful processing and against accidental loss, destruction or damage, using appropriate technical or organisational measures.",
    guidance: "Implement AES-256 encryption at rest, TLS 1.3 in transit, RBAC, MFA, and regular security assessments. Document the security measures in your ROPA." },
  { requirement_id: "S14", title: "Accountability of the controller", section: "Part II — General Principles", category: "governance", is_mandatory: true, order_index: 8,
    description: "The controller is responsible for, and must be able to demonstrate compliance with, the principles set out in this Part. Controllers must maintain records of processing activities and be able to demonstrate that processing is performed in accordance with the Act.",
    guidance: "Maintain a Records of Processing Activities (ROPA) register. Conduct annual compliance audits. Assign a Data Protection Officer." },

  // Part III — Rights of Data Subjects
  { requirement_id: "S15", title: "Right to information", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 9,
    description: "Data subjects have the right to be informed about the collection and use of their personal data. Controllers must provide privacy notices at the time of collection, including the identity of the controller, purposes, recipients, retention period, and rights of the data subject.",
    guidance: "Publish clear privacy notices on websites, apps, and collection forms. Provide layered notices for complex processing." },
  { requirement_id: "S16", title: "Right of access", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 10,
    description: "Data subjects have the right to obtain confirmation of whether their personal data is being processed, and access to their personal data along with information about the purposes, recipients, retention period, and their rights to rectification, erasure, and objection.",
    guidance: "Implement a data subject access request (DSAR) process with a 30-day response SLA. Use the Privacy Request portal." },
  { requirement_id: "S17", title: "Right to rectification", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 11,
    description: "Data subjects have the right to have inaccurate personal data rectified without undue delay. Controllers must notify third parties to whom the data was disclosed of any rectification.",
    guidance: "Provide a self-service correction mechanism where possible. Track third-party notifications for rectified data." },
  { requirement_id: "S18", title: "Right to erasure (right to be forgotten)", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 12,
    description: "Data subjects have the right to have their personal data erased where the data is no longer necessary for the purposes for which it was collected, the data subject withdraws consent, the data subject objects to processing, or the data was unlawfully processed.",
    guidance: "Implement a verified erasure workflow. Ensure erasure from backups, logs, and third-party processors. Document legal retention exemptions." },
  { requirement_id: "S19", title: "Right to restrict processing", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 13,
    description: "Data subjects have the right to restrict the processing of their personal data where the accuracy is contested, the processing is unlawful, the data is no longer needed but the data subject needs it for legal claims, or the data subject has objected pending verification.",
    guidance: "Implement a 'block processing' flag in systems. Ensure restricted data is stored but not processed except for storage." },
  { requirement_id: "S20", title: "Right to data portability", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 14,
    description: "Data subjects have the right to receive their personal data in a structured, commonly used and machine-readable format and to transmit that data to another controller without hindrance.",
    guidance: "Provide data export in JSON or CSV format. Ensure export includes all personal data provided by the data subject." },
  { requirement_id: "S21", title: "Right to object", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 15,
    description: "Data subjects have the right to object to processing based on legitimate interests or public task, as well as direct marketing. Controllers must stop processing unless they demonstrate compelling legitimate grounds.",
    guidance: "Provide an opt-out mechanism in all direct marketing communications. Process objections within 30 days." },
  { requirement_id: "S22", title: "Rights regarding automated decision-making", section: "Part III — Data Subject Rights", category: "privacy", is_mandatory: true, order_index: 16,
    description: "Data subjects have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects or similarly significantly affects them, unless the decision is necessary for a contract, authorised by law, or based on the data subject's explicit consent.",
    guidance: "Implement human-in-the-loop review for automated decisions. Provide meaningful information about the logic involved." },

  // Part IV — Controller & Processor Obligations
  { requirement_id: "S25", title: "Data protection by design and by default", section: "Part IV — Controller Obligations", category: "data_protection", is_mandatory: true, order_index: 17,
    description: "Controllers must implement appropriate technical and organisational measures to ensure that, by default, only personal data necessary for each specific purpose is processed. This includes minimisation of data collection, storage time, and accessibility.",
    guidance: "Adopt privacy-by-design principles in all new systems. Conduct DPIAs for high-risk processing. Configure default settings to most privacy-protective." },
  { requirement_id: "S26", title: "Records of Processing Activities (ROPA)", section: "Part IV — Controller Obligations", category: "compliance", is_mandatory: true, order_index: 18,
    description: "Controllers and processors must maintain a record of processing activities under their responsibility, including the purposes, categories of data and data subjects, recipients, transfers to third countries, retention periods, and a general description of security measures.",
    guidance: "Use the ROPA module to maintain the register. Review quarterly. Make available to BOCRA on request." },
  { requirement_id: "S27", title: "Data Protection Impact Assessment (DPIA)", section: "Part IV — Controller Obligations", category: "compliance", is_mandatory: true, order_index: 19,
    description: "Controllers must conduct a DPIA for processing likely to result in a high risk to the rights and freedoms of natural persons, including large-scale processing of sensitive data, systematic monitoring, or innovative technologies. The DPIA must assess risks and mitigations.",
    guidance: "Trigger DPIA for new processing involving sensitive data, AI/ML, biometrics, or large-scale monitoring. Use the DPIA module." },
  { requirement_id: "S28", title: "Data Protection Officer (DPO) appointment", section: "Part IV — Controller Obligations", category: "governance", is_mandatory: true, order_index: 20,
    description: "Controllers and processors must designate a Data Protection Officer where the core activities involve large-scale processing of sensitive data or regular and systematic monitoring. The DPO must have expert knowledge and report to the highest management level.",
    guidance: "Appoint a DPO and register with BOCRA. Ensure the DPO has independence, resources, and direct access to the board. Record in TenantSettings." },
  { requirement_id: "S29", title: "Processor & sub-processor written agreements", section: "Part IV — Controller Obligations", category: "compliance", is_mandatory: true, order_index: 21,
    description: "Controllers must only use processors that provide sufficient guarantees of security. Processing by a processor must be governed by a written contract setting out the subject matter, duration, nature, purpose, data types, data subjects, and obligations of the processor.",
    guidance: "Execute Data Processing Agreements (DPAs) with all vendors. Track sub-processors. Use the Vendor management module with DPA tracking." },

  // Part V — Security of Processing & Breach Notification
  { requirement_id: "S32", title: "Security of processing", section: "Part V — Security & Breach Notification", category: "data_protection", is_mandatory: true, order_index: 22,
    description: "Controllers and processors must implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including pseudonymisation and encryption, confidentiality, integrity, availability, resilience, and regular testing.",
    guidance: "Implement ISO 27001 controls. Conduct penetration testing annually. Use encryption, access controls, and security monitoring." },
  { requirement_id: "S33", title: "Personal data breach notification to BOCRA", section: "Part V — Security & Breach Notification", category: "incident_response", is_mandatory: true, order_index: 23,
    description: "Controllers must notify BOCRA of a personal data breach within 72 hours of becoming aware of it, unless the breach is unlikely to result in a risk to the rights and freedoms of natural persons. The notification must include the nature of the breach, categories and approximate number of data subjects and records, likely consequences, and measures taken.",
    guidance: "Implement an incident response plan with a 72-hour notification workflow. Use the Incident module for breach tracking. Draft regulator notification templates." },
  { requirement_id: "S34", title: "Communication of breach to data subjects", section: "Part V — Security & Breach Notification", category: "incident_response", is_mandatory: true, order_index: 24,
    description: "When a personal data breach is likely to result in a high risk to the rights and freedoms of natural persons, the controller must communicate the breach to the data subject without undue delay, describing the nature of the breach and providing advice on measures to mitigate risks.",
    guidance: "Prepare breach notification templates for data subjects. Define criteria for 'high risk' breaches. Coordinate with communications team." },

  // Part VI — Cross-Border Data Transfers
  { requirement_id: "S38", title: "Restrictions on cross-border data transfers", section: "Part VI — Cross-Border Transfers", category: "data_protection", is_mandatory: true, order_index: 25,
    description: "Personal data must not be transferred to a third country or international organisation unless the receiving country ensures an adequate level of data protection, or appropriate safeguards are in place such as standard contractual clauses, binding corporate rules, or approved codes of conduct.",
    guidance: "Use the Cross-Border Matrix to assess transfer legality. Execute SCCs with all cross-border processors. Document adequacy decisions." },
  { requirement_id: "S39", title: "Documentation of transfer mechanisms", section: "Part VI — Cross-Border Transfers", category: "compliance", is_mandatory: true, order_index: 26,
    description: "Controllers must document the transfer mechanism used for each cross-border transfer, including the country of destination, the safeguard relied upon, and the supplementary measures implemented to ensure adequate protection.",
    guidance: "Maintain a transfer register linked to the ROPA. Review annually. Update when new transfer routes are added." },

  // Part VII — Registration & Enforcement
  { requirement_id: "S42", title: "Registration with BOCRA", section: "Part VII — Registration & Enforcement", category: "compliance", is_mandatory: true, order_index: 27,
    description: "Every data controller and processor must register with BOCRA before processing personal data. Registration must include the controller's details, purposes of processing, data categories, data subjects, recipients, and transfers. Registration must be renewed as prescribed.",
    guidance: "Complete BOCRA registration before commencing processing. Maintain registration records. Update when processing changes." },
  { requirement_id: "S45", title: "Children's data protections", section: "Part VII — Registration & Enforcement", category: "privacy", is_mandatory: true, order_index: 28,
    description: "Processing of personal data of a child under 16 years requires the consent of the parent or guardian. Controllers must make reasonable efforts to verify that consent is given by the holder of parental responsibility. Children's data must not be used for marketing profiling without consent.",
    guidance: "Implement age verification mechanisms. Obtain verifiable parental consent for under-16 processing. Restrict marketing to children." },
  { requirement_id: "S48", title: "Compliance orders & enforcement by BOCRA", section: "Part VII — Registration & Enforcement", category: "compliance", is_mandatory: true, order_index: 29,
    description: "BOCRA may issue compliance orders requiring controllers to take specified actions to remedy contraventions of the Act. Failure to comply with a compliance order is an offence. BOCRA may conduct investigations and audits of controllers and processors.",
    guidance: "Maintain an audit-ready posture. Track all BOCRA correspondence. Implement remediation tracking for any compliance orders received." },
  { requirement_id: "S50", title: "Administrative fines & penalties", section: "Part VII — Registration & Enforcement", category: "compliance", is_mandatory: true, order_index: 30,
    description: "BOCRA may impose administrative fines for contraventions of the Act, including processing without registration, failure to notify breaches, failure to conduct DPIAs, and failure to comply with compliance orders. Fines may be up to P100,000 or a percentage of annual turnover.",
    guidance: "Track compliance status against each requirement. Implement risk-based prioritisation for remediation. Maintain evidence of compliance." },
];

// ── POPIA (Protection of Personal Information Act, South Africa) ─────────────
// Act 4 of 2013. Effective 1 July 2021. Administered by the Information Regulator.
// 8 conditions for lawful processing across 11 chapters.

export const POPIA_REQUIREMENTS = [
  // Chapter 2 — Conditions for Lawful Processing
  { requirement_id: "S4", title: "Condition 1: Accountability", section: "Chapter 2 — Conditions for Lawful Processing", category: "governance", is_mandatory: true, order_index: 1,
    description: "The responsible party must ensure that the conditions for lawful processing are complied with at the time of the determination of the purposes and means of the processing and during the processing itself. The responsible party remains accountable for compliance even when processing is outsourced.",
    guidance: "Assign a dedicated Information Officer. Maintain a POPIA compliance program. Conduct annual POPIA audits. Ensure processor agreements include POPIA compliance clauses." },
  { requirement_id: "S5", title: "Condition 2: Processing limitation — lawful basis & minimisation", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 2,
    description: "Personal information must be processed lawfully and in a reasonable manner that does not infringe the privacy of the data subject. Only the minimum personal information necessary for the purpose may be collected. Collection must not exceed what is necessary.",
    guidance: "Document the lawful basis for each processing activity. Review data collection forms for minimisation. Remove unnecessary data fields." },
  { requirement_id: "S6", title: "Condition 2: Processing limitation — consent", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 3,
    description: "Personal information may be processed with the consent of the data subject, or if processing is necessary to carry out actions in a contract, to comply with a legal obligation, to protect a vital interest, or if the information is publicly available. Consent must be voluntary, specific, and informed.",
    guidance: "Implement granular consent mechanisms. Provide easy withdrawal. Record consent with timestamps and versions. Use the Consent Management module." },
  { requirement_id: "S7", title: "Condition 2: Processing limitation — special personal information", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 4,
    description: "Special personal information (religious or philosophical beliefs, race, ethnic origin, trade union membership, political opinions, health, biometrics, sexual life, criminal behaviour) must not be processed unless an exception applies: consent, legal obligation, vital interests, or the data subject has made the information public.",
    guidance: "Identify and classify all special personal information in your data inventory. Apply enhanced controls. Require explicit consent for processing." },
  { requirement_id: "S8", title: "Condition 2: Processing limitation — children's personal information", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 5,
    description: "Personal information of children must not be processed unless processing is carried out with the prior consent of a competent person (parent or guardian), or is necessary for the establishment, exercise or defence of a legal claim, or the information has been deliberately made public by the child with parental consent.",
    guidance: "Implement age-gating and parental consent verification. Restrict marketing to children. Apply enhanced security to children's data." },
  { requirement_id: "S9", title: "Condition 3: Purpose specification", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 6,
    description: "Personal information must be collected for a specific, explicitly defined and lawful purpose. The data subject must be aware of the purpose. Records must not be kept longer than necessary unless retained for legal, historical, or research purposes with appropriate safeguards.",
    guidance: "Document the purpose for each data collection point. Define and enforce retention schedules. Implement automated deletion at end of retention." },
  { requirement_id: "S10", title: "Condition 3: Purpose specification — data subject notification", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 7,
    description: "When collecting personal information, the responsible party must take reasonably practicable steps to ensure the data subject is aware of: the information being collected, the source, the purpose, recipients, whether supply is voluntary or mandatory, and the right to object to processing.",
    guidance: "Provide clear privacy notices at collection points. Include all required elements. Use layered notices for complex processing." },
  { requirement_id: "S11", title: "Condition 4: Further processing limitation", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 8,
    description: "Further processing of personal information must be compatible with the purpose for which it was collected. Factors to consider include the link between the original and further processing, the context, the nature of the information, the consequences for the data subject, and the safeguards applied.",
    guidance: "Assess compatibility before repurposing data. Document the compatibility assessment. Obtain new consent if processing is incompatible." },
  { requirement_id: "S12", title: "Condition 5: Information quality", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 9,
    description: "The responsible party must take reasonably practicable steps to ensure that personal information is complete, accurate, not misleading, and updated where necessary. Steps must be proportionate to the purpose and the likelihood of harm.",
    guidance: "Implement data quality controls. Provide self-service correction mechanisms. Regularly review and update critical data fields." },
  { requirement_id: "S13", title: "Condition 6: Openness — notification of collection", section: "Chapter 2 — Conditions for Lawful Processing", category: "privacy", is_mandatory: true, order_index: 10,
    description: "The responsible party must maintain open documentation of its processing operations and take reasonably practicable steps to ensure the data subject is aware of the collection, source, purpose, and recipients of their personal information.",
    guidance: "Publish a privacy policy. Maintain a ROPA. Provide just-in-time notices at data collection points." },
  { requirement_id: "S14", title: "Condition 7: Security safeguards", section: "Chapter 2 — Conditions for Lawful Processing", category: "data_protection", is_mandatory: true, order_index: 11,
    description: "The responsible party must secure the integrity of personal information by taking appropriate, reasonable technical and organisational measures to prevent loss, damage, unauthorised access, or destruction. Measures must be proportionate to the harm or distress likely to result from a breach.",
    guidance: "Implement ISO 27001 controls. Use encryption, access controls, MFA, and security monitoring. Conduct regular security assessments and penetration testing." },
  { requirement_id: "S15", title: "Condition 7: Security safeguards — processor agreements", section: "Chapter 2 — Conditions for Lawful Processing", category: "compliance", is_mandatory: true, order_index: 12,
    description: "Where processing is carried out on behalf of the responsible party, the responsible party must ensure that the operator (processor) processes the information only with the knowledge or authorisation of the responsible party and under a written contract that imposes the same security obligations.",
    guidance: "Execute operator agreements with all vendors. Include POPIA compliance clauses. Audit vendor security. Use the Vendor management module." },

  // Chapter 3 — Data Subject Participation
  { requirement_id: "S23", title: "Right to access personal information", section: "Chapter 3 — Data Subject Participation", category: "privacy", is_mandatory: true, order_index: 13,
    description: "A data subject may request a responsible party to confirm whether it holds personal information about them and to receive a record of that information, including the identity of third parties who have had access. The responsible party must respond within a reasonable time and in a prescribed manner.",
    guidance: "Implement a PAIA/POPIA access request process. Respond within 30 days. Use the Privacy Request portal for tracking." },
  { requirement_id: "S24", title: "Right to correction of personal information", section: "Chapter 3 — Data Subject Participation", category: "privacy", is_mandatory: true, order_index: 14,
    description: "A data subject may request the correction or deletion of personal information that is inaccurate, irrelevant, out of date, incomplete, misleading, or obtained unlawfully. The responsible party must correct or destroy the information and notify recipients of the correction.",
    guidance: "Implement a correction request workflow. Track third-party notifications. Document legal retention exemptions for destruction requests." },
  { requirement_id: "S25", title: "Right to object to direct marketing", section: "Chapter 3 — Data Subject Participation", category: "privacy", is_mandatory: true, order_index: 15,
    description: "A data subject may object, free of charge, to the processing of their personal information for direct marketing. The responsible party must stop processing for direct marketing upon receipt of an objection. Direct marketing by electronic means requires prior consent (opt-in).",
    guidance: "Implement opt-in consent for electronic marketing. Provide easy opt-out mechanisms. Honour objections within a reasonable time." },
  { requirement_id: "S26", title: "Right to object to automated decision-making", section: "Chapter 3 — Data Subject Participation", category: "privacy", is_mandatory: true, order_index: 16,
    description: "A data subject may object to a decision based solely on automated processing, including profiling, that has legal or similarly significant effects. The responsible party must provide an opportunity to make representations and to have the decision reconsidered by a human.",
    guidance: "Implement human review for automated decisions. Provide meaningful information about the logic. Allow data subjects to contest decisions." },

  // Chapter 5 — Information Officer & Compliance
  { requirement_id: "S55", title: "Designation of Information Officer", section: "Chapter 5 — Information Officer", category: "governance", is_mandatory: true, order_index: 17,
    description: "Every public and private body must designate and register an Information Officer with the Information Regulator. The Information Officer is responsible for ensuring compliance with POPIA and PAIA, and is the contact point for data subjects and the Regulator.",
    guidance: "Designate an Information Officer (typically the head of the body or a delegated senior person). Register with the Information Regulator. Record in TenantSettings DPO fields." },
  { requirement_id: "S56", title: "Information Officer duties & delegation", section: "Chapter 5 — Information Officer", category: "governance", is_mandatory: true, order_index: 18,
    description: "The Information Officer must encourage compliance with the conditions for lawful processing, deal with requests made pursuant to the Act, and work with the Regulator. Deputy Information Officers may be designated with specific responsibilities.",
    guidance: "Define Information Officer responsibilities in a RACI matrix. Train deputy IOs. Ensure adequate resources and authority." },

  // Chapter 6 — Prior Authorisation & Security Compromise
  { requirement_id: "S57", title: "Prior authorisation for high-risk processing", section: "Chapter 6 — Prior Authorisation", category: "compliance", is_mandatory: true, order_index: 19,
    description: "Prior authorisation from the Information Regulator is required before processing that: uniquely identifies data subjects, involves special personal information or children's data, links records across multiple bodies, or involves the transfer of personal information to a third party outside South Africa without adequate safeguards.",
    guidance: "Identify processing activities requiring prior authorisation. Submit applications to the Information Regulator before commencing. Track in the Regulatory Filing module." },
  { requirement_id: "S22", title: "Security compromise (breach notification)", section: "Chapter 6 — Security Compromise", category: "incident_response", is_mandatory: true, order_index: 20,
    description: "Where there are reasonable grounds to believe that the personal information of a data subject has been accessed or acquired by an unauthorised person, the responsible party must notify the Regulator and the data subject as soon as reasonably possible after discovering the compromise, unless the responsible party can demonstrate that the compromise will not have a significant impact on the data subject.",
    guidance: "Implement a breach response plan with notification workflows. Notify the Information Regulator within a reasonable time. Use the Incident module for breach tracking. Draft notification templates." },

  // Chapter 7 — Cross-Border Transfers
  { requirement_id: "S72", title: "Trans-border information flows", section: "Chapter 7 — Trans-Border Flows", category: "data_protection", is_mandatory: true, order_index: 21,
    description: "A responsible party may not transfer personal information to a third party in a foreign country unless the recipient is subject to a law, binding corporate rules, or enforceable agreement providing adequate protection, or the data subject consents to the transfer, or the transfer is necessary for a contract or legal obligation.",
    guidance: "Assess each cross-border transfer using the Cross-Border Matrix. Execute SCCs or binding corporate rules. Document the adequacy assessment. Track transfer mechanisms in the ROPA." },

  // Chapter 8 — Codes of Conduct & Enforcement
  { requirement_id: "S73", title: "Codes of conduct", section: "Chapter 8 — Codes & Enforcement", category: "compliance", is_mandatory: false, order_index: 22,
    description: "Bodies or associations may submit codes of conduct to the Information Regulator for approval. Approved codes provide guidance on the application of the conditions for lawful processing within a specific sector. Compliance with an approved code is a factor in demonstrating compliance.",
    guidance: "Adopt relevant industry codes of conduct. Submit sector-specific codes for approval. Reference codes in compliance documentation." },
  { requirement_id: "S82", title: "Enforcement notices by the Information Regulator", section: "Chapter 8 — Codes & Enforcement", category: "compliance", is_mandatory: true, order_index: 23,
    description: "The Information Regulator may issue an enforcement notice where it has reasonable grounds to believe that a responsible party has contravened the conditions for lawful processing. The enforcement notice must specify the steps to be taken and the time period for compliance. Failure to comply is an offence.",
    guidance: "Maintain an audit-ready compliance posture. Track all Regulator correspondence. Implement remediation tracking for any enforcement notices." },
  { requirement_id: "S99", title: "Administrative fines & penalties", section: "Chapter 8 — Codes & Enforcement", category: "compliance", is_mandatory: true, order_index: 24,
    description: "The Information Regulator may impose administrative fines for contraventions of the Act, including processing without consent, failure to secure personal information, failure to notify breaches, and failure to comply with enforcement notices. Fines may be up to R10 million or imprisonment, or both.",
    guidance: "Track compliance against each POPIA requirement. Prioritise remediation by risk. Maintain evidence of compliance for audit." },
  { requirement_id: "PAIA-S32", title: "PAIA alignment — Section 32 manual", section: "PAIA Alignment", category: "compliance", is_mandatory: true, order_index: 25,
    description: "Every public and private body must compile a Section 32 manual in accordance with the Promotion of Access to Information Act (PAIA), detailing the categories of records held, the procedure for access requests, and the availability of the manual. The manual must be updated annually and submitted to the Information Regulator.",
    guidance: "Compile and maintain a PAIA Section 32 manual. Publish on the organisation's website. Submit to the Information Regulator. Review annually." },
];

// Helper: get all requirement libraries keyed by framework code
export const SADC_REQUIREMENT_LIBRARIES = {
  bdpa_bw: { framework_code: "bdpa_bw", name: "Botswana DPA", requirements: BDPA_REQUIREMENTS },
  popia: { framework_code: "popia", name: "POPIA (South Africa)", requirements: POPIA_REQUIREMENTS },
};