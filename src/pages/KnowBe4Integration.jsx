import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { GraduationCap, RefreshCw, Zap, AlertCircle, CheckCircle2, Users, BookOpen, Award } from "lucide-react";

export default function KnowBe4Integration() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connection, setConnection] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [result, setResult] = useState(null);

  const load = async () => {
    try {
      const conns = await base44.entities.Connection.filter({ name: "KnowBe4 Training" });
      setConnection(conns[0] || null);
      const kbTrainings = await base44.entities.Training.filter({ source_system: "knowbe4" });
      setTrainings(kbTrainings);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await base44.functions.invoke("syncKnowBe4Training", { action: "test" });
      if (res.data?.connected) {
        toast({ title: "KnowBe4 connection verified", description: `Account: ${res.data.account?.name || "Connected"}` });
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
      const res = await base44.functions.invoke("syncKnowBe4Training", { action: "sync" });
      setResult(res.data);
      toast({ title: "KnowBe4 sync complete", description: `${res.data?.training_created} created, ${res.data?.training_updated} updated` });
      load();
    } catch (e) {
      toast({ title: "Sync failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const totalAssigned = trainings.reduce((sum, t) => sum + (t.assignee_count || 0), 0);
  const totalCompleted = trainings.reduce((sum, t) => sum + (t.completed_count || 0), 0);
  const completionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="KnowBe4 Training Integration" subtitle="Automated security awareness training evidence from KnowBe4" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Connection Status</CardTitle>
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
              <p className="text-sm text-muted-foreground">Not connected. Set the KNOWBE4_API_KEY secret and test your connection.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Campaigns" value={result.total_campaigns} icon={BookOpen} color="blue" />
          <StatCard label="Created" value={result.training_created} icon={GraduationCap} color="green" />
          <StatCard label="Updated" value={result.training_updated} icon={RefreshCw} color="amber" />
          <StatCard label="Total Users" value={result.total_users} icon={Users} color="purple" />
        </div>
      )}

      {trainings.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Training Campaigns" value={trainings.length} icon={BookOpen} color="blue" />
            <StatCard label="Assigned" value={totalAssigned} icon={Users} color="amber" />
            <StatCard label="Completion Rate" value={`${completionRate}%`} icon={Award} color="green" />
          </div>

          <Card>
            <CardHeader><CardTitle>Synced Training Campaigns</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {trainings.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium text-sm">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">{t.completed_count}/{t.assignee_count}</p>
                        <p className="text-xs text-muted-foreground">{t.assignee_count > 0 ? Math.round((t.completed_count / t.assignee_count) * 100) : 0}%</p>
                      </div>
                      <Badge variant={t.status === "active" ? "default" : "secondary"}>{t.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}