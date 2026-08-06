export const DEVSECOPS_CHECKS = [
  { id: "branch_protection", name: "Branch Protection", description: "Default branch has protection rules enabled (no direct pushes)", framework: "SOC 2 CC8.1", severity: "high", category: "code" },
  { id: "required_reviews", name: "Required PR Reviews", description: "At least 2 reviewers required for production branches", framework: "SOC 2 CC8.1", severity: "medium", category: "code" },
  { id: "secret_scanning", name: "Secret Scanning", description: "GitHub secret scanning enabled on private repos", framework: "SOC 2 CC6.1", severity: "high", category: "code" },
  { id: "dependency_alerts", name: "Dependency Vulnerability Alerts", description: "Dependabot vulnerability alerts enabled", framework: "SOC 2 CC7.1", severity: "medium", category: "code" },
  { id: "code_scanning", name: "Code Scanning (SAST)", description: "GitHub Advanced Security code scanning / CodeQL enabled", framework: "SOC 2 CC7.1", severity: "medium", category: "code" },
  { id: "signed_commits", name: "Signed Commits", description: "Commit signing required on protected branches", framework: "ISO 27001 A.8.2", severity: "low", category: "code" },
  { id: "admin_2fa", name: "Admin 2FA Enforcement", description: "Repository admins must have 2FA enabled", framework: "SOC 2 CC6.1", severity: "high", category: "identity" },
  { id: "security_policy", name: "Security Policy", description: "SECURITY.md policy file present in repo", framework: "ISO 27001 A.5.1", severity: "low", category: "governance" },
];

export const DEVSECOPS_CATEGORIES = [
  { id: "code", name: "Code Security", icon: "Code" },
  { id: "identity", name: "Identity & Access", icon: "KeyRound" },
  { id: "governance", name: "Governance", icon: "Landmark" },
];