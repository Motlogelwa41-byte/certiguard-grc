import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Training gate enforcement. Checks if mandatory trainings are overdue and
// blocks system access until completed. Creates remediation tasks for overdue items.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { user_email } = body;
    const tenantId = user.data?.tenant_id || user.tenant_id || "";
    const sr = base44.asServiceRole;
    const now = new Date();

    const trainings = await base44.entities.Training.list().catch(() => []);
    const mandatory = trainings.filter(t => t.mandatory && t.status === "active");

    const overdueTrainings = [];
    const completedTrainings = [];
    const upcomingTrainings = [];

    for (const training of mandatory) {
      const isOverdue = training.due_date && new Date(training.due_date) < now;
      const completionRate = training.assignee_count > 0 ? training.completed_count / training.assignee_count : 0;

      if (isOverdue && completionRate < 1) {
        overdueTrainings.push({
          training_id: training.id, title: training.title, category: training.category,
          due_date: training.due_date, completion_rate: Math.round(completionRate * 100),
          assignee_count: training.assignee_count, completed_count: training.completed_count,
        });
      } else if (isOverdue && completionRate >= 1) {
        completedTrainings.push({ training_id: training.id, title: training.title });
      } else if (training.due_date) {
        upcomingTrainings.push({
          training_id: training.id, title: training.title, due_date: training.due_date,
          completion_rate: Math.round(completionRate * 100),
        });
      }
    }

    const gatePassed = overdueTrainings.length === 0;
    const tasksCreated = [];

    if (!gatePassed) {
      for (const ot of overdueTrainings.slice(0, 10)) {
        const task = await sr.entities.ComplianceTask.create({
          tenant_id: tenantId,
          title: `[Training Gate] Complete: ${ot.title}`,
          description: `Mandatory training "${ot.title}" is overdue (due ${ot.due_date}). System access is blocked until completed. Completion: ${ot.completion_rate}%.`,
          type: "training", status: "overdue", priority: "high",
          assignee_email: user_email, due_date: ot.due_date,
          notes: "Auto-created by training gate enforcement",
        }).catch(() => null);
        if (task) tasksCreated.push(task.id);
      }
    }

    return Response.json({
      gate_passed: gatePassed, user_email,
      mandatory_trainings_total: mandatory.length,
      completed: completedTrainings.length,
      overdue: overdueTrainings.length,
      upcoming: upcomingTrainings.length,
      overdue_trainings: overdueTrainings,
      upcoming_trainings: upcomingTrainings,
      tasks_created: tasksCreated.length,
      access_decision: gatePassed ? "granted" : "blocked",
      timestamp: now.toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}