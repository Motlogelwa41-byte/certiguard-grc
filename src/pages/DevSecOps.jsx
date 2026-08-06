import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEVSECOPS_CHECKS } from "@/lib/devSecOpsChecks";
import { ScanLine, GitBranch, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Loader2, KeyRound, FileCheck } from "lucide-react";

const checkIcons = {
  branch_protection: GitBranch,
  required_reviews: GitBranch,
  secret_scanning: ShieldCheck,
  dependency_alerts: AlertTriangle,
  code_scanning: ScanLine,
  signed_commits: KeyRound,
  admin_2fa: KeyRound,
  security_policy: FileCheck,
};

export default function DevSecOps() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [findings, setFindings] = useState([]);
  const { toast } = useToast();

  const loadFindings = useCallback(async () => {
    try {
      const data = await base44.entities.SecurityFinding.filter({ notes: "DevSecOps" }, "-detected_date", 50);
      setFindings(data || []);
    } catch (e) { setFindings([]); }
  }, []);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  const runScan = async () => {
    setScanning(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("scanDevSecOpsPipeline", {});
      const data = res?.data || res;
      setResult(data);
      if (data.status === "completed") {
        toast({ title: `DevSecOps scan complete — ${data.repos_scanned} repos, ${data.findings_created} new findings` });
        loadFindings();
      } else {
        toast({ title: "DevSecOps scan failed", description: data.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Scan failed", description: e.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="DevSecOps Pipeline Scanner"
        subtitle="Automated GitHub repository security posture scanning against CIS & SOC 2 benchmarks"
        actions={<Button onClick={runScan} disabled={scanning} variant="default">
          {scanning ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning repos...</> : <><ScanLine className="h-4 w-4 mr-2" /> Scan GitHub Repos</>}
        </Button>}
      />

      {/* Check catalog */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Security Checks Performed</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {DEVSECOPS_CHECKS.map((check) => {
            const Icon = checkIcons[check.id] || ShieldCheck;
            return (
              <Card key={check.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{check.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{check.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{check.framework}</Badge>
                    <Badge variant={check.severity === "high" ? "destructive" : "secondary"} className="text-xs">{check.severity}</Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Scan results */}
      {result && result.status === "completed" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatCard label="Repos Scanned" value={result.repos_scanned} icon={GitBranch} color="text-blue-500" />
          <StatCard label="Checks Run" value={result.checks_run} icon={ScanLine} color="text-purple-500" />
          <StatCard label="Findings Created" value={result.findings_created} icon={AlertTriangle} color="text-red-500" />
          <StatCard label="Pass Rate" value={`${result.results.filter(r => r.checks.branch_protection && r.checks.vulnerability_alerts).length}/${result.results.length}`} icon={CheckCircle2} color="text-emerald-500" />
        </div>
      )}

      {/* Repo results table */}
      {result && result.status === "completed" && result.results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Repository Scan Results</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Repository</th>
                    <th className="pb-2 font-medium text-center">Branch Protection</th>
                    <th className="pb-2 font-medium text-center">Required Reviews</th>
                    <th className="pb-2 font-medium text-center">Vuln Alerts</th>
                    <th className="pb-2 font-medium text-center">Secret Scanning</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-2 font-mono text-xs">{r.repo}</td>
                      <td className="py-2 text-center">{r.checks.branch_protection ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}</td>
                      <td className="py-2 text-center">{r.checks.required_reviews >= 2 ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}</td>
                      <td className="py-2 text-center">{r.checks.vulnerability_alerts ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}</td>
                      <td className="py-2 text-center">{r.checks.secret_scanning === undefined ? <span className="text-muted-foreground text-xs">N/A</span> : r.checks.secret_scanning ? <CheckCircle2 className="h-4 w-4 text-emerald-500 inline" /> : <XCircle className="h-4 w-4 text-red-500 inline" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing DevSecOps findings */}
      <Card>
        <CardHeader><CardTitle>Open DevSecOps Findings ({findings.length})</CardTitle></CardHeader>
        <CardContent>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No DevSecOps findings. Run a scan to check your repositories.</p>
          ) : (
            <div className="space-y-2">
              {findings.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-md border">
                  <AlertTriangle className={`h-4 w-4 ${f.severity === "high" ? "text-red-500" : "text-amber-500"}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{f.title}</div>
                    <div className="text-xs text-muted-foreground">{f.description}</div>
                  </div>
                  <Badge variant={f.severity === "high" ? "destructive" : "secondary"} className="text-xs">{f.severity}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}