import React from "react";
import PageHeader from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Cloud, RefreshCw, Shield, Clock, Activity, HardDrive, Network, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function HadrDocumentation() {
  const architecture = [
    { component: "API Gateway", rto: "15 min", rpo: "0 min", strategy: "Multi-AZ active-active with automatic failover", icon: Network },
    { component: "Application Servers", rto: "30 min", rpo: "0 min", strategy: "Auto-scaling group across 3 availability zones", icon: Server },
    { component: "Primary Database", rto: "15 min", rpo: "5 min", strategy: "Primary + 2 replicas with automated point-in-time recovery", icon: Database },
    { component: "Entity Storage", rto: "60 min", rpo: "15 min", strategy: "Daily snapshots + continuous WAL archiving", icon: HardDrive },
    { component: "File Storage", rto: "60 min", rpo: "1 hour", strategy: "Cross-region replication with versioning", icon: Cloud },
    { component: "Authentication", rto: "15 min", rpo: "0 min", strategy: "Stateless JWT + distributed session cache", icon: Shield },
  ];

  const procedures = [
    { name: "Database Failover", trigger: "Primary DB unreachable", steps: ["Health check detects failure", "Promote read replica to primary", "Update connection strings", "Verify application connectivity", "Notify engineering team"], rto: "15 min" },
    { name: "Region Failover", trigger: "Primary region unavailable", steps: ["Activate DR region", "Update DNS records", "Restore from latest backup", "Verify data integrity", "Switch traffic to DR region", "Notify all stakeholders"], rto: "60 min" },
    { name: "Ransomware Recovery", trigger: "Malware detected / data encrypted", steps: ["Isolate affected systems", "Activate incident response team", "Restore from clean backup", "Verify data integrity", "Conduct forensic analysis", "Restore services incrementally"], rto: "4 hours" },
    { name: "Data Corruption Recovery", trigger: "Data integrity check failed", steps: ["Identify corruption scope", "Quarantine affected records", "Restore from point-in-time backup", "Run data validation scripts", "Reconcile lost transactions"], rto: "2 hours" },
  ];

  const backup = [
    { type: "Database snapshot", frequency: "Daily (02:00 UTC)", retention: "30 days", encrypted: true },
    { type: "WAL archive", frequency: "Continuous", retention: "7 days", encrypted: true },
    { type: "File storage", frequency: "Real-time replication", retention: "90 days versioning", encrypted: true },
    { type: "Configuration", frequency: "On change", retention: "Indefinite", encrypted: true },
    { type: "Audit logs", frequency: "Real-time", retention: "7 years (regulatory)", encrypted: true },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="High Availability & Disaster Recovery"
        subtitle="Architecture documentation, RTO/RPO targets, failover procedures, and backup strategy"
      />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" /> Architecture Overview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Cloud className="h-4 w-4 text-blue-500" /><span className="font-medium">Multi-Region Deployment</span></div>
              <p className="text-xs text-muted-foreground">Primary region (active) + DR region (warm standby). Traffic routed via latency-based DNS. Automatic health checks every 10 seconds.</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-emerald-500" /><span className="font-medium">Auto-Scaling</span></div>
              <p className="text-xs text-muted-foreground">Application servers auto-scale based on CPU threshold and request queue depth. Min 3 instances across 3 AZs for HA.</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Database className="h-4 w-4 text-purple-500" /><span className="font-medium">Database Replication</span></div>
              <p className="text-xs text-muted-foreground">Synchronous replication to standby (same region) + asynchronous to DR region. Automated failover with 15-min RTO.</p>
            </div>
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2"><Shield className="h-4 w-4 text-amber-500" /><span className="font-medium">Zero-Downtime Deployments</span></div>
              <p className="text-xs text-muted-foreground">Blue-green deployments with health-gated traffic shifting. Automatic rollback on elevated error rate.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> RTO / RPO Targets by Component</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Component</th>
                  <th className="pb-2 font-medium">RTO</th>
                  <th className="pb-2 font-medium">RPO</th>
                  <th className="pb-2 font-medium">Strategy</th>
                </tr>
              </thead>
              <tbody>
                {architecture.map((a, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2"><div className="flex items-center gap-2"><a.icon className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{a.component}</span></div></td>
                    <td className="py-2"><Badge variant="outline">{a.rto}</Badge></td>
                    <td className="py-2"><Badge variant="outline">{a.rpo}</Badge></td>
                    <td className="py-2 text-xs text-muted-foreground">{a.strategy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> Backup Strategy</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">Backup Type</th>
                  <th className="pb-2 font-medium">Frequency</th>
                  <th className="pb-2 font-medium">Retention</th>
                  <th className="pb-2 font-medium">Encrypted</th>
                </tr>
              </thead>
              <tbody>
                {backup.map((b, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 font-medium">{b.type}</td>
                    <td className="py-2 text-muted-foreground">{b.frequency}</td>
                    <td className="py-2 text-muted-foreground">{b.retention}</td>
                    <td className="py-2">{b.encrypted ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <AlertTriangle className="h-4 w-4 text-red-500 inline" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Recovery Procedures</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {procedures.map((p, i) => (
              <div key={i} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Trigger: {p.trigger}</div>
                  </div>
                  <Badge variant="outline">RTO: {p.rto}</Badge>
                </div>
                <ol className="space-y-1">
                  {p.steps.map((step, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{j + 1}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>DR Testing Schedule</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><strong>Monthly:</strong> Database failover test (non-production)</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><strong>Quarterly:</strong> Full DR region activation test</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><strong>Semi-annually:</strong> Full tabletop exercise with all stakeholders</span></div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span><strong>Annually:</strong> Third-party DR audit and certification</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}