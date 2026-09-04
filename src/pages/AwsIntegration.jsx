import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Cloud, Users, HardDrive, ShieldCheck, RefreshCw, Zap, AlertCircle, CheckCircle2, FileText } from "lucide-react";

export default function AwsIntegration() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [result, setResult] = useState(null);

  const loadConnection = async () => {
    try {
      const conns = await base44.entities.Connection.filter({ service: "aws" });
      setConnection(conns[0] || null);
    } catch {}
  };

  useEffect(() => { loadConnection(); }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await base44.functions.invoke("syncAwsIntegration", { action: "test" });
      if (res.data?.connected) {
        toast({ title: "AWS connection verified", description: `Account: ${res.data.account_id}` });
      } else {
        toast({ title: "Connection failed", description: res.data?.error, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const sync = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("syncAwsIntegration", { action: "sync" });
      setResult(res.data);
      toast({ title: "AWS sync complete", description: `${res.data?.evidence_created} evidence records created` });
      loadConnection();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="AWS Integration" subtitle="Automated evidence collection from AWS — IAM, S3, Security Hub" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="w-5 h-5" /> Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {connection ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="font-medium">{connection.name}</p>
                <p className="text-sm text-muted-foreground">Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "Never"}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <p className="text-sm text-muted-foreground">Not connected. Test your AWS credentials to begin.</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={testConnection} disabled={testing} variant="outline">
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Test Connection
            </Button>
            <Button onClick={sync} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Account ID" value={result.account_id} icon={Cloud} color="blue" />
            <StatCard label="IAM Users" value={result.iam?.totalUsers} icon={Users} color="green" />
            <StatCard label="MFA Enabled" value={result.iam?.mfaUsers} icon={ShieldCheck} color="amber" />
            <StatCard label="S3 Buckets" value={result.s3?.bucketCount} icon={HardDrive} color="purple" />
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Sync Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {result.iam?.userList?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">IAM Users ({result.iam.userList.length})</h4>
                  <div className="flex flex-wrap gap-2">{result.iam.userList.map((u, i) => <span key={i} className="px-2 py-1 rounded-md bg-muted text-sm">{u}</span>)}</div>
                </div>
              )}
              {result.s3?.buckets?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">S3 Buckets ({result.s3.buckets.length})</h4>
                  <div className="flex flex-wrap gap-2">{result.s3.buckets.map((b, i) => <span key={i} className="px-2 py-1 rounded-md bg-muted text-sm">{b}</span>)}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div><p className="text-sm text-muted-foreground">Security Hub Findings</p><p className="text-lg font-semibold">{result.security_hub?.findingsCount} found · {result.security_hub?.findingsCreated} created</p></div>
                <div><p className="text-sm text-muted-foreground">Evidence Records</p><p className="text-lg font-semibold">{result.evidence_created} created</p></div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}