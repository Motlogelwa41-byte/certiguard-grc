import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, CheckCircle2, XCircle, AlertTriangle, GraduationCap, Loader2, ShieldCheck, ShieldX } from "lucide-react";

export default function TrainingGates() {
  const [gateResult, setGateResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [trainings, setTrainings] = useState([]);
  const { toast } = useToast();

  const loadTrainings = useCallback(async () => {
    try {
      const data = await base44.entities.Training.filter({ mandatory: true, status: "active" }, "-due_date");
      setTrainings(data || []);
    } catch (e) { setTrainings([]); }
  }, []);

  useEffect(() => { loadTrainings(); }, [loadTrainings]);

  const checkGate = async () => {
    setChecking(true);
    setGateResult(null);
    try {
      const res = await base44.functions.invoke("enforceTrainingGates", { user_email: userEmail });
      const data = res?.data || res;
      setGateResult(data);
      if (data.gate_passed) {
        toast({ title: "Access granted — all training complete" });
      } else {
        toast({ title: `Access blocked — ${data.overdue} overdue training(s)`, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Gate check failed", description: e.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Training Gates"
        subtitle="Enforce mandatory training completion before system access is granted"
      />

      {/* Gate checker */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Access Gate Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label>User Email</Label>
              <Input placeholder="user@company.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={checkGate} disabled={checking || !userEmail}>
                {checking ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Checking...</> : <><Lock className="h-4 w-4 mr-2" /> Check Access Gate</>}
              </Button>
            </div>
          </div>

          {gateResult && (
            <div className={`p-4 rounded-lg border-2 ${gateResult.gate_passed ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
              <div className="flex items-center gap-3 mb-3">
                {gateResult.gate_passed ? <CheckCircle2 className="h-8 w-8 text-emerald-500" /> : <XCircle className="h-8 w-8 text-red-500" />}
                <div>
                  <div className="text-lg font-bold">{gateResult.gate_passed ? "ACCESS GRANTED" : "ACCESS BLOCKED"}</div>
                  <div className="text-sm text-muted-foreground">All mandatory training requirements must be completed before system access is granted.</div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <StatCard label="Mandatory" value={gateResult.mandatory_trainings_total} icon={GraduationCap} color="text-blue-500" />
                <StatCard label="Completed" value={gateResult.completed} icon={CheckCircle2} color="text-emerald-500" />
                <StatCard label="Overdue" value={gateResult.overdue} icon={AlertTriangle} color="text-red-500" />
                <StatCard label="Upcoming" value={gateResult.upcoming} icon={GraduationCap} color="text-amber-500" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue trainings detail */}
      {gateResult && !gateResult.gate_passed && gateResult.overdue_trainings.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-red-600"><ShieldX className="h-5 w-5" /> Overdue Training Blocking Access</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {gateResult.overdue_trainings.map((t) => (
                <div key={t.training_id} className="flex items-center gap-3 p-3 rounded-md border border-red-200 bg-red-50/50">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">Due: {t.due_date} · Completion: {t.completion_rate}% ({t.completed_count}/{t.assignee_count})</div>
                  </div>
                  <Badge variant="destructive" className="text-xs">Overdue</Badge>
                </div>
              ))}
            </div>
            {gateResult.tasks_created > 0 && (
              <p className="text-xs text-muted-foreground mt-3">{gateResult.tasks_created} remediation task(s) auto-created for the user.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* All mandatory trainings */}
      <Card>
        <CardHeader><CardTitle>Mandatory Training Catalog ({trainings.length})</CardTitle></CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No mandatory trainings configured.</p>
          ) : (
            <div className="space-y-2">
              {trainings.map((t) => {
                const isOverdue = t.due_date && new Date(t.due_date) < new Date();
                const completionRate = t.assignee_count > 0 ? Math.round((t.completed_count / t.assignee_count) * 100) : 0;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-md border">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{t.category?.replace(/_/g, " ")} · Due: {t.due_date || "No deadline"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{completionRate}%</div>
                      <div className="text-xs text-muted-foreground">{t.completed_count}/{t.assignee_count} completed</div>
                    </div>
                    {isOverdue && completionRate < 100 && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}