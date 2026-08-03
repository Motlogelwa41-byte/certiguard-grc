// Pre-built policy template library — 22 ready-to-deploy policy templates
// Each template includes full policy text mapped to compliance frameworks

export const policyTemplateCategories = {
  information_security: { label: "Information Security", color: "text-blue-600 bg-blue-50" },
  data_privacy: { label: "Data Privacy", color: "text-emerald-600 bg-emerald-50" },
  access_control: { label: "Access Control", color: "text-purple-600 bg-purple-50" },
  acceptable_use: { label: "Acceptable Use", color: "text-amber-600 bg-amber-50" },
  incident_response: { label: "Incident Response", color: "text-red-600 bg-red-50" },
  business_continuity: { label: "Business Continuity", color: "text-cyan-600 bg-cyan-50" },
  vendor_management: { label: "Vendor Management", color: "text-orange-600 bg-orange-50" },
  human_resources: { label: "Human Resources", color: "text-pink-600 bg-pink-50" },
  physical_security: { label: "Physical Security", color: "text-slate-600 bg-slate-50" },
};

const section = (heading, body) => `## ${heading}\n\n${body}`;

export const policyTemplates = [
  {
    id: "info-security",
    title: "Information Security Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001", "NIST CSF", "POPIA", "King V"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes the framework for protecting information assets from unauthorized access, disclosure, modification, or destruction.")}\n\n${section("Scope", "This policy applies to all employees, contractors, vendors, and third parties who access company information systems and data.")}\n\n${section("Policy", "The organization shall:\n1. Maintain a comprehensive information security management program aligned with ISO 27001.\n2. Implement risk-based controls to protect confidentiality, integrity, and availability of information.\n3. Conduct annual security risk assessments and remediate identified gaps.\n4. Appoint a designated Information Security Officer responsible for policy enforcement.\n5. Report security incidents immediately to the security team.")}\n\n${section("Enforcement", "Violations of this policy may result in disciplinary action up to and including termination of employment and legal prosecution.")}`,
  },
  {
    id: "acceptable-use",
    title: "Acceptable Use Policy",
    category: "acceptable_use",
    frameworks: ["SOC 2", "ISO 27001"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines acceptable use of company-provided IT resources, including computers, networks, email, and internet access.")}\n\n${section("Scope", "All employees, contractors, and temporary staff with access to company systems.")}\n\n${section("Policy", "Users shall:\n1. Use company resources only for legitimate business purposes.\n2. Not install unauthorized software or access restricted systems.\n3. Not share credentials or bypass security controls.\n4. Respect intellectual property and licensing agreements.\n5. Report suspicious activity to the IT security team immediately.\n\nUsers shall NOT:\n1. Access, store, or transmit illegal or offensive content.\n2. Use company resources for personal commercial activities.\n3. Attempt to circumvent security controls or monitoring.")}\n\n${section("Enforcement", "Violations may result in access revocation, disciplinary action, and legal prosecution.")}`,
  },
  {
    id: "access-control",
    title: "Access Control Policy",
    category: "access_control",
    frameworks: ["SOC 2", "ISO 27001", "NIST CSF", "PCI DSS"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for controlling access to information systems and data.")}\n\n${section("Scope", "All systems, applications, databases, and data repositories owned or managed by the organization.")}\n\n${section("Policy", "1. **Least Privilege**: Users shall be granted the minimum access required to perform their job duties.\n2. **Need-to-Know**: Access to sensitive data is restricted to authorized personnel with a legitimate business need.\n3. **MFA**: Multi-factor authentication is required for all remote access and privileged accounts.\n4. **Access Reviews**: Access rights shall be reviewed quarterly and upon role changes.\n5. **Provisioning**: New access requires management approval and is provisioned within 1 business day.\n6. **Deprovisioning**: Access shall be revoked within 24 hours of termination or role change.\n7. **Privileged Access**: Administrative accounts shall use separate credentials and be logged.")}\n\n${section("Enforcement", "The IT Security team monitors access logs and conducts periodic audits.")}`,
  },
  {
    id: "data-classification",
    title: "Data Classification Policy",
    category: "data_privacy",
    frameworks: ["ISO 27001", "POPIA", "GDPR", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines data classification levels and handling requirements for protecting information assets.")}\n\n${section("Scope", "All data created, received, stored, or transmitted by the organization.")}\n\n${section("Classification Levels", "1. **Public**: Information approved for public release. No restrictions.\n2. **Internal**: Information for internal use only. Not for external distribution.\n3. **Confidential**: Sensitive business information. Restricted access.\n4. **Restricted**: Highly sensitive data (PII, financial, credentials). Strictly controlled access.")}\n\n${section("Handling Requirements", "1. Confidential and Restricted data must be encrypted in transit and at rest.\n2. Access to Restricted data requires explicit authorization and is logged.\n3. Data shall not be stored on personal devices or unapproved cloud services.\n4. Disposal of media containing Confidential/Restricted data requires secure destruction.")}\n\n${section("Enforcement", "Data owners are responsible for classifying their data. The Security team audits compliance.")}`,
  },
  {
    id: "data-protection",
    title: "Data Protection and Privacy Policy",
    category: "data_privacy",
    frameworks: ["POPIA", "GDPR", "ISO 27001", "SOC 2"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for protecting personal information in compliance with POPIA, GDPR, and applicable data protection laws.")}\n\n${section("Scope", "All personal information (PI) processed by the organization, including customer, employee, and vendor data.")}\n\n${section("Policy", "1. **Lawful Processing**: PI shall only be processed for legitimate, documented purposes with appropriate consent.\n2. **Data Minimization**: Only PI necessary for the stated purpose shall be collected.\n3. **Retention**: PI shall be retained only as long as legally required, then securely deleted.\n4. **Subject Rights**: Data subjects may exercise their rights (access, correction, deletion) via the DPO.\n5. **Cross-Border Transfers**: International transfers require adequate safeguards and SADC sovereignty compliance.\n6. **Breach Notification**: Data breaches shall be reported to the Information Regulator within 72 hours.\n7. **DPO**: A Data Protection Officer is appointed to oversee compliance.")}\n\n${section("Enforcement", "Non-compliance may result in regulatory fines and disciplinary action.")}`,
  },
  {
    id: "incident-response",
    title: "Incident Response Policy",
    category: "incident_response",
    frameworks: ["SOC 2", "ISO 27001", "NIST CSF", "POPIA"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines the framework for detecting, responding to, and recovering from security incidents.")}\n\n${section("Scope", "All security incidents affecting company systems, data, or personnel.")}\n\n${section("Incident Response Phases", "1. **Preparation**: Maintain IR plan, train response team, and establish on-call schedule.\n2. **Detection & Analysis**: Monitor for incidents, triage alerts, and classify severity.\n3. **Containment**: Isolate affected systems to prevent further damage.\n4. **Eradication**: Remove the threat and restore systems to a known-good state.\n5. **Recovery**: Restore services, verify integrity, and monitor for recurrence.\n6. **Post-Incident Review**: Document lessons learned and update controls.")}\n\n${section("Severity Levels", "- **Critical**: Data breach, system compromise, or major outage. Response: immediate.\n- **High**: Significant security event with potential impact. Response: within 1 hour.\n- **Medium**: Limited impact event. Response: within 4 hours.\n- **Low**: Minor event. Response: next business day.")}\n\n${section("Notification", "Critical incidents shall be reported to management within 1 hour. Data breaches reported to the Information Regulator within 72 hours.")}`,
  },
  {
    id: "change-management",
    title: "Change Management Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes controls for managing changes to production systems and infrastructure.")}\n\n${section("Scope", "All changes to production systems, applications, infrastructure, and configurations.")}\n\n${section("Policy", "1. **Change Request**: All changes require a documented change request with business justification.\n2. **Approval**: Changes require approval from the Change Advisory Board (CAB) or designated approver.\n3. **Testing**: Changes shall be tested in a non-production environment before deployment.\n4. **Rollback**: A rollback plan shall be documented for every change.\n5. **Deployment Window**: Production changes shall occur during approved maintenance windows.\n6. **Code Review**: All code changes require peer review before merge.\n7. **Documentation**: All changes shall be documented in the change management system.")}\n\n${section("Emergency Changes", "Emergency changes may bypass normal approval but require post-implementation review within 24 hours.")}`,
  },
  {
    id: "password-authentication",
    title: "Password and Authentication Policy",
    category: "access_control",
    frameworks: ["SOC 2", "ISO 27001", "NIST CSF", "PCI DSS"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines password complexity, management, and authentication requirements.")}\n\n${section("Scope", "All systems, applications, and accounts accessing company resources.")}\n\n${section("Password Requirements", "1. Minimum 12 characters in length.\n2. Must include uppercase, lowercase, numbers, and special characters.\n3. Passwords shall not be reused for at least 10 cycles.\n4. Passwords shall be changed upon suspected compromise.\n5. Passwords shall not be stored in plaintext or shared via email.\n6. A password manager shall be used for all company credentials.")}\n\n${section("Authentication Requirements", "1. Multi-factor authentication (MFA) is required for all remote access.\n2. MFA is required for all privileged/administrative accounts.\n3. Failed login attempts shall lock accounts after 5 attempts.\n4. Session timeouts shall be configured for 15 minutes of inactivity.")}\n\n${section("Enforcement", "The IT Security team monitors authentication logs and conducts periodic audits.")}`,
  },
  {
    id: "email-security",
    title: "Email Security Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines requirements for securing email communications and preventing email-based threats.")}\n\n${section("Scope", "All company email accounts and email gateway systems.")}\n\n${section("Policy", "1. **Anti-Spam/Anti-Phishing**: Email filtering shall be enabled with spam and phishing detection.\n2. **DKIM/SPF/DMARC**: Email authentication records shall be configured for all domains.\n3. **Encryption**: Email containing Confidential/Restricted data shall be encrypted.\n4. **Retention**: Email shall be retained per the data retention schedule.\n5. **External Warnings**: Emails from external senders shall display a warning banner.\n6. **Training**: Employees shall complete annual email security awareness training.")}\n\n${section("Prohibited Use", "1. Using personal email for company business.\n2. Forwarding company email to external/personal accounts.\n3. Opening suspicious attachments or clicking unverified links.")}`,
  },
  {
    id: "network-security",
    title: "Network Security Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for securing network infrastructure and communications.")}\n\n${section("Scope", "All network infrastructure, including routers, switches, firewalls, VPNs, and wireless networks.")}\n\n${section("Policy", "1. **Firewall**: Firewalls shall be deployed at all network boundaries with documented rules.\n2. **Segmentation**: Production, development, and corporate networks shall be segmented.\n3. **VPN**: Remote access shall use encrypted VPN with MFA.\n4. **Wireless**: Wi-Fi networks shall use WPA3 encryption with separate guest network.\n5. **Monitoring**: Network traffic shall be monitored for anomalies and logged.\n6. **Patching**: Network devices shall be patched per the vulnerability management schedule.\n7. **DNS**: DNS filtering shall block known malicious domains.")}\n\n${section("Review", "Firewall rules and network configurations shall be reviewed quarterly.")}`,
  },
  {
    id: "physical-security",
    title: "Physical Security Policy",
    category: "physical_security",
    frameworks: ["SOC 2", "ISO 27001"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines physical security requirements for protecting facilities and equipment.")}\n\n${section("Scope", "All company offices, data centers, and physical assets.")}\n\n${section("Policy", "1. **Access Control**: Physical access to facilities shall be restricted via badge/biometric systems.\n2. **Visitor Management**: All visitors shall sign in, wear badges, and be escorted.\n3. **Equipment Security**: Laptops and mobile devices shall be secured when unattended.\n4. **Server Rooms**: Access to server/network rooms shall be restricted to authorized IT staff.\n5. **CCTV**: Security cameras shall monitor entry points and sensitive areas.\n6. **Clean Desk**: Confidential documents shall be secured when not in use.\n7. **Asset Disposal**: Equipment shall be sanitized before disposal.")}\n\n${section("Enforcement", "Facility security shall be reviewed annually.")}`,
  },
  {
    id: "vendor-management",
    title: "Vendor Risk Management Policy",
    category: "vendor_management",
    frameworks: ["SOC 2", "ISO 27001", "POPIA", "GDPR"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for assessing and managing third-party vendor risk.")}\n\n${section("Scope", "All vendors, suppliers, and service providers with access to company data or systems.")}\n\n${section("Policy", "1. **Risk Assessment**: Vendors shall be assessed before onboarding and annually thereafter.\n2. **Due Diligence**: Vendor security posture shall be evaluated via questionnaires and certifications (SOC 2, ISO 27001).\n3. **Contracts**: Vendor contracts shall include security, confidentiality, and breach notification clauses.\n4. **Data Processing**: Vendors processing PI shall sign a Data Processing Agreement (DPA).\n5. **Tiering**: Vendors shall be tiered by risk level (Critical, High, Medium, Low) with appropriate oversight.\n6. **Offboarding**: Vendor access shall be revoked and data returned/destroyed upon contract termination.\n7. **Monitoring**: Critical vendors shall be monitored continuously for security incidents.")}`,
  },
  {
    id: "business-continuity",
    title: "Business Continuity Policy",
    category: "business_continuity",
    frameworks: ["SOC 2", "ISO 27001", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for maintaining business operations during and after disruptions.")}\n\n${section("Scope", "All critical business processes and supporting IT systems.")}\n\n${section("Policy", "1. **BCP Document**: A Business Continuity Plan shall be maintained and reviewed annually.\n2. **BIA**: A Business Impact Analysis shall identify critical processes and recovery priorities.\n3. **RTO/RPO**: Recovery Time and Recovery Point Objectives shall be defined for each critical system.\n4. **Backup**: Data backups shall be maintained with tested restore procedures.\n5. **Redundancy**: Critical systems shall have redundancy across availability zones or regions.\n6. **Testing**: The BCP shall be tested annually via tabletop or full-scale exercises.\n7. **Communication**: Emergency communication procedures shall be documented and tested.")}`,
  },
  {
    id: "disaster-recovery",
    title: "Disaster Recovery Policy",
    category: "business_continuity",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines requirements for recovering IT systems and data following a disaster.")}\n\n${section("Scope", "All production IT systems, applications, and data.")}\n\n${section("Policy", "1. **DR Plan**: A Disaster Recovery Plan shall be maintained with detailed recovery procedures.\n2. **RTO**: Critical systems shall have RTO ≤4 hours; non-critical ≤24 hours.\n3. **RPO**: Critical data shall have RPO ≤1 hour via continuous replication.\n4. **Backup Strategy**: 3-2-1 backup strategy (3 copies, 2 media, 1 offsite).\n5. **DR Testing**: DR procedures shall be tested semi-annually.\n6. **Failover**: Automated failover shall be configured for critical systems.\n7. **Documentation**: Recovery procedures shall be documented and accessible to the DR team.")}`,
  },
  {
    id: "retention",
    title: "Data Retention Policy",
    category: "data_privacy",
    frameworks: ["ISO 27001", "POPIA", "GDPR", "SOC 2"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines retention periods for different types of data and secure disposal procedures.")}\n\n${section("Scope", "All data created, received, or maintained by the organization.")}\n\n${section("Retention Schedule", "1. **Financial Records**: 7 years (per regulatory requirements).\n2. **Employee Records**: 7 years post-termination.\n3. **Customer Data**: Duration of relationship + 3 years.\n4. **Security Logs**: 365 days.\n5. **Audit Reports**: 7 years.\n6. **Email**: 3 years.\n7. **Personal Data (PI)**: Only as long as necessary for the stated purpose.\n8. **Backups**: 90 days (overwritten on cycle).")}\n\n${section("Disposal", "1. Electronic data shall be securely deleted using approved wiping tools.\n2. Physical media shall be shredded or degaussed.\n3. Disposal shall be documented with certificates of destruction.")}`,
  },
  {
    id: "logging-monitoring",
    title: "Logging and Monitoring Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines requirements for logging, monitoring, and alerting on security events.")}\n\n${section("Scope", "All systems, applications, network devices, and security tools.")}\n\n${section("Policy", "1. **Log Collection**: Security-relevant events shall be logged and centralized in a SIEM.\n2. **Log Content**: Logs shall include timestamp, user, action, source IP, and outcome.\n3. **Retention**: Security logs shall be retained for 365 days.\n4. **Alerting**: Critical events shall trigger real-time alerts to the security team.\n5. **Monitoring**: The security team shall monitor alerts 24/7 (or via on-call rotation).\n6. **Review**: Access logs for privileged accounts shall be reviewed monthly.\n7. **Integrity**: Logs shall be protected from tampering (write-once or append-only).")}`,
  },
  {
    id: "encryption",
    title: "Encryption Policy",
    category: "data_privacy",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS", "POPIA"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines encryption standards for protecting data at rest and in transit.")}\n\n${section("Scope", "All data stored on company systems or transmitted over networks.")}\n\n${section("Policy", "1. **At Rest**: All databases, file storage, and backups shall use AES-256 encryption.\n2. **In Transit**: All network traffic shall use TLS 1.2 or higher.\n3. **Key Management**: Encryption keys shall be managed via a KMS (AWS KMS, Azure Key Vault, or equivalent).\n4. **Key Rotation**: Encryption keys shall be rotated annually.\n5. **Endpoint**: Full disk encryption (FileVault/BitLocker) shall be enabled on all laptops.\n6. **Email**: Confidential email shall be encrypted via S/MIME or transport encryption.\n7. **Certificates**: TLS certificates shall be monitored and renewed before expiry.")}`,
  },
  {
    id: "mobile-device",
    title: "Mobile Device and BYOD Policy",
    category: "human_resources",
    frameworks: ["SOC 2", "ISO 27001", "POPIA"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines requirements for securing mobile devices used for company business, including BYOD.")}\n\n${section("Scope", "All smartphones, tablets, and laptops used to access company data, whether company-owned or personal (BYOD).")}\n\n${section("Policy", "1. **MDM**: All devices accessing company data shall be enrolled in Mobile Device Management.\n2. **Passcode**: Devices shall have a 6+ digit passcode with auto-lock after 5 minutes.\n3. **Encryption**: Full disk encryption shall be enabled on all devices.\n4. **Remote Wipe**: The company reserves the right to remotely wipe company data from any device.\n5. **OS Updates**: Devices shall run supported OS versions with security patches applied within 30 days.\n6. **BYOD**: Personal devices shall have a separate work profile; company data is containerized.\n7. **Lost/Stolen**: Lost or stolen devices shall be reported within 24 hours for remote wipe.")}`,
  },
  {
    id: "remote-work",
    title: "Remote Work Security Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines security requirements for employees working remotely.")}\n\n${section("Scope", "All employees, contractors, and temporary staff working from locations outside company facilities.")}\n\n${section("Policy", "1. **VPN**: Remote access to company systems shall use VPN with MFA.\n2. **Network**: Employees shall not use public Wi-Fi without VPN for company business.\n3. **Workspace**: Remote workspaces shall prevent unauthorized viewing of screens (shoulder surfing).\n4. **Devices**: Only company-managed or approved BYOD devices shall access company systems.\n5. **Printing**: Confidential documents shall not be printed in shared/public spaces.\n6. **Physical Security**: Company equipment shall be secured when not in use.\n7. **Family/Visitors**: Family members and visitors shall not use company devices.")}`,
  },
  {
    id: "security-awareness",
    title: "Security Awareness and Training Policy",
    category: "human_resources",
    frameworks: ["SOC 2", "ISO 27001", "POPIA", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes requirements for security awareness training and education.")}\n\n${section("Scope", "All employees, contractors, and temporary staff with access to company systems.")}\n\n${section("Policy", "1. **Onboarding**: New hires shall complete security awareness training within 30 days of start date.\n2. **Annual Training**: All staff shall complete annual security awareness training.\n3. **Phishing Simulations**: Phishing simulations shall be conducted quarterly.\n4. **Role-Specific Training**: Personnel in security-sensitive roles shall receive additional training.\n5. **Policy Acknowledgment**: Employees shall acknowledge key security policies annually.\n6. **Tracking**: Training completion shall be tracked and reported to management.\n7. **Remediation**: Employees failing phishing simulations shall receive additional training.")}`,
  },
  {
    id: "risk-management",
    title: "Risk Management Policy",
    category: "information_security",
    frameworks: ["ISO 27001", "NIST CSF", "King V", "COSO ERM"],
    version: "1.0",
    content: `${section("Purpose", "This policy establishes the framework for identifying, assessing, and managing information security and enterprise risks.")}\n\n${section("Scope", "All risks to information assets, business operations, and organizational objectives.")}\n\n${section("Policy", "1. **Risk Register**: A central risk register shall be maintained with all identified risks.\n2. **Assessment**: Risks shall be assessed for likelihood and impact (qualitative and quantitative).\n3. **Risk Appetite**: The board shall define and approve the organization's risk appetite annually.\n4. **Treatment**: Risks shall be treated via mitigation, transfer, acceptance, or avoidance.\n5. **Review**: The risk register shall be reviewed quarterly by the risk committee.\n6. **Reporting**: Key risks shall be reported to the board/executive team quarterly.\n7. **COSO ERM**: Enterprise risk management shall follow the COSO ERM framework.\n8. **SADC Sovereignty**: Cross-border data transfer risks shall be assessed per SADC model law.")}`,
  },
  {
    id: "vulnerability-management",
    title: "Vulnerability Management Policy",
    category: "information_security",
    frameworks: ["SOC 2", "ISO 27001", "PCI DSS", "NIST CSF"],
    version: "1.0",
    content: `${section("Purpose", "This policy defines requirements for identifying, prioritizing, and remediating vulnerabilities.")}\n\n${section("Scope", "All company systems, applications, network devices, and cloud infrastructure.")}\n\n${section("Policy", "1. **Scanning**: Vulnerability scans shall run weekly on all infrastructure.\n2. **Penetration Testing**: Annual penetration tests shall be conducted by qualified third parties.\n3. **Severity Classification**: Vulnerabilities shall be classified as Critical, High, Medium, or Low.\n4. **Remediation SLAs**: Critical: 7 days, High: 30 days, Medium: 90 days, Low: 180 days.\n5. **Patching**: Security patches shall be applied per the patching SLA.\n6. **Tracking**: All vulnerabilities shall be tracked to closure in the vulnerability register.\n7. **Reporting**: Vulnerability metrics shall be reported to management monthly.")}`,
  },
];

export const getPolicyTemplatesByCategory = () => {
  const grouped = {};
  for (const [key, val] of Object.entries(policyTemplateCategories)) {
    grouped[key] = { ...val, items: policyTemplates.filter((p) => p.category === key) };
  }
  return grouped;
};