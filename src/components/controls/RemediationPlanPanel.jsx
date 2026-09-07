import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Sparkles, Loader2, AlertTriangle, CheckCircle2, Clock, ListChecks, Target } from "lucide-react";

export default function RemediationPlanPanel({ control, onTasksCreated }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);

  const generate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const res = await base44.functions.invoke("generateRemediationPlan", { control_id: control.id });
      if (res.data?.error) throw new Error(res.data.error);
      setPlan(res.data);
      toast({
        title: "Remediation plan generated",
        description: `${res.data.tasks?.length || 0} tasks created and linked to this control.`,
      });
      if (onTasksCreated) onTasksCreated();
    } catch (e) {
      toast({ title: "Failed to generate plan", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  if (control.status !== "failing") return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          AI Remediation Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!plan && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Generate an AI-powered remediation plan with suggested tasks, owners, and timelines — auto-created as trackable compliance tasks.
            </p>
            <Button onClick={generate} className="bg-amber-600 hover:bg-amber-700">
              <Sparkles className="w-4 h-4 mr-1" /> Generate Remediation Plan
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing failure and generating plan...</span>
          </div>
        )}

        {plan && (
          <div className="space-y-4">
            {/* Root cause */}
            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-foreground">Root Cause Analysis</h4>
              </div>
              <p className="text-sm text-muted-foreground">{plan.root_cause}</p>
              {plan.severity_assessment && (
                <p className="text-xs text-amber-700 mt-1.5 font-medium">{plan.severity_assessment}</p>
              )}
            </div>

            {/* Tasks */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-primary" />
                Generated Tasks ({plan.tasks?.length || 0})
              </h4>
              <div className="space-y-2">
                {plan.tasks?.map((task, i) => (
                  <div key={task.id || i} className="rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground flex-1">{task.title}</p>
                      <Badge variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "default" : "secondary"}>
                        {task.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Due {task.due_date}
                      </span>
                      <span>· {task.suggested_owner_role}</span>
                      <span>· {task.estimated_days}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Success criteria */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <Target className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-semibold text-foreground">Success Criteria</h4>
              </div>
              <p className="text-sm text-muted-foreground">{plan.success_criteria}</p>
            </div>

            {/* Summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {plan.tasks?.length || 0} tasks created in Task tracker
              </span>
              <span>Est. {plan.estimated_total_days} days total</span>
            </div>

            <Button variant="outline" size="sm" onClick={generate} disabled={loading} className="w-full">
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Regenerate Plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}