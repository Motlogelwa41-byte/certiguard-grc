// CIS Benchmark Baseline Library
// Pre-built golden configuration baselines aligned to Center for Internet Security (CIS) benchmarks.
// Each template contains the CIS control items, expected values, validation methods, and remediation guidance.

export const CIS_BASELINE_TEMPLATES = [
  {
    baseline_id: "BASE-CIS-LIN-01",
    name: "CIS Ubuntu Linux 22.04 LTS Benchmark",
    description: "Hardened baseline for Ubuntu 22.04 LTS servers aligned to CIS Benchmark v2.0.0 — covers server hardening, minimal package installation, account management, and service management.",
    cis_benchmark: "CIS Ubuntu Linux 22.04 LTS Benchmark",
    cis_version: "v2.0.0",
    target_platform: "linux",
    platform_detail: "Ubuntu 22.04 LTS",
    category: "server_hardening",
    enforcement_mode: "enforce",
    validation_frequency: "daily",
    config_items: [
      { item_id: "CIS-1.1.1", name: "Ensure mounting of cramfs filesystems is disabled", cis_ref: "1.1.1", category: "server_hardening", expected_value: "disabled", validation_method: "manual", severity: "low", remediation_guidance: "Run: modprobe -n -v cramfs || echo 'install cramfs /bin/true' >> /etc/modprobe.d/cramfs.conf" },
      { item_id: "CIS-1.4.1", name: "Ensure AIDE is installed (file integrity monitoring)", cis_ref: "1.4.1", category: "server_hardening", expected_value: "installed", validation_method: "asset_agent_installed", severity: "high", remediation_guidance: "Install AIDE: apt install aide && aideinit" },
      { item_id: "CIS-1.5.1", name: "Ensure SELinux or AppArmor is installed and enabled", cis_ref: "1.5.1", category: "server_hardening", expected_value: "enabled", validation_method: "asset_agent_installed", severity: "high", remediation_guidance: "Install and enable AppArmor: apt install apparmor apparmor-utils" },
      { item_id: "CIS-1.6.1", name: "Ensure XD/NX support is enabled (DEP)", cis_ref: "1.6.1", category: "server_hardening", expected_value: "enabled", validation_method: "manual", severity: "medium", remediation_guidance: "Verify in BIOS/UEFI that NX/XD bit is enabled" },
      { item_id: "CIS-1.8.1", name: "Ensure updates, patches, and security software are installed", cis_ref: "1.8.1", category: "server_hardening", expected_value: "current", validation_method: "asset_patch_level", severity: "critical", remediation_guidance: "Run: apt update && apt upgrade -y" },
      { item_id: "CIS-2.2.1", name: "Ensure minimal package installation (no GUI/X11 on servers)", cis_ref: "2.2.1", category: "package_management", expected_value: "no_gui", validation_method: "manual", severity: "medium", remediation_guidance: "Remove GUI packages: apt purge xserver-xorg* && apt autoremove" },
      { item_id: "CIS-2.2.2", name: "Ensure Avahi Server is not installed", cis_ref: "2.2.2", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge avahi-daemon" },
      { item_id: "CIS-2.2.3", name: "Ensure CUPS is not installed (print server)", cis_ref: "2.2.3", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge cups" },
      { item_id: "CIS-2.2.4", name: "Ensure DHCP Server is not installed", cis_ref: "2.2.4", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge isc-dhcp-server" },
      { item_id: "CIS-2.2.5", name: "Ensure LDAP server is not installed", cis_ref: "2.2.5", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge slapd" },
      { item_id: "CIS-2.2.6", name: "Ensure NFS and RPC are not installed", cis_ref: "2.2.6", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge nfs-kernel-server rpcbind" },
      { item_id: "CIS-2.2.7", name: "Ensure DNS Server is not installed", cis_ref: "2.2.7", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge bind9" },
      { item_id: "CIS-2.2.8", name: "Ensure FTP Server is not installed", cis_ref: "2.2.8", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge vsftpd" },
      { item_id: "CIS-2.2.9", name: "Ensure HTTP server is not installed", cis_ref: "2.2.9", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge apache2 nginx" },
      { item_id: "CIS-2.2.10", name: "Ensure IMAP/POP3 server is not installed", cis_ref: "2.2.10", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge dovecot-imapd dovecot-pop3d" },
      { item_id: "CIS-2.2.11", name: "Ensure Samba is not installed", cis_ref: "2.2.11", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge samba" },
      { item_id: "CIS-2.2.12", name: "Ensure HTTP Proxy server is not installed", cis_ref: "2.2.12", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge squid" },
      { item_id: "CIS-2.2.13", name: "Ensure SNMP is not installed", cis_ref: "2.2.13", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge snmpd" },
      { item_id: "CIS-2.3.1", name: "Ensure NIS Server is not installed (legacy services)", cis_ref: "2.3.1", category: "service_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge nis" },
      { item_id: "CIS-2.3.2", name: "Ensure rsh server is not installed", cis_ref: "2.3.2", category: "service_management", expected_value: "not_installed", validation_method: "manual", severity: "high", remediation_guidance: "Remove: apt purge rsh-server" },
      { item_id: "CIS-2.3.3", name: "Ensure talk server is not installed", cis_ref: "2.3.3", category: "service_management", expected_value: "not_installed", validation_method: "manual", severity: "low", remediation_guidance: "Remove: apt purge talkd" },
      { item_id: "CIS-2.3.4", name: "Ensure telnet server is not installed", cis_ref: "2.3.4", category: "service_management", expected_value: "not_installed", validation_method: "manual", severity: "high", remediation_guidance: "Remove: apt purge telnetd" },
      { item_id: "CIS-2.3.5", name: "Ensure tftp server is not installed", cis_ref: "2.3.5", category: "service_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: apt purge tftpd" },
      { item_id: "CIS-4.1.1", name: "Ensure SSH root login is disabled", cis_ref: "4.1.1", category: "access_control", expected_value: "PermitRootLogin no", validation_method: "manual", severity: "critical", remediation_guidance: "Set 'PermitRootLogin no' in /etc/ssh/sshd_config" },
      { item_id: "CIS-4.1.2", name: "Ensure SSH password authentication is disabled", cis_ref: "4.1.2", category: "access_control", expected_value: "PasswordAuthentication no", validation_method: "manual", severity: "high", remediation_guidance: "Set 'PasswordAuthentication no' in /etc/ssh/sshd_config" },
      { item_id: "CIS-4.1.3", name: "Ensure SSH MaxAuthTries is set to 4 or less", cis_ref: "4.1.3", category: "access_control", expected_value: "MaxAuthTries 4", validation_method: "manual", severity: "medium", remediation_guidance: "Set 'MaxAuthTries 4' in /etc/ssh/sshd_config" },
      { item_id: "CIS-5.1.1", name: "Ensure disk encryption is enabled (LUKS)", cis_ref: "5.1.1", category: "data_protection", expected_value: "encrypted", validation_method: "asset_encryption", severity: "critical", remediation_guidance: "Enable LUKS full disk encryption on all server volumes" },
      { item_id: "CIS-5.2.1", name: "Ensure firewall is enabled (ufw/iptables)", cis_ref: "5.2.1", category: "network_security", expected_value: "enabled", validation_method: "asset_agent_installed", severity: "high", remediation_guidance: "Enable UFW: ufw enable && ufw default deny incoming" },
      { item_id: "CIS-6.1.1", name: "Ensure auditd is installed and running (logging)", cis_ref: "6.1.1", category: "logging_auditing", expected_value: "installed", validation_method: "asset_agent_installed", severity: "high", remediation_guidance: "Install auditd: apt install auditd && systemctl enable auditd" },
      { item_id: "CIS-6.2.1", name: "Ensure permissions on /etc/passwd are configured (644)", cis_ref: "6.2.1", category: "access_control", expected_value: "644", validation_method: "manual", severity: "medium", remediation_guidance: "Run: chmod 644 /etc/passwd" },
      { item_id: "CIS-6.2.2", name: "Ensure permissions on /etc/shadow are restricted (640)", cis_ref: "6.2.2", category: "access_control", expected_value: "640", validation_method: "manual", severity: "high", remediation_guidance: "Run: chmod 640 /etc/shadow" },
      { item_id: "CIS-7.1.1", name: "Ensure no default/unneeded accounts exist", cis_ref: "7.1.1", category: "account_management", expected_value: "no_default_accounts", validation_method: "manual", severity: "high", remediation_guidance: "Remove default accounts: userdel games; userdel news; userdel uucp" },
      { item_id: "CIS-7.2.1", name: "Ensure no users have empty password fields", cis_ref: "7.2.1", category: "account_management", expected_value: "no_empty_passwords", validation_method: "manual", severity: "critical", remediation_guidance: "Run: awk -F: '($2 == \"\") {print}' /etc/shadow — lock any empty accounts" },
      { item_id: "CIS-7.3.1", name: "Ensure password creation requirements are configured", cis_ref: "7.3.1", category: "account_management", expected_value: "minlen=14", validation_method: "manual", severity: "medium", remediation_guidance: "Configure /etc/security/pwquality.conf with minlen=14, minclass=4" },
      { item_id: "CIS-7.4.1", name: "Ensure inactive password lock is configured (30 days)", cis_ref: "7.4.1", category: "account_management", expected_value: "30", validation_method: "manual", severity: "medium", remediation_guidance: "Run: chage --maxdays 90 --inactive 30 <user>" },
      { item_id: "CIS-7.5.1", name: "Ensure session timeout is configured (TMOUT=600)", cis_ref: "7.5.1", category: "access_control", expected_value: "600", validation_method: "manual", severity: "medium", remediation_guidance: "Add 'TMOUT=600' to /etc/profile.d/session_timeout.sh" },
    ],
  },
  {
    baseline_id: "BASE-CIS-WIN-01",
    name: "CIS Windows Server 2022 Benchmark",
    description: "Hardened baseline for Windows Server 2022 aligned to CIS Benchmark v2.0.0 — covers server hardening, account management, service management, and data protection.",
    cis_benchmark: "CIS Windows Server 2022 Benchmark",
    cis_version: "v2.0.0",
    target_platform: "windows",
    platform_detail: "Windows Server 2022",
    category: "server_hardening",
    enforcement_mode: "enforce",
    validation_frequency: "daily",
    config_items: [
      { item_id: "CIS-WIN-1.1.1", name: "Ensure 'Enforce password history' is set to 24 or more", cis_ref: "1.1.1", category: "account_management", expected_value: "24", validation_method: "manual", severity: "medium", remediation_guidance: "Set via GPO: Computer Configuration > Policies > Windows Settings > Security Settings > Account Policies > Password Policy" },
      { item_id: "CIS-WIN-1.1.2", name: "Ensure 'Maximum password age' is set to 365 or fewer days", cis_ref: "1.1.2", category: "account_management", expected_value: "365", validation_method: "manual", severity: "medium", remediation_guidance: "Set 'Maximum password age' to 365 days via GPO" },
      { item_id: "CIS-WIN-1.1.3", name: "Ensure 'Minimum password length' is set to 14 or more", cis_ref: "1.1.3", category: "account_management", expected_value: "14", validation_method: "manual", severity: "high", remediation_guidance: "Set 'Minimum password length' to 14 via GPO" },
      { item_id: "CIS-WIN-1.1.4", name: "Ensure 'Password must meet complexity requirements' is enabled", cis_ref: "1.1.4", category: "account_management", expected_value: "Enabled", validation_method: "manual", severity: "high", remediation_guidance: "Enable 'Password must meet complexity requirements' via GPO" },
      { item_id: "CIS-WIN-1.2.1", name: "Ensure 'Account lockout threshold' is set to 5 or fewer invalid attempts", cis_ref: "1.2.1", category: "account_management", expected_value: "5", validation_method: "manual", severity: "high", remediation_guidance: "Set 'Account lockout threshold' to 5 via GPO" },
      { item_id: "CIS-WIN-1.2.2", name: "Ensure 'Account lockout duration' is set to 15 or more minutes", cis_ref: "1.2.2", category: "account_management", expected_value: "15", validation_method: "manual", severity: "medium", remediation_guidance: "Set 'Account lockout duration' to 15 minutes via GPO" },
      { item_id: "CIS-WIN-2.1.1", name: "Ensure 'Guest' account is disabled", cis_ref: "2.1.1", category: "account_management", expected_value: "Disabled", validation_method: "manual", severity: "critical", remediation_guidance: "Disable Guest account: net user guest /active:no" },
      { item_id: "CIS-WIN-2.1.2", name: "Ensure 'Guest' account is renamed", cis_ref: "2.1.2", category: "account_management", expected_value: "renamed", validation_method: "manual", severity: "medium", remediation_guidance: "Rename Guest account via GPO or: wmic useraccount where name='Guest' rename='DisabledGuest'" },
      { item_id: "CIS-WIN-2.2.1", name: "Ensure 'Remote Desktop Services' is disabled unless required", cis_ref: "2.2.1", category: "service_management", expected_value: "Disabled", validation_method: "manual", severity: "high", remediation_guidance: "Disable RDS via Server Manager or GPO if not needed" },
      { item_id: "CIS-WIN-2.2.2", name: "Ensure 'Print Spooler' service is disabled unless required", cis_ref: "2.2.2", category: "service_management", expected_value: "Disabled", validation_method: "manual", severity: "medium", remediation_guidance: "Disable Print Spooler: Set-Service -Name Spooler -StartupType Disabled" },
      { item_id: "CIS-WIN-2.2.3", name: "Ensure 'Remote Registry' service is disabled", cis_ref: "2.2.3", category: "service_management", expected_value: "Disabled", validation_method: "manual", severity: "high", remediation_guidance: "Disable Remote Registry: Set-Service -Name RemoteRegistry -StartupType Disabled" },
      { item_id: "CIS-WIN-2.2.4", name: "Ensure 'Telnet Client' is not installed", cis_ref: "2.2.4", category: "package_management", expected_value: "not_installed", validation_method: "manual", severity: "medium", remediation_guidance: "Remove: Remove-WindowsFeature -Name Telnet-Client" },
      { item_id: "CIS-WIN-2.2.5", name: "Ensure 'SMB v1' is disabled (legacy protocol)", cis_ref: "2.2.5", category: "service_management", expected_value: "Disabled", validation_method: "manual", severity: "critical", remediation_guidance: "Disable SMBv1: Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol" },
      { item_id: "CIS-WIN-3.1.1", name: "Ensure 'Windows Firewall: Domain Profile' is enabled", cis_ref: "3.1.1", category: "network_security", expected_value: "Enabled", validation_method: "asset_agent_installed", severity: "critical", remediation_guidance: "Enable firewall: netsh advfirewall set domainprofile state on" },
      { item_id: "CIS-WIN-3.1.2", name: "Ensure 'Windows Firewall: Private Profile' is enabled", cis_ref: "3.1.2", category: "network_security", expected_value: "Enabled", validation_method: "asset_agent_installed", severity: "critical", remediation_guidance: "Enable firewall: netsh advfirewall set privateprofile state on" },
      { item_id: "CIS-WIN-4.1.1", name: "Ensure 'Audit Policy' is configured for security events", cis_ref: "4.1.1", category: "logging_auditing", expected_value: "configured", validation_method: "manual", severity: "high", remediation_guidance: "Configure audit policy via GPO: Advanced Audit Policy Configuration" },
      { item_id: "CIS-WIN-5.1.1", name: "Ensure BitLocker is enabled on all fixed drives", cis_ref: "5.1.1", category: "data_protection", expected_value: "encrypted", validation_method: "asset_encryption", severity: "critical", remediation_guidance: "Enable BitLocker: Enable-BitLocker -MountPoint C: -EncryptionMethod XtsAes256" },
      { item_id: "CIS-WIN-5.2.1", name: "Ensure 'Windows Update' is configured for automatic updates", cis_ref: "5.2.1", category: "server_hardening", expected_value: "current", validation_method: "asset_patch_level", severity: "critical", remediation_guidance: "Configure automatic updates via GPO or sconfig" },
      { item_id: "CIS-WIN-6.1.1", name: "Ensure 'Windows Defender Antivirus' is enabled", cis_ref: "6.1.1", category: "server_hardening", expected_value: "enabled", validation_method: "asset_agent_installed", severity: "critical", remediation_guidance: "Enable Defender: Set-MpPreference -DisableRealtimeMonitoring $false" },
      { item_id: "CIS-WIN-6.2.1", name: "Ensure 'Windows Defender Firewall' logging is enabled", cis_ref: "6.2.1", category: "logging_auditing", expected_value: "enabled", validation_method: "manual", severity: "medium", remediation_guidance: "Enable firewall logging: netsh advfirewall set allprofile logging enabled" },
    ],
  },
  {
    baseline_id: "BASE-CIS-K8S-01",
    name: "CIS Kubernetes Benchmark",
    description: "Hardened baseline for Kubernetes clusters aligned to CIS Kubernetes Benchmark v1.9.0 — covers API server, etcd, control plane, and worker node hardening.",
    cis_benchmark: "CIS Kubernetes Benchmark",
    cis_version: "v1.9.0",
    target_platform: "kubernetes",
    platform_detail: "Kubernetes 1.27+",
    category: "server_hardening",
    enforcement_mode: "enforce",
    validation_frequency: "weekly",
    config_items: [
      { item_id: "CIS-K8S-1.2.1", name: "Ensure --anonymous-auth is set to false on API server", cis_ref: "1.2.1", category: "access_control", expected_value: "false", validation_method: "manual", severity: "critical", remediation_guidance: "Set --anonymous-auth=false in kube-apiserver manifest" },
      { item_id: "CIS-K8S-1.2.2", name: "Ensure --authorization-mode includes RBAC", cis_ref: "1.2.2", category: "access_control", expected_value: "RBAC", validation_method: "manual", severity: "critical", remediation_guidance: "Set --authorization-mode=Node,RBAC in kube-apiserver manifest" },
      { item_id: "CIS-K8S-1.2.3", name: "Ensure --client-ca-file is set (TLS client auth)", cis_ref: "1.2.3", category: "access_control", expected_value: "configured", validation_method: "manual", severity: "high", remediation_guidance: "Set --client-ca-file in kube-apiserver manifest" },
      { item_id: "CIS-K8S-1.2.4", name: "Ensure --token-auth-file is not used (static tokens)", cis_ref: "1.2.4", category: "access_control", expected_value: "not_used", validation_method: "manual", severity: "high", remediation_guidance: "Remove --token-auth-file from kube-apiserver manifest" },
      { item_id: "CIS-K8S-1.2.5", name: "Ensure --DisableProfiling is set to false (for audit)", cis_ref: "1.2.5", category: "logging_auditing", expected_value: "false", validation_method: "manual", severity: "low", remediation_guidance: "Keep profiling enabled for debugging: --profiling=true" },
      { item_id: "CIS-K8S-1.2.6", name: "Ensure --audit-log-path is set (audit logging)", cis_ref: "1.2.6", category: "logging_auditing", expected_value: "configured", validation_method: "manual", severity: "high", remediation_guidance: "Set --audit-log-path=/var/log/kube-audit.log in kube-apiserver manifest" },
      { item_id: "CIS-K8S-1.2.7", name: "Ensure --audit-log-maxage is set to 30 or more days", cis_ref: "1.2.7", category: "logging_auditing", expected_value: "30", validation_method: "manual", severity: "medium", remediation_guidance: "Set --audit-log-maxage=30 in kube-apiserver manifest" },
      { item_id: "CIS-K8S-2.1.1", name: "Ensure etcd has peer client cert authentication enabled", cis_ref: "2.1.1", category: "access_control", expected_value: "enabled", validation_method: "manual", severity: "critical", remediation_guidance: "Set --peer-client-cert-auth=true in etcd configuration" },
      { item_id: "CIS-K8S-2.1.2", name: "Ensure etcd auto-tls is disabled (explicit TLS)", cis_ref: "2.1.2", category: "data_protection", expected_value: "false", validation_method: "manual", severity: "high", remediation_guidance: "Set --auto-tls=false in etcd configuration" },
      { item_id: "CIS-K8S-3.1.1", name: "Ensure --anonymous-auth is false on kubelet", cis_ref: "3.1.1", category: "access_control", expected_value: "false", validation_method: "manual", severity: "high", remediation_guidance: "Set anonymous-auth: false in kubelet config" },
      { item_id: "CIS-K8S-3.1.2", name: "Ensure --authorization-mode is WebHook on kubelet", cis_ref: "3.1.2", category: "access_control", expected_value: "WebHook", validation_method: "manual", severity: "high", remediation_guidance: "Set authorization.mode: WebHook in kubelet config" },
      { item_id: "CIS-K8S-4.1.1", name: "Ensure worker node kubelet config file permissions are 644", cis_ref: "4.1.1", category: "access_control", expected_value: "644", validation_method: "manual", severity: "medium", remediation_guidance: "Run: chmod 644 /var/lib/kubelet/config.yaml" },
      { item_id: "CIS-K8S-5.1.1", name: "Ensure image vulnerability scanning is enabled", cis_ref: "5.1.1", category: "server_hardening", expected_value: "enabled", validation_method: "asset_agent_installed", severity: "high", remediation_guidance: "Deploy an admission controller with image scanning (e.g. Trivy, Clair)" },
      { item_id: "CIS-K8S-5.1.2", name: "Ensure Network Policies are applied to restrict pod traffic", cis_ref: "5.1.2", category: "network_security", expected_value: "configured", validation_method: "manual", severity: "high", remediation_guidance: "Apply NetworkPolicy resources to all namespaces with default deny" },
      { item_id: "CIS-K8S-5.1.3", name: "Ensure container images are pulled from trusted registries", cis_ref: "5.1.3", category: "server_hardening", expected_value: "trusted_registry", validation_method: "manual", severity: "medium", remediation_guidance: "Configure imagePolicyWebhook admission controller for trusted registries" },
      { item_id: "CIS-K8S-6.1.1", name: "Ensure RBAC policies are minimal (no cluster-admin by default)", cis_ref: "6.1.1", category: "access_control", expected_value: "minimal", validation_method: "manual", severity: "high", remediation_guidance: "Audit and restrict cluster-admin bindings: kubectl get clusterrolebindings" },
      { item_id: "CIS-K8S-6.1.2", name: "Ensure default service account is not used for workloads", cis_ref: "6.1.2", category: "account_management", expected_value: "not_used", validation_method: "manual", severity: "medium", remediation_guidance: "Set automountServiceAccountToken: false on workloads" },
    ],
  },
];

export function getTemplateById(baselineId) {
  return CIS_BASELINE_TEMPLATES.find((t) => t.baseline_id === baselineId);
}

export function getTemplatesByPlatform(platform) {
  return CIS_BASELINE_TEMPLATES.filter((t) => t.target_platform === platform);
}

// Validation method → human-readable description
export const VALIDATION_METHODS = {
  asset_encryption: "Check IT asset encryption status",
  asset_patch_level: "Check IT asset patch currency",
  asset_agent_installed: "Check IT asset security agent is installed",
  asset_status_active: "Check IT asset is in active service",
  asset_classification: "Check IT asset data classification meets minimum",
  manual: "Manual verification required (no automated check available)",
  agent_reported: "Requires live agent report from the target system",
};

// Severity colors for UI
export const SEVERITY_COLORS = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-blue-100 text-blue-700 border-blue-200",
};

// Category labels
export const CATEGORY_LABELS = {
  server_hardening: "Server Hardening",
  package_management: "Package Management",
  account_management: "Account Management",
  service_management: "Service Management",
  network_security: "Network Security",
  access_control: "Access Control",
  logging_auditing: "Logging & Auditing",
  data_protection: "Data Protection",
  configuration_management: "Configuration Management",
};